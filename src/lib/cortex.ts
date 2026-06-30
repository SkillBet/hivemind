/**
 * Hivemind — $CORTEX ledger & reputation engine.
 *
 * Awards $CORTEX, adjusts reputation, and ranks contributors. SERVER-ONLY.
 */

import "server-only";

import { prisma } from "./prisma";
import {
  REWARD,
  tierForReputation,
  type ContributorTierConfig,
} from "./constants";
import { dayKey } from "./utils";

// ---------------------------------------------------------------------------
// Reward computation
// ---------------------------------------------------------------------------

/** Reputation → reward multiplier (clamped to [minMultiplier, maxMultiplier]). */
export function multiplierForReputation(reputation: number): number {
  const ratio = reputation / REWARD.reputationStart; // 1.0 at start reputation
  const m = REWARD.minMultiplier + (REWARD.maxMultiplier - REWARD.minMultiplier) * clamp01(ratio);
  return Number(m.toFixed(2));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Compute the $CORTEX reward for a revealed rating.
 * - Consensus match: base * multiplier + consensusBonus
 * - Outlier: outlierConsolation
 */
export function computeReward(reputation: number, isConsensus: boolean): number {
  if (isConsensus) {
    return Math.round(REWARD.base * multiplierForReputation(reputation) + REWARD.consensusBonus);
  }
  return REWARD.outlierConsolation;
}

/** New reputation after a reveal (+step on consensus, −step on outlier, clamped). */
export function nextReputation(reputation: number, isConsensus: boolean): number {
  const delta = isConsensus ? REWARD.reputationStep : -REWARD.reputationStep;
  return Math.max(
    REWARD.reputationFloor,
    Math.min(REWARD.reputationCeiling, reputation + delta),
  );
}

// ---------------------------------------------------------------------------
// Ledger writes
// ---------------------------------------------------------------------------

interface AwardInput {
  userId: string;
  taskId: string;
  amount: number;
  reason: string;
}

/** Credit $CORTEX + append to the earnings ledger in one transaction. */
export async function awardCortex({ userId, taskId, amount, reason }: AwardInput): Promise<void> {
  const today = dayKey();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { cortexBalance: { increment: amount } },
    }),
    prisma.earning.create({
      data: { userId, taskId, amount, reason, dayKey: today },
    }),
  ]);
}

/** Apply a reputation delta to a user (clamped by the engine on read). */
export async function bumpReputation(userId: string, nextRep: number): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { reputation: nextRep } });
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export interface BalanceSummary {
  balance: number;
  reputation: number;
  multiplier: number;
  ratingsCount: number;
  consensusHits: number;
  consensusRate: number;
  tier: ContributorTierConfig;
  /** Progress to the next contributor tier (0..1), or null if already Gold. */
  nextTier: { name: string; progress: number; minReputation: number } | null;
}

export async function getBalanceSummary(userId: string): Promise<BalanceSummary | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      cortexBalance: true,
      reputation: true,
      ratingsCount: true,
      consensusHits: true,
    },
  });
  if (!user) return null;

  const tier = tierForReputation(user.reputation);
  const consensusRate =
    user.ratingsCount > 0 ? Math.round((user.consensusHits / user.ratingsCount) * 100) : 0;

  // Progress to next tier.
  let nextTier: BalanceSummary["nextTier"] = null;
  if (tier.id === "bronze") {
    nextTier = progressTo(CONTRIBUTOR_TIERS_LOOKUP.silver, user.reputation);
  } else if (tier.id === "silver") {
    nextTier = progressTo(CONTRIBUTOR_TIERS_LOOKUP.gold, user.reputation);
  }

  return {
    balance: user.cortexBalance,
    reputation: user.reputation,
    multiplier: multiplierForReputation(user.reputation),
    ratingsCount: user.ratingsCount,
    consensusHits: user.consensusHits,
    consensusRate,
    tier,
    nextTier,
  };
}

// Local alias to avoid importing the whole record into the hot path.
import { CONTRIBUTOR_TIERS as CONTRIBUTOR_TIERS_LOOKUP } from "./constants";

function progressTo(
  target: { name: string; minReputation: number },
  reputation: number,
): { name: string; progress: number; minReputation: number } {
  const span = target.minReputation - REWARD.reputationFloor;
  const done = reputation - REWARD.reputationFloor;
  const progress = span <= 0 ? 1 : Math.max(0, Math.min(1, done / span));
  return { name: target.name, progress, minReputation: target.minReputation };
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  walletAddress: string | null;
  cortexBalance: number;
  reputation: number;
  consensusRate: number;
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const rows = await prisma.user.findMany({
    where: { cortexBalance: { gt: 0 } },
    orderBy: [{ cortexBalance: "desc" }, { reputation: "desc" }],
    take: limit,
    select: {
      id: true,
      walletAddress: true,
      cortexBalance: true,
      reputation: true,
      ratingsCount: true,
      consensusHits: true,
    },
  });

  return rows.map((r, i) => ({
    rank: i + 1,
    userId: r.id,
    walletAddress: r.walletAddress,
    cortexBalance: r.cortexBalance,
    reputation: r.reputation,
    consensusRate:
      r.ratingsCount > 0 ? Math.round((r.consensusHits / r.ratingsCount) * 100) : 0,
  }));
}
