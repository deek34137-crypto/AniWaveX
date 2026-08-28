import { cache } from "react";
import { fetchAniListGraphQL } from "@/lib/schedule";
import { getAnilistId } from "@/lib/providers/anikoto-wrapper";

function extractCategories(anime: any, included?: any[]): string[] {
  if (!included || !Array.isArray(included) || included.length === 0) {
    return ["Animation", "Anime"];
  }
  const catNames = included
    .filter((inc: any) => inc.type === "categories" && inc.attributes?.title)
    .map((inc: any) => inc.attributes.title)
    .slice(0, 5);
  return catNames.length > 0 ? catNames : ["Animation", "Anime"];
}

// Helper to format Kitsu response
function formatAnimeData(anime: any, included?: any[]) {
  const attr = anime.attributes;
  const duration = attr.episodeLength || 24;
  const tags = extractCategories(anime, included);
  return {
    id: anime.id,
    slug: attr.slug,
    title: attr.canonicalTitle,
    year: attr.startDate ? attr.startDate.split('-')[0] : "Unknown",
    rating: attr.averageRating ? (parseFloat(attr.averageRating) / 10).toFixed(1) : "N/A",
    status: attr.status === "current" ? "Ongoing" : "Completed",
    type: attr.subtype,
    tags,
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

export const getAiringAnime = cache(async () => {
  try {
    const res = await fetch('https://kitsu.io/api/edge/anime?filter[status]=current&sort=-user_count&page[limit]=40&include=categories', {
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
    return (json.data || []).map((a: any) => formatAnimeData(a, json.included));
  } catch (error) {
    console.error("Failed to fetch airing anime:", error);
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

  // 3. Strip confusing punctuation (dots, hyphens) but keep spaces and all Unicode letters & numbers
  const normalized = lowerQuery.replace(/[-_]/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '');
  
  // 4. Return normalized (or fallback to trimmed lowerQuery if strip leaves it empty)
  return normalized.trim() || lowerQuery;
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

export async function fetchKitsuEpisodeRange(animeId: string, offset: number = 0, limit: number = 100) {
  const headers = {
    "Accept": "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  try {
    const res = await fetch(
      `https://kitsu.io/api/edge/anime/${encodeURIComponent(animeId)}/episodes?page[limit]=${limit}&page[offset]=${offset}`,
      {
        headers,
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 } // 24 hours ISR cache
      }
    );
    if (!res.ok) return { data: [], meta: { count: 0 } };
    const json = await res.json();
    return {
      data: (json.data || []).map((ep: any) => ({
        id: ep.attributes?.number ?? ep.id,
        title: ep.attributes?.canonicalTitle || `Episode ${ep.attributes?.number ?? ep.id}`,
      })),
      meta: json.meta || { count: 0 }
    };
  } catch (err) {
    console.error(`Failed to fetch episode range for anime ${animeId}:`, err);
    return { data: [], meta: { count: 0 } };
  }
}

export const getAnimeData = cache(async (slug: string) => {
  const headers = {
    "Accept": "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  try {
    // 1. Fetch live metadata from Kitsu including categories & episodes in a single combined request
    let res = await fetch(`https://kitsu.io/api/edge/anime?filter[slug]=${encodeURIComponent(slug)}&include=categories,episodes`, {
      headers,
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 } // 24 hours ISR cache
    });
    let json = res.ok ? await res.json() : { data: [], included: [] };
    
    // Fallback to text search if exact slug match is not found
    if (!json.data || json.data.length === 0) {
      res = await fetch(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(slug)}&include=categories,episodes`, {
        headers,
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 }
      });
      json = res.ok ? await res.json() : { data: [], included: [] };
    }

    if (!json.data || json.data.length === 0) {
      return null;
    }

    const anime = json.data[0];
    const metadata = formatAnimeData(anime, json.included);
    const episodeCount = anime.attributes.episodeCount;

    // Extract episodes from included array first
    const includedEpisodes = (json.included || []).filter((inc: any) => inc.type === "episodes");
    
    let allEpisodesData = includedEpisodes;

    // If anime has more than the included episodes, fetch full first 100 in parallel
    if (episodeCount && episodeCount > includedEpisodes.length && includedEpisodes.length < 100) {
      try {
        const epRes = await fetch(`https://kitsu.io/api/edge/anime/${anime.id}/episodes?page[limit]=100`, {
          headers,
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 86400 }
        });
        if (epRes.ok) {
          const epJson = await epRes.json();
          if (epJson.data && epJson.data.length > 0) {
            allEpisodesData = epJson.data;
          }
        }
      } catch {}
    }

    // Determine totalCount reliably
    const totalCount = episodeCount || (allEpisodesData.length > 0 ? (allEpisodesData[allEpisodesData.length - 1].attributes?.number || allEpisodesData.length) : 12);

    // Map initial episode titles in O(N) linear time
    const epMap = new Map<number, any>();
    for (const ep of allEpisodesData) {
      const num = ep.attributes?.number;
      if (num !== undefined && num !== null) {
        epMap.set(num, ep);
      }
    }

    // Synthesize full episode list instantly without N+1 blocking
    const episodes = Array.from({ length: totalCount }, (_, i) => {
      const episodeNum = i + 1;
      const realEpData = epMap.get(episodeNum);
      
      return {
        id: episodeNum,
        title: realEpData?.attributes?.canonicalTitle || `Episode ${episodeNum}`,
      };
    });

    // Resolve AniList ID for upstream video player and sync
    const anilistId = await getAnilistId(metadata.title).catch(() => null);

    return { 
      ...metadata, 
      animeId: anime.id,
      anilistId,
      totalEpisodes: totalCount,
      episodes 
    };
  } catch (error) {
    console.error(`Failed to fetch anime data for slug "${slug}":`, error);
    return null;
  }
});

// ── AniList relation types that count as "next in series" ────────────────────
const SEQUEL_RELATION_TYPES = ["SEQUEL", "ALTERNATIVE_VERSION"];
const FRANCHISE_RELATION_TYPES = ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE_VERSION", "PARENT", "COMPILATION"];

function generateSlugFromTitle(title: string): string {
  if (!title) return "";
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Fetch AniList relations for a title. Returns array of related media sorted chronologically. */
async function fetchAniListRelations(title: string): Promise<{
  nextInSeries: { slug: string; title: string; posterImage: string; year: string; rating: string; tags: string[]; relationType: string } | null;
  franchiseSlugs: string[];
}> {
  try {
    const gqlQuery = `query($search: String) {
      Media(search: $search, type: ANIME) {
        title { english romaji }
        startDate { year }
        relations {
          edges {
            relationType
            node {
              id
              type
              startDate { year }
              title { english romaji }
              coverImage { large extraLarge }
              averageScore
              genres
              format
            }
          }
        }
      }
    }`;

    const data = await fetchAniListGraphQL<{ Media?: { relations?: { edges?: any[] } } }>(
      gqlQuery,
      { search: title },
      { ttlMs: 24 * 60 * 60 * 1000, retries: 2, timeoutMs: 6000 }
    );

    const edges: any[] = data?.Media?.relations?.edges || [];

    // Collect all franchise slugs (to exclude from genre recs)
    const franchiseSlugs: string[] = [];
    for (const edge of edges) {
      if (FRANCHISE_RELATION_TYPES.includes(edge.relationType) && edge.node?.type === "ANIME") {
        const t = edge.node.title?.english || edge.node.title?.romaji || "";
        if (t) franchiseSlugs.push(generateSlugFromTitle(t));
      }
    }

    // Find the chronological next entry (SEQUEL or ALTERNATIVE_VERSION)
    const sequelEdges = edges
      .filter(e => SEQUEL_RELATION_TYPES.includes(e.relationType) && e.node?.type === "ANIME")
      .sort((a, b) => (a.node.startDate?.year ?? 9999) - (b.node.startDate?.year ?? 9999));

    if (sequelEdges.length === 0) return { nextInSeries: null, franchiseSlugs };

    const next = sequelEdges[0].node;
    const nextTitle = next.title?.english || next.title?.romaji || "";
    const nextSlug = generateSlugFromTitle(nextTitle);

    return {
      nextInSeries: {
        slug: nextSlug,
        title: nextTitle,
        posterImage: next.coverImage?.extraLarge || next.coverImage?.large || "",
        year: next.startDate?.year?.toString() || "Unknown",
        rating: next.averageScore ? (next.averageScore / 10).toFixed(1) : "N/A",
        tags: next.genres?.slice(0, 3) || [],
        relationType: sequelEdges[0].relationType,
      },
      franchiseSlugs,
    };
  } catch (err) {
    console.error("AniList relations fetch failed:", err);
    return { nextInSeries: null, franchiseSlugs: [] };
  }
}

export const getRecommendedAnime = cache(async (slug: string, genres?: string[], title?: string) => {
  // Step 1: Fetch sequel/franchise data from AniList in parallel with genre recs
  const searchTitle = title || slug.replace(/-/g, " ");
  const [relationsData, genreResults] = await Promise.allSettled([
    fetchAniListRelations(searchTitle),
    (async () => {
      const primaryGenre = (genres || [])
        .map(g => g.trim().toLowerCase())
        .find(g => g !== "animation" && g !== "anime" && g.length > 2);

      if (!primaryGenre) return [];

      const categorySlug = GENRE_MAP[primaryGenre] || primaryGenre.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const res = await fetch(
        `https://kitsu.io/api/edge/anime?filter[categories]=${encodeURIComponent(categorySlug)}&sort=-userCount&page[limit]=15`,
        {
          headers: {
            "Accept": "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(8000),
          next: { revalidate: 86400 },
        }
      );
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data || []).map((a: any) => formatAnimeData(a));
    })(),
  ]);

  const { nextInSeries, franchiseSlugs } =
    relationsData.status === "fulfilled" ? relationsData.value : { nextInSeries: null, franchiseSlugs: [] };

  const genreAnime: any[] =
    genreResults.status === "fulfilled" ? genreResults.value : [];

  // Step 2: Build exclusion set — current slug + ALL franchise slugs + sequel slug
  const excludeSlugs = new Set<string>([slug, ...(franchiseSlugs || [])]);

  // Step 3: Genre fill — exclude current + entire franchise
  const genreFill = genreAnime
    .filter((a: any) => !excludeSlugs.has(a.slug))
    .slice(0, nextInSeries ? 4 : 5); // leave 1 slot for sequel if found

  // Step 4: Compose final list — sequel FIRST, then genre fill
  const final: any[] = [];

  if (nextInSeries) {
    final.push({
      ...nextInSeries,
      id: `sequel-${nextInSeries.slug}`,
      status: "Completed",
      type: "TV",
      description: "",
      duration: "24m",
      backgroundImage: nextInSeries.posterImage,
      isNextInSeries: true, // flag for UI badge
    });
  }

  final.push(...genreFill);

  // Step 5: If still short, pad with trending
  if (final.length < 3) {
    try {
      const trending = await getTrendingAnime();
      const trendingFill = trending
        .filter((a: any) => !excludeSlugs.has(a.slug) && !final.find((f: any) => f.slug === a.slug))
        .slice(0, 5 - final.length);
      final.push(...trendingFill);
    } catch {}
  }

  return final.slice(0, 5);
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
