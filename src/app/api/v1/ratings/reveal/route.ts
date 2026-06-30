import type { NextRequest } from "next/server";
import { z } from "zod";
import { resolvePrincipal, gate, json, errorResponse } from "@/lib/api-helpers";
import { resolveConsensus } from "@/lib/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({ taskId: z.string().min(1) });

/**
 * POST /api/v1/ratings/reveal — attempt to reveal a task's consensus. If the
 * threshold of sealed votes is met, every vote is decrypted, the majority wins,
 * and $CORTEX is paid. Returns the caller's outcome.
 */
export async function POST(req: NextRequest) {
  try {
    const blocked = gate(req, "reveal", 60, 60_000);
    if (blocked) return blocked;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Invalid request.", code: "bad_body" }, 400);
    }

    const principal = await resolvePrincipal(req);
    const result = await resolveConsensus({ principal, taskId: parsed.data.taskId });
    return json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
