/**
 * Hivemind — typed client-side fetch wrapper.
 *
 * Automatically attaches the caller's wallet address (from the cookie set by
 * WalletButton) so server routes can resolve identity + quota.
 */

export interface ApiError {
  error: string;
  code?: string;
  quota?: { used: number; limit: number; remaining: number };
}

function walletFromCookie(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)hive_wallet=([^;]+)/);
  return match?.[1];
}

export async function api<T = unknown>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const wallet = walletFromCookie();
  const headers = new Headers(init?.headers);
  if (init?.json !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (wallet) headers.set("x-wallet-address", wallet);

  const res = await fetch(path, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as ApiError)?.error ?? `Request failed: ${res.status}`) as Error & ApiError;
    err.code = (data as ApiError)?.code;
    err.quota = (data as ApiError)?.quota;
    throw err;
  }
  return data as T;
}
