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
  const res = await fetch('https://kitsu.io/api/edge/trending/anime');
  const json = await res.json();
  return json.data.map(formatAnimeData);
});

export const getTopRatedAnime = cache(async () => {
  const res = await fetch('https://kitsu.io/api/edge/anime?sort=-averageRating&page[limit]=10');
  const json = await res.json();
  return json.data.map(formatAnimeData);
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
  "snk": "Attack on Titan"
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
  // e.g. "boku-no-hero" -> "boku no hero"
  // "s.a.o" -> "s a o" -> actually if it has periods we might want to just strip them
  let normalized = lowerQuery.replace(/[-]/g, ' ').replace(/[._!?,;'"]/g, '');
  
  // 4. Return normalized (Kitsu natively handles romanji, japanese, and most acronyms if clean)
  return normalized.trim();
}

export const searchAnime = cache(async (query: string, limit: number = 20) => {
  if (!query) return [];
  const normalizedQuery = normalizeSearchQuery(query);
  const res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(normalizedQuery)}&page[limit]=${limit}`);
  const json = await res.json();
  if (!json.data) return [];
  return json.data.map(formatAnimeData);
});

export const getAnimeData = cache(async (slug: string) => {
  // 1. Fetch live metadata from Kitsu
  const res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${slug}`);
  const json = await res.json();
  
  if (!json.data || json.data.length === 0) {
    return null;
  }

  const anime = json.data[0];
  const metadata = formatAnimeData(anime);
  const episodeCount = anime.attributes.episodeCount; // Might be null for airing

  // 2. Fetch real episodes from Kitsu (first 20)
  const epRes = await fetch(`https://kitsu.io/api/edge/anime/${anime.id}/episodes?page[limit]=20`);
  const epJson = await epRes.json();
  
  let fetchedEpisodes: any[] = [];
  if (epJson.data) {
    fetchedEpisodes = epJson.data
      .filter((ep: any) => ep.attributes.number !== null)
      .sort((a: any, b: any) => a.attributes.number - b.attributes.number);
  }

  // 3. Determine the total count to render
  let totalCount = episodeCount;
  
  // Kitsu's episodes endpoint returns the actual total count of released episodes in meta
  const metaCount = epJson.meta?.count || 0;
  if (metaCount > (totalCount || 0)) {
    totalCount = metaCount;
  }

  if (!totalCount) {
    // If unknown total or currently airing, default to the fetched number
    totalCount = fetchedEpisodes.length > 0 ? fetchedEpisodes[fetchedEpisodes.length - 1].attributes.number : 12; // Fallback to 12 if absolutely nothing is found
  }

  // 4. Build the normalized episodes array
  const episodes = Array.from({ length: totalCount }).map((_, i) => {
    const episodeNum = i + 1;
    const realEpData = fetchedEpisodes.find((ep) => ep.attributes.number === episodeNum);
    
    return {
      id: episodeNum,
      title: realEpData?.attributes?.canonicalTitle || `Episode ${episodeNum}`,
      // We are NO LONGER eagerly fetching streams here!
      // Streams will be fetched lazily on the client when clicked.
    };
  });

  return { ...metadata, episodes };
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
    const res = await fetch(url);
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
