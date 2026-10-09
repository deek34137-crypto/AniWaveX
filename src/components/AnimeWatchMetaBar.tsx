"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Calendar, Clock, ChevronDown, Sparkles, Building2 } from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import WatchlistDropdown from "@/components/WatchlistDropdown";
import { WatchlistStatus } from "@/lib/watchlist";

interface AnimeWatchMetaBarProps {
  anime: any;
  initialBookmarked?: boolean;
  initialBookmarkStatus?: WatchlistStatus | null;
  user?: any;
  lastWatchedEpisode?: number | null;
}

export default function AnimeWatchMetaBar({
  anime,
  initialBookmarked = false,
  initialBookmarkStatus = "watching",
  user,
  lastWatchedEpisode,
}: AnimeWatchMetaBarProps) {
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);

  if (!anime) return null;

  const hasDescription = Boolean(anime.description && anime.description.trim().length > 0);

  return (
    <div className="w-full bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Section: Poster Thumbnail + Main Metadata */}
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
          {anime.posterImage && (
            <div className="w-14 sm:w-16 md:w-20 aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-lg border border-white/15 relative bg-slate-900 group">
              <AnimeImage
                src={anime.posterImage}
                alt={`${anime.title} thumbnail`}
                fill
                sizes="(max-width: 640px) 56px, 80px"
                className="object-cover transform transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          )}

          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5">
              {anime.status && (
                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-md border border-blue-500/30">
                  {anime.status}
                </span>
              )}
              {anime.tags && anime.tags.length > 0 && (
                anime.tags.slice(0, 3).map((tag: string) => {
                  const tagSlug = tag.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  if (!tagSlug) return null;
                  return (
                    <Link
                      key={tag}
                      href={`/genre/${tagSlug}`}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[10px] sm:text-[11px] font-medium rounded-md border border-white/5 truncate max-w-[120px] transition-colors"
                    >
                      {tag}
                    </Link>
                  );
                })
              )}
              <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] border border-white/10 font-bold">
                HD
              </span>
            </div>

            {/* Anime Title */}
            <h2 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight leading-snug line-clamp-1 sm:line-clamp-2">
              {anime.title}
            </h2>

            {/* Details Row: Rating, Year, Duration, Studio */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
              {anime.rating && anime.rating !== "N/A" && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{anime.rating}</span>
                </div>
              )}
              {anime.year && /^\d{4}$/.test(String(anime.year).trim()) ? (
                <Link href={`/year/${String(anime.year).trim()}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{anime.year}</span>
                </Link>
              ) : anime.year && anime.year !== "Unknown" ? (
                <div className="flex items-center gap-1 text-slate-400">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{anime.year}</span>
                </div>
              ) : null}
              {(anime.duration || anime.totalEpisodes) && (
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    {anime.totalEpisodes ? `${anime.totalEpisodes} Eps` : anime.duration || "24m"}
                  </span>
                </div>
              )}
              {anime.studio && (
                <div className="hidden sm:flex items-center gap-1 text-slate-400">
                  <Building2 className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-[120px]">{anime.studio}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Watchlist Status Dropdown Button */}
        <div className="shrink-0 w-full md:w-auto">
          <WatchlistDropdown
            anime={anime}
            initialBookmarked={initialBookmarked}
            initialBookmarkStatus={initialBookmarkStatus}
            user={user}
            lastWatchedEpisode={lastWatchedEpisode}
            size="compact"
            direction="down"
            className="w-full md:w-auto"
          />
        </div>
      </div>

      {/* Expandable Synopsis Accordion */}
      {hasDescription && (
        <div className="mt-3.5 pt-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => setIsSynopsisExpanded(!isSynopsisExpanded)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-300 hover:text-white transition-colors group cursor-pointer"
            aria-expanded={isSynopsisExpanded}
          >
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
              <Sparkles className="w-3 h-3" />
              Synopsis
            </span>
            <span className="text-slate-400 text-[11px] group-hover:text-slate-200 flex items-center gap-1">
              {isSynopsisExpanded ? "Show Less" : "Read Synopsis"}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isSynopsisExpanded ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>
          <div
            className={`mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed transition-all ${
              isSynopsisExpanded ? "" : "line-clamp-2 text-slate-400"
            }`}
          >
            <p>{anime.description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
