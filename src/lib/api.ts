import { cache } from "react";

// Helper to format Kitsu response
function formatAnimeData(anime: any) {
  const attr = anime.attributes;
  const duration = attr.episodeLength || 24;
  return {
    id: anime.id,
    slug: attr.slug,
    title: attr.canonicalTitle,
    year: attr.startDate ? attr.startDate.split('-')[0] : "Unknown",
    rating: attr.averageRating ? (parseFloat(attr.averageRating) / 10).toFixed(1) : "N/A",
    status: attr.status === "current" ? "Ongoing" : "Completed",
    type: attr.subtype,
    tags: ["Animation", "Anime"],
    description: attr.synopsis,
    duration: duration > 60 ? `${Math.floor(duration / 60)}h ${duration % 60}m` : `${duration}m`,
    posterImage: attr.posterImage?.original || "",
    backgroundImage: attr.coverImage?.original || attr.posterImage?.original || "",
  };
}

export const getTrendingAnime = cache(async () => {
  try {
    const res = await fetch('https://kitsu.io/api/edge/trending/anime', {
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 } // 1 hour ISR cache
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map(formatAnimeData);
  } catch (error) {
    console.error("Failed to fetch trending anime:", error);
    return [];
  }
});

export const getTopRatedAnime = cache(async () => {
  try {
    const res = await fetch('https://kitsu.io/api/edge/anime?sort=-averageRating&page[limit]=10', {
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 } // 1 hour ISR cache
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data || []).map(formatAnimeData);
  } catch (error) {
    console.error("Failed to fetch top rated anime:", error);
    return [];
  }
});

// Alias map for common titles that might fail normal search
const SEARCH_ALIASES: Record<string, string> = {
  "slime datta ken": "That Time I Got Reincarnated as a Slime",
  "tensura": "That Time I Got Reincarnated as a Slime",
  "danmachi": "Is It Wrong to Try to Pick Up Girls in a Dungeon",
  "mushoku tensei": "Mushoku Tensei Jobless Reincarnation",
  "oregairu": "My Teen Romantic Comedy SNAFU",
  "konosuba": "KonoSuba God's Blessing on this Wonderful World",
  "rezero": "Re:ZERO -Starting Life in Another World-",
  "s.a.o": "Sword Art Online",
  "s.a.o.": "Sword Art Online",
  "fmab": "Fullmetal Alchemist Brotherhood",
  "aot": "Attack on Titan",
  "snk": "Attack on Titan",
  "love unseen beneath the clear night sky": "Tomei na Yoru ni Kakeru-kun to, Menimienai Koi wo Shita",
  "toumei na yoru ni kakeru": "Tomei na Yoru ni Kakeru-kun to, Menimienai Koi wo Shita",
  "toumei na yoru": "Tomei na Yoru ni Kakeru-kun to, Menimienai Koi wo Shita"
};

function normalizeSearchQuery(query: string): string {
  if (!query) return "";
  
  // 1. Lowercase for dictionary lookup
  const lowerQuery = query.toLowerCase().trim();

  // 2. Check exact dictionary match
  if (SEARCH_ALIASES[lowerQuery]) {
    return SEARCH_ALIASES[lowerQuery];
  }

  // 3. Strip confusing punctuation (dots, hyphens) but keep spaces
  const normalized = lowerQuery.replace(/[-]/g, ' ').replace(/[._!?,;'"]/g, '');
  
  // 4. Return normalized
  return normalized.trim();
}

export const searchAnime = cache(async (query: string, limit: number = 20) => {
  if (!query) return [];
  const normalizedQuery = normalizeSearchQuery(query);
  try {
    const res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(normalizedQuery)}&page[limit]=${limit}`, {
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 300 } // 5 minutes cache
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (!json.data) return [];
    return json.data.map(formatAnimeData);
  } catch (error) {
    console.error("Failed to search anime:", error);
    return [];
  }
});

async function fetchAllKitsuEpisodes(animeId: string, initialEpJson: any): Promise<any[]> {
  const headers = {
    "Accept": "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  const initialEpisodes: any[] = initialEpJson?.data || [];
  const metaCount: number = initialEpJson?.meta?.count || 0;
  const pageSize = 100;

  // If all episodes fit in the initial response, return immediately
  if (metaCount <= initialEpisodes.length || initialEpisodes.length === 0) {
    return initialEpisodes;
  }

  // Create offsets for remaining episodes (up to 1500 episodes)
  const maxEpisodes = Math.min(metaCount, 1500);
  const offsets: number[] = [];
  for (let offset = pageSize; offset < maxEpisodes; offset += pageSize) {
    offsets.push(offset);
  }

  // Fetch remaining pages in parallel batches of 5 to avoid overwhelming the server
  const allFetched = [...initialEpisodes];
  const batchSize = 5;

  for (let i = 0; i < offsets.length; i += batchSize) {
    const chunk = offsets.slice(i, i + batchSize);
    const chunkResults = await Promise.all(
      chunk.map(async (offset) => {
        try {
          const res = await fetch(
            `https://kitsu.io/api/edge/anime/${animeId}/episodes?page[limit]=${pageSize}&page[offset]=${offset}`,
            {
              headers,
              signal: AbortSignal.timeout(8000),
              next: { revalidate: 86400 } // 24h ISR cache
            }
          );
          if (!res.ok) return [];
          const epData = await res.json();
          return epData.data || [];
        } catch {
          return [];
        }
      })
    );

    for (const eps of chunkResults) {
      allFetched.push(...eps);
    }
  }

  return allFetched;
}

