import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogAnime, SEASON_MAP } from "@/lib/api";
import { generateSeasonMetadata } from "@/lib/seo/metadata";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { Calendar, Radio, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

function parseSeasonSlug(slug: string): { season: string; year: string } | null {
  const match = slug.toLowerCase().match(/^([a-z]+)-(\d{4})$/);
  if (!match) return null;
  const [, season, year] = match;
  if (!SEASON_MAP[season]) return null;
  const numYear = parseInt(year, 10);
  if (isNaN(numYear) || numYear < 1960 || numYear > 2100) return null;
  return { season, year };
}

function getAdjacentSeasons(season: string, year: number) {
  const order = ["winter", "spring", "summer", "fall"];
  const curIdx = order.indexOf(season);

  const prevIdx = (curIdx - 1 + 4) % 4;
  const prevYear = curIdx === 0 ? year - 1 : year;
  const prevSlug = `${order[prevIdx]}-${prevYear}`;

  const nextIdx = (curIdx + 1) % 4;
  const nextYear = curIdx === 3 ? year + 1 : year;
  const nextSlug = `${order[nextIdx]}-${nextYear}`;

  return {
    prev: { season: order[prevIdx], year: prevYear, slug: prevSlug },
    next: { season: order[nextIdx], year: nextYear, slug: nextSlug },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSeasonSlug(slug);
  if (!parsed) {
    return { title: "Anime Season Not Found | AniWaveX" };
  }
  return generateSeasonMetadata(parsed.season, parsed.year);
}

export default async function SeasonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const parsed = parseSeasonSlug(slug);

  if (!parsed) {
    notFound();
  }

  const { season, year } = parsed;
  const page = sParams.page ? Math.max(1, parseInt(sParams.page, 10) || 1) : 1;

  const { data, meta } = await getCatalogAnime({
    season,
    year,
    page,
    sort: "popularity",
  });

  const totalCount = meta.count || 0;
  const totalPages = Math.ceil(totalCount / 20);
  const formattedSeason = season.charAt(0).toUpperCase() + season.slice(1);
  const adj = getAdjacentSeasons(season, parseInt(year, 10));

  const itemList = data.map((item: any) => ({
    name: item.title,
    path: `/anime/${item.slug}`,
    image: item.posterImage || item.backgroundImage,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <JsonLd schema={createItemListSchema(`${formattedSeason} ${year} Anime`, itemList)} />
      <Navbar />
      <div className="page-top-spacer" />

      <div className="tv-safe-container pt-4 space-y-8">
        <Breadcrumbs
          items={[
            { name: "Anime", path: "/anime" },
            { name: `${formattedSeason} ${year}`, path: `/season/${slug}` },
          ]}
        />

        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-purple-950/80 via-slate-900 to-blue-950/80 border border-white/10 p-6 sm:p-10 shadow-2xl">
          <div className="max-w-3xl space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Seasonal Anime Guide
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              {formattedSeason} {year} Anime — Airing &amp; Upcoming Schedule
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore all new releases, continuing simulcasts, and highly anticipated premiere titles for the {formattedSeason} {year} anime season. Watch episodes, view airing schedules, and track community ratings.
            </p>

            {/* Adjacent Season Fast Navigation */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/season/${adj.prev.slug}`}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3 h-3" />
                Previous: {adj.prev.season.toUpperCase()} {adj.prev.year}
              </Link>
              <Link
                href={`/season/${adj.next.slug}`}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                Next: {adj.next.season.toUpperCase()} {adj.next.year}
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Anime Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-purple-400" />
              {formattedSeason} {year} Releases ({totalCount.toLocaleString()} Series)
            </h2>
          </div>

          {data.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-slate-400">
              No anime found for {formattedSeason} {year}. Check back soon as broadcasting schedules are announced.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {data.map((item: any) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                searchParams={sParams}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
