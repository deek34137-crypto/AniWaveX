/**
 * Multi-Worker Proxy Pool for AniWaveX Streaming
 * Distributes requests evenly across multiple Cloudflare Worker instances
 * to achieve 200K - 300K+ daily request capacity.
 */

export const DEFAULT_PROXY_WORKERS: string[] = [
  "https://anidb-proxy.deek34137.workers.dev",
  "https://anidb-proxy.rajverma159310.workers.dev",
];

let roundRobinIndex = 0;
const workerFailureMap = new Map<string, number>();
const FAILURE_PENALTY_MS = 60 * 1000;

export function getActiveWorkerPool(): string[] {
  const envPool = process.env.NEXT_PUBLIC_PROXY_URLS;
  let pool = DEFAULT_PROXY_WORKERS;

  if (envPool) {
    const parsed = envPool.split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);
    if (parsed.length > 0) pool = parsed;
  } else if (process.env.NEXT_PUBLIC_PROXY_URL) {
    const single = process.env.NEXT_PUBLIC_PROXY_URL.replace(/\/+$/, "");
    if (!pool.includes(single)) {
      pool = [single, ...pool];
    }
  }

  const now = Date.now();
  const healthy = pool.filter((w) => {
    const failedAt = workerFailureMap.get(w);
    return !failedAt || now - failedAt > FAILURE_PENALTY_MS;
  });

  return healthy.length > 0 ? healthy : pool;
}

export function getNextProxyWorker(): string {
  const pool = getActiveWorkerPool();
  if (pool.length === 0) return "/api/proxy";
  const worker = pool[roundRobinIndex % pool.length];
  roundRobinIndex = (roundRobinIndex + 1) % pool.length;
  return worker;
}

export function getRandomProxyWorker(): string {
  const pool = getActiveWorkerPool();
  if (pool.length === 0) return "/api/proxy";
  return pool[Math.floor(Math.random() * pool.length)];
}

export function reportWorkerFailure(workerUrl: string): void {
  try {
    const origin = new URL(workerUrl).origin;
    workerFailureMap.set(origin, Date.now());
    console.warn("[Proxy Pool] Worker penalized for 60s: " + origin);
  } catch {}
}
