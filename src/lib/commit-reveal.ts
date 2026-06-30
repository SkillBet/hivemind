/**
 * Hivemind — Browser-side commit-reveal cryptography.
 *
 * The anti-collusion moat. A rater's choice (A vs B) is sealed in the browser
 * with the network's reveal public key BEFORE it is submitted, so:
 *   - The server cannot peek at partial results to bias consensus.
 *   - Early raters cannot see how others voted before committing.
 *
 * Hybrid encryption (same primitives as before, repurposed):
 *   1. A fresh AES-256-GCM key encrypts the rater's choice.
 *   2. That AES key is wrapped (RSA-OAEP) with the network reveal public key,
 *      so only the reveal step (run once a batch closes) can recover it.
 *
 * All primitives use the Web Crypto API (no third-party crypto). The browser
 * keypair's private key is non-extractable and lives only in IndexedDB.
 */

import { COMMIT_REVEAL } from "./constants";
import { base64ToBytes, bytesToBase64 } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A sealed vote — what the server stores until reveal. */
export interface SealedVote {
  /** AES-256-GCM ciphertext of the rater's choice, base64. */
  encryptedPayload: string;
  /** AES key wrapped with the network reveal RSA public key, base64. */
  encryptedKey: string;
  /** AES-GCM initialization vector, base64. */
  iv: string;
}

// ---------------------------------------------------------------------------
// Base64 / PEM utilities
// ---------------------------------------------------------------------------

/** Strip PEM headers/footers and whitespace, returning raw base64. */
function pemToBase64(pem: string): string {
  return pem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s+/g, "");
}

/** SPKI base64 → PEM (for exporting the user public key). */
export function spkiToPem(spki: ArrayBuffer): string {
  const b64 = bytesToBase64(spki);
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

// ---------------------------------------------------------------------------
// Key handling
// ---------------------------------------------------------------------------

/** Import an RSA public key from a PEM string. */
export async function importRsaPublicKey(
  pem: string,
  usage: KeyUsage[] = ["wrapKey", "encrypt"],
): Promise<CryptoKey> {
  const b64 = pemToBase64(pem);
  const der = base64ToBytes(b64);
  return crypto.subtle.importKey(
    "spki",
    der,
    { name: "RSA-OAEP", hash: COMMIT_REVEAL.rsaHash },
    true,
    usage,
  );
}

/** Generate the rater's browser-side RSA-OAEP keypair. Private key is non-extractable. */
export async function generateUserKeyPair(): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyPem: string;
}> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: COMMIT_REVEAL.rsaBits,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: COMMIT_REVEAL.rsaHash,
    },
    true,
    ["encrypt", "wrapKey", "decrypt", "unwrapKey"],
  );

  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return { publicKey, privateKey, publicKeyPem: spkiToPem(spki) };
}

// ---------------------------------------------------------------------------
// Sealing a vote (encrypt for the network reveal key) — the core of the moat
// ---------------------------------------------------------------------------

/**
 * Hybrid-encrypt `choice` ("a" | "b") so only the holder of the network reveal
 * key can decrypt it. Returns a SealedVote the server stores until reveal.
 */
export async function sealVote(
  choice: "a" | "b",
  revealPublicKeyPem: string,
): Promise<SealedVote> {
  // 1. Fresh AES-256-GCM key for this vote.
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: COMMIT_REVEAL.aesBits },
    true,
    ["encrypt", "decrypt"],
  );

  // 2. Encrypt the choice under the AES key.
  const iv = crypto.getRandomValues(new Uint8Array(COMMIT_REVEAL.ivBytes));
  const encoded = new TextEncoder().encode(choice);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, encoded);

  // 3. Wrap the AES key with the network reveal RSA public key.
  const revealKey = await importRsaPublicKey(revealPublicKeyPem);
  const wrappedKey = await crypto.subtle.wrapKey("raw", aesKey, revealKey, { name: "RSA-OAEP" });

  return {
    encryptedPayload: bytesToBase64(ciphertext),
    encryptedKey: bytesToBase64(wrappedKey),
    iv: bytesToBase64(iv),
  };
}

// ---------------------------------------------------------------------------
// Browser keypair persistence (IndexedDB) — private key never leaves device
// ---------------------------------------------------------------------------

interface StoredKeyPair {
  publicKeyPem: string;
  /** Non-extractable private key handle (CryptoKey is structured-cloneable). */
  privateKey: CryptoKey;
  createdAt: number;
}

function openKeyStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("hivemind-keystore", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("keypair")) {
        db.createObjectStore("keypair");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Load (or generate) the rater's local keypair. Private key stays non-extractable. */
export async function getOrCreateUserKeyPair(): Promise<{
  publicKeyPem: string;
  privateKey: CryptoKey;
  createdAt: number;
  isNew: boolean;
}> {
  const db = await openKeyStore();
  const existing = await new Promise<StoredKeyPair | undefined>((resolve) => {
    const tx = db.transaction("keypair", "readonly");
    const req = tx.objectStore("keypair").get("user");
    req.onsuccess = () => resolve(req.result as StoredKeyPair | undefined);
    req.onerror = () => resolve(undefined);
  });
  if (existing) {
    db.close();
    return { ...existing, isNew: false };
  }

  const { publicKeyPem, privateKey } = await generateUserKeyPair();
  const record: StoredKeyPair = { publicKeyPem, privateKey, createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("keypair", "readwrite");
    tx.objectStore("keypair").put(record, "user");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return { ...record, isNew: true };
}
