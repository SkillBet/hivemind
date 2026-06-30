"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  Vote,
  Lock,
  Hexagon,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import ContributorTiers from "@/components/ContributorTiers";
import Leaderboard from "@/components/Leaderboard";
import { TOKEN } from "@/lib/constants";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

const STEPS = [
  {
    icon: Wallet,
    title: "Connect Wallet",
    desc: "Link your Base wallet to create your contributor identity. Anonymous preview available without one.",
  },
  {
    icon: Vote,
    title: "Rate AI Outputs",
    desc: "Get paired with a prompt and two AI responses. Pick the better one. Your vote is sealed client-side — collusion-resistant.",
  },
  {
    icon: CheckCircle2,
    title: "Consensus Rewards",
    desc: "Once enough raters commit, votes are revealed. Match the crowd consensus to earn $CORTEX — outlier votes earn less.",
  },
  {
    icon: Hexagon,
    title: "Build Reputation",
    desc: "Accurate ratings raise your reputation. Higher rep unlocks bigger multipliers, premium tasks, and validator eligibility.",
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <Scene />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero */}
        <section className="flex min-h-[88vh] flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/5 px-3 py-1 text-xs text-cyan/80">
              <Hexagon className="h-3.5 w-3.5" /> Train-to-Earn · Base network
            </span>
          </motion.div>

          <h1 className="mb-6 text-4xl font-extrabold leading-tight md:text-6xl lg:text-7xl">
            <span className="text-gradient-cyan">Train the AI.</span>
            <br />
            <span className="text-glow">Earn {TOKEN.symbol}.</span>
          </h1>

          <p className="mb-8 max-w-xl text-base leading-relaxed text-white/50 md:text-lg">
            Rate AI outputs and get paid. Your sealed votes train the next generation
            of models — with math, not promises. Join the hive that powers the
            intelligence revolution.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/rate" className="btn-glow inline-flex items-center gap-2 px-6 py-3 text-sm font-medium">
              Start Rating <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white/80 transition-colors hover:border-cyan/50 hover:text-cyan">
              View Dashboard
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Zero-Trust, <span className="text-cyan">Sealed Votes</span>
            </h2>
            <p className="mt-2 text-sm text-white/40">
              Your opinion is valuable. Protect it with cryptography.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan/10 text-cyan">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-white">{step.title}</h3>
                  <p className="text-xs leading-relaxed text-white/50">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Contributor Tiers */}
        <section id="earn" className="mx-auto max-w-5xl px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Contributor <span className="text-cyan">Tiers</span>
            </h2>
            <p className="mt-2 text-sm text-white/40">
              Higher reputation = higher rewards. Pure meritocracy.
            </p>
          </motion.div>
          <ContributorTiers />
        </section>

        {/* Leaderboard */}
        <section className="mx-auto max-w-5xl px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 text-center"
          >
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Top <span className="text-cyan">Earners</span>
            </h2>
            <p className="mt-2 text-sm text-white/40">
              The hive&apos;s sharpest raters, ranked by {TOKEN.symbol} earned.
            </p>
          </motion.div>
          <Leaderboard limit={10} />
        </section>

        {/* Trust strip */}
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="glass-card flex flex-col items-center gap-2 text-center">
            <Lock className="h-6 w-6 text-cyan" />
            <p className="font-medium text-white">Sealed by cryptography</p>
            <p className="text-xs text-white/40">
              Every vote is encrypted before it leaves your browser. Consensus is computed
              after the batch closes. Neither the operator nor early raters can peek at
              partial results.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
