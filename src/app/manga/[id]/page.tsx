import { getMangaDetails, getMangaChapters } from "@/lib/manga/service";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { Star, BookOpen, ChevronRight, ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

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

      {/* Banner / Header Hero */}
      <div className="relative w-full h-64 sm:h-80 overflow-hidden bg-slate-900 border-b border-white/10">
        {manga.bannerImage ? (
          <Image
            src={manga.bannerImage}
            alt={manga.title}
            fill
            className="object-cover opacity-30 blur-sm scale-105"
            priority
          />
        ) : manga.posterImage ? (
          <Image
            src={manga.posterImage}
            alt={manga.title}
            fill
            className="object-cover opacity-20 blur-md scale-105"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />

        <div className="absolute bottom-6 left-4 sm:left-8 max-w-7xl mx-auto flex items-end gap-6 z-10">
          <div className="relative w-28 sm:w-40 aspect-[3/4] rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 shrink-0 hidden xs:block bg-slate-800">
            {manga.posterImage && (
              <Image src={manga.posterImage} alt={manga.title} fill className="object-cover" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/80 text-white text-xs font-bold uppercase">
                {manga.type}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium">
                {manga.status}
              </span>
              {manga.rating !== "N/A" && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {manga.rating}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white">{manga.title}</h1>
            {manga.romajiTitle && manga.romajiTitle !== manga.title && (
              <p className="text-sm text-slate-400">{manga.romajiTitle}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Synopsis & Genres */}
        <div className="space-y-6">
          <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              Synopsis
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {manga.description || "No synopsis available for this title."}
            </p>

            {manga.genres.length > 0 && (
              <div className="pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                {manga.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 text-xs font-medium border border-white/5"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chapters Index */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              Chapters ({chapters.length})
            </h2>
            {chapters.length > 0 && (
              <Link
                href={`/manga/${manga.id}/read?chapterId=${encodeURIComponent(chapters[0].id)}&ch=${chapters[0].chapterNumber}`}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20"
              >
                Start Reading Ch. {chapters[0].chapterNumber}
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {chapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/manga/${manga.id}/read?chapterId=${encodeURIComponent(ch.id)}&ch=${ch.chapterNumber}`}
                className="flex items-center justify-between p-3.5 bg-slate-900/70 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/40 rounded-xl transition-all group"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-white group-hover:text-cyan-400 transition-colors block truncate">
                    {ch.title}
                  </span>
                  <span className="text-[11px] text-slate-400">Source: {ch.source}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
