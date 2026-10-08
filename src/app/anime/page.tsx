import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { getTrendingAnime, getTopRatedAnime, getAiringAnime, GENRE_MAP } from "@/lib/api";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { getAbsoluteUrl, SITE_CONFIG } from "@/lib/seo/site-config";
import { Sparkles, Flame, Star, Radio, Compass, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anime Discovery — Watch Online, Episodes & Airing Series",
  description:
    "Explore thousands of anime series, movies, and OVAs. Stream trending shows, top-rated classics, and newly airing seasonal simulcasts in high quality on AniWaveX.",
  alternates: {
    canonical: getAbsoluteUrl("/anime"),
  },
  openGraph: {
    title: "Anime Discovery & Series Catalog — AniWaveX",
    description:
      "Explore thousands of anime series, movies, and OVAs on AniWaveX with episode guides, ratings, and streaming information.",
    url: getAbsoluteUrl("/anime"),
    siteName: SITE_CONFIG.name,
    images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: "Anime Discovery on AniWaveX" }],
    type: "website",
  },
};

export default async function AnimeIndexPage() {
  const [trending, airing, topRated] = await Promise.all([
    getTrendingAnime().catch(() => []),
    getAiringAnime().catch(() => []),
    getTopRatedAnime().catch(() => []),
  ]);

  const currentYear = new Date().getFullYear();
  const popularGenres = Object.keys(GENRE_MAP);

  const featuredItemList = trending.slice(0, 10).map((a: any) => ({
    name: a.title,
    path: `/anime/${a.slug}`,
    image: a.posterImage || a.backgroundImage,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <JsonLd schema={createItemListSchema("Popular Anime Series", featuredItemList)} />
      <Navbar />
      <div className="page-top-spacer" />

      <div className="tv-safe-container pt-4 space-y-10">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={[{ name: "Anime", path: "/anime" }]} />

        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-950/80 via-indigo-950/60 to-slate-900 border border-white/10 p-6 sm:p-10 lg:p-12 shadow-2xl">
          <div className="max-w-3xl space-y-4">
            <span className="px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Anime Directory &amp; Guide
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              Discover Anime Series, Episodes &amp; Simulcasts
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Find your next favorite anime from comprehensive seasonal lists, genre collections, and community ratings. Track episode releases, read detailed synopses, and stream in crisp HD.
            </p>

            {/* Quick Filter Navigation Chips */}
            <div className="pt-2 flex flex-wrap gap-2">
              <Link
                href="/airing"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-all flex items-center gap-1.5"
              >
                <Radio className="w-3 h-3 text-blue-400" />
                This Week's Airing
              </Link>
              <Link
                href={`/season/fall-${currentYear}`}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-all flex items-center gap-1.5"
              >
                Fall {currentYear} Anime
              </Link>
              <Link
                href={`/season/winter-${currentYear + 1}`}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all flex items-center gap-1.5"
              >
                Winter {currentYear + 1} Upcoming
              </Link>
              <Link
                href="/catalog"
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-semibold border border-white/10 transition-all flex items-center gap-1.5"
              >
                <Compass className="w-3 h-3 text-slate-400" />
                All Filters
              </Link>
            </div>
          </div>
        </div>

        {/* Explore by Genre Hub */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Explore Anime by Genre
            </h2>
            <Link href="/catalog" className="text-xs sm:text-sm text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
              View All Filters <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 gap-3">
            {popularGenres.map((g) => (
              <Link
                key={g}
                href={`/genre/${g}`}
                className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
              >
                <h3 className="text-sm font-bold text-white group-hover:text-blue-400 capitalize transition-colors">
                  {g} Anime
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">Browse top {g} titles</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Currently Airing Anime Section */}
        {airing.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-blue-400 animate-pulse" />
                Currently Airing Anime
              </h2>
              <Link href="/airing" className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                Full Broadcast Schedule <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {airing.slice(0, 12).map((item: any) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Anime Section */}
        {trending.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                Trending Anime Series
              </h2>
              <Link href="/catalog?sort=popularity" className="text-xs sm:text-sm text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
                View All Trending <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {trending.slice(0, 12).map((item: any) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          </section>
        )}

        {/* Highest Rated Classics */}
        {topRated.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                All-Time Highest Rated Anime
              </h2>
              <Link href="/catalog?sort=rating" className="text-xs sm:text-sm text-yellow-400 hover:text-yellow-300 font-bold flex items-center gap-1">
                View Top Rated <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {topRated.slice(0, 12).map((item: any) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
