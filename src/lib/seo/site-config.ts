/**
 * AniWaveX SEO Site Configuration
 * Centralized site constants and URL helpers
 */

export const SITE_CONFIG = {
  name: "AniWaveX",
  title: "AniWaveX - Premium Anime Streaming & Discovery Platform",
  tagline: "Discover, Track, and Stream High-Quality Anime & Manga",
  description:
    "Explore thousands of subbed and dubbed anime series, read the latest manga chapters, and track currently airing seasonal releases in HD without interruptions.",
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://www.aniwavex.bond"),
  ogImage: "https://media.kitsu.io/anime/poster_images/1/large.jpg",
  twitterHandle: "@aniwavex",
  locale: "en_US",
} as const;

export function getAbsoluteUrl(path: string = ""): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const base = SITE_CONFIG.siteUrl.replace(/\/+$/, "");
  return `${base}${cleanPath}`;
}
