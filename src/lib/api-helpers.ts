/**
 * Hivemind — shared API helpers: caller resolution, rate limiting, errors.
 * SERVER-ONLY.
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "./utils";
import { resolveUser } from "./principal";
import type { Principal } from "./tasks";

// ---------------------------------------------------------------------------
// Caller resolution from a Next.js request
// ---------------------------------------------------------------------------

/** Read the caller's wallet (header or cookie) + anon key (IP) from a request. */
export function readCaller(req: NextRequest): {
  walletAddress?: string;
  anonKey?: string;
} {
  const wallet =
    req.headers.get("x-wallet-address") ||
    readCookie(req, "hive_wallet") ||
    readCookie(req, "sn_wallet"); // back-compat
  const anonKey =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  return { walletAddress: wallet ?? undefined, anonKey };
}

function readCookie(req: NextRequest, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  const match = raw.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : undefined;
}

export async function resolvePrincipal(req: NextRequest): Promise<Principal> {
  const { walletAddress, anonKey } = readCaller(req);
  return resolveUser({ walletAddress, anonKey });
}

// ---------------------------------------------------------------------------
// Rate limit gate
// ---------------------------------------------------------------------------

export function gate(req: NextRequest, keyPrefix: string, limit: number, windowMs: number) {
  const { anonKey } = readCaller(req);
  const rl = rateLimit({ key: `${keyPrefix}:${anonKey}`, limit, windowMs });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Slow down.", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.resetMs / 1000)) } },
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Typed JSON + error helpers
// ---------------------------------------------------------------------------

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** Convert a thrown HttpError (or anything else) into a JSON response. */
export function errorResponse(err: unknown): NextResponse {
  const status =
    err && typeof err === "object" && "status" in err && typeof (err as { status: unknown }).status === "number"
      ? (err as { status: number }).status
      : 500;
  const message = err instanceof Error ? err.message : "Internal error";
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "error";
  return NextResponse.json({ error: message, code }, { status });
}
