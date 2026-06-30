/**
 * Hivemind — task lifecycle & consensus resolution engine. SERVER-ONLY.
 *
 * Flow:
 *   fetchNextTask(user)        → next task this rater hasn't rated yet
 *   submitSealedRating(...)    → store the sealed vote (commit)
 *   resolveConsensus(taskId)   → reveal all votes, pick majority, pay $CORTEX
 */

import "server-only";

import { prisma } from "./prisma";
import { REWARD } from "./constants";
import { unsealVote } from "./reveal-server";
import { awardCortex, bumpReputation, computeReward, nextReputation } from "./cortex";
import { resolveUser, type Principal } from "./principal";

// ---------------------------------------------------------------------------
// Task fetching
// ---------------------------------------------------------------------------

export interface TaskView {
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
  closesAt: string;
  /** Whether THIS rater has already committed a vote. */
  alreadyRated: boolean;
  /** Whether the rater's vote is awaiting reveal. */
  pendingReveal: boolean;
}

function toView(t: {
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
  closesAt: Date;
  ratings?: { revealed: boolean }[];
}): TaskView {
  const mine = t.ratings?.[0];
  return {
    id: t.id,
    prompt: t.prompt,
    modelA: t.modelA,
    responseA: t.responseA,
    modelB: t.modelB,
    responseB: t.responseB,
    category: t.category,
    difficulty: t.difficulty,
    rewardBase: t.rewardBase,
    raterCount: t.raterCount,
    closesAt: t.closesAt.toISOString(),
    alreadyRated: !!mine,
    pendingReveal: !!mine && !mine.revealed,
  };
}

/** Next open task the principal has not yet rated. */
export async function fetchNextTask(principal: Principal): Promise<TaskView | null> {
  const task = await prisma.task.findFirst({
    where: {
      status: "open",
      closesAt: { gt: new Date() },
      NOT: { ratings: { some: { userId: principal.id } } },
    },
    orderBy: { createdAt: "asc" },
    include: { ratings: { where: { userId: principal.id }, select: { revealed: true } } },
  });
  return task ? toView(task) : null;
}

/** A specific task (with the caller's vote status). */
export async function getTask(taskId: string, principal: Principal): Promise<TaskView | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { ratings: { where: { userId: principal.id }, select: { revealed: true } } },
  });
  return task ? toView(task) : null;
}

// ---------------------------------------------------------------------------
// Commit a sealed rating
// ---------------------------------------------------------------------------

export interface SealedVoteInput {
  encryptedPayload: string;
  encryptedKey: string;
  iv: string;
}

export async function submitSealedRating(opts: {
  principal: Principal;
  taskId: string;
  sealed: SealedVoteInput;
}): Promise<{ ok: true; pendingReveal: boolean }> {
  const { principal, taskId, sealed } = opts;

  // Anonymous users cannot commit (they may preview only).
  if (principal.anonymous) {
    throw new HttpError(401, "Connect a wallet to submit ratings.");
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, closesAt: true },
  });
  if (!task) throw new HttpError(404, "Task not found.");
  if (task.status !== "open") throw new HttpError(409, "This task is no longer open.");
  if (task.closesAt.getTime() < Date.now()) {
    throw new HttpError(410, "This task has closed.");
  }

  // Idempotency: one vote per (task, user).
  const existing = await prisma.rating.findUnique({
    where: { taskId_userId: { taskId, userId: principal.id } },
  });
  if (existing) {
    throw new HttpError(409, "You've already rated this task.");
  }

  // Persist the sealed vote + bump the task's rater count atomically.
  await prisma.$transaction([
    prisma.rating.create({
      data: {
        taskId,
        userId: principal.id,
        encryptedPayload: JSON.stringify(sealed),
      },
    }),
    prisma.task.update({
      where: { id: taskId },
      data: { raterCount: { increment: 1 } },
    }),
    prisma.user.update({
      where: { id: principal.id },
      data: { ratingsCount: { increment: 1 } },
    }),
  ]);

  return { ok: true, pendingReveal: true };
}

