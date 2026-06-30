import type { NextRequest } from "next/server";
import { resolvePrincipal, gate, errorResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/earnings/export — stream the caller's full payout history as CSV. */
export async function GET(req: NextRequest) {
  try {
    const blocked = gate(req, "export", 20, 60_000);
    if (blocked) return blocked;

    const principal = await resolvePrincipal(req);
    if (principal.anonymous) {
      return errorResponse(new Error("Connect a wallet to export your payout history."));
    }

    const rows = await prisma.earning.findMany({
      where: { userId: principal.id },
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: { amount: true, reason: true, taskId: true, createdAt: true },
    });

    const csvCell = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const lines = ["timestamp,amount_cortex,reason,task_id"];
    for (const r of rows) {
      lines.push(
        [r.createdAt.toISOString(), r.amount, r.reason, r.taskId ?? ""]
          .map(csvCell)
          .join(","),
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="hivemind-earnings-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
