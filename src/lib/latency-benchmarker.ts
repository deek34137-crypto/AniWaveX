/**
 * Smart Stream Quality & Server Latency Benchmarker
 * Performs lightweight async probes to measure real-time Round-Trip-Time (RTT) to media stream servers.
 */

export interface ServerPingResult {
  url: string;
  latencyMs: number;
  status: "fast" | "medium" | "slow" | "offline";
}

/**
 * Measure latency to a specific stream server endpoint
 */
export async function measureServerLatency(url: string, timeoutMs = 2500): Promise<number> {
  if (!url) return 9999;

  const start = performance.now();
  try {
    // Probe through the internal proxy or direct URL using lightweight HEAD/range probe
    const probeUrl = url.startsWith("http") ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
    
    await fetch(probeUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });

    const duration = Math.round(performance.now() - start);
    return duration;
  } catch {
    // If HEAD failed or timed out, attempt lightweight GET with tiny abort
    try {
      const startFallback = performance.now();
      const probeUrl = url.startsWith("http") ? `/api/proxy?url=${encodeURIComponent(url)}` : url;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      await fetch(probeUrl, {
        method: "GET",
        signal: controller.signal,
        headers: { Range: "bytes=0-100" },
        cache: "no-store",
      }).catch(() => {});

      clearTimeout(timeoutId);
      const duration = Math.round(performance.now() - startFallback);
      return duration > 0 && duration < 2500 ? duration : 9999;
    } catch {
      return 9999;
    }
  }
}

/**
 * Concurrently benchmark an array of stream sources
 */
export async function benchmarkStreamSources(
  sources: { url: string; quality?: string }[]
): Promise<Record<string, number>> {
  if (!sources || sources.length === 0) return {};

  const results: Record<string, number> = {};
  
  await Promise.all(
    sources.map(async (source) => {
      if (source.url) {
        const ping = await measureServerLatency(source.url, 2000);
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