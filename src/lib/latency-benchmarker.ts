/**
 * Smart Stream Quality & Server Latency Benchmarker
 * Performs lightweight async probes to measure real-time Round-Trip-Time (RTT) to media stream servers.
 */

export interface ServerPingResult {
  url: string;
  latencyMs: number;
  status: "fast" | "medium" | "slow" | "offline";
}

// Client-side in-memory latency cache (5-minute TTL)
const clientLatencyCache = new Map<string, { latency: number; expiresAt: number }>();
const LATENCY_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Measure latency to a specific stream server endpoint
 */
export async function measureServerLatency(url: string, timeoutMs = 2000): Promise<number> {
  if (!url) return 9999;

  // Check cache first
  const cached = clientLatencyCache.get(url);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.latency;
  }

  const start = performance.now();
  try {
    const probeUrl = url.startsWith("http") && !url.includes("/api/proxy") && !url.includes("proxy?")
      ? `/api/proxy?url=${encodeURIComponent(url)}`
      : url;
    
    await fetch(probeUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    const duration = Math.round(performance.now() - start);
    clientLatencyCache.set(url, { latency: duration, expiresAt: Date.now() + LATENCY_CACHE_TTL_MS });
    return duration;
  } catch {
    // If HEAD failed, default to offline without triggering full GET fallbacks to save invocations
    clientLatencyCache.set(url, { latency: 9999, expiresAt: Date.now() + 60000 });
    return 9999;
  }
}

/**
 * Concurrently benchmark an array of stream sources (capped to top 3 HLS streams to save bandwidth)
 */
export async function benchmarkStreamSources(
  sources: { url: string; quality?: string; isM3U8?: boolean }[]
): Promise<Record<string, number>> {
  if (!sources || sources.length === 0) return {};

  const results: Record<string, number> = {};
  // Only probe top 3 HLS candidates (skip embeds to save network calls)
  const probeCandidates = sources.filter(s => s.isM3U8 !== false).slice(0, 3);
  
  await Promise.all(
    probeCandidates.map(async (source) => {
      if (source.url) {
        const ping = await measureServerLatency(source.url, 1800);
        results[source.url] = ping;
      }
    })
  );

  return results;
}

/**
 * Find index of the lowest latency stream server
 */
export function getFastestServerIndex(
  sources: { url: string; quality?: string }[],
  latencies: Record<string, number>
): number {
  if (!sources || sources.length === 0) return 0;

  let bestIdx = 0;
  let minLatency = Infinity;

  sources.forEach((s, idx) => {
    const lat = latencies[s.url];
    if (typeof lat === "number" && lat > 0 && lat < minLatency) {
      minLatency = lat;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

/**
 * Format latency for UI badges
 */
export function formatLatencyBadge(latencyMs?: number): { text: string; colorClass: string } {
  if (typeof latencyMs !== "number" || latencyMs >= 9000 || latencyMs <= 0) {
    return { text: "Online", colorClass: "text-slate-400" };
  }
  if (latencyMs < 120) {
    return { text: `${latencyMs}ms ⚡`, colorClass: "text-emerald-400 font-bold" };
  }
  if (latencyMs < 350) {
    return { text: `${latencyMs}ms`, colorClass: "text-blue-400 font-medium" };
  }
  return { text: `${latencyMs}ms`, colorClass: "text-amber-400" };
}