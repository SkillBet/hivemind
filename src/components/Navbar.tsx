"use client";

/**
 * Hivemind — glassmorphic navbar with wallet connect + earnings pill.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletButton } from "./wallet-button";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/rate", label: "Rate" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#earn", label: "Earn" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-cyan/10 shadow-glow-sm">
            <Hexagon className="h-5 w-5 text-cyan" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">
            Hive<span className="text-cyan">mind</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-white/10 text-white" : "text-white/60 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
