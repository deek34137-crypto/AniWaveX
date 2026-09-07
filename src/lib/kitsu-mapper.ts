interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class BoundedLRU<K, V> {
  private max: number;
  private cache: Map<K, CacheEntry<V>>;

  constructor(max = 1000) {
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

// 24-hour cache for successful mappings, 5-minute cache for misses
const kitsuToAnilistCache = new BoundedLRU<string, number | null>(1000);
const CACHE_TTL_SUCCESS_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MISS_MS = 5 * 60 * 1000;

const inFlightResolutions = new Map<string, Promise<number | null>>();

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json"
};

const KITSU_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/vnd.api+json",
  "Content-Type": "application/vnd.api+json"
};

/**
 * Fetch AniList ID from ARM (Anime Relations Map) using Kitsu ID.
 */
async function fetchFromARM(kitsuId: string | number): Promise<number | null> {
  try {
    const res = await fetch(`https://arm.haglund.dev/api/v2/ids?source=kitsu&id=${encodeURIComponent(kitsuId)}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const json = await res.json();
    const anilistId = json?.anilist;
    if (typeof anilistId === "number" && anilistId > 0) {
      return anilistId;
    }
    if (typeof anilistId === "string" && !isNaN(Number(anilistId))) {
      return Number(anilistId);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch AniList ID from AniZip using Kitsu ID.
 */
async function fetchFromAniZip(kitsuId: string | number): Promise<number | null> {
  try {
    const res = await fetch(`https://api.ani.zip/mappings?kitsu_id=${encodeURIComponent(kitsuId)}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const json = await res.json();
    const anilistId = json?.mappings?.anilist_id;
    if (typeof anilistId === "number" && anilistId > 0) {
      return anilistId;
    }
    if (typeof anilistId === "string" && !isNaN(Number(anilistId))) {
      return Number(anilistId);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deterministically resolve an AniList ID from a Kitsu ID.
 * 
 * Pipeline:
 * 1. Cache hit (24h TTL)
 * 2. ARM API (direct Kitsu ID cross-reference)
 * 3. AniZip API (direct Kitsu ID cross-reference)
 * 4. Fuzzy title search fallback (if optional fallbackTitle provided)
 */
export async function resolveAnilistIdFromKitsu(
  kitsuId: string | number,
  fallbackTitle?: string
): Promise<number | null> {
  const cacheKey = String(kitsuId);
  const cached = kitsuToAnilistCache.get(cacheKey);
  if (cached !== undefined) return cached;

  if (inFlightResolutions.has(cacheKey)) {
    return inFlightResolutions.get(cacheKey)!;
  }

  const resolutionPromise = (async (): Promise<number | null> => {
    // 1. Try ARM
    const armId = await fetchFromARM(kitsuId);
    if (armId) {
      kitsuToAnilistCache.set(cacheKey, armId, CACHE_TTL_SUCCESS_MS);
      return armId;
    }

    // 2. Try AniZip
    const aniZipId = await fetchFromAniZip(kitsuId);
    if (aniZipId) {
      kitsuToAnilistCache.set(cacheKey, aniZipId, CACHE_TTL_SUCCESS_MS);
      return aniZipId;
    }

    // 3. Optional fallback to title search if provided
    if (fallbackTitle) {
      try {
        const { getAnilistId } = await import("@/lib/providers/anikoto-wrapper");
        const titleId = await getAnilistId(fallbackTitle);
        if (titleId) {
          kitsuToAnilistCache.set(cacheKey, titleId, CACHE_TTL_SUCCESS_MS);
          return titleId;
        }
      } catch {}
    }

    // Cache miss for a short duration to avoid repetitive failing requests
    kitsuToAnilistCache.set(cacheKey, null, CACHE_TTL_MISS_MS);
    return null;
  })();

  inFlightResolutions.set(cacheKey, resolutionPromise);
  try {
    return await resolutionPromise;
  } finally {
    inFlightResolutions.delete(cacheKey);
  }
}

/**
 * Resolves AniList ID from either a Kitsu ID, a Kitsu slug, or title.
 * Used by /api/stream to guarantee resolution even if client didn't pass anilistId param.
 */
export async function resolveAnilistIdFromSlugOrKitsu(
  idOrSlug: string,
  fallbackTitle?: string
): Promise<number | null> {
  if (!idOrSlug) return null;

  // 1. If it's already a numeric string, treat as Kitsu ID directly
  if (/^\d+$/.test(idOrSlug)) {
    return await resolveAnilistIdFromKitsu(idOrSlug, fallbackTitle);
  }

  // 2. If it's a slug, query Kitsu to get the Kitsu ID
  try {
    let res = await fetch(`https://kitsu.io/api/edge/anime?filter[slug]=${encodeURIComponent(idOrSlug)}&fields[anime]=id`, {
      headers: KITSU_HEADERS,
      signal: AbortSignal.timeout(4000)
    });
    let json = res.ok ? await res.json() : null;
    let kitsuId = json?.data?.[0]?.id;

    // Fallback to text search on Kitsu if slug match is empty
    if (!kitsuId) {
      res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(idOrSlug)}&fields[anime]=id`, {
        headers: KITSU_HEADERS,
        signal: AbortSignal.timeout(4000)
      });
      json = res.ok ? await res.json() : null;
      kitsuId = json?.data?.[0]?.id;
    }

    if (kitsuId) {
      const mapped = await resolveAnilistIdFromKitsu(kitsuId, fallbackTitle);
      if (mapped) return mapped;
    }
  } catch {}

  // 3. Fallback to title search if provided
  if (fallbackTitle) {
    try {
      const { getAnilistId } = await import("@/lib/providers/anikoto-wrapper");
      return await getAnilistId(fallbackTitle);
    } catch {}
  }

  return null;
}
