"use client";

/**
 * Hivemind — contributor tiers. Three glassmorphic cards showing reputation
 * milestones, reward multipliers, and perks. Pure reputation-driven — no paywall.
 */

import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { CONTRIBUTOR_TIER_LIST } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ContributorTiersProps {
  currentTierId?: string;
}

export default function ContributorTiers({ currentTierId }: ContributorTiersProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {CONTRIBUTOR_TIER_LIST.map((tier, i) => {
        const featured = tier.id === "gold";
        const isCurrent = currentTierId === tier.id;
        return (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "relative flex flex-col rounded-2xl p-6",
              featured ? "glass border-cyan/40 shadow-glow" : "glass",
            )}
          >
            {featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan px-3 py-1 text-xs font-semibold text-black">
                Top Tier
              </span>
            )}

            <div className="mb-1 flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
              <Zap className="h-4 w-4 text-cyan" />
            </div>

            <div className="mb-1 text-sm text-white/50">{tier.blurb}</div>

            <div className="mb-4">
              <span className="text-4xl font-bold text-cyan">{tier.multiplier}×</span>
              <span className="ml-1 text-sm text-white/40">reward multiplier</span>
            </div>

            <ul className="mb-6 flex-1 space-y-2.5">
              {tier.perks.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
                  {f}
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <div className="rounded-xl border border-cyan/40 bg-cyan/10 py-3 text-center text-sm font-medium text-cyan">
                Your Tier
              </div>
            ) : (
              <a
                href="/rate"
                className={cn(
                  "rounded-xl py-3 text-center text-sm font-medium transition-all",
                  featured
                    ? "btn-glow w-full"
                    : "border border-white/15 bg-white/5 text-white hover:border-cyan/50 hover:text-cyan",
                )}
              >
                Rate to unlock
              </a>
            )}

            <p className="mt-3 text-center text-[11px] text-white/30">
              Requires {tier.minReputation}+ reputation
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
