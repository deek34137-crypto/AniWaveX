"use client";

import Link from "next/link";
import Image from "next/image";
import { BookOpen, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";
import type { MangaAdaptation } from "@/lib/manga/types";

interface MangaAdaptationBridgeProps {
  manga?: MangaAdaptation | null;
  animeTitle?: string;
}

export default function MangaAdaptationBridge({
  manga,
  animeTitle,
}: MangaAdaptationBridgeProps) {
  if (!manga || !manga.id) return null;

  const displayTitle = manga.title || animeTitle || "Official Manga";
  const isSource = manga.relationType === "SOURCE";

  return (
    <section 
      aria-label="Manga adaptation reader link"
      className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-cyan-950/40 p-4 sm:p-6 shadow-2xl backdrop-blur-xl group hover:border-emerald-500/50 transition-all duration-300"
    >
      {/* Ambient background glow */}
      <div 
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl transition-all group-hover:bg-emerald-500/15" 
        aria-hidden="true" 
      />
      <div 
        className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl transition-all group-hover:bg-cyan-500/15" 
        aria-hidden="true" 
      />

      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
        {/* Left: Poster + Text Details */}
        <div className="flex items-center gap-3.5 sm:gap-5 flex-1 min-w-0">
          {manga.coverImage ? (
            <div className="relative w-14 sm:w-20 aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-xl border border-emerald-500/30 bg-slate-900 group-hover:scale-105 group-hover:border-emerald-400/60 transition-transform duration-300">
              <Image
                src={manga.coverImage}
                alt={`${displayTitle} manga cover visual`}
                fill
                sizes="(max-width: 640px) 56px, 80px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-14 sm:w-20 aspect-[2/3] shrink-0 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-emerald-400" />
            </div>
          )}

          <div className="space-y-1 min-w-0 flex-1">
            {/* Pill badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                {isSource ? "Original Source Material" : "Official Manga Adaptation"}
              </span>
              {manga.status && (
                <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/5 text-slate-300 border border-white/10">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  {manga.status === "FINISHED" ? "Completed" : "Ongoing"}
                </span>
              )}
              {manga.totalChapters && (
                <span className="hidden sm:inline-flex text-[10px] font-mono text-slate-400">
                  • {manga.totalChapters} Chapters
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight truncate">
              {displayTitle}
            </h3>

            {/* Subtext description */}
            <p className="text-xs sm:text-sm text-slate-300/90 line-clamp-2 leading-relaxed">
              Read ahead of the anime or explore the original panel artwork in the built-in manga reader with instant chapter streaming.
            </p>
          </div>
        </div>

        {/* Right: CTA Button */}
        <div className="w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <Link
            href={`/manga/${manga.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
            title={`Read ${displayTitle} on AniWaveX Manga`}
          >
            <BookOpen className="w-4 h-4 fill-slate-950/20" />
            <span>Read Official Manga</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
