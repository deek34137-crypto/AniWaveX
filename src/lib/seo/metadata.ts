import type { Metadata } from "next";
import { SITE_CONFIG, getAbsoluteUrl } from "./site-config";

/**
 * Truncate text cleanly on word boundaries
 */
export function cleanSynopsis(raw?: string | null, maxLength = 100): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const cut = cleaned.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 60 ? `${cut.slice(0, lastSpace)}...` : `${cut}...`;
}

/**
 * Guarantee description does not exceed maximum characters (Google cuts off around 155-160)
 */
export function clampDescription(text: string, maxLength = 155): string {
  if (!text) return "";
  const cleaned = text.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const cut = cleaned.slice(0, maxLength - 3);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > maxLength * 0.7 ? `${cut.slice(0, lastSpace)}...` : `${cut}...`;
}

/**
 * Formats page title so that when the layout template appends " | AniWaveX" (12 chars),
 * the final title remains comfortably <= 58 characters.
 */
export function formatSeoTitle(title: string, action = "Watch HD"): string {
  const maxTitlePart = 44 - action.length - 3;
  const trimmed = title.length > maxTitlePart
    ? `${title.slice(0, maxTitlePart - 1).trim()}…`
    : title;
  return `${trimmed} — ${action}`;
}

/**
 * Format Anime title for organic search intent
 */
