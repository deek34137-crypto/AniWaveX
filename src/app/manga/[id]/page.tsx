import { getMangaDetails, getMangaChapters } from "@/lib/manga/service";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { Star, BookOpen, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import MangaDetailChaptersClient from "@/components/manga/MangaDetailChaptersClient";

export const dynamic = "force-dynamic";

export default async function MangaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const manga = await getMangaDetails(id);

  if (!manga) {
    notFound();
  }

  const chapters = await getMangaChapters(manga.title, manga.id, manga.romajiTitle);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <Navbar />
      <div className="page-top-spacer"></div>

      {/* Banner / Header Hero - Expansive Widescreen */}
      <div className="relative w-full h-72 sm:h-96 2xl:h-[420px] overflow-hidden bg-slate-900 border-b border-white/10 shadow-2xl">
        {/* Quick Back to Manga Catalog Link */}
        <div className="absolute top-4 left-4 sm:left-8 lg:left-12 z-20">
          <Link
            href="/manga"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-white/15 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all shadow-lg focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>All Manga</span>
          </Link>
        </div>

        {manga.bannerImage ? (
          <Image
            src={manga.bannerImage}
            alt={manga.title}
            fill
            className="object-cover opacity-35 blur-sm scale-105"
            priority
          />
        ) : manga.posterImage ? (
          <Image
            src={manga.posterImage}
            alt={manga.title}
            fill
            className="object-cover opacity-25 blur-md scale-105"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80" />

        <div className="absolute bottom-6 left-4 sm:left-8 lg:left-12 max-w-[1720px] 2xl:max-w-[1920px] mx-auto flex items-end gap-6 z-10">
          <div className="relative w-28 sm:w-44 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 shrink-0 hidden xs:block bg-slate-800">
            {manga.posterImage && (
              <Image src={manga.posterImage} alt={manga.title} fill className="object-cover" />
            )}
          </div>

          <div className="space-y-2.5 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-cyan-500/80 text-white text-xs font-bold uppercase tracking-wider">
                {manga.type}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-white/10 text-slate-200 text-xs font-semibold">
                {manga.status}
              </span>
              {manga.rating !== "N/A" && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {manga.rating}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {manga.title}
            </h1>
            {manga.romajiTitle && manga.romajiTitle !== manga.title && (
              <p className="text-xs sm:text-sm text-slate-400 font-medium">{manga.romajiTitle}</p>
            )}


          </div>
        </div>
      </div>

      {/* Main Body - Expansive Desktop / TV Container */}
      <div className="max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12 mt-8 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {/* Left Column: Synopsis, Genres & Info */}
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/60 border border-white/10 rounded-3xl space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Synopsis
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-h-96 overflow-y-auto pr-1 hide-scrollbar">
              {manga.description || "No synopsis available for this title."}
            </p>

            {manga.genres.length > 0 && (
              <div className="pt-4 border-t border-white/5 space-y-2">
                <p className="text-xs font-semibold text-slate-400">Genres</p>
                <div className="flex flex-wrap gap-1.5">
                  {manga.genres.map((g) => (
                    <span
                      key={g}
                      className="px-2.5 py-1 rounded-lg bg-white/5 text-slate-300 text-xs font-medium border border-white/5 hover:border-cyan-500/30 transition-colors"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chapters Index Client */}
        <div className="lg:col-span-2 xl:col-span-3">
          <MangaDetailChaptersClient
            mangaId={manga.id}
            chapters={chapters}
            mangaTitle={manga.title}
            posterImage={manga.posterImage}
          />
        </div>
      </div>
    </div>
  );
}
