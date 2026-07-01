"use client";

/**
 * Hivemind — earnings dashboard.
 *
 * Contributor analytics: $CORTEX balance, reputation, daily earnings chart,
 * category breakdown, and payout history. All data from /api/v1/earnings.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Hexagon,
  Star,
  Target,
  TrendingUp,
  Download,
  Wallet,
  Award,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { formatNumber, cn } from "@/lib/utils";
import { TOKEN } from "@/lib/constants";

interface EarningsData {
  anonymous?: boolean;
  balance: number | null;
  reputation: number;
  multiplier: number;
  ratingsCount: number;
  consensusHits: number;
  consensusRate: number;
  tier: { id: string; name: string; multiplier: number };
  nextTier: { name: string; progress: number; minReputation: number } | null;
  series: { day: string; amount: number }[];
  categories: { category: string; amount: number }[];
  payouts: { id: string; taskId: string | null; amount: number; reason: string; at: string }[];
}

const PIE_COLORS = ["#f59e0b", "#fbbf24", "#fcd34d", "#fde68a", "#fef3c7", "#d97706"];

export default function EarningsDashboard() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<EarningsData>("/api/v1/earnings");
      setData(d);
      setError(null);
    } catch {
      setError("Connect a wallet to view your earnings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card skeleton h-32" />
        ))}
      </div>
    );
  }

  if (error || !data || data.anonymous || data.balance === null) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
        <Wallet className="mb-3 h-10 w-10 text-hive/50" />
        <p className="text-white/60">{error ?? "No data available."}</p>
        <p className="mt-1 text-sm text-white/30">
          Connect your wallet to start earning {TOKEN.symbol}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Hexagon}
          label={`${TOKEN.symbol} Balance`}
          value={formatNumber(data.balance)}
          accent
        />
        <StatCard icon={Star} label="Reputation" value={`${data.reputation}`} />
        <StatCard icon={Target} label="Consensus Rate" value={`${data.consensusRate}%`} />
        <StatCard icon={Award} label="Contributor Tier" value={data.tier.name} />
      </div>

      {/* Reputation progress */}
      {data.nextTier && (
        <div className="glass-card">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-white/60">
              Progress to <strong className="text-hive">{data.nextTier.name}</strong> tier
            </span>
            <span className="text-white/40">
              {data.reputation} / {data.nextTier.minReputation} rep
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(data.nextTier.progress * 100)}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-hive to-amber-500"
            />
          </div>
          <p className="mt-2 text-[11px] text-white/40">
            At {data.nextTier.name}, you unlock a higher reward multiplier and premium tasks.
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card lg:col-span-2">
          <h3 className="mb-4 text-sm font-medium text-white/80">
            Daily {TOKEN.symbol} Earned (14d)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="day"
                stroke="rgba(255,255,255,0.3)"
                fontSize={11}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "rgba(10,10,15,0.95)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 12,
                  color: "#fff",
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#facc15"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#facc15" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card">
          <h3 className="mb-4 text-sm font-medium text-white/80">By Category</h3>
          {data.categories.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-xs text-white/30">
              No category data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.categories}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.categories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(10,10,15,0.95)",
                    border: "1px solid rgba(245,158,11,0.3)",
                    borderRadius: 12,
                    color: "#fff",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Payout history */}
      <div className="glass-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-white/80">Payout History</h3>
            <p className="text-xs text-white/30">
              Every {TOKEN.symbol} award — consensus matches pay the most.
            </p>
          </div>
          <a
            href="/api/v1/earnings/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-hive/50 hover:text-hive"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-white/40">
                <th className="pb-2 pr-4 font-medium">When</th>
                <th className="pb-2 pr-4 font-medium">Reason</th>
                <th className="pb-2 pr-4 font-medium">Task</th>
                <th className="pb-2 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.payouts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-white/30">
                    No payouts yet — rate some tasks to earn {TOKEN.symbol}.
                  </td>
                </tr>
              )}
              {data.payouts.slice(0, 20).map((p) => (
                <tr key={p.id} className="border-b border-white/5 font-mono text-xs">
                  <td className="py-2 pr-4 text-white/50">
                    {new Date(p.at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-[10px]",
                        p.reason === "consensus"
                          ? "bg-ok/15 text-ok"
                          : "bg-white/10 text-white/60",
                      )}
                    >
                      {p.reason}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-white/40">
                    {p.taskId ? `#${p.taskId.slice(-6)}` : "—"}
                  </td>
                  <td className="py-2 text-right text-hive">+{p.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Earn-more nudge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card flex flex-col items-center justify-between gap-3 sm:flex-row"
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-hive" />
          <div>
            <p className="font-medium text-white">Keep rating to raise your reputation</p>
            <p className="text-sm text-white/50">
              You earn a {data.multiplier.toFixed(1)}× multiplier. Higher reputation unlocks bigger rewards.
            </p>
          </div>
        </div>
        <a href="/rate" className="btn-glow">Rate tasks</a>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card", accent && "border-hive/30 shadow-glow-sm")}
    >
      <div className="mb-2 flex items-center gap-2 text-xs text-white/40">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("text-2xl font-semibold", accent ? "text-hive" : "text-white")}>
        {value}
      </div>
    </motion.div>
  );
}
