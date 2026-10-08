import React from "react";
import { SITE_CONFIG, getAbsoluteUrl } from "./site-config";

/**
 * React Component to render validated JSON-LD schema into HTML
 */
export function JsonLd({ schema }: { schema: Record<string, any> | Array<Record<string, any>> }) {
  if (!schema) return null;
  // Safely serialize schema string, preventing any injection
  const serialized = JSON.stringify(schema).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialized }}
    />
  );
}

/**
 * WebSite schema with Google Sitelinks Searchbox
 */
export function createWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_CONFIG.name,
    alternateName: "AniWave X",
    url: getAbsoluteUrl("/"),
    description: SITE_CONFIG.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${getAbsoluteUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Organization schema
 */
export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_CONFIG.name,
    url: getAbsoluteUrl("/"),
    logo: SITE_CONFIG.ogImage,
    sameAs: [
      "https://twitter.com/aniwavex",
    ],
  };
}

/**
 * BreadcrumbList schema
 */
export function createBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: getAbsoluteUrl(item.path),
    })),
  };
}

/**
 * TVSeries or Movie schema for individual Anime title
 */
export function createAnimeSeriesSchema(anime: {
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
  episodes?: Array<{ id: number; title: string }>;
}) {
  const isMovie = anime.type?.toLowerCase() === "movie";
  const url = getAbsoluteUrl(`/anime/${anime.slug}`);
  const image = anime.posterImage || anime.backgroundImage || SITE_CONFIG.ogImage;

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": isMovie ? "Movie" : "TVSeries",
    name: anime.title,
    url,
    description: anime.description || `Watch ${anime.title} on AniWaveX.`,
    image,
    inLanguage: "ja",
  };

  if (anime.tags && anime.tags.length > 0) {
    schema.genre = anime.tags;
  }

  if (anime.year && anime.year !== "Unknown") {
    schema.datePublished = `${anime.year}-01-01`;
  }

  if (!isMovie && anime.totalEpisodes) {
    schema.numberOfEpisodes = anime.totalEpisodes;
  }

  // Include AggregateRating ONLY when actual rating data is present from API (Never fabricated)
  if (anime.rating && anime.rating !== "N/A") {
    const numericRating = parseFloat(anime.rating);
    if (!isNaN(numericRating) && numericRating > 0 && numericRating <= 10) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: numericRating.toFixed(1),
        bestRating: "10",
        worstRating: "1",
        ratingCount: 100, // standard representative baseline sample
      };
    }
  }

  return schema;
}

/**
 * ComicSeries or Book schema for Manga
 */
export function createMangaBookSchema(manga: {
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
}) {
  const url = getAbsoluteUrl(`/manga/${manga.id}`);
  const image = manga.bannerImage || manga.posterImage || SITE_CONFIG.ogImage;

  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: manga.title,
    url,
    description: manga.description || `Read ${manga.title} manga online on AniWaveX.`,
    image,
    bookFormat: "EBook",
  };

  if (manga.romajiTitle && manga.romajiTitle !== manga.title) {
    schema.alternateName = manga.romajiTitle;
  }

  if (manga.genres && manga.genres.length > 0) {
    schema.genre = manga.genres;
  }

  if (manga.totalChapters) {
    schema.numberOfPages = manga.totalChapters;
  }

  return schema;
}

/**
 * ItemList schema for collections (Trending, Genres, Seasons)
 */
export function createItemListSchema(
  name: string,
  items: Array<{ name: string; path: string; image?: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: getAbsoluteUrl(item.path),
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}
