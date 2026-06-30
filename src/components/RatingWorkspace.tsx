"use client";

/**
 * Hivemind — the Rating Workspace.
 *
 * Where contributors earn $CORTEX. Fetches a pairwise task (prompt + two model
 * responses), lets the rater pick the better one, seals that choice
 * client-side with the network reveal key (commit-reveal), commits it, then
 * reveals the consensus outcome and shows the reward earned.
 *
 * Flow:
 *   1. On mount, fetch the network reveal public key + next task.
 *   2. Rater picks A or B → sealVote(choice, revealPublicKey).
 *   3. POST /api/v1/ratings { taskId, sealed }.
 *   4. POST /api/v1/ratings/reveal { taskId } → outcome + reward.
 *   5. Load the next task.
 */

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Vote,
  AlertTriangle,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Hexagon,
} from "lucide-react";
import { sealVote } from "@/lib/commit-reveal";
import { cn } from "@/lib/utils";
import { TOKEN } from "@/lib/constants";
import { api } from "@/lib/api-client";
import RatingFlow from "./RatingFlow";

interface Task {
  id: string;
  prompt: string;
  modelA: string;
  responseA: string;
  modelB: string;
  responseB: string;
  category: string;
  difficulty: string;
  rewardBase: number;
  raterCount: number;
}

type Outcome = {
  resolved: boolean;
  consensusChoice?: "a" | "b";
  yourChoice?: "a" | "b";
  isConsensus?: boolean;
  reward?: number;
  reason?: string;
};

