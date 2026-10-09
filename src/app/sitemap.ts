import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/seo/site-config";
import {
  getTrendingAnime,
  getTopRatedAnime,
  getAiringAnime,
  getCatalogAnime,
  GENRE_MAP
} from "@/lib/api";
import { getTrendingMangaList } from "@/lib/manga/service";

export const revalidate = 86400; // Cache sitemap generation for 24 hours

function isValidSlug(slug: any): slug is string {
  return typeof slug === "string" && slug.trim().length >= 2 && /^[a-z0-9-]+$/i.test(slug.trim());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date();

  // 1. Core static high-authority pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: getAbsoluteUrl("/"),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: getAbsoluteUrl("/anime"),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/manga"),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/airing"),
      lastModified: currentDate,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: getAbsoluteUrl("/catalog"),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: getAbsoluteUrl("/tier-list"),
      lastModified: currentDate,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: getAbsoluteUrl("/tier-list/community"),
      lastModified: currentDate,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // 2. Genre landing pages (Derived from expanded GENRE_MAP)
  const genreRoutes: MetadataRoute.Sitemap = Object.keys(GENRE_MAP).map((genre) => ({
    url: getAbsoluteUrl(`/genre/${genre}`),
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3. Dynamic Seasonal pages (past 2 years through current year)
  const currentYear = currentDate.getFullYear();
  const seasons = ["winter", "spring", "summer", "fall"];
  const seasonalYears = [currentYear - 2, currentYear - 1, currentYear];
  const seasonRoutes: MetadataRoute.Sitemap = [];

  for (const year of seasonalYears) {
    for (const season of seasons) {
      seasonRoutes.push({
        url: getAbsoluteUrl(`/season/${season}-${year}`),
        lastModified: currentDate,
        changeFrequency: "weekly",
        priority: year === currentYear ? 0.85 : 0.75,
      });
    }
  }

  // 4. Release Year pages (1995 to currentYear)
  const yearRoutes: MetadataRoute.Sitemap = [];
  for (let y = currentYear; y >= 1995; y--) {
    yearRoutes.push({
      url: getAbsoluteUrl(`/year/${y}`),
      lastModified: currentDate,
      changeFrequency: "monthly",
      priority: y >= currentYear - 3 ? 0.8 : 0.65,
    });
  }

  // 5. Dynamic Anime title entries (Trending, Airing, Top-Rated & Top Catalog tiers)
  let animeRoutes: MetadataRoute.Sitemap = [];
  try {
    const catalogPagesToFetch = [1, 2, 3, 4, 5, 6, 7, 8];
    const [trending, topRated, airing, ...catalogBatches] = await Promise.all([
      getTrendingAnime().catch(() => []),
      getTopRatedAnime().catch(() => []),
      getAiringAnime().catch(() => []),
      ...catalogPagesToFetch.map((p) =>
        getCatalogAnime({ page: p, sort: "popularity" })
          .then((res) => res.data || [])
          .catch(() => [])
      ),
    ]);

    const seenSlugs = new Set<string>();
    const allAnimeItems = [
      ...trending,
      ...airing,
      ...topRated,
      ...catalogBatches.flat(),
    ];

    for (const item of allAnimeItems) {
      if (item?.slug && isValidSlug(item.slug) && !seenSlugs.has(item.slug)) {
        seenSlugs.add(item.slug);
        animeRoutes.push({
          url: getAbsoluteUrl(`/anime/${item.slug}`),
          lastModified: currentDate,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    console.warn("Failed to populate dynamic anime in sitemap:", err);
  }

  // 6. Dynamic Manga entries
  let mangaRoutes: MetadataRoute.Sitemap = [];
  try {
    const trendingManga = await getTrendingMangaList(60).catch(() => []);
    const seenMangaIds = new Set<string>();

    for (const item of trendingManga) {
      const cleanId = String(item?.id || "").trim();
      if (cleanId && !seenMangaIds.has(cleanId)) {
        seenMangaIds.add(cleanId);
        mangaRoutes.push({
          url: getAbsoluteUrl(`/manga/${cleanId}`),
          lastModified: currentDate,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch (err) {
    console.warn("Failed to populate dynamic manga in sitemap:", err);
  }

  return [
    ...staticRoutes,
    ...genreRoutes,
    ...seasonRoutes,
    ...yearRoutes,
    ...animeRoutes,
    ...mangaRoutes,
  ];
}
