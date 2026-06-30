import type { NextRequest } from "next/server";
import { z } from "zod";
import { resolvePrincipal, gate, json, errorResponse } from "@/lib/api-helpers";
import { submitSealedRating, HttpError } from "@/lib/tasks";
import { checkTaskLimit } from "@/lib/principal";
import { DAILY_TASK_LIMIT } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Body = z.object({
  taskId: z.string().min(1),
  sealed: z.object({
    encryptedPayload: z.string().min(1),
    encryptedKey: z.string().min(1),
    iv: z.string().min(1),
  }),
});

/**
 * POST /api/v1/ratings — commit a sealed vote. The rater's choice is sealed
 * client-side with the network reveal key; the server stores only ciphertext.
 */
export async function POST(req: NextRequest) {
  try {
    const blocked = gate(req, "ratings", 60, 60_000);
    if (blocked) return blocked;

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Invalid request.", code: "bad_body" }, 400);
    }

    const principal = await resolvePrincipal(req);

    // Enforce the daily task limit before accepting the commit.
    const limit = await checkTaskLimit(principal);
    if (!limit.allowed) {
      throw new HttpError(429, limit.reason ?? "Daily limit reached.");
    }

    const result = await submitSealedRating({
      principal,
      taskId: parsed.data.taskId,
      sealed: parsed.data.sealed,
    });

    return json({
      ok: true,
      pendingReveal: result.pendingReveal,
      quota: { used: limit.used + 1, limit: DAILY_TASK_LIMIT, remaining: limit.remaining - 1 },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
