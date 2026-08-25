import { NextResponse } from "next/server";
import { getAnikotoStream, getAnilistId } from "@/lib/providers/anikoto-wrapper";
import { unstable_cache } from "next/cache";

interface CacheEntry {
  data: any;
  expiresAt: number;
}

class BoundedLRU {
  private max: number;
  private cache: Map<string, CacheEntry>;

  constructor(max = 200) {
    this.max = max;
    this.cache = new Map();
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order (most recently used at end)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: any, ttlMs: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
      // Evict oldest entry (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }
}

// Bounded LRU cache: 200 items, 3-minute TTL (conservative for signed stream URLs)
const streamCache = new BoundedLRU(200);
const STREAM_CACHE_TTL_MS = 3 * 60 * 1000;

// In-flight request deduplication Map
const inFlightRequests = new Map<string, Promise<any>>();

interface ExtractedStreamResult {
  sources: any[];
  subtitles: any[];
}

function getRefererForStream(url: string, streamObj?: any, data?: any): string {
  if (streamObj?.referer) return streamObj.referer;
  if (streamObj?.headers?.Referer) return streamObj.headers.Referer;
  if (data?.referer) return data.referer;
  if (data?.headers?.Referer) return data.headers.Referer;

  const lower = url.toLowerCase();
  if (lower.includes("watching.onl") || lower.includes("megaplay.buzz")) {
    return "https://megaplay.buzz/";
  }
  if (lower.includes("krussdomi")) {
    return "https://krussdomi.com/";
  }
  if (lower.includes("vidtube.site") || lower.includes("akirax.buzz") || lower.includes("shiora.top") || lower.includes("mikora.top")) {
    return "https://vidtube.site/";
  }
  if (lower.includes("bibiemb.xyz") || lower.includes("vibevibe.workers.dev")) {
    return "https://bibiemb.xyz/";
  }
  if (lower.includes("vivibebe.site")) {
    return "https://vivibebe.site/";
  }
  if (lower.includes("animeapps.top")) {
    return "https://playeng.animeapps.top/";
  }
  if (lower.includes("anime-dunya.com")) {
    return "https://anime-dunya.com/";
  }
  if (lower.includes("megacloud.tv") || lower.includes("atomic4cdn.top")) {
    return "https://megacloud.tv/";
  }
  if (lower.includes("rabbitstream.net")) {
    return "https://rabbitstream.net/";
  }
  if (lower.includes("dokicloud.one")) {
    return "https://dokicloud.one/";
  }
  if (lower.includes("mcloud.to")) {
    return "https://mcloud.to/";
  }
  if (lower.includes("vidcloud.co") || lower.includes("vidcloud.fun")) {
    return "https://vidcloud.co/";
  }
  if (lower.includes("vidstream.pro")) {
    return "https://vidstream.pro/";
  }
  return "https://flixcloud.cc/";
}

function extractWorkerSources(
  data: any,
  provider: string,
  audio: 'sub' | 'dub' | 'hindi'
): ExtractedStreamResult {
  const sources: any[] = [];
  const subtitles: any[] = [];

  if (!data) return { sources, subtitles };

  const langTag = audio === 'hindi' ? 'Hindi Dub' : (audio === 'dub' ? 'Eng Dub' : 'Sub');
  const providerLabel = provider === 'justanime'
    ? 'JustAnime'
    : provider === 'hianime'
    ? 'HiAnime' 
    : provider === 'anikoto' 
    ? 'MegaCloud' 
    : provider === 'kaa' 
    ? 'KickAssAnime' 
    : provider.toUpperCase();

  // 1. Process all streams from data.streams array
  if (Array.isArray(data.streams)) {
    for (const s of data.streams) {
      if (!s.url) continue;

      if (s.type === 'hls' || s.url.includes('.m3u8')) {
        const ref = getRefererForStream(s.url, s, data);
        const serverName = s.server ? `${providerLabel} (${s.server})` : providerLabel;
        sources.push({
          url: `/api/proxy?url=${encodeURIComponent(s.url)}&referer=${encodeURIComponent(ref)}`,
          quality: `${serverName} [${langTag}]`,
          isM3U8: true,
        });

        // Collect subtitles attached to this stream
        if (Array.isArray(s.subtitles)) {
          for (const sub of s.subtitles) {
            if (sub && sub.url && !subtitles.some(existing => existing.url === sub.url)) {
              subtitles.push(sub);
            }
          }
        }
      } else if (s.type === 'embed' && !s.url.includes('animeapps.top')) {
        const serverName = s.server ? `${providerLabel} (${s.server})` : `${providerLabel} Embed`;
        sources.push({
          url: s.url,
          quality: `${serverName} [${langTag}]`,
          isM3U8: false,
        });
      }
    }
  }

  // 2. Direct HLS stream if not already added
  const directHls = data.stream_url;
  if (directHls && typeof directHls === 'string') {
    const ref = getRefererForStream(directHls, null, data);
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(directHls)}&referer=${encodeURIComponent(ref)}`;
    if (!sources.some(s => s.url === proxyUrl)) {
      sources.unshift({
        url: proxyUrl,
        quality: `${providerLabel} [${langTag}]`,
        isM3U8: true,
      });
    }
  }

  // Ensure HLS native streams are prioritized first before embed iframe fallbacks
  sources.sort((a, b) => {
    if (a.isM3U8 && !b.isM3U8) return -1;
    if (!a.isM3U8 && b.isM3U8) return 1;
    return 0;
  });

  // 3. Top-level subtitles
  if (Array.isArray(data.subtitles)) {
    for (const sub of data.subtitles) {
      if (sub && sub.url && !subtitles.some(existing => existing.url === sub.url)) {
        subtitles.push(sub);
      }
    }
  }

  // Proxy all external remote subtitles through /api/proxy to guarantee CORS and Referer compliance
  const safeSubtitles = subtitles.map(sub => {
    if (sub.url && typeof sub.url === 'string' && sub.url.startsWith('http') && !sub.url.startsWith('/api/proxy')) {
      const ref = getRefererForStream(sub.url, null, data);
      return {
        ...sub,
        url: `/api/proxy?url=${encodeURIComponent(sub.url)}&referer=${encodeURIComponent(ref)}`
      };
    }
    return sub;
  });

  return { sources, subtitles: safeSubtitles };
}

/**
 * Validates whether a resolved stream candidate is truly playable and non-empty.
 */
function isPlayableStream(result: any): boolean {
  if (!result || !Array.isArray(result.sources) || result.sources.length === 0) {
    return false;
  }
  return result.sources.some((s: any) => {
    if (!s || !s.url || typeof s.url !== 'string') return false;
    if (s.isM3U8) {
      return s.url.includes('/api/proxy') || s.url.includes('.m3u8');
    }
    return s.url.startsWith('http://') || s.url.startsWith('https://');
  });
}

function formatStreamResponse(sources: any[], subtitles: any[], audio: 'sub' | 'dub' | 'hindi') {
  const sortedSources = [...sources].sort((a, b) => {
    if (a.isM3U8 && !b.isM3U8) return -1;
    if (!a.isM3U8 && b.isM3U8) return 1;
    return 0;
  });

  return {
    sources: sortedSources,
    sub: audio === 'sub' ? sortedSources : [],
    dub: audio === 'dub' ? sortedSources : [],
    hindi: audio === 'hindi' ? sortedSources : [],
    audio: audio,
    nativeStream: {
      subtitles: subtitles || []
    }
  };
}

async function fetchWorkerProvider(
  externalApi: string,
  provider: string,
  anilistId: number,
  ep: number,
  audio: 'sub' | 'dub' | 'hindi',
  signal?: AbortSignal,
  timeoutMs = 2500
): Promise<ExtractedStreamResult | null> {
  const workerAudio = audio === 'hindi' ? 'dub' : audio;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const combinedSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;

  try {
    const res = await fetch(
      `${externalApi}/watch/${provider}/${anilistId}/${workerAudio}/${provider}-${ep}`,
      {
        headers: { Accept: 'application/json' },
        signal: combinedSignal,
        next: { revalidate: 180 }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const extracted = extractWorkerSources(data, provider, audio);
    return extracted.sources.length > 0 ? extracted : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Speculative parallel stream probe with non-canceling escalation timers (0ms, 600ms, 1000ms).
 * Returns the first validated, playable candidate immediately.
 */
async function speculativeProbeEngine(
  externalApi: string,
  resolvedAnilistId: number,
  parsedEp: number,
  title: string,
  audio: 'sub' | 'dub' | 'hindi'
): Promise<any | null> {
  return new Promise<any>((resolve) => {
    let isResolved = false;
    const masterController = new AbortController();

    // Global hard timeout
    const globalTimeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        masterController.abort();
        resolve(null);
      }
    }, 5500);

    const onCandidateFound = (candidate: any) => {
      if (!isResolved && isPlayableStream(candidate)) {
        isResolved = true;
        clearTimeout(globalTimeout);
        masterController.abort(); // Cancel remaining requests
        resolve(candidate);
      }
    };

    const tryProvider = async (provider: string, pAudio: 'sub' | 'dub' | 'hindi', timeoutMs = 2500) => {
      if (isResolved) return;
      try {
        const res = await fetchWorkerProvider(
          externalApi,
          provider,
          resolvedAnilistId,
          parsedEp,
          pAudio,
          masterController.signal,
          timeoutMs
        );
        if (res && res.sources.length > 0) {
          const candidate = formatStreamResponse(res.sources, res.subtitles, audio);
          onCandidateFound(candidate);
        }
      } catch {
        // Continue probing other candidates
      }
    };

    const tryLocalAnikoto = async () => {
      if (isResolved || audio === 'hindi') return;
      try {
        const anikotoRes = await getAnikotoStream(title, parsedEp, audio as 'sub' | 'dub', resolvedAnilistId);
        if (anikotoRes) {
          const sources: any[] = [];
          const subtitles = anikotoRes.subtitles || [];

          if (anikotoRes.stream_url) {
            sources.push({
              url: `/api/proxy?url=${encodeURIComponent(anikotoRes.stream_url)}&referer=${encodeURIComponent("https://flixcloud.cc/")}`,
              quality: "HD-1 (HLS)",
              isM3U8: true,
            });
          }

          if (anikotoRes.streams) {
            const embedSources = anikotoRes.streams
              .filter((s: any) => s.type === "embed" && s.url && !s.url.includes("animeapps.top") && !s.url.includes("filmu.in"))
              .map((s: any) => ({
                url: s.url,
                quality: s.server || "Server Embed",
                isM3U8: false
              }));

            sources.push(...embedSources);
          }

          if (sources.length > 0) {
            const candidate = formatStreamResponse(sources, subtitles, audio);
            onCandidateFound(candidate);
          }
        }
      } catch {
        // Continue
      }
    };

    // Non-canceling Escalation Pipeline:
    if (audio === 'hindi') {
      // t = 0ms: Primary Hindi provider
      ['anibd'].forEach(p => tryProvider(p, 'hindi', 2500));

      // t = 600ms: Concurrently launch Eng dub fallback providers
      setTimeout(() => {
        if (!isResolved) {
          ['reanime', 'justanime', 'anikoto', 'kaa'].forEach(p => tryProvider(p, 'dub', 2500));
        }
      }, 600);
    } else {
      // t = 0ms: Tier 1 high-speed providers (reanime, justanime, anikoto)
      ['reanime', 'justanime', 'anikoto'].forEach(p => tryProvider(p, audio, 2500));

      // t = 600ms: Tier 2 providers launched in parallel without canceling Tier 1
      setTimeout(() => {
        if (!isResolved) {
          ['kaa', 'animegg', 'anineko', 'anibd', 'animenosub'].forEach(p => tryProvider(p, audio, 2500));
        }
      }, 600);

      // t = 1000ms: Local Anikoto resolver launched in parallel
      setTimeout(() => {
        if (!isResolved) {
          tryLocalAnikoto();
        }
      }, 1000);
    }
  });
}

async function resolveStreamRaw(
  id: string,
  ep: string,
  title: string,
  type: string | null,
  audio: 'sub' | 'dub' | 'hindi',
  anilistParam?: string | null
) {
  const parsedEp = parseInt(ep, 10);
  const resolvedAnilistId = anilistParam ? Number(anilistParam) : await getAnilistId(title);

  if (!resolvedAnilistId) {
    // Fallback directly to local Anikoto if AniList ID is completely missing
    if (audio !== 'hindi') {
      try {
        const anikotoRes = await getAnikotoStream(title, parsedEp, audio as 'sub' | 'dub');
        if (anikotoRes && anikotoRes.stream_url) {
          const sources = [{
            url: `/api/proxy?url=${encodeURIComponent(anikotoRes.stream_url)}&referer=${encodeURIComponent("https://flixcloud.cc/")}`,
            quality: "HD-1 (HLS)",
            isM3U8: true,
          }];
          return formatStreamResponse(sources, anikotoRes.subtitles || [], audio);
        }
      } catch {}
    }
    return null;
  }

  const rawExternalApi = process.env.STREAM_API_URL || process.env.NEXT_PUBLIC_STREAM_API_URL || "https://anivexa-stream-api.deek34137.workers.dev";
  const externalApi = rawExternalApi ? rawExternalApi.replace(/\/+$/, '').replace(/\/stream$/, '') : "";

  const result = await speculativeProbeEngine(
    externalApi,
    resolvedAnilistId,
    parsedEp,
    title,
    audio
  );

  return isPlayableStream(result) ? result : null;
}

// Next.js persistent cache layer (3 minutes TTL across distributed serverless instances)
const resolveStreamCachedPersistent = unstable_cache(
  async (
    _cacheKey: string,
    id: string,
    ep: string,
    title: string,
    type: string | null,
    audio: 'sub' | 'dub' | 'hindi',
    anilistParam?: string | null
  ) => {
    return await resolveStreamRaw(id, ep, title, type, audio, anilistParam);
  },
  ['stream-resolution-v2'],
  {
    revalidate: 180, // 3 minutes
    tags: ['stream-resolution']
  }
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const ep = searchParams.get("ep");
  const title = searchParams.get("title");
  const type = searchParams.get("type");
  const audio = (searchParams.get("audio") || 'sub') as 'sub' | 'dub' | 'hindi';
  const anilistParam = searchParams.get("anilistId");

  if (!id || !ep || !title) {
    return NextResponse.json({ error: "Missing required parameters (id, ep, title)" }, { status: 400 });
  }

  // Build deterministic cache key with every parameter affecting stream resolution
  const cacheKey = `stream:${id}:${ep}:${title.toLowerCase().trim()}:${audio}:${type || ''}:${anilistParam || ''}`;

  // 1. Check L1 in-memory LRU Cache (Fastest same-instance hit)
  const cached = streamCache.get(cacheKey);
  if (cached && isPlayableStream(cached)) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=180, stale-while-revalidate=360",
      }
    });
  }

  // 2. Check in-flight request deduplication Map
  let requestPromise = inFlightRequests.get(cacheKey);

  if (!requestPromise) {
    requestPromise = (async () => {
      // 3. Persistent Data Cache across serverless lambdas
      const streamResult = await resolveStreamCachedPersistent(
        cacheKey,
        id,
        ep,
        title,
        type,
        audio,
        anilistParam
      );
      return streamResult;
    })();
    inFlightRequests.set(cacheKey, requestPromise);
  }

  try {
    const result = await requestPromise;

    if (!result || !isPlayableStream(result)) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // Cache valid resolution in L1 LRU Cache
    streamCache.set(cacheKey, result, STREAM_CACHE_TTL_MS);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=180, stale-while-revalidate=360",
      }
    });
  } catch (error) {
    console.error("Stream fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch stream" }, { status: 500 });
  } finally {
    // ALWAYS remove in-flight promise to prevent poisoning subsequent requests
    inFlightRequests.delete(cacheKey);
  }
}
