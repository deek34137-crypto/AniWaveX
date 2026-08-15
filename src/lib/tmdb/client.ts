/**
 * TMDB API Client
 * Used to map anime titles to TMDB IDs for use with third-party embed providers like FilmU.
 */

// Simple in-memory cache to avoid redundant API calls during a session
const tmdbCache = new Map<string, number | null>();

export async function getTmdbId(title: string, isMovie: boolean = false): Promise<number | null> {
  const cacheKey = `${title}-${isMovie}`;
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey) || null;
  }

  try {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      console.warn("TMDB_API_KEY is not set. Cannot fetch TMDB ID.");
      return null;
    }

    const endpoint = isMovie ? 'search/movie' : 'search/tv';
    
    // Clean the title slightly to improve search match (e.g. remove trailing "(TV)")
    const cleanTitle = title.replace(/\s*\(.*?\)\s*/g, ' ').trim();
    
    const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('query', cleanTitle);
    url.searchParams.append('include_adult', 'false');

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 * 24 } // Next.js cache for 24 hours
    });

    if (!res.ok) {
      console.error(`TMDB API returned ${res.status}:`, await res.text());
      return null;
    }

    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Return the first exact or best match
      const tmdbId = data.results[0].id;
      tmdbCache.set(cacheKey, tmdbId);
      return tmdbId;
    }

    tmdbCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.error("Error fetching TMDB ID:", error);
    return null;
  }
}
