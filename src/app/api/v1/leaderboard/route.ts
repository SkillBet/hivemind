import type { NextRequest } from "next/server";
import { gate, json, errorResponse } from "@/lib/api-helpers";
import { getLeaderboard } from "@/lib/cortex";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/leaderboard?limit=20 — top earners by $CORTEX. */
export async function GET(req: NextRequest) {
  try {
    const blocked = gate(req, "leaderboard", 60, 60_000);
    if (blocked) return blocked;

    const limit = Math.min(50, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "20")));
    const entries = await getLeaderboard(limit);
    return json({ entries });
  } catch (err) {
    return errorResponse(err);
  }
}
