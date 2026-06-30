import type { NextRequest } from "next/server";
import { resolvePrincipal, gate, json, errorResponse } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getBalanceSummary } from "@/lib/cortex";
import { dayKey } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/v1/earnings — balance, reputation, 14-day series, category breakdown, payouts. */
export async function GET(req: NextRequest) {
  try {
    const blocked = gate(req, "earnings", 60, 60_000);
    if (blocked) return blocked;

    const principal = await resolvePrincipal(req);

    // Anonymous preview: no real balance, but return a shaped response so the UI
    // can render an empty state without a wallet.
    if (principal.anonymous) {
      return json({ anonymous: true, balance: null, series: [], categories: [], payouts: [] });
    }

    const summary = await getBalanceSummary(principal.id);
    if (!summary) return json({ error: "User not found." }, 404);

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [rows, payouts] = await Promise.all([
      prisma.earning.findMany({
        where: { userId: principal.id, createdAt: { gte: since } },
        select: { amount: true, dayKey: true, reason: true },
      }),
      prisma.earning.findMany({
        where: { userId: principal.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, taskId: true, amount: true, reason: true, createdAt: true },
      }),
    ]);

    // Daily series.
    const byDay = new Map<string, number>();
    for (const r of rows) byDay.set(r.dayKey, (byDay.get(r.dayKey) ?? 0) + r.amount);
    const series = Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amount]) => ({ day, amount }));

    // Category breakdown (via task join).
    const catRows = await prisma.earning.findMany({
      where: { userId: principal.id, createdAt: { gte: since } },
      select: { amount: true, taskId: true },
    });
    const taskIds = [...new Set(catRows.map((r) => r.taskId).filter(Boolean) as string[])];
    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, category: true },
    });
    const taskCat = new Map(tasks.map((t) => [t.id, t.category]));
    const byCat = new Map<string, number>();
    for (const r of catRows) {
      const cat = r.taskId ? (taskCat.get(r.taskId) ?? "Other") : "Other";
      byCat.set(cat, (byCat.get(cat) ?? 0) + r.amount);
    }
    const categories = Array.from(byCat.entries()).map(([category, amount]) => ({ category, amount }));

    return json({
      anonymous: false,
      ...summary,
      series,
      categories,
      payouts: payouts.map((p) => ({
        id: p.id,
        taskId: p.taskId,
        amount: p.amount,
        reason: p.reason,
        at: p.createdAt.toISOString(),
      })),
      today: dayKey(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
