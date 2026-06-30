import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Hivemind — Train the AI. Earn $CORTEX.",
  description:
    "A decentralized train-to-earn network where anyone earns $CORTEX by rating AI outputs. Collusion-resistant sealed votes, consensus rewards, and on-chain reputation.",
  keywords: ["train-to-earn", "decentralized AI", "RLHF", "$CORTEX", "Base", "preference data"],
  authors: [{ name: "Hivemind" }],
  openGraph: {
    title: "Hivemind — Train the AI. Earn $CORTEX.",
    description: "Rate AI outputs, earn $CORTEX. The human-intelligence network.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-black font-sans text-white antialiased">
        <Providers>
          <Navbar />
          <main className="pt-16">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