// ---------------------------------------------------------------------------
// Reveal & consensus resolution — the heart of commit-reveal
// ---------------------------------------------------------------------------

export interface RevealResult {
  resolved: boolean;
  /** Present when this caller had a vote on the task. */
  yourChoice?: "a" | "b";
  consensusChoice?: "a" | "b";
  isConsensus?: boolean;
  reward?: number;
  reason?: string;
}

/**
 * If the task has reached the consensus threshold, reveal every sealed vote,
 * compute the majority, and pay each rater. Returns the caller's outcome.
 */
export async function resolveConsensus(opts: {
  principal: Principal;
  taskId: string;
}): Promise<RevealResult> {
  const { principal, taskId } = opts;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { ratings: true },
  });
  if (!task) throw new HttpError(404, "Task not found.");

  // Already resolved → just return the caller's stored outcome.
  if (task.status === "resolved") {
    return outcomeForCaller(task.ratings, task.consensusChoice, principal.id);
  }

  // Not enough sealed votes yet.
  if (task.ratings.length < REWARD.consensusThreshold) {
    return {
      resolved: false,
      reason: `Awaiting ${REWARD.consensusThreshold - task.ratings.length} more rater(s).`,
    };
  }

  // Reveal every sealed vote.
  const choices: ("a" | "b")[] = [];
  for (const r of task.ratings) {
    if (!r.encryptedPayload) continue;
    const choice = await unsealVote(JSON.parse(r.encryptedPayload));
    choices.push(choice);
  }

  // Majority vote.
  const a = choices.filter((c) => c === "a").length;
  const b = choices.filter((c) => c === "b").length;
  const consensusChoice = a >= b ? "a" : "b";

  // Pay each rater + adjust reputation.
  await prisma.$transaction(async (tx) => {
    await tx.task.update({
      where: { id: taskId },
      data: { status: "resolved", consensusChoice },
    });

    for (const r of task.ratings) {
      if (!r.encryptedPayload) continue;
      const choice = await unsealVote(JSON.parse(r.encryptedPayload));
      const isConsensus = choice === consensusChoice;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: r.userId },
        select: { reputation: true },
      });
      const reward = computeReward(user.reputation, isConsensus);
      const nextRep = nextReputation(user.reputation, isConsensus);

      await tx.rating.update({
        where: { id: r.id },
        data: {
          choice,
          revealed: true,
          revealedAt: new Date(),
          isConsensus,
          rewardAwarded: reward,
        },
      });
      await tx.user.update({
        where: { id: r.userId },
        data: {
          cortexBalance: { increment: reward },
          reputation: nextRep,
          consensusHits: { increment: isConsensus ? 1 : 0 },
        },
      });
      await tx.earning.create({
        data: {
          userId: r.userId,
          taskId,
          amount: reward,
          reason: isConsensus ? "consensus" : "participation",
          dayKey: new Date().toISOString().slice(0, 10),
        },
      });
    }
  });

  const refreshed = await prisma.task.findUnique({
    where: { id: taskId },
    include: { ratings: true },
  });
  return outcomeForCaller(refreshed?.ratings ?? [], refreshed?.consensusChoice ?? null, principal.id);
}

function outcomeForCaller(
  ratings: { userId: string; choice: string | null; isConsensus: boolean | null; rewardAwarded: number }[],
  consensusChoice: string | null,
  callerId: string,
): RevealResult {
  const mine = ratings.find((r) => r.userId === callerId);
  return {
    resolved: true,
    consensusChoice: (consensusChoice as "a" | "b") ?? undefined,
    yourChoice: (mine?.choice as "a" | "b") ?? undefined,
    isConsensus: mine?.isConsensus ?? undefined,
    reward: mine?.rewardAwarded ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Minimal HTTP error helper (mirrors the project's existing pattern)
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

// Re-export so route handlers have a single import surface for the task domain.
export { resolveUser };
export type { Principal };
