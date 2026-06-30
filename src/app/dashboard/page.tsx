/**
 * Hivemind — earnings dashboard page.
 */

import type { Metadata } from "next";
import EarningsDashboard from "@/components/EarningsDashboard";
import ContributorTiers from "@/components/ContributorTiers";

export const metadata: Metadata = {
  title: "Dashboard — Hivemind",
  description: "Your $CORTEX earnings, reputation, and payout history.",
};

export default function DashboardPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">Dashboard</h1>
        <p className="mt-2 text-sm text-white/50">
          Your $CORTEX balance, reputation score, and payout history.
        </p>
      </div>

      <EarningsDashboard />

      <div id="earn" className="mt-16 scroll-mt-24">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold">Contributor Tiers</h2>
          <p className="mt-1 text-sm text-white/50">Rate more, earn more, climb the ranks.</p>
        </div>
        <ContributorTiers />
      </div>
    </section>
  );
}
