#!/usr/bin/env node
/**
 * Hivemind — generate a persistent network reveal keypair for production.
 *
 * The browser seals votes to the reveal PUBLIC key; the server unseals them
 * during consensus. In serverless production (Vercel), a key that regenerates on
 * every cold start would orphan in-flight sealed votes — so you must provide a
 * STABLE keypair via env vars. This script prints the two values to set.
 *
 *   npm run genkeys
 *
 * Then copy the two printed lines into your hosting provider's env vars:
 *   HIVE_REVEAL_PUB_PEM   = the public PEM   (safe to expose)
 *   HIVE_REVEAL_KEY_B64   = the private key (KEEP SECRET)
 */

import { webcrypto } from "node:crypto";

async function main() {
  const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["decrypt", "unwrapKey", "encrypt", "wrapKey"],
  );

  const spki = await webcrypto.subtle.exportKey("spki", publicKey);
  const pkcs8 = await webcrypto.subtle.exportKey("pkcs8", privateKey);

  const pubB64 = Buffer.from(new Uint8Array(spki)).toString("base64");
  const pubPem =
    "-----BEGIN PUBLIC KEY-----\n" +
    (pubB64.match(/.{1,64}/g) ?? []).join("\n") +
    "\n-----END PUBLIC KEY-----";

  const privB64 = Buffer.from(new Uint8Array(pkcs8)).toString("base64");

  console.log("🔐 Hivemind — persistent reveal keypair generated.\n");
  console.log("Add these TWO env vars to your hosting dashboard (Vercel → Settings → Environment Variables):\n");
  console.log("HIVE_REVEAL_PUB_PEM=");
  console.log(pubPem);
  console.log("");
  console.log("HIVE_REVEAL_KEY_B64=" + privB64);
  console.log("\n✅ The public key is safe to expose. NEVER commit or share the private key.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
