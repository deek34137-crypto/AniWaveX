import { NextResponse } from "next/server";
import { multiProvider } from "@/lib/providers/reanime";
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

async function resolveStream(
  id: string,
  ep: string,
  title: string,
  type: string | null,
  audio: 'sub' | 'dub',
  anilistParam?: string | null
) {
  const parsedEp = parseInt(ep, 10);

  // 1. Resolve AniList ID once if not provided by caller
  const resolvedAnilistId = anilistParam ? Number(anilistParam) : await getAnilistId(title);

  const sources: any[] = [];

  // 2. Try AnikotoProvider with resolved AniList ID
  const anikotoRes = await getAnikotoStream(title, parsedEp, audio, resolvedAnilistId);
  if (anikotoRes && anikotoRes.streams) {
    const embedSources = anikotoRes.streams
      .filter((s: any) => s.type === "embed" && s.url && !s.url.includes("animeapps.top"))
      .map((s: any) => ({
        url: s.url,
        quality: s.server || "Server 1",
        isM3U8: false
      }));

    sources.push(...embedSources);
  }

  // 3. Always append FilmU embed server as backup/guaranteed source
  const fallbackStream = await multiProvider.getStreamInfo(id, parsedEp, title, resolvedAnilistId);
  if (fallbackStream) {
    const fallbackSources = (audio === 'dub' ? fallbackStream.dub : fallbackStream.sub) || fallbackStream.sources || [];
    for (const src of fallbackSources) {
      if (src.url && !sources.some(s => s.url === src.url)) {
        sources.push({
          url: src.url,
          quality: src.quality || "Server Backup",
          isM3U8: false
        });
      }
    }
  }

  if (sources.length > 0) {
    return {
      sources: sources,
      sub: audio === 'sub' ? sources : [],
      dub: audio === 'dub' ? sources : [],
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
  const audio = (searchParams.get("audio") || 'sub') as 'sub' | 'dub';
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
