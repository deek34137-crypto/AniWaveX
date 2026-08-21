import { NextResponse } from "next/server";
import { getAnikotoStream, getAnilistId } from "@/lib/providers/anikoto-wrapper";

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
  const providerLabel = provider === 'hianime' 
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

async function fetchWorkerProvider(
  externalApi: string,
  provider: string,
  anilistId: number,
  ep: number,
  audio: 'sub' | 'dub' | 'hindi',
  timeoutMs = 2500
): Promise<ExtractedStreamResult | null> {
  const workerAudio = audio === 'hindi' 
    ? (provider === 'animedunya' ? 'sub' : 'dub') 
    : audio;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `${externalApi}/watch/${provider}/${anilistId}/${workerAudio}/${provider}-${ep}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
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

async function resolveStream(
  id: string,
  ep: string,
  title: string,
  type: string | null,
  audio: 'sub' | 'dub' | 'hindi',
  anilistParam?: string | null
) {
  const parsedEp = parseInt(ep, 10);

  // 1. Resolve AniList ID once if not provided by caller (uses bounded LRU cache)
  const resolvedAnilistId = anilistParam ? Number(anilistParam) : await getAnilistId(title);

  const sources: any[] = [];
  let subtitles: any[] = [];

  // 1. Try external Cloudflare Worker API (Anivexa-API) using bounded parallel probing
  const externalApi = process.env.STREAM_API_URL || process.env.NEXT_PUBLIC_STREAM_API_URL || "https://anivexa-stream-api.deek34137.workers.dev";
  if (externalApi && !externalApi.startsWith('/') && resolvedAnilistId) {
    try {
      if (audio === 'hindi') {
        // Probe all 3 Hindi providers in parallel
        const hindiProviders = ['animedunya', 'anibd', 'senshi'];
        const results = await Promise.allSettled(
          hindiProviders.map(p => fetchWorkerProvider(externalApi, p, resolvedAnilistId, parsedEp, 'hindi', 2500))
        );

        for (const res of results) {
          if (res.status === 'fulfilled' && res.value && res.value.sources.length > 0) {
            sources.push(...res.value.sources);
            subtitles.push(...res.value.subtitles);
            break;
          }
        }

        // If no Hindi streams found, probe fallback English dub providers in parallel
        if (sources.length === 0) {
          const fallbackProviders = ['reanime', 'anikoto', 'animegg', 'kaa'];
          const fbResults = await Promise.allSettled(
            fallbackProviders.map(p => fetchWorkerProvider(externalApi, p, resolvedAnilistId, parsedEp, 'dub', 2500))
          );

          for (const res of fbResults) {
            if (res.status === 'fulfilled' && res.value && res.value.sources.length > 0) {
              sources.push(...res.value.sources);
              subtitles.push(...res.value.subtitles);
              break;
            }
          }
        }
      } else {
        // Probe Tier 1 high-speed providers in parallel (3 concurrent)
        const tier1Providers = ['reanime', 'hianime', 'anikoto'];
        const tier1Results = await Promise.allSettled(
          tier1Providers.map(p => fetchWorkerProvider(externalApi, p, resolvedAnilistId, parsedEp, audio, 2500))
        );

        for (const res of tier1Results) {
          if (res.status === 'fulfilled' && res.value && res.value.sources.length > 0) {
            sources.push(...res.value.sources);
            subtitles.push(...res.value.subtitles);
            break;
          }
        }

        // If Tier 1 produced no sources, probe Tier 2 providers in parallel
        if (sources.length === 0) {
          const tier2Providers = ['animegg', 'anizone', 'kaa', 'anineko', '2dhive'];
          const tier2Results = await Promise.allSettled(
            tier2Providers.map(p => fetchWorkerProvider(externalApi, p, resolvedAnilistId, parsedEp, audio, 3000))
          );

          for (const res of tier2Results) {
            if (res.status === 'fulfilled' && res.value && res.value.sources.length > 0) {
              sources.push(...res.value.sources);
              subtitles.push(...res.value.subtitles);
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn("External worker stream fetch error, falling back to local resolver:", err);
    }
  }

  // 2. Local Resolver (Anikoto Stream Resolution)
  if (sources.length === 0 && audio !== 'hindi') {
    try {
      const anikotoRes = await getAnikotoStream(title, parsedEp, audio, resolvedAnilistId);

      if (anikotoRes) {
        if (anikotoRes.subtitles) {
          subtitles = anikotoRes.subtitles;
        }

        // A. If direct HLS stream is available, proxy it
        if (anikotoRes.stream_url) {
          sources.push({
            url: `/api/proxy?url=${encodeURIComponent(anikotoRes.stream_url)}&referer=${encodeURIComponent("https://flixcloud.cc/")}`,
            quality: "HD-1 (HLS)",
            isM3U8: true,
          });
        }

        // B. Add embed servers (e.g. Server SB, Server HD-2, etc.)
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
      }
    } catch (err) {
      console.warn("Local anikoto stream resolution error:", err);
    }
  }

  if (sources.length > 0) {
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
        subtitles: subtitles
      }
    };
  }

  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const ep = searchParams.get("ep");
  const title = searchParams.get("title");
  const type = searchParams.get("type"); // e.g., 'movie', 'TV'
  const audio = (searchParams.get("audio") || 'sub') as 'sub' | 'dub' | 'hindi';
  const anilistParam = searchParams.get("anilistId");

  if (!id || !ep || !title) {
    return NextResponse.json({ error: "Missing required parameters (id, ep, title)" }, { status: 400 });
  }

  // Build normalized cache key using all resolution-affecting parameters
  const cacheKey = `${id}:${ep}:${title.toLowerCase().trim()}:${audio}:${type || ''}:${anilistParam || ''}`;

  // Check LRU Cache
  const cached = streamCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  // Check In-Flight Requests (Deduplication)
  let requestPromise = inFlightRequests.get(cacheKey);

  if (!requestPromise) {
    requestPromise = resolveStream(id, ep, title, type, audio, anilistParam);
    inFlightRequests.set(cacheKey, requestPromise);
  }

  try {
    const result = await requestPromise;

    if (!result) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    }

    // Cache successful stream resolution for 3 minutes
    streamCache.set(cacheKey, result, STREAM_CACHE_TTL_MS);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Stream fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch stream" }, { status: 500 });
  } finally {
    // ALWAYS remove the in-flight promise to prevent poisoning subsequent requests
    inFlightRequests.delete(cacheKey);
  }
}