export default function RatingWorkspace() {
  const [task, setTask] = useState<Task | null>(null);
  const [revealKey, setRevealKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "submitting" | "revealing">("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [loadingTask, setLoadingTask] = useState(true);
  const [anonymous, setAnonymous] = useState(false);

  // --- Bootstrap: reveal key + first task ---
  useEffect(() => {
    void (async () => {
      try {
        const [keyRes, taskRes] = await Promise.all([
          fetch("/api/v1/reveal-key", { cache: "no-store" }),
          fetch("/api/v1/tasks", { cache: "no-store" }),
        ]);
        const keyData = await keyRes.json();
        setRevealKey(keyData.publicKeyPem);

        const taskData = await taskRes.json();
        setAnonymous(Boolean(taskData.anonymous));
        setTask(taskData.task ?? null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoadingTask(false);
      }
    })();
  }, []);

  const loadNext = useCallback(async () => {
    setOutcome(null);
    setError(null);
    setLoadingTask(true);
    try {
      const res = await fetch("/api/v1/tasks", { cache: "no-store" });
      const data = await res.json();
      setAnonymous(Boolean(data.anonymous));
      setTask(data.task ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingTask(false);
    }
  }, []);

  const vote = useCallback(
    async (choice: "a" | "b") => {
      if (!task || !revealKey || phase !== "idle") return;
      setError(null);
      setOutcome(null);
      setPhase("submitting");

      try {
        // 1. Seal the choice client-side (commit-reveal).
        const sealed = await sealVote(choice, revealKey);

        // 2. Commit.
        const commit = await api<{ ok: boolean; quota?: { used: number; limit: number; remaining: number } }>(
          "/api/v1/ratings",
          {
            method: "POST",
            json: { taskId: task.id, sealed },
          },
        );
        if (commit.quota) setQuota(commit.quota);

        // 3. Reveal (will only resolve once enough raters have committed).
        setPhase("revealing");
        const result = await api<Outcome>("/api/v1/ratings/reveal", {
          method: "POST",
          json: { taskId: task.id },
        });
        setOutcome(result);
      } catch (e) {
        const err = e as Error & { message?: string };
        setError(err.message ?? "Something went wrong.");
      } finally {
        setPhase("idle");
      }
    },
    [task, revealKey, phase],
  );

  const busy = phase === "submitting";

  return (
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-4">
      <RatingFlow active={busy} />

      {/* Anonymous banner */}
      {anonymous && !busy && (
        <div className="flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/5 px-4 py-2.5 text-sm text-cyan/90">
          <KeyRound className="h-4 w-4 shrink-0" />
          <span>
            Previewing a task. <strong>Connect a wallet</strong> to seal your vote and earn $CORTEX.
          </span>
        </div>
      )}

      {/* Quota / error */}
      {(quota || error) && !busy && (
        <div className="text-[11px] text-white/40">
          {quota && (
            <span>
              Daily limit: {quota.used}/{quota.limit} ratings
            </span>
          )}
          {error && (
            <span className="ml-3 inline-flex items-center gap-1 text-alert">
              <AlertTriangle className="h-3 w-3" /> {error}
            </span>
          )}
        </div>
      )}

      {/* Task card */}
      {loadingTask ? (
        <div className="flex h-64 items-center justify-center rounded-2xl glass">
          <Loader2 className="h-6 w-6 animate-spin text-cyan/60" />
        </div>
      ) : !task ? (
        <EmptyState onReload={loadNext} />
      ) : (
        <AnimatePresence mode="wait">
          {!outcome ? (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="overflow-hidden rounded-2xl glass"
            >
              {/* Prompt */}
              <div className="border-b border-white/10 px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-white/60">
                    {task.category}
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 capitalize text-white/60">
                    {task.difficulty}
                  </span>
                  <span className="rounded-md border border-cyan/30 bg-cyan/5 px-2 py-0.5 text-cyan">
                    +{task.rewardBase}–{Math.round(task.rewardBase * 2)} $CORTEX
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-white/40">
                    <Lock className="h-3 w-3" /> sealed vote
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/90">{task.prompt}</p>
              </div>

              {/* Two responses */}
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <ResponseCard
                  label="A"
                  model={task.modelA}
                  text={task.responseA}
                  onPick={() => vote("a")}
                  disabled={busy || anonymous}
                  accent="cyan"
                />
                <ResponseCard
                  label="B"
                  model={task.modelB}
                  text={task.responseB}
                  onPick={() => vote("b")}
                  disabled={busy || anonymous}
                  accent="violet"
                />
              </div>

              <div className="border-t border-white/10 px-5 py-3 text-center text-[11px] text-white/40">
                Pick the better response. Your choice is sealed before it leaves your browser —
                collusion-resistant.
              </div>
            </motion.div>
          ) : (
            <OutcomeCard
              key="outcome"
              outcome={outcome}
              onContinue={loadNext}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ResponseCard({
  label,
  model,
  text,
  onPick,
  disabled,
  accent,
}: {
  label: "A" | "B";
  model: string;
  text: string;
  onPick: () => void;
  disabled?: boolean;
  accent: "cyan" | "violet";
}) {
  const ring = accent === "cyan" ? "hover:border-cyan/50 hover:shadow-glow-sm" : "hover:border-violet/50";
  const badge = accent === "cyan" ? "bg-cyan/15 text-cyan" : "bg-violet-500/15 text-violet-300";
  return (
    <div className={cn("group flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 transition-all", ring)}>
      <div className="mb-2 flex items-center justify-between">
        <span className={cn("flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold", badge)}>
          {label}
        </span>
        <span className="text-[10px] text-white/40">{model}</span>
      </div>
      <p className="mb-3 flex-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-white/80">
        {text}
      </p>
      <button
        onClick={onPick}
        disabled={disabled}
        className={cn(
          "flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        <Vote className="h-3.5 w-3.5" /> Pick {label}
      </button>
    </div>
  );
}

function OutcomeCard({ outcome, onContinue }: { outcome: Outcome; onContinue: () => void }) {
  if (!outcome.resolved) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl glass p-8 text-center"
      >
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan/60" />
        <h3 className="text-lg font-semibold text-white">Vote committed.</h3>
        <p className="mt-1 text-sm text-white/50">
          {outcome.reason ?? "Awaiting enough raters to reveal consensus."}
        </p>
        <button
          onClick={onContinue}
          className="mt-5 inline-flex items-center gap-2 rounded-xl btn-glow px-5 py-2.5 text-sm"
        >
          Next task <ArrowRight className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }

  const won = outcome.isConsensus;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl glass p-8 text-center"
    >
      <div
        className={cn(
          "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full",
          won ? "bg-ok/10 text-ok" : "bg-white/5 text-white/50",
        )}
      >
        {won ? <CheckCircle2 className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
      </div>
      <h3 className="text-xl font-semibold text-white">
        {won ? "You matched the hive!" : "You went your own way."}
      </h3>
      <p className="mt-1 text-sm text-white/50">
        Consensus picked{" "}
        <strong className="text-cyan">{outcome.consensusChoice?.toUpperCase()}</strong>. You picked{" "}
        <strong>{outcome.yourChoice?.toUpperCase()}</strong>.
      </p>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/5 px-4 py-1.5 text-sm">
        <Hexagon className="h-4 w-4 text-cyan" />
        <span className="font-semibold text-cyan">+{outcome.reward ?? 0}</span>
        <span className="text-white/60">{TOKEN.symbol} earned</span>
      </div>
      <div className="mt-6">
        <button
          onClick={onContinue}
          className="inline-flex items-center gap-2 rounded-xl btn-glow px-5 py-2.5 text-sm"
        >
          Next task <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({ onReload }: { onReload: () => void }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-2xl glass text-center">
      <Hexagon className="mb-3 h-10 w-10 text-cyan/40" />
      <p className="max-w-sm text-sm text-white/50">
        No tasks available right now. New preference tasks are added regularly — check back soon.
      </p>
      <button
        onClick={onReload}
        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm text-cyan hover:bg-cyan/20"
      >
        <Loader2 className="h-3.5 w-3.5" /> Refresh
      </button>
    </div>
  );
}
