import { AnikotoProvider } from './anikoto/provider.js';
import { searchAnilist } from './anikoto/core/anilist.js';
import { unstable_cache } from 'next/cache';

const anikoto = new AnikotoProvider();

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class BoundedLRU<K, V> {
  private max: number;
  private cache: Map<K, CacheEntry<V>>;

  constructor(max = 500) {
    this.max = max;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh LRU order (most recently used at end)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: K, data: V, ttlMs: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.max) {
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

// Bounded LRU cache: 500 entries
// 24h TTL for successful hits, 1h TTL for null hits (prevent flooding)
const anilistIdCache = new BoundedLRU<string, number | null>(500);
const CACHE_TTL_SUCCESS_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MISS_MS = 60 * 60 * 1000;

// In-flight request deduplication map
const inFlightSearches = new Map<string, Promise<number | null>>();

function normalizeTitle(str: string | null | undefined): string {
  return (str || "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

function pickBestMatch(searchTitle: string, results: any[]): number | null {
  if (!results || results.length === 0) return null;
  const targetNorm = normalizeTitle(searchTitle);
  if (!targetNorm) return results[0]?.id ?? null;

  // 1. Exact match on romaji, english, or native title
  for (const m of results) {
    if (!m || !m.id) continue;
    const romajiNorm = normalizeTitle(m.title?.romaji);
    const englishNorm = normalizeTitle(m.title?.english);
    const nativeNorm = normalizeTitle(m.title?.native);
    if (romajiNorm === targetNorm || englishNorm === targetNorm || nativeNorm === targetNorm) {
      return m.id;
    }
  }

  // 2. High relevance match (contains/prefix) ranked by popularity
  const matchingCandidates = results.filter(m => {
    if (!m || !m.id) return false;
    const romajiNorm = normalizeTitle(m.title?.romaji);
    const englishNorm = normalizeTitle(m.title?.english);
    const nativeNorm = normalizeTitle(m.title?.native);
    return (
      (romajiNorm && (romajiNorm.includes(targetNorm) || (targetNorm.length > 4 && targetNorm.includes(romajiNorm)))) ||
      (englishNorm && (englishNorm.includes(targetNorm) || (targetNorm.length > 4 && targetNorm.includes(englishNorm)))) ||
      (nativeNorm && (nativeNorm.includes(targetNorm) || (targetNorm.length > 2 && targetNorm.includes(nativeNorm))))
    );
  });

  if (matchingCandidates.length > 0) {
    matchingCandidates.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return matchingCandidates[0].id;
  }

  // 3. Fallback to highest popularity result in top 3
  const topSlice = results.slice(0, 3).filter(m => m && m.id);
  topSlice.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  return topSlice[0]?.id || results[0].id;
}

async function resolveAnilistIdRaw(title: string): Promise<number | null> {
  const normalizedKey = title.toLowerCase().trim();
  try {
    // Step 1: Direct title search
    let results = await searchAnilist(title);
    let matchId = pickBestMatch(title, results);
    if (matchId) return matchId;

    // Step 2: Cleaned title (replace hyphens, underscores, colons with spaces)
    const cleaned = title.replace(/[-_:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.toLowerCase() !== normalizedKey) {
      results = await searchAnilist(cleaned);
      matchId = pickBestMatch(cleaned, results);
      if (matchId) return matchId;
    }

    // High-confidence fallback candidates (capped to prevent rate-limiting)
    const candidateQueries: string[] = [];

    // Step 3: Remove season / part numbers, formats, and honorific suffixes
    const noSeason = cleaned
      .replace(/season \d+/i, '')
      .replace(/\d+(nd|rd|th|st) season/i, '')
      .replace(/part \d+/i, '')
      .replace(/\b(tv|movie|ova|ona|special)\b/i, '')
      .replace(/-(kun|san|chan|sama|senpai|sensei)\b/gi, '')
      .replace(/\b(kun|san|chan|sama|senpai|sensei)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (noSeason.length > 2 && noSeason.toLowerCase() !== cleaned.toLowerCase()) {
      candidateQueries.push(noSeason);
    }

    // Step 4: Romanization vowel expansion (e.g. Tomei -> Toumei, Shojo -> Shoujo, etc.)
    const baseForExpansion = noSeason || cleaned;
    const ouNormalized = baseForExpansion
      .replace(/\btomei\b/gi, 'Toumei')
      .replace(/\bkyoto\b/gi, 'Kyouto')
      .replace(/\byusha\b/gi, 'Yuusha')
      .replace(/\bshojo\b/gi, 'Shoujo')
      .replace(/\bshonen\b/gi, 'Shounen')
      .replace(/\bgakuin\b/gi, 'Gakuen')
      .replace(/\s+/g, ' ')
      .trim();

    if (ouNormalized.toLowerCase() !== cleaned.toLowerCase() && !candidateQueries.includes(ouNormalized)) {
      candidateQueries.push(ouNormalized);
    }

    // Step 5: Significant word prefix (3-4 words) from normalized string
    const targetSource = ouNormalized || noSeason || cleaned;
    const words = targetSource.split(' ').filter(w => w.length > 1);
    if (words.length >= 3) {
      const prefix4 = words.slice(0, 4).join(' ');
      const prefix3 = words.slice(0, 3).join(' ');
      if (prefix4.length > 5 && !candidateQueries.includes(prefix4)) {
        candidateQueries.push(prefix4);
      }
      if (prefix3.length > 5 && !candidateQueries.includes(prefix3)) {
        candidateQueries.push(prefix3);
      }
    }

    // Execute fallback candidates in order
    const limitedCandidates = candidateQueries.slice(0, 3);
    if (limitedCandidates.length > 0) {
      const batchResults = await Promise.all(
        limitedCandidates.map(q => searchAnilist(q).catch(() => []))
      );

      for (let i = 0; i < batchResults.length; i++) {
        const res = batchResults[i];
        const queryUsed = limitedCandidates[i];
        const foundId = pickBestMatch(queryUsed, res);
        if (foundId) return foundId;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching Anilist ID:", error);
    return null;
  }
}

// Next.js persistent data cache (7 days TTL across serverless lambdas)
const getCachedAnilistIdPersistent = unstable_cache(
  async (normalizedKey: string) => {
    return await resolveAnilistIdRaw(normalizedKey);
  },
  ['anilist-id-resolver'],
  {
    revalidate: 604800, // 7 days (604,800s)
    tags: ['anilist-id']
  }
);

export async function getAnilistId(title: string): Promise<number | null> {
  if (!title || typeof title !== 'string') return null;
  const normalizedKey = title.toLowerCase().trim();
  if (!normalizedKey) return null;

  // 1. Check in-memory L1 LRU Cache
  const cached = anilistIdCache.get(normalizedKey);
  if (cached !== undefined) {
    return cached;
  }

  // 2. Check in-flight request deduplication map
  const inFlight = inFlightSearches.get(normalizedKey);
  if (inFlight) {
    return inFlight;
  }

  const searchPromise = (async (): Promise<number | null> => {
    try {
      const matchId = await getCachedAnilistIdPersistent(normalizedKey);
      if (matchId) {
        anilistIdCache.set(normalizedKey, matchId, CACHE_TTL_SUCCESS_MS);
      } else {
        anilistIdCache.set(normalizedKey, null, CACHE_TTL_MISS_MS);
      }
      return matchId;
    } catch (error) {
      console.error("Failed to resolve Anilist ID:", error);
      return null;
    } finally {
      inFlightSearches.delete(normalizedKey);
    }
  })();

  inFlightSearches.set(normalizedKey, searchPromise);
  return searchPromise;
}

export async function getAnikotoStream(
  title: string, 
  episode: number, 
  audio: 'sub' | 'dub' = 'sub', 
  resolvedAnilistId?: number | null
) {
  try {
    const anilistId = resolvedAnilistId ?? await getAnilistId(title);
    if (!anilistId) {
      console.warn("Anikoto: No AniList ID found in results for", title);
      return null;
    }

    // Fetch the stream for the specified episode
    const streamInfo = await anikoto.getStreams(anilistId, episode, audio);
    return streamInfo;
  } catch (error) {
    console.error("Anikoto streaming error:", error);
    return null;
  }
}
