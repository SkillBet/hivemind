import type { NextRequest } from "next/server";
import { resolvePrincipal, gate, json, errorResponse } from "@/lib/api-helpers";
import { getTask } from "@/lib/tasks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/tasks/[id] — a specific task with the caller's vote status. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const blocked = gate(req, "tasks", 120, 60_000);
    if (blocked) return blocked;

    const { id } = await ctx.params;
    const principal = await resolvePrincipal(req);
    const task = await getTask(id, principal);
    if (!task) return json({ error: "Task not found." }, 404);
    return json({ task, anonymous: principal.anonymous });
  } catch (err) {
    return errorResponse(err);
  }
}
