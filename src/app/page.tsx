import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import AnimeRow from "@/components/AnimeRow";
import JumpBackInRow from "@/components/JumpBackInRow";
import TodayAiringRow from "@/components/TodayAiringRow";
import { getTrendingAnime, getTopRatedAnime, getGenreAnime } from "@/lib/api";
import { getUnifiedAiringSchedule } from "@/lib/schedule";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { SITE_CONFIG, getAbsoluteUrl } from "@/lib/seo/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AniWaveX — Watch Anime Online & Discover Latest Series",
  description: SITE_CONFIG.description,
  alternates: {
    canonical: getAbsoluteUrl("/"),
  },
  openGraph: {
    title: "AniWaveX — Watch Anime Online & Discover Latest Series",
    description: SITE_CONFIG.description,
    url: getAbsoluteUrl("/"),
    siteName: SITE_CONFIG.name,
    images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: "AniWaveX Anime Discovery" }],
    type: "website",
  },
};

export default async function Home() {
  const [trending, topRated, romance, comedy, isekai, airingSchedule] = await Promise.all([
    getTrendingAnime(),
    getTopRatedAnime(),
    getGenreAnime("romance", 12),
    getGenreAnime("comedy", 12),
    getGenreAnime("isekai", 12),
    getUnifiedAiringSchedule().catch(() => []),
  ]);

  // Use top 5 trending anime for the hero slider
  const heroAnimeList = trending.slice(0, 5);
  // The rest for the trending row
  const trendingRow = trending.slice(5);

  const featuredItemList = trending.slice(0, 10).map((a: any) => ({
    name: a.title,
    path: `/anime/${a.slug}`,
    image: a.posterImage || a.backgroundImage,
  }));

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <JsonLd schema={createItemListSchema("Popular & Trending Anime Series", featuredItemList)} />
      <Navbar />
      <div className="page-top-spacer"></div>

      <div className="tv-safe-container space-y-4 tv:space-y-8">
        <HeroSlider animeList={heroAnimeList} />
        
        <JumpBackInRow />

        <TodayAiringRow initialSchedule={airingSchedule} />

        <AnimeRow title="Trending Now" items={trendingRow} viewAllHref="/catalog?sort=popularity" />
        <AnimeRow title="Highest Rated" items={topRated} viewAllHref="/catalog?sort=rating" />

        {romance && romance.length > 0 && (
          <AnimeRow
            title="Best of Romance"
            items={romance}
            viewAllHref="/genre/romance"
          />
        )}

        {comedy && comedy.length > 0 && (
          <AnimeRow
            title="Top Comedy"
            items={comedy}
            viewAllHref="/genre/comedy"
          />
        )}

        {isekai && isekai.length > 0 && (
          <AnimeRow
            title="Best Isekai"
            items={isekai}
            viewAllHref="/genre/isekai"
          />
        )}
      </div>
    </main>
  );
}