export const getAnimeData = cache(async (slug: string) => {
  const headers = {
    "Accept": "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  try {
    // 1. Fetch live metadata from Kitsu using exact slug first (cached 24h)
    let res = await fetch(`https://kitsu.io/api/edge/anime?filter[slug]=${encodeURIComponent(slug)}`, {
      headers,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 } // 24 hours ISR cache
    });
    let json = res.ok ? await res.json() : { data: [] };
    
    // Fallback to text search if exact slug match is not found
    if (!json.data || json.data.length === 0) {
      res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(slug)}`, {
        headers,
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 }
      });
      json = res.ok ? await res.json() : { data: [] };
    }

    if (!json.data || json.data.length === 0) {
      return null;
    }

    const anime = json.data[0];
    const metadata = formatAnimeData(anime);
    const episodeCount = anime.attributes.episodeCount; // Might be null for airing

    // 2. Fetch initial episodes from Kitsu (up to 100 episodes, cached 24h)
    const epRes = await fetch(`https://kitsu.io/api/edge/anime/${anime.id}/episodes?page[limit]=100`, {
      headers,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 } // 24 hours ISR cache
    });
    const epJson = epRes.ok ? await epRes.json() : { data: [], meta: { count: 0 } };
    
    // 3. Fetch all remaining episode pages if anime has > 100 episodes
    const rawEpisodes = await fetchAllKitsuEpisodes(anime.id, epJson);

    let fetchedEpisodes: any[] = [];
    if (rawEpisodes.length > 0) {
      fetchedEpisodes = rawEpisodes
        .filter((ep: any) => ep.attributes?.number !== null && ep.attributes?.number !== undefined)
        .sort((a: any, b: any) => a.attributes.number - b.attributes.number);
    }

    // 4. Determine the total count to render
    let totalCount = episodeCount;
    
    // Kitsu's episodes endpoint returns the actual total count of released episodes in meta
    const metaCount = epJson.meta?.count || 0;
    if (metaCount > (totalCount || 0)) {
      totalCount = metaCount;
    }

    if (!totalCount) {
      // If unknown total or currently airing, default to the fetched number
      totalCount = fetchedEpisodes.length > 0 ? fetchedEpisodes[fetchedEpisodes.length - 1].attributes.number : 12;
    }

    // 5. Build the normalized episodes array in O(N) linear time using a Map lookup
    const epMap = new Map<number, any>();
    for (const ep of fetchedEpisodes) {
      const num = ep.attributes?.number;
      if (num !== undefined && num !== null) {
        epMap.set(num, ep);
      }
    }

    const episodes = Array.from({ length: totalCount }, (_, i) => {
      const episodeNum = i + 1;
      const realEpData = epMap.get(episodeNum);
      
      return {
        id: episodeNum,
        title: realEpData?.attributes?.canonicalTitle || `Episode ${episodeNum}`,
      };
    });

    return { ...metadata, episodes };
  } catch (error) {
    console.error(`Failed to fetch anime data for slug "${slug}":`, error);
    return null;
  }
});

export interface CatalogFilters {
  genre?: string;
  year?: string;
  season?: string;
  format?: string;
  sort?: string;
  page?: number;
}

export const GENRE_MAP: Record<string, string> = {
  action: "action",
  romance: "romance",
  comedy: "comedy",
  fantasy: "fantasy",
  "sci-fi": "science-fiction",
  horror: "horror",
  sports: "sports",
  "slice-of-life": "slice-of-life",
  isekai: "isekai",
  drama: "drama"
};

export const SORT_MAP: Record<string, string> = {
  popularity: "-userCount",
  rating: "-averageRating",
  newest: "-startDate",
  oldest: "startDate",
  updated: "-updatedAt"
};

export const FORMAT_MAP: Record<string, string> = {
  tv: "TV",
  movie: "movie",
  ova: "OVA",
  special: "special"
};

export const SEASON_MAP: Record<string, string> = {
  winter: "winter",
  spring: "spring",
  summer: "summer",
  fall: "fall"
};

export async function getCatalogAnime(filters: CatalogFilters) {
  let url = 'https://kitsu.io/api/edge/anime?';
  const queryParams = new URLSearchParams();

  // Validate and apply Pagination
  const page = Math.max(1, filters.page || 1);
  const limit = 20;
  queryParams.append('page[limit]', limit.toString());
  queryParams.append('page[offset]', ((page - 1) * limit).toString());

  // Validate and apply Genre
  if (filters.genre && GENRE_MAP[filters.genre.toLowerCase()]) {
    queryParams.append('filter[categories]', GENRE_MAP[filters.genre.toLowerCase()]);
  }

  // Validate and apply Year
  if (filters.year) {
    const yearInt = parseInt(filters.year, 10);
    if (!isNaN(yearInt) && yearInt >= 1900 && yearInt <= 2100) {
      queryParams.append('filter[seasonYear]', yearInt.toString());
    }
  }

  // Validate and apply Season
  if (filters.season && SEASON_MAP[filters.season.toLowerCase()]) {
    queryParams.append('filter[season]', SEASON_MAP[filters.season.toLowerCase()]);
  }

  // Validate and apply Format
  if (filters.format && FORMAT_MAP[filters.format.toLowerCase()]) {
    queryParams.append('filter[subtype]', FORMAT_MAP[filters.format.toLowerCase()]);
  }

  // Validate and apply Sort
  const sortKey = filters.sort?.toLowerCase() || 'popularity';
  const sortValue = SORT_MAP[sortKey] || SORT_MAP['popularity'];
  queryParams.append('sort', sortValue);

  url += queryParams.toString();

  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 1800 } // 30 minutes ISR cache
    });
    const json = await res.json();
    
    return {
      data: (json.data || []).map(formatAnimeData),
      meta: json.meta || { count: 0 }
    };
  } catch (error) {
    console.error("Failed to fetch catalog", error);
    return { data: [], meta: { count: 0 } };
  }
}
