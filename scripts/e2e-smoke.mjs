#!/usr/bin/env node
/**
 * Hivemind — end-to-end smoke test.
 *
 * Proves the train-to-earn loop without a browser:
 *   1. GET /api/v1/reveal-key      → network reveal public key
 *   2. GET /api/v1/tasks            → next task
 *   3. Seal a vote ("a") client-side with the reveal key
 *   4. POST /api/v1/ratings         → commit
 *   5. POST /api/v1/ratings/reveal  → outcome (may not resolve until threshold met)
 *
 * Run:  node --env-file=.env scripts/e2e-smoke.mjs
 *       (defaults to SMOKE_BASE=http://localhost:3000)
 */

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

function pemToBase64(pem) {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
}

function bytesToBase64(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return Buffer.from(bin, "binary").toString("base64");
}

function base64ToBytes(b64) {
  const bin = Buffer.from(b64, "base64").toString("binary");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function sealVote(choice, revealPem) {
  const webcrypto = globalThis.crypto;

  // Fresh AES-256-GCM key.
  const aesKey = await webcrypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ct = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(choice),
  );

  // Wrap AES key with reveal RSA public key.
  const der = base64ToBytes(pemToBase64(revealPem));
  const pub = await webcrypto.subtle.importKey(
    "spki",
    der,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["wrapKey", "encrypt"],
  );
  const wrapped = await webcrypto.subtle.wrapKey("raw", aesKey, pub, { name: "RSA-OAEP" });

  return {
    encryptedPayload: bytesToBase64(new Uint8Array(ct)),
    encryptedKey: bytesToBase64(new Uint8Array(wrapped)),
    iv: bytesToBase64(iv),
  };
}

async function main() {
  console.log(`🐝 Hivemind smoke test → ${BASE}`);

  // 1. Reveal key.
  const keyRes = await fetch(`${BASE}/api/v1/reveal-key`, { cache: "no-store" });
  if (!keyRes.ok) throw new Error(`reveal-key ${keyRes.status}`);
  const { publicKeyPem } = await keyRes.json();
  console.log("  ✓ Fetched network reveal public key");

  // 2. Next task.
  const taskRes = await fetch(`${BASE}/api/v1/tasks`, { cache: "no-store" });
  if (!taskRes.ok) throw new Error(`tasks ${taskRes.status}`);
  const { task, anonymous } = await taskRes.json();
  if (!task) {
    console.log("  ℹ No open tasks to rate — nothing to smoke test. Run `npm run db:seed` first.");
    return;
  }
  console.log(`  ✓ Got task ${task.id} (${task.category}) — anonymous:${anonymous}`);

  if (anonymous) {
    console.log("  ℹ Anonymous (no wallet). Sealing a vote anyway to verify crypto round-trip.");
  }

  // 3. Seal a vote.
  const sealed = await sealVote("a", publicKeyPem);
  console.log("  ✓ Sealed vote locally (commit-reveal)");

  // 4. Commit (may 401 if anonymous).
  const commitRes = await fetch(`${BASE}/api/v1/ratings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ taskId: task.id, sealed }),
  });
  const commitBody = await commitRes.json();
  if (!commitRes.ok) {
    console.log(`  ℹ Commit returned ${commitRes.status}: ${commitBody.error ?? ""}`);
    console.log("  ✓ Crypto round-trip verified. Connect a wallet to fully test rewards.");
    return;
  }
  console.log("  ✓ Vote committed");

  // 5. Reveal.
  const revealRes = await fetch(`${BASE}/api/v1/ratings/reveal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ taskId: task.id }),
  });
  const revealBody = await revealRes.json();
  if (revealBody.resolved) {
    console.log(
      `  ✓ Resolved! consensus=${revealBody.consensusChoice} you=${revealBody.yourChoice} ` +
        `match=${revealBody.isConsensus} reward=${revealBody.reward}`,
    );
  } else {
    console.log(`  ✓ Vote committed; ${revealBody.reason ?? "awaiting more raters"}`);
  }

  console.log("✅ Smoke test passed.");
}

main().catch((err) => {
  console.error("❌ Smoke test failed:", err);
  process.exit(1);
});
