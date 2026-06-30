/**
 * Hivemind — principal resolution & task-limit metering.
 *
 * Resolves a caller (wallet / anonymous) to a User row, and enforces the daily
 * task limit. SERVER-ONLY.
 */

import "server-only";

import { prisma } from "./prisma";
import { DAILY_TASK_LIMIT } from "./constants";
import { dayKey } from "./utils";

// ---------------------------------------------------------------------------
// Principal resolution
// ---------------------------------------------------------------------------

export interface Principal {
  id: string;
  /** True when the caller is unauthenticated (metered by IP instead). */
  anonymous: boolean;
}

/**
 * Resolve a caller from a wallet address. Falls back to an anonymous principal
 * metered by `anonKey` so visitors can preview tasks before connecting.
 */
export async function resolveUser(opts: {
  walletAddress?: string | null;
  anonKey?: string | null;
}): Promise<Principal> {
  if (opts.walletAddress) {
    const addr = opts.walletAddress.toLowerCase();
    let user = await prisma.user.findUnique({ where: { walletAddress: addr } });
    if (!user) {
      user = await prisma.user.create({ data: { walletAddress: addr } });
    }
    return { id: user.id, anonymous: false };
  }

  // Anonymous: deterministic id from the caller key so the daily limit is
  // enforced per-IP without polluting the users table.
  const key = (opts.anonKey ?? "anon").toLowerCase();
  return { id: `anon:${key}`, anonymous: true };
}

// ---------------------------------------------------------------------------
// Daily task-limit enforcement
// ---------------------------------------------------------------------------

export interface TaskLimitCheck {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
  remaining: number;
}

/** Returns true if the principal may rate another task today. */
export async function checkTaskLimit(principal: Principal): Promise<TaskLimitCheck> {
  const today = dayKey();
  const used = await prisma.rating.count({
    where: { userId: principal.id, submittedAt: { gte: startOfTodayUtc() } },
  });

  if (used >= DAILY_TASK_LIMIT) {
    return {
      allowed: false,
      reason: `Daily limit reached (${DAILY_TASK_LIMIT} ratings/day). Come back tomorrow.`,
      used,
      limit: DAILY_TASK_LIMIT,
      remaining: 0,
    };
  }
  return { allowed: true, used, limit: DAILY_TASK_LIMIT, remaining: DAILY_TASK_LIMIT - used };
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
