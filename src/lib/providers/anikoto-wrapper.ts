import { AnikotoProvider } from './anikoto/provider.js';
import { searchAnilist } from './anikoto/core/anilist.js';

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
// 24h TTL for successful hits, 10m TTL for null hits (prevent flooding)
const anilistIdCache = new BoundedLRU<string, number | null>(500);
const CACHE_TTL_SUCCESS_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MISS_MS = 10 * 60 * 1000;

// In-flight request deduplication map
const inFlightSearches = new Map<string, Promise<number | null>>();

function normalizeTitle(str: string | null | undefined): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");
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
    if (romajiNorm === targetNorm || englishNorm === targetNorm) {
      return m.id;
    }
  }

  // 2. High relevance match (contains/prefix) ranked by popularity
  const matchingCandidates = results.filter(m => {
    if (!m || !m.id) return false;
    const romajiNorm = normalizeTitle(m.title?.romaji);
    const englishNorm = normalizeTitle(m.title?.english);
    return romajiNorm.includes(targetNorm) || (targetNorm.length > 4 && targetNorm.includes(romajiNorm)) ||
           englishNorm.includes(targetNorm) || (targetNorm.length > 4 && targetNorm.includes(englishNorm));
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

export async function getAnilistId(title: string): Promise<number | null> {
  if (!title || typeof title !== 'string') return null;
  const normalizedKey = title.toLowerCase().trim();
  if (!normalizedKey) return null;

  // 1. Check LRU Cache
  const cached = anilistIdCache.get(normalizedKey);
  if (cached !== undefined) {
    return cached;
  }

  // 2. Check In-Flight Deduplication
  const inFlight = inFlightSearches.get(normalizedKey);
  if (inFlight) {
    return inFlight;
  }

  const searchPromise = (async (): Promise<number | null> => {
    try {
      // Step 1: Direct title search
      let results = await searchAnilist(title);
      let matchId = pickBestMatch(title, results);
      if (matchId) {
        anilistIdCache.set(normalizedKey, matchId, CACHE_TTL_SUCCESS_MS);
        return matchId;
      }

      // Step 2: Cleaned title (replace hyphens, underscores, colons with spaces)
      const cleaned = title.replace(/[-_:]/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleaned.toLowerCase() !== normalizedKey) {
        results = await searchAnilist(cleaned);
        matchId = pickBestMatch(cleaned, results);
        if (matchId) {
          anilistIdCache.set(normalizedKey, matchId, CACHE_TTL_SUCCESS_MS);
          return matchId;
        }
      }

      // Candidate search queries for parallel fallback
      const candidateQueries: string[] = [];
      const words = cleaned.split(' ').filter(w => w.length > 1);

      // Step 3: Significant word prefix
      if (words.length > 3) {
        candidateQueries.push(words.slice(0, 3).join(' '));
        if (words.length > 4) candidateQueries.push(words.slice(0, 4).join(' '));
      }

      // Step 4: Remove season / part numbers
      const noSeason = cleaned
        .replace(/season \d+/i, '')
        .replace(/\d+(nd|rd|th|st) season/i, '')
        .replace(/part \d+/i, '')
        .replace(/\b(tv|movie|ova|ona|special)\b/i, '')
        .trim();

      if (noSeason.length > 2 && noSeason.toLowerCase() !== cleaned.toLowerCase()) {
        candidateQueries.push(noSeason);
      }

      // Step 5: First 2 words fallback
      if (words.length >= 2) {
        const firstTwo = words.slice(0, 2).join(' ');
        if (!candidateQueries.includes(firstTwo)) {
          candidateQueries.push(firstTwo);
        }
      }

      // Step 6: Romanization macron/vowel expansion (e.g. Tomei -> Toumei, Sho -> Shou)
      const ouNormalized = cleaned
        .replace(/\btomei\b/gi, 'Toumei')
        .replace(/\bkyoto\b/gi, 'Kyouto')
        .replace(/\byusha\b/gi, 'Yuusha')
        .replace(/\bshojo\b/gi, 'Shoujo')
        .replace(/\bshonen\b/gi, 'Shounen')
        .replace(/\bkimi\b/gi, 'Kun');

      if (ouNormalized.toLowerCase() !== cleaned.toLowerCase()) {
        const ouPrefix = ouNormalized.split(' ').slice(0, 4).join(' ');
        if (!candidateQueries.includes(ouPrefix)) {
          candidateQueries.push(ouPrefix);
        }
      }

      // Execute remaining candidates in parallel
      if (candidateQueries.length > 0) {
        const batchResults = await Promise.all(
          candidateQueries.map(q => searchAnilist(q).catch(() => []))
        );

        for (let i = 0; i < batchResults.length; i++) {
          const res = batchResults[i];
          const queryUsed = candidateQueries[i];
          const foundId = pickBestMatch(queryUsed, res);
          if (foundId) {
            anilistIdCache.set(normalizedKey, foundId, CACHE_TTL_SUCCESS_MS);
            return foundId;
          }
        }
      }

      // Cache negative lookup for 10 minutes to prevent repeat hammering
      anilistIdCache.set(normalizedKey, null, CACHE_TTL_MISS_MS);
      return null;
    } catch (error) {
      console.error("Error fetching Anilist ID:", error);
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
