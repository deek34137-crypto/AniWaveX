import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import AnimeRow from "@/components/AnimeRow";
import JumpBackInRow from "@/components/JumpBackInRow";
import TodayAiringRow from "@/components/TodayAiringRow";
import AnimeRowSkeleton from "@/components/AnimeRowSkeleton";
import TodayAiringSkeleton from "@/components/TodayAiringSkeleton";
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

// Streamed async Server Component for below-the-fold genre rows
async function StreamedGenreRow({
  genre,
  title,
  viewAllHref,
}: {
  genre: string;
  title: string;
  viewAllHref: string;
}) {
  const items = await getGenreAnime(genre, 12).catch(() => []);
  if (!items || items.length === 0) return null;
  return <AnimeRow title={title} items={items} viewAllHref={viewAllHref} />;
}

// Streamed async Server Component for the today's airing schedule row
async function StreamedAiringRow() {
  const airingSchedule = await getUnifiedAiringSchedule().catch(() => []);
  return <TodayAiringRow initialSchedule={airingSchedule} />;
}

export default async function Home() {
  // Critical above-the-fold content: Only block on primary trending & top rated anime
  const [trending, topRated] = await Promise.all([
    getTrendingAnime().catch(() => []),
    getTopRatedAnime().catch(() => []),
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

        {/* Streamed: Airing Schedule */}
        <Suspense fallback={<TodayAiringSkeleton />}>
          <StreamedAiringRow />
        </Suspense>

        {/* Critical rows: Trending and Highest Rated */}
        <AnimeRow title="Trending Now" items={trendingRow} viewAllHref="/catalog?sort=popularity" />
        <AnimeRow title="Highest Rated" items={topRated} viewAllHref="/catalog?sort=rating" />

        {/* Streamed non-critical rows: Romance */}
        <Suspense fallback={<AnimeRowSkeleton title="Best of Romance" />}>
          <StreamedGenreRow
            genre="romance"
            title="Best of Romance"
            viewAllHref="/genre/romance"
          />
        </Suspense>

        {/* Streamed non-critical rows: Comedy */}
        <Suspense fallback={<AnimeRowSkeleton title="Top Comedy" />}>
          <StreamedGenreRow
            genre="comedy"
            title="Top Comedy"
            viewAllHref="/genre/comedy"
          />
        </Suspense>

        {/* Streamed non-critical rows: Isekai */}
        <Suspense fallback={<AnimeRowSkeleton title="Best Isekai" />}>
          <StreamedGenreRow
            genre="isekai"
            title="Best Isekai"
            viewAllHref="/genre/isekai"
          />
        </Suspense>
      </div>
    </main>
  );
}
