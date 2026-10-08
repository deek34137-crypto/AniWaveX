import type { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/seo/site-config";
import { getTrendingAnime, getTopRatedAnime, getAiringAnime, GENRE_MAP } from "@/lib/api";
import { getTrendingMangaList } from "@/lib/manga/service";

export const revalidate = 86400; // Cache sitemap generation for 24 hours

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

  // 2. Genre landing pages
  const genreRoutes: MetadataRoute.Sitemap = Object.keys(GENRE_MAP).map((genre) => ({
    url: getAbsoluteUrl(`/genre/${genre}`),
    lastModified: currentDate,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3. Dynamic Seasonal pages (spanning previous, current, and upcoming seasons)
  const currentYear = currentDate.getFullYear();
  const seasons = ["winter", "spring", "summer", "fall"];
  const seasonalYears = [currentYear - 1, currentYear, currentYear + 1];
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

  // 4. Release Year pages
  const yearRoutes: MetadataRoute.Sitemap = [
    currentYear + 1,
    currentYear,
    currentYear - 1,
    currentYear - 2,
    currentYear - 3,
    currentYear - 4,
    currentYear - 5,
  ].map((y) => ({
    url: getAbsoluteUrl(`/year/${y}`),
    lastModified: currentDate,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // 5. High-priority Anime title entries
  let animeRoutes: MetadataRoute.Sitemap = [];
  try {
    const [trending, topRated, airing] = await Promise.all([
      getTrendingAnime().catch(() => []),
      getTopRatedAnime().catch(() => []),
      getAiringAnime().catch(() => []),
    ]);

    const seenSlugs = new Set<string>();
    const combinedAnime = [...trending, ...airing, ...topRated];

    for (const item of combinedAnime) {
      if (item?.slug && !seenSlugs.has(item.slug)) {
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

  // 6. High-priority Manga entries
  let mangaRoutes: MetadataRoute.Sitemap = [];
  try {
    const trendingManga = await getTrendingMangaList(40).catch(() => []);
    const seenMangaIds = new Set<string>();

    for (const item of trendingManga) {
      if (item?.id && !seenMangaIds.has(item.id)) {
        seenMangaIds.add(item.id);
        mangaRoutes.push({
          url: getAbsoluteUrl(`/manga/${item.id}`),
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
