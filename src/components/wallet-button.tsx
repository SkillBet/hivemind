"use client";

/**
 * Hivemind — wallet connect button.
 *
 * Wraps RainbowKit's ConnectButton and persists the active address so the API
 * routes can resolve the caller via the `hive_wallet` cookie.
 */

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect } from "react";
import { useAccount } from "wagmi";
import { cn } from "@/lib/utils";

export function WalletButton() {
  const { address, isConnected } = useAccount();

  // Expose the active address to server routes via a cookie so fetch() in
  // Rating/Dashboard picks it up automatically.
  useEffect(() => {
    if (isConnected && address) {
      document.cookie = `hive_wallet=${address}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  }, [address, isConnected]);

  return (
    <div className={cn("flex items-center")}>
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
          const ready = mounted && authenticationStatus !== "loading";
          const connected =
            ready && account && chain && (!authenticationStatus || authenticationStatus === "authenticated");
          return (
            <div
              {...(!ready ? { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none", userSelect: "none" } } : {})}
              className="flex items-center"
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="rounded-xl border border-hive/40 bg-hive/10 px-4 py-2 text-sm font-medium text-hive transition-all hover:bg-hive/20 hover:shadow-glow-sm"
                    >
                      Connect Wallet
                    </button>
                  );
                }
                if (chain.unsupported) {
                  return (
                    <button onClick={openChainModal} type="button" className="rounded-xl border border-alert/40 bg-alert/10 px-4 py-2 text-sm text-alert">
                      Wrong network
                    </button>
                  );
                }
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="hidden items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 sm:flex"
                    >
                      {chain.hasIcon && (
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{
                            background: chain.iconBackground,
                            backgroundImage: chain.iconUrl ? `url(${chain.iconUrl})` : undefined,
                            backgroundSize: "cover",
                          }}
                        />
                      )}
                      {chain.name}
                    </button>
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                    >
                      {account.displayName}
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
}
