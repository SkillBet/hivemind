import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes intelligently (dedupes conflicting utilities).
 * Used by every UI component.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ---------------------------------------------------------------------------
// Base64 helpers that work in both browser and Node (no Buffer in browser)
// ---------------------------------------------------------------------------

/** Bytes → base64 string. */
export function bytesToBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.byteLength; i++) {
    binary += String.fromCharCode(view[i]!);
  }
  return btoa(binary);
}

/** Base64 string → ArrayBuffer-backed Uint8Array (WebCrypto-compatible). */
export function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ---------------------------------------------------------------------------
// Hashing / formatting
// ---------------------------------------------------------------------------

/** SHA-256 hex digest of a string. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Shorten a hash/address for display, e.g. 0x1234…abcd. */
export function shortHash(hash: string, head = 6, tail = 4): string {
  if (!hash) return "";
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/** Format an ISO timestamp as a relative "x seconds ago" string. */
export function timeAgo(iso: string | number | Date): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

/** Format a number with thousands separators. */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Format a USD price. */
export function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

/** Format a Date as YYYY-MM-DD (for audit-trail grouping). */
export function dayKey(d: Date | string | number = new Date()): string {
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

/** Promise-based delay. */
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Stable, collision-resistant id without external deps. */
export function uid(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}${rand}`;
}

/**
 * Simple in-memory rate limiter (token bucket per key).
 * Sufficient for a single-instance MVP; swap for Upstash/Redis for scale.
 */
export function rateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): { ok: boolean; remaining: number; resetMs: number } {
  const buckets = (globalThis as unknown as { __rateBuckets?: Map<string, { count: number; resetAt: number }> });
  if (!buckets.__rateBuckets) {
    (globalThis as unknown as { __rateBuckets: Map<string, { count: number; resetAt: number }> }).__rateBuckets = new Map();
  }
  const store = (globalThis as unknown as { __rateBuckets: Map<string, { count: number; resetAt: number }> }).__rateBuckets;
  const now = Date.now();
  const bucket = store.get(opts.key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, resetMs: opts.windowMs };
  }
  if (bucket.count >= opts.limit) {
    return { ok: false, remaining: 0, resetMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, remaining: opts.limit - bucket.count, resetMs: bucket.resetAt - now };
}
