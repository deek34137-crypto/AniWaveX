const API = "https://graphql.anilist.co";

const cache = new Map();
const inFlight = new Map();
const MAX_CACHE_SIZE = 300;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  // Refresh LRU order
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function setCached(key, data, ttlMs = CACHE_TTL_MS) {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function getMedia(id) {
  if (!id) return null;
  const cacheKey = `media:${id}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const q = `query($id:Int){Media(id:$id,type:ANIME){id idMal title{romaji english native}format status startDate{year month day}seasonYear episodes duration genres averageScore coverImage{large} bannerImage}}`;
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: q, variables: { id } })
      });
      if (!r.ok) return null;
      const j = await r.json();
      const media = j.data?.Media ?? null;
      if (media) {
        setCached(cacheKey, media, CACHE_TTL_MS);
      }
      return media;
    } catch {
      return null;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}

async function searchAnilist(query) {
  if (!query || typeof query !== "string" || !query.trim()) return [];
  const normalizedQuery = query.toLowerCase().trim();
  const cacheKey = `search:${normalizedQuery}`;
  const cached = getCached(cacheKey);
  if (cached !== undefined) return cached;

  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey);
  }

  const fetchPromise = (async () => {
    try {
      const q = `query($s:String){Page(perPage:20){media(search:$s,type:ANIME){id idMal title{romaji english native}format status startDate{year month day}seasonYear episodes genres averageScore coverImage{large}}}}`;
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query: q, variables: { s: query } })
      });
      if (!r.ok) return [];
      const j = await r.json();
      const results = j.data?.Page?.media ?? [];
      setCached(cacheKey, results, results.length > 0 ? CACHE_TTL_MS : 5 * 60 * 1000);
      return results;
    } catch {
      return [];
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export { getMedia, searchAnilist };