export function generateAnimeMetadata(anime: {
  slug: string;
  title: string;
  description?: string;
  posterImage?: string;
  backgroundImage?: string;
  year?: string | number;
  rating?: string;
  status?: string;
  type?: string;
  tags?: string[];
  totalEpisodes?: number;
}): Metadata {
  const title = formatSeoTitle(anime.title, "Watch HD");

  const synopsisSummary = cleanSynopsis(anime.description, 90);
  const rawDescription = synopsisSummary
    ? `${synopsisSummary} Watch ${anime.title} in HD on AniWaveX.`
    : `Stream ${anime.title} in HD with English subtitles and dubs on AniWaveX. Track episodes, characters, and status.`;
  const description = clampDescription(rawDescription, 155);

  const canonicalUrl = getAbsoluteUrl(`/anime/${anime.slug}`);
  const ogImage = anime.posterImage || anime.backgroundImage || SITE_CONFIG.ogImage;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${anime.title} — AniWaveX`,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: ogImage,
          width: 800,
          height: 1200,
          alt: `${anime.title} Official Poster Visual`,
        },
      ],
      type: anime.type?.toLowerCase() === "movie" ? "video.movie" : "video.tv_show",
      locale: SITE_CONFIG.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: `${anime.title} — AniWaveX`,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * Format Manga title metadata
 */
export function generateMangaMetadata(manga: {
  id: string | number;
  title: string;
  romajiTitle?: string;
  description?: string;
  posterImage?: string;
  bannerImage?: string;
  status?: string;
  type?: string;
  genres?: string[];
  totalChapters?: number;
}): Metadata {
  const title = formatSeoTitle(manga.title, "Read Online");

  const synopsisSummary = cleanSynopsis(manga.description, 90);
  const rawDescription = synopsisSummary
    ? `${synopsisSummary} Read ${manga.title} online on AniWaveX.`
    : `Read ${manga.title} manga chapters online in HD quality on AniWaveX with synopsis, updates, and chapter list.`;
  const description = clampDescription(rawDescription, 155);

  const canonicalUrl = getAbsoluteUrl(`/manga/${manga.id}`);
  const ogImage = manga.bannerImage || manga.posterImage || SITE_CONFIG.ogImage;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${manga.title} Manga — AniWaveX`,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [
        {
          url: ogImage,
          width: 800,
          height: 1200,
          alt: `${manga.title} Manga Cover`,
        },
      ],
      type: "book",
      locale: SITE_CONFIG.locale,
    },
    twitter: {
      card: "summary_large_image",
      title: `${manga.title} Manga — AniWaveX`,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * Format Genre Landing Page metadata
 */
export function generateGenreMetadata(genre: string, totalCount?: number): Metadata {
  const formattedGenre = genre.charAt(0).toUpperCase() + genre.slice(1).toLowerCase();
  const title = `${formattedGenre} Anime — Top Series`;
  const countText = totalCount ? `Explore over ${totalCount} titles: ` : "Explore ";
  const rawDescription = `${countText}top rated, trending, and newly released ${formattedGenre} anime series on AniWaveX. Stream full episodes online.`;
  const description = clampDescription(rawDescription, 155);
  const canonicalUrl = getAbsoluteUrl(`/genre/${genre.toLowerCase()}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${formattedGenre} Anime | AniWaveX`,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [{ url: SITE_CONFIG.ogImage, width: 800, height: 600, alt: `${formattedGenre} Anime on AniWaveX` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${formattedGenre} Anime | AniWaveX`,
      description,
      images: [SITE_CONFIG.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Format Seasonal Landing Page metadata (e.g., /season/fall-2026)
 */
export function generateSeasonMetadata(season: string, year: string | number): Metadata {
  const formattedSeason = season.charAt(0).toUpperCase() + season.slice(1).toLowerCase();
  const title = `${formattedSeason} ${year} Anime Schedule`;
  const rawDescription = `Discover all new and airing anime for the ${formattedSeason} ${year} season on AniWaveX with broadcast schedules and episodes.`;
  const description = clampDescription(rawDescription, 155);
  const canonicalUrl = getAbsoluteUrl(`/season/${season.toLowerCase()}-${year}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${formattedSeason} ${year} Anime Season | AniWaveX`,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [{ url: SITE_CONFIG.ogImage, width: 800, height: 600, alt: `${formattedSeason} ${year} Anime Schedule` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${formattedSeason} ${year} Anime Season | AniWaveX`,
      description,
      images: [SITE_CONFIG.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Format Year Landing Page metadata (e.g., /year/2026)
 */
export function generateYearMetadata(year: string | number): Metadata {
  const title = `${year} Anime Releases & Catalog`;
  const rawDescription = `Catalog of anime movies and TV series released in ${year}. Stream top rated titles and seasonal highlights on AniWaveX.`;
  const description = clampDescription(rawDescription, 155);
  const canonicalUrl = getAbsoluteUrl(`/year/${year}`);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${year} Anime Catalog | AniWaveX`,
      description,
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      images: [{ url: SITE_CONFIG.ogImage, width: 800, height: 600, alt: `${year} Anime Releases` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${year} Anime Catalog | AniWaveX`,
      description,
      images: [SITE_CONFIG.ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Format Metadata for Catalog filters
 */
export function generateCatalogMetadata(filters: {
  genre?: string;
  year?: string;
  season?: string;
  format?: string;
  sort?: string;
}): Metadata {
  const parts: string[] = [];
  if (filters.format === "movie") parts.push("Movies");
  else if (filters.sort === "newest") parts.push("New Releases");
  else if (filters.sort === "rating") parts.push("Top Rated");
  else if (filters.genre) parts.push(`${filters.genre.toUpperCase()}`);
  else parts.push("Anime Catalog");

  if (filters.year) parts.push(`(${filters.year})`);

  const title = `${parts.join(" ")} — Directory`;
  const rawDescription = `Browse the AniWaveX anime catalog with filter options by genre, release year, season, and broadcast format in HD.`;
  const description = clampDescription(rawDescription, 155);
  const canonicalUrl = getAbsoluteUrl("/catalog");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Generate metadata for search results (NOINDEX to prevent search crawl loops)
 */
export function generateSearchMetadata(query?: string, searchType = "all"): Metadata {
  const title = query ? `Search results for "${query}"` : "Search Anime & Manga Titles";
  const description = `Find subbed and dubbed anime series, movies, and manga chapters by title, character, or studio on AniWaveX.`;
  const canonicalUrl = getAbsoluteUrl("/search");

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: false,
      follow: true, // Allow search engine to follow links found on search results
    },
  };
}

/**
 * Metadata for Private or Admin pages
 */
export function generatePrivateMetadata(pageName: string): Metadata {
  return {
    title: `${pageName} — AniWaveX`,
    robots: {
      index: false,
      follow: false,
      noimageindex: true,
      nocache: true,
    },
  };
}
