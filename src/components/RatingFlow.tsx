"use client";

/**
 * Hivemind — staged rating-submission animation overlay.
 *
 * Shown over the RatingWorkspace while a vote is sealed, committed, and revealed.
 * Steps through the real commit-reveal pipeline visually so the anti-collusion
 * guarantee feels tangible.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Lock, Vote, Send, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: KeyRound, label: "Generating ephemeral AES-256 key…", ms: 550 },
  { icon: Lock, label: "Sealing your vote (RSA-OAEP + AES-GCM)…", ms: 650 },
  { icon: Send, label: "Committing sealed vote to the network…", ms: 600 },
  { icon: Vote, label: "Awaiting consensus reveal…", ms: 600 },
] as const;

export default function RatingFlow({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    let cancelled = false;
    let acc = 0;
    const timers: number[] = [];
    STEPS.forEach((s, i) => {
      acc += s.ms;
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setStep(i);
        }, acc - s.ms),
      );
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="glass w-[min(92vw,420px)] rounded-2xl p-6"
          >
            <div className="mb-4 flex items-center gap-2 text-sm font-medium text-cyan">
              <Lock className="h-4 w-4" />
              Sealing your vote
            </div>
            <ul className="space-y-3">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const current = i === step;
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0.3 }}
                    animate={{ opacity: done || current ? 1 : 0.3 }}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                        done && "border-ok/40 bg-ok/10 text-ok",
                        current && "border-cyan/50 bg-cyan/10 text-cyan shadow-glow-sm",
                        !done && !current && "border-white/10 bg-white/5 text-white/40",
                      )}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Icon className={cn("h-4 w-4", current && "animate-pulse")} />}
                    </span>
                    <span className={cn(done || current ? "text-white/90" : "text-white/40")}>
                      {s.label}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
