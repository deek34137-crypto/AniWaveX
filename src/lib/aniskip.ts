/**
 * AniSkip Integration Service
 * Fetches accurate timestamps for Opening (OP), Ending (ED), and Recap sequences
 * powered by the public AniSkip API (https://api.aniskip.com).
 */

import { BoundedLRU } from "@/lib/lru-cache";

export interface SkipInterval {
  type: "op" | "ed" | "recap";
  label: string;
  startTime: number;
  endTime: number;
}

// Bounded LRU cache to prevent unbounded memory growth
const skipCache = new BoundedLRU<SkipInterval[]>(1000);
const CACHE_TTL_SUCCESS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_TTL_EMPTY = 60 * 60 * 1000; // 1 hour for not found

/**
 * Resolves MyAnimeList (MAL) ID from AniList ID or Kitsu ID via AniZip
 */
async function resolveMalId(anilistId?: number | null, kitsuId?: string | number | null): Promise<number | null> {
  if (anilistId) {
    try {
      const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${encodeURIComponent(anilistId)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.mappings?.mal_id) {
          return Number(json.mappings.mal_id);
        }
      }
    } catch {}

    try {
      const armRes = await fetch(`https://arm.haglund.dev/api/v2/ids?source=anilist&id=${encodeURIComponent(anilistId)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (armRes.ok) {
        const armJson = await armRes.json();
        if (armJson?.myanimelist) {
          return Number(armJson.myanimelist);
        }
      }
    } catch {}
  }

  if (kitsuId) {
    try {
      const res = await fetch(`https://api.ani.zip/mappings?kitsu_id=${encodeURIComponent(kitsuId)}`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.mappings?.mal_id) {
          return Number(json.mappings.mal_id);
        }
      }
    } catch {}
  }

  return null;
}

/**
 * Fetch skip intervals for a specific episode
 */
export async function getEpisodeSkipTimes(options: {
  malId?: number | null;
  anilistId?: number | null;
  kitsuId?: string | number | null;
  episodeNumber: number;
  duration?: number;
}): Promise<SkipInterval[]> {
  const { episodeNumber, duration = 0 } = options;
  if (!episodeNumber || episodeNumber <= 0) return [];

  // 1. Resolve MAL ID
  let targetMalId = options.malId;
  if (!targetMalId) {
    targetMalId = await resolveMalId(options.anilistId, options.kitsuId);
  }

  if (!targetMalId) {
    return [];
  }

  // 2. Check Cache
  const cacheKey = `${targetMalId}_${episodeNumber}`;
  const cached = skipCache.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const url = `https://api.aniskip.com/v2/skip-times/${targetMalId}/${episodeNumber}?types=op&types=ed&types=recap&types=mixed-op&types=mixed-ed&episodeLength=${Math.round(duration)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      skipCache.set(cacheKey, [], CACHE_TTL_EMPTY);
      return [];
    }

    const data = await res.json();
    if (!data.found || !Array.isArray(data.results)) {
      skipCache.set(cacheKey, [], CACHE_TTL_EMPTY);
      return [];
    }

    const intervals: SkipInterval[] = data.results.map((item: any) => {
      const rawType = item.skipType || "op";
      let type: "op" | "ed" | "recap" = "op";
      let label = "Skip Opening";

      if (rawType.includes("ed")) {
        type = "ed";
        label = "Skip Ending";
      } else if (rawType.includes("recap")) {
        type = "recap";
        label = "Skip Recap";
      }

      return {
        type,
        label,
        startTime: item.interval?.startTime || 0,
        endTime: item.interval?.endTime || 0,
      };
    }).filter((item: SkipInterval) => item.endTime > item.startTime);

    skipCache.set(cacheKey, intervals, CACHE_TTL_SUCCESS);
    return intervals;
  } catch (err) {
    console.warn("[AniSkip] Error fetching skip times:", err);
    return [];
  }
}
