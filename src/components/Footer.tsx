/**
 * Hivemind — minimal dark footer.
 */

import Link from "next/link";
import { Hexagon } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-white/40 sm:flex-row">
        <div className="flex items-center gap-2">
          <Hexagon className="h-4 w-4 text-cyan/60" />
          <span>Hivemind — train the AI, earn $CORTEX.</span>
        </div>
        <nav className="flex items-center gap-5">
          <Link href="/rate" className="hover:text-cyan">Rate</Link>
          <Link href="/dashboard" className="hover:text-cyan">Dashboard</Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-cyan"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
