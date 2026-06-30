/**
 * Hivemind — seed script.
 *
 * Populates realistic pairwise preference tasks (so the rating workspace is
 * populated on first run) plus a handful of demo contributors with $CORTEX
 * balances so the leaderboard isn't empty.
 *
 *   npm run db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface TaskSeed {
  prompt: string;
  modelA: string;
  responseA: string;
  modelB: string;
  responseB: string;
  category: string;
  difficulty: string;
}

// A spread of plausible A-vs-B pairs. Some have a clearly stronger answer,
// some are close calls — the point is realistic consensus surfaces.
const TASKS: TaskSeed[] = [
  {
    prompt: "Explain what a hash function is to a 10-year-old.",
    modelA: "anthropic/claude-3.5",
    responseA:
      "A hash function is like a magical blender for words. You can throw in any message — a word, a book, a whole movie — and it always pours out the exact same size smoothie. Change one letter of what you put in, and you get a totally different smoothie. And nobody can un-blend it back into the original.",
    modelB: "anthropic/claude-3.5",
    responseB:
      "Hash function maps input to fixed output. Used in crypto.",
    category: "Reasoning",
    difficulty: "easy",
  },
  {
    prompt: "Write a Python function that returns true if a string is a palindrome.",
    modelA: "openai/gpt-4o",
    responseA:
      "def is_palindrome(s):\n    return s == s[::-1]",
    modelB: "openai/gpt-4o",
    responseB:
      "def is_palindrome(s):\n    n = len(s)\n    for i in range(n):\n        if s[i] != s[n - i]:\n            return False\n    return True",
    category: "Coding",
    difficulty: "standard",
  },
  {
    prompt: "Write a one-line tagline for a coffee shop.",
    modelA: "meta-llama/llama-3.1",
    responseA: "Brewed for the bold, served for you.",
    modelB: "meta-llama/llama-3.1",
    responseB: "Coffee.",
    category: "Writing",
    difficulty: "easy",
  },
  {
    prompt: "A train travels 60 km in 1.5 hours. What is its average speed in km/h?",
    modelA: "openai/gpt-4o-mini",
    responseA: "Average speed = distance / time = 60 / 1.5 = 40 km/h.",
    modelB: "openai/gpt-4o-mini",
    responseB: "The speed is 90 km/h because 60 × 1.5 = 90.",
    category: "Math",
    difficulty: "easy",
  },
  {
    prompt: "Give one helpful, safe tip for someone feeling overwhelmed.",
    modelA: "anthropic/claude-3.5",
    responseA:
      "Try the 5-4-3-2-1 grounding technique: name five things you see, four you can touch, three you hear, two you smell, and one you taste. It gently brings your attention back to the present.",
    modelB: "anthropic/claude-3.5",
    responseB:
      "Just stop being anxious and focus. It's all in your head.",
    category: "Safety",
    difficulty: "standard",
  },
  {
    prompt: "Summarize the plot of Romeo and Juliet in two sentences.",
    modelA: "openai/gpt-4o",
    responseA:
      "Two teenagers from feuding families fall in love at first sight and secretly marry. A chain of tragic misunderstandings leads to their suicides, finally reconciling their warring houses.",
    modelB: "openai/gpt-4o",
    responseB:
      "Romeo and Juliet love each other. They die.",
    category: "Writing",
    difficulty: "standard",
  },
  {
    prompt: "What's the difference between TCP and UDP in one sentence?",
    modelA: "meta-llama/llama-3.1",
    responseA:
      "TCP establishes a reliable, ordered connection with delivery guarantees, while UDP fires packets off with no guarantee of order or arrival in exchange for lower latency.",
    modelB: "meta-llama/llama-3.1",
    responseB:
      "TCP and UDP are both internet things that computers use.",
    category: "Reasoning",
    difficulty: "standard",
  },
  {
    prompt: "Rewrite this politely: 'Send me the file now.'",
    modelA: "openai/gpt-4o-mini",
    responseA: "Could you please send me the file when you have a moment?",
    modelB: "openai/gpt-4o-mini",
    responseB: "I need the file immediately, do it now thanks.",
    category: "Instruction",
    difficulty: "easy",
  },
  {
    prompt: "Explain why the sky is blue.",
    modelA: "anthropic/claude-3.5",
    responseA:
      "Sunlight is made of all colors. As it enters the atmosphere, air molecules scatter the shorter blue wavelengths in every direction far more than the longer reds — so the blue light reaches your eyes from all over the sky. This is called Rayleigh scattering.",
    modelB: "anthropic/claude-3.5",
    responseB:
      "The sky is blue because that's the color of the ocean reflecting up.",
    category: "Reasoning",
    difficulty: "standard",
  },
  {
    prompt: "Solve: if 3x + 7 = 22, what is x?",
    modelA: "openai/gpt-4o",
    responseA: "3x = 22 - 7 = 15, so x = 5.",
    modelB: "openai/gpt-4o",
    responseB: "x = 22 - 7 + 3 = 18.",
    category: "Math",
    difficulty: "easy",
  },
  {
    prompt: "Write a secure default for a Boolean flag in a config.",
    modelA: "openai/gpt-4o-mini",
    responseA: "Default sensitive features to `false` (fail-closed) until explicitly enabled.",
    modelB: "openai/gpt-4o-mini",
    responseB: "Default everything to `true` so users get all features by default.",
    category: "Coding",
    difficulty: "standard",
  },
  {
    prompt: "Name one way to verify a news source is credible.",
    modelA: "meta-llama/llama-3.1",
    responseA:
      "Cross-check the claim against at least two independent outlets with a history of corrections and named sources, and look for the original primary source rather than a reblog.",
    modelB: "meta-llama/llama-3.1",
    responseB: "If it has lots of likes and shares it's probably true.",
    category: "Instruction",
    difficulty: "standard",
  },
];

async function main() {
  console.log("🐝 Seeding Hivemind…");

  const now = Date.now();
  const day = 86_400_000;
  const closesAt = new Date(now + day); // tasks live 24h

  // --- Tasks ---
  let taskCount = 0;
  for (const t of TASKS) {
    await prisma.task.create({
      data: {
        prompt: t.prompt,
        modelA: t.modelA,
        responseA: t.responseA,
        modelB: t.modelB,
        responseB: t.responseB,
        category: t.category,
        difficulty: t.difficulty,
        rewardBase: t.difficulty === "hard" ? 20 : t.difficulty === "easy" ? 8 : 12,
        status: "open",
        closesAt,
        createdAt: new Date(now - taskCount * 60_000),
      },
    });
    taskCount++;
  }
  console.log(`  • ${taskCount} pairwise tasks`);

  // --- Demo contributors (populated leaderboard) ---
  const contributors = [
    { wallet: "0xH1vE000000000000000000000000000000aA11ce", balance: 4820, rep: 185, hits: 210, count: 240 },
    { wallet: "0xH1vE000000000000000000000000000000b0Bee2", balance: 3110, rep: 168, hits: 150, count: 180 },
    { wallet: "0xH1vE000000000000000000000000000000c3Dar3", balance: 2480, rep: 155, hits: 132, count: 165 },
    { wallet: "0xH1vE000000000000000000000000000000d4ron4", balance: 1640, rep: 142, hits: 96, count: 130 },
    { wallet: "0xH1vE000000000000000000000000000000e5lis5", balance: 980, rep: 128, hits: 70, count: 100 },
    { wallet: "0xH1vE000000000000000000000000000000f6inn6", balance: 540, rep: 115, hits: 44, count: 70 },
  ];

  for (const c of contributors) {
    const user = await prisma.user.upsert({
      where: { walletAddress: c.wallet },
      update: {
        cortexBalance: c.balance,
        reputation: c.rep,
        consensusHits: c.hits,
        ratingsCount: c.count,
      },
      create: {
        walletAddress: c.wallet,
        cortexBalance: c.balance,
        reputation: c.rep,
        consensusHits: c.hits,
        ratingsCount: c.count,
      },
    });

    // Spread their earnings over the last 14 days for the chart.
    let remaining = c.balance;
    for (let d = 13; d >= 0 && remaining > 0; d--) {
      const amt = d === 0 ? remaining : Math.min(remaining, Math.floor(c.balance / 14) + Math.floor(Math.random() * 80));
      if (amt <= 0) continue;
      remaining -= amt;
      await prisma.earning.create({
        data: {
          userId: user.id,
          taskId: null,
          amount: amt,
          reason: Math.random() > 0.2 ? "consensus" : "participation",
          dayKey: new Date(now - d * day).toISOString().slice(0, 10),
          createdAt: new Date(now - d * day + Math.floor(Math.random() * day)),
        },
      });
    }
  }
  console.log(`  • ${contributors.length} demo contributors`);

  console.log("✅ Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
