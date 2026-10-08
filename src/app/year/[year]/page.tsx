import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogAnime } from "@/lib/api";
import { generateYearMetadata } from "@/lib/seo/metadata";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { Calendar, Flame, ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

function parseYear(raw: string): number | null {
  const num = parseInt(raw, 10);
  if (isNaN(num) || num < 1960 || num > 2100) return null;
  return num;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  const numYear = parseYear(year);
  if (!numYear) {
    return { title: "Year Not Found | AniWaveX" };
  }
  return generateYearMetadata(numYear);
}

export default async function YearPage({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { year } = await params;
  const sParams = searchParams ? await searchParams : {};
  const numYear = parseYear(year);

  if (!numYear) {
    notFound();
  }

  const page = sParams.page ? Math.max(1, parseInt(sParams.page, 10) || 1) : 1;

  const { data, meta } = await getCatalogAnime({
    year: numYear.toString(),
    page,
    sort: "popularity",
  });

  const totalCount = meta.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const prevYear = numYear - 1;
  const nextYear = numYear + 1;

  const itemList = data.map((item: any) => ({
    name: item.title,
    path: `/anime/${item.slug}`,
    image: item.posterImage || item.backgroundImage,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <JsonLd schema={createItemListSchema(`${numYear} Anime Releases`, itemList)} />
      <Navbar />
      <div className="page-top-spacer" />

      <div className="tv-safe-container pt-4 space-y-8">
        <Breadcrumbs
          items={[
            { name: "Anime", path: "/anime" },
            { name: `${numYear} Anime`, path: `/year/${numYear}` },
          ]}
        />

        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-white/10 p-6 sm:p-10 shadow-2xl">
          <div className="max-w-3xl space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Annual Anime Archive
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              {numYear} Anime Releases — Popular &amp; Top Rated Series
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore all anime movies, TV series, and OVAs originally broadcast or premiered in {numYear}. Review synopsis information, streaming details, and community ratings.
            </p>

            {/* Adjacent Year Fast Links */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              {prevYear >= 1960 && (
                <Link
                  href={`/year/${prevYear}`}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3 h-3" />
                  {prevYear} Anime
                </Link>
              )}
              {nextYear <= 2100 && (
                <Link
                  href={`/year/${nextYear}`}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                >
                  {nextYear} Anime
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Anime Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              {numYear} Series ({totalCount.toLocaleString()} Titles)
            </h2>
          </div>

          {data.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-slate-400">
              No anime found for {numYear}.
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
