import type { NextRequest } from "next/server";
import { gate, json, errorResponse } from "@/lib/api-helpers";
import { getRevealPublicKeyPem } from "@/lib/reveal-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/v1/reveal-key — publishes the network reveal PUBLIC key so the
 * browser can seal each vote. The matching private key never leaves the server
 * and is used only during the reveal step.
 */
export async function GET(req: NextRequest) {
  try {
    const blocked = gate(req, "reveal-key", 120, 60_000);
    if (blocked) return blocked;

    const publicKeyPem = await getRevealPublicKeyPem();
    return json({ publicKeyPem });
  } catch (err) {
    return errorResponse(err);
  }
}
