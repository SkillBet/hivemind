import type { NextRequest } from "next/server";
import { resolvePrincipal, gate, json, errorResponse } from "@/lib/api-helpers";
import { fetchNextTask } from "@/lib/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/tasks — the next open task for the caller (skips already-rated). */
export async function GET(req: NextRequest) {
  try {
    const blocked = gate(req, "tasks", 120, 60_000);
    if (blocked) return blocked;

    const principal = await resolvePrincipal(req);
    const task = await fetchNextTask(principal);
    return json({ task, anonymous: principal.anonymous });
  } catch (err) {
    return errorResponse(err);
  }
}
