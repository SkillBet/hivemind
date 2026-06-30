import type { Metadata } from "next";
import dynamic from "next/dynamic";
import RatingWorkspace from "@/components/RatingWorkspace";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

export const metadata: Metadata = {
  title: "Rate — Hivemind",
  description: "Rate AI outputs, earn $CORTEX. Sealed votes, consensus rewards.",
};

export default function RatePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Scene />
      <div className="absolute inset-0 z-10 flex flex-col items-center px-4 pt-28 pb-16">
        <h1 className="mb-2 text-center text-3xl font-bold leading-tight md:text-4xl">
          The <span className="text-cyan">Rating</span> Workspace
        </h1>
        <p className="mb-8 max-w-md text-center text-sm text-white/50">
          Pick the better AI response. Your vote is sealed before it leaves your browser.
          Match the consensus to earn {process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? "$CORTEX"}.
        </p>
        <RatingWorkspace />
      </div>
    </main>
  );
}
