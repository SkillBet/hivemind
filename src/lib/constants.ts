/**
 * Hivemind — global constants & runtime configuration.
 *
 * Everything that varies per-environment is read from env vars with safe
 * fallbacks so the app boots in "demo mode" without any configuration.
 */

export const ENV = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  // v2: live OpenRouter task generation (off by default — seeded tasks only).
  openRouterKey: process.env.OPENROUTER_API_KEY,
  openRouterBaseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  // Stripe + USDC buyer-side payments are wired but dormant until v2.
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  stripePricePro: process.env.STRIPE_PRICE_PRO,
  stripePriceEnterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
  isServer: typeof window === "undefined",
} as const;

// ---------------------------------------------------------------------------
// Blockchain — Base mainnet (v2: on-chain $CORTEX + escrow)
// ---------------------------------------------------------------------------

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 8453);

export const USDC_CONTRACT =
  process.env.NEXT_PUBLIC_USDC_CONTRACT ??
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base mainnet USDC

export const CORTEX_CONTRACT =
  process.env.NEXT_PUBLIC_CORTEX_CONTRACT ??
  "0x0000000000000000000000000000000000000000"; // unset until deployed (v2)

/** USDC uses 6 decimals. */
export const USDC_DECIMALS = 6;

/** Raw Wei/units helper for USDC amounts. */
export function toUsdcUnits(usd: number): bigint {
  return BigInt(Math.round(usd * 10 ** USDC_DECIMALS));
}

// ---------------------------------------------------------------------------
// $CORTEX token branding
// ---------------------------------------------------------------------------

export const TOKEN = {
  name: "Cortex",
  symbol: "$CORTEX",
  decimals: 0, // v1: whole-unit off-chain points
  /** Short marketing blurb surfaced on the landing page + dashboard. */
  tagline: "Earned by the minds that train AI.",
} as const;

// ---------------------------------------------------------------------------
// Reward economy — single source of truth (server reward engine + UI)
// ---------------------------------------------------------------------------

export const REWARD = {
  /** Base $CORTEX for a rating that matches consensus (before reputation multiplier). */
  base: 10,
  /** Bonus layered on top of `base` for a consensus match. */
  consensusBonus: 15,
  /** Small consolation for an outlier (non-consensus) rating — keeps participation honest. */
  outlierConsolation: 2,
  /** How many sealed ratings must accumulate before a task can reveal. */
  consensusThreshold: 5,
  /** Reputation bounds — rater score is clamped to [floor, ceiling]. */
  reputationFloor: 50,
  reputationCeiling: 200,
  reputationStart: 100,
  /** Reputation delta applied on each reveal (+ for consensus, − for outlier). */
  reputationStep: 5,
  /** Reputation multiplier range applied to `base`. */
  minMultiplier: 0.5,
  maxMultiplier: 2.0,
} as const;

/** How many tasks a single contributor can rate per day (anti-abuse / pacing). */
export const DAILY_TASK_LIMIT = 50;

/** Maximum tasks returned per `/api/v1/tasks` page. */
export const TASK_PAGE_SIZE = 20;

/** How long an open task lives before it can auto-resolve (ms). */
export const TASK_TTL_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Task taxonomy
// ---------------------------------------------------------------------------

export const TASK_CATEGORIES = [
  "Reasoning",
  "Coding",
  "Writing",
  "Safety",
  "Math",
  "Instruction",
] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Contributor tiers — reputation milestones (drive the "earn more" cards + badge)
// ---------------------------------------------------------------------------

export type ContributorTierId = "bronze" | "silver" | "gold";

export interface ContributorTierConfig {
  id: ContributorTierId;
  name: string;
  /** Minimum reputation to qualify. */
  minReputation: number;
  /** Reward multiplier unlocked at this tier. */
  multiplier: number;
  blurb: string;
  perks: string[];
}

export const CONTRIBUTOR_TIERS: Record<ContributorTierId, ContributorTierConfig> = {
  bronze: {
    id: "bronze",
    name: "Bronze",
    minReputation: 0,
    multiplier: 1.0,
    blurb: "Every mind starts here.",
    perks: [
      "Rate up to 50 tasks / day",
      "Earn $CORTEX on every consensus match",
      "Build your reputation",
    ],
  },
  silver: {
    id: "silver",
    name: "Silver",
    minReputation: 120,
    multiplier: 1.4,
    blurb: "A trusted voice in the hive.",
    perks: [
      "1.4× reward multiplier",
      "Access to higher-value tasks",
      "Priority task routing",
      "On-chain reputation badge (v2)",
    ],
  },
  gold: {
    id: "gold",
    name: "Gold",
    minReputation: 160,
    multiplier: 2.0,
    blurb: "The hive's elite reviewers.",
    perks: [
      "2× reward multiplier",
      "Premium & hard tasks",
      "Validator eligibility (v2)",
      "$CORTEX governance (v2)",
    ],
  },
};

export const CONTRIBUTOR_TIER_LIST = Object.values(CONTRIBUTOR_TIERS);

/** Resolve a reputation score to its contributor tier. */
export function tierForReputation(reputation: number): ContributorTierConfig {
  if (reputation >= CONTRIBUTOR_TIERS.gold.minReputation) return CONTRIBUTOR_TIERS.gold;
  if (reputation >= CONTRIBUTOR_TIERS.silver.minReputation) return CONTRIBUTOR_TIERS.silver;
  return CONTRIBUTOR_TIERS.bronze;
}

// ---------------------------------------------------------------------------
// Commit-reveal crypto — kept in sync between browser & server
// ---------------------------------------------------------------------------

export const COMMIT_REVEAL = {
  /** RSA modulus length for the browser keypair. */
  rsaBits: 2048,
  /** RSA-OAEP hash used for key wrapping. */
  rsaHash: "SHA-256",
  /** AES key length in bits. */
  aesBits: 256,
  /** AES-GCM IV length in bytes. */
  ivBytes: 12,
} as const;

/** IndexedDB store name for the user's local private key. */
export const KEYSTORE_DB = "hivemind";
export const KEYSTORE_STORE = "keys";
export const KEYSTORE_RECORD = "user-keypair";
