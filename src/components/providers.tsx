"use client";

/**
 * Hivemind — Wagmi + RainbowKit providers configured for Base.
 *
 * WalletKit is mounted client-side only (it depends on window). We default to
 * Base mainnet; a testnet can be added by extending SUPPORTED_CHAINS.
 */

import { type ReactNode, useMemo } from "react";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { base } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@rainbow-me/rainbowkit/styles.css";

const PROJECT_ID = "9ccd27552b663fce44ef032ccd0794d6"; // Replace with walletconnect.org project id for prod

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), []);

  const config = useMemo(
    () =>
      getDefaultConfig({
        appName: "Hivemind",
        projectId: PROJECT_ID,
        chains: [base],
        ssr: true,
      }),
    [],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00f0ff",
            accentColorForeground: "#000000",
            borderRadius: "medium",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
