/**
 * Hivemind — Server-side reveal engine.
 *
 * Holds the network's reveal RSA keypair. Raters seal their votes to the
 * reveal PUBLIC key (browser-side); this module recovers the plaintext choice
 * with the reveal PRIVATE key once a batch closes — the "reveal" step of
 * commit-reveal.
 *
 * Key provisioning (zero-setup dev mode):
 *   - If HIVE_REVEAL_KEY_B64 (PKCS#8 private, base64) + HIVE_REVEAL_PUB_PEM are
 *     set, those are used (production).
 *   - Otherwise a 2048-bit RSA keypair is generated once at boot and cached on
 *     the global object. This is NOT cryptographically secret across restarts —
 *     it exists only so the demo loop works end-to-end with no configuration.
 *
 * The reveal key NEVER protects stored data long-term; it only enforces that
 * votes are committed before any of them are readable.
 */

import { COMMIT_REVEAL } from "./constants";
import { base64ToBytes, bytesToBase64 } from "./utils";
import type { SealedVote } from "./commit-reveal";

interface CachedKeypair {
  privateKey: CryptoKey;
  publicKeyPem: string;
}

const globalCache = globalThis as unknown as { __hiveRevealKey?: CachedKeypair };

function importPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "pkcs8",
    base64ToBytes(pkcs8Base64),
    { name: "RSA-OAEP", hash: COMMIT_REVEAL.rsaHash },
    true,
    ["unwrapKey", "decrypt"],
  );
}

async function generateKeypair(): Promise<CachedKeypair> {
  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: COMMIT_REVEAL.rsaBits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: COMMIT_REVEAL.rsaHash,
    },
    true,
    ["decrypt", "unwrapKey", "encrypt", "wrapKey"],
  );
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  const pemLines = (bytesToBase64(spki).match(/.{1,64}/g) ?? []).join("\n");
  return {
    privateKey,
    publicKeyPem: `-----BEGIN PUBLIC KEY-----\n${pemLines}\n-----END PUBLIC KEY-----`,
  };
}

/**
 * Get (or lazily provision) the network reveal keypair. The public PEM is
 * published to browsers so they can seal votes; the private key never leaves
 * this module.
 */
export async function getRevealKeypair(): Promise<CachedKeypair> {
  if (globalCache.__hiveRevealKey) return globalCache.__hiveRevealKey;

  const envPriv = process.env.HIVE_REVEAL_KEY_B64;
  const envPub = process.env.HIVE_REVEAL_PUB_PEM;
  let kp: CachedKeypair;
  if (envPriv && envPub) {
    kp = { privateKey: await importPrivateKey(envPriv), publicKeyPem: envPub };
  } else {
    kp = await generateKeypair();
  }
  globalCache.__hiveRevealKey = kp;
  return kp;
}

/** Public reveal key for browsers to seal against. */
export async function getRevealPublicKeyPem(): Promise<string> {
  return (await getRevealKeypair()).publicKeyPem;
}

/**
 * Recover the plaintext choice ("a" | "b") from a sealed vote. Called only
 * during the reveal step, after a batch has closed.
 */
export async function unsealVote(sealed: SealedVote): Promise<"a" | "b"> {
  const { privateKey } = await getRevealKeypair();

  // 1. Unwrap the AES key with the reveal RSA private key.
  const aesKey = await crypto.subtle.unwrapKey(
    "raw",
    base64ToBytes(sealed.encryptedKey),
    privateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM" },
    true,
    ["decrypt"],
  );

  // 2. Decrypt the choice.
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(sealed.iv) },
    aesKey,
    base64ToBytes(sealed.encryptedPayload),
  );

  const choice = new TextDecoder().decode(plaintext);
  if (choice !== "a" && choice !== "b") {
    throw new Error(`Invalid revealed choice: ${choice}`);
  }
  return choice;
}
