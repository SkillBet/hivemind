/**
 * Hivemind — on-chain bindings (v2 roadmap).
 *
 * v1 keeps $CORTEX off-chain (Prisma). This module preserves the USDC/ERC-20
 * plumbing so the future on-chain upgrade (contracts/HivemindCortex.sol) drops
 * in cleanly. Nothing in v1 actively calls these; they exist for the roadmap.
 */

import { USDC_CONTRACT, CORTEX_CONTRACT } from "./constants";

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export const CONTRACTS = {
  usdc: USDC_CONTRACT,
  cortex: CORTEX_CONTRACT,
} as const;
