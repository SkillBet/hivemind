"use client";

/**
 * Hivemind — leaderboard of top earners.
 */

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Hexagon, Star, Loader2 } from "lucide-react";
import { useAccount } from "wagmi";
import { api } from "@/lib/api-client";
import { cn, shortHash } from "@/lib/utils";
import { TOKEN } from "@/lib/constants";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  walletAddress: string | null;
  cortexBalance: number;
  reputation: number;
  consensusRate: number;
}

export default function Leaderboard({ limit = 10 }: { limit?: number }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const { address } = useAccount();

  const load = useCallback(async () => {
    try {
      const d = await api<{ entries: LeaderboardEntry[] }>(
        `/api/v1/leaderboard?limit=${limit}`,
      );
      setEntries(d.entries);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-cyan/60" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center py-12 text-center">
        <Trophy className="mb-3 h-8 w-8 text-white/20" />
        <p className="text-sm text-white/40">No earners yet. Be the first to rate tasks!</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <h3 className="px-5 pt-5 text-sm font-medium text-white/80">Top Earners</h3>
      <p className="px-5 pb-3 text-xs text-white/30">
        Highest {TOKEN.symbol} balances on the network.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-xs text-white/40">
              <th className="px-5 pb-2.5 pr-4 font-medium">Rank</th>
              <th className="px-2 pb-2.5 pr-4 font-medium">Contributor</th>
              <th className="px-2 pb-2.5 pr-4 font-medium text-right">{TOKEN.symbol}</th>
              <th className="px-2 pb-2.5 pr-4 font-medium text-right">Rep</th>
              <th className="px-2 pb-2.5 font-medium text-right">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const isYou = address && e.walletAddress?.toLowerCase() === address.toLowerCase();
              return (
                <motion.tr
                  key={e.userId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "border-b border-white/5 font-mono text-xs",
                    isYou && "bg-cyan/5",
                  )}
                >
                  <td className="px-5 py-3 pr-4">
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold",
                        e.rank === 1 && "bg-yellow-500/20 text-yellow-400",
                        e.rank === 2 && "bg-slate-400/20 text-slate-300",
                        e.rank === 3 && "bg-amber-700/20 text-amber-500",
                        e.rank > 3 && "bg-white/5 text-white/50",
                      )}
                    >
                      {e.rank}
                    </span>
                  </td>
                  <td className="px-2 py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white/70">
                        {e.walletAddress ? shortHash(e.walletAddress, 6, 4) : "Anon"}
                      </span>
                      {isYou && (
                        <span className="rounded bg-cyan/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan">
                          YOU
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 pr-4 text-right font-semibold text-cyan">
                    {e.cortexBalance.toLocaleString()}
                  </td>
                  <td className="px-2 py-3 pr-4 text-right text-white/60">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3" /> {e.reputation}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-right text-white/50">
                    {e.consensusRate}%
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
