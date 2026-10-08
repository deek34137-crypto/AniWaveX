import type { Metadata } from "next";
import { SITE_CONFIG, getAbsoluteUrl } from "./site-config";

/**
 * Truncate text cleanly on word boundaries
 */
export function cleanSynopsis(raw?: string | null, maxLength = 160): string {
  if (!raw) return "";
  const cleaned = raw.replace(/\r?\n|\r/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const cut = cleaned.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return lastSpace > 100 ? `${cut.slice(0, lastSpace)}...` : `${cut}...`;
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
  const title = `${anime.title} — Episodes, Watch Information & Synopsis`;
  const primaryGenres = (anime.tags || []).slice(0, 3).join(", ");
  const genreClause = primaryGenres ? ` (${primaryGenres})` : "";
  const yearClause = anime.year && anime.year !== "Unknown" ? ` [${anime.year}]` : "";
  const epClause = anime.totalEpisodes ? ` with ${anime.totalEpisodes} episodes` : "";

  const synopsisSummary = cleanSynopsis(anime.description, 130);
  const description = synopsisSummary
    ? `${synopsisSummary} Watch ${anime.title}${yearClause}${genreClause}${epClause} on AniWaveX.`
    : `Explore ${anime.title}${yearClause}${genreClause}${epClause}. Stream episodes in HD and track characters, synopsis, and status on AniWaveX.`;

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
  const title = `${manga.title} Manga — Read Chapters Online, Synopsis & Info`;
  const genresStr = (manga.genres || []).slice(0, 3).join(", ");
  const genreClause = genresStr ? ` featuring ${genresStr}` : "";
  const chapterClause = manga.totalChapters ? ` across ${manga.totalChapters} chapters` : "";
  const synopsisSummary = cleanSynopsis(manga.description, 130);

  const description = synopsisSummary
    ? `${synopsisSummary} Read ${manga.title}${genreClause}${chapterClause} online on AniWaveX.`
    : `Read ${manga.title} manga chapters online in HD quality on AniWaveX. Browse synopsis, publication status (${manga.status || "Ongoing"}), and official art.`;

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
  const title = `Best ${formattedGenre} Anime — Top Rated & Popular Series`;
  const countText = totalCount ? `Explore over ${totalCount} titles including ` : "Explore ";
  const description = `${countText}top rated, trending, and newly released ${formattedGenre} anime on AniWaveX. Stream full episodes and track reviews in HD.`;
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
  const title = `${formattedSeason} ${year} Anime — Airing, New & Upcoming Schedule`;
  const description = `Discover all new and currently airing anime for the ${formattedSeason} ${year} season on AniWaveX. Complete broadcast schedule, synopsis, studios, and episode links.`;
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
  const title = `${year} Anime Releases — Top Rated & Popular Series`;
  const description = `Complete catalog of anime released in ${year}. Discover top-rated shows, breakout hits, movie premieres, and seasonal highlights on AniWaveX.`;
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
  if (filters.format === "movie") parts.push("Anime Movies");
  else if (filters.sort === "newest") parts.push("New Anime Releases");
  else if (filters.sort === "rating") parts.push("Highest Rated Anime");
  else if (filters.genre) parts.push(`${filters.genre.toUpperCase()} Anime`);
  else parts.push("Anime Catalog & Directory");

  if (filters.year) parts.push(`(${filters.year})`);

  const title = `${parts.join(" ")} — Browse & Filter`;
  const description = `Browse the extensive AniWaveX anime catalog with filter options by genre, release year, season, broadcast format, and popularity ranking.`;
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
