"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Star, Play, Bookmark, Check, Plus, Info } from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { createClient } from "@/lib/supabase/client";
import { WATCHLIST_STATUSES, WatchlistStatus } from "@/lib/watchlist";

interface AnimeCardProps {
  anime: {
    id: string | number;
    slug: string;
    title: string;
    posterImage?: string;
    backgroundImage?: string;
    rating?: string;
    year?: string;
    status?: string;
    duration?: string;
    tags?: string[];
    description?: string;
  };
  priority?: boolean;
  sizes?: string;
  className?: string;
  aspectRatio?: "poster" | "video";
}

export default function AnimeCard({
  anime,
  sizes,
  className = "",
  aspectRatio = "poster",
}: AnimeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [bookmarkStatus, setBookmarkStatus] = useState<WatchlistStatus | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const handleMouseEnter = () => {
    // 250ms delay to prevent jitter when cursor sweeps across cards
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHovered(false);
    setShowStatusMenu(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const handleQuickBookmark = async (e: React.MouseEvent, status: WatchlistStatus = "watching") => {
    e.preventDefault();
    e.stopPropagation();

    setIsBookmarking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Trigger alert if guest
        alert("Please sign in to save anime to your watchlist.");
        return;
      }

      setBookmarkStatus(status);
      setShowStatusMenu(false);

      await supabase.from("bookmarks").upsert(
        {
          user_id: user.id,
          anime_slug: anime.slug,
          anime_title: anime.title,
          poster_image: anime.posterImage,
          status: status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id, anime_slug" }
      );
    } catch (err) {
      console.error("Failed to bookmark anime:", err);
    } finally {
      setIsBookmarking(false);
    }
  };

  const isOngoing = anime.status === "Ongoing" || anime.status === "current";
  const bgImg = anime.backgroundImage || anime.posterImage;

  return (
    <div
      className={`relative group rounded-2xl cursor-pointer ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/anime/${anime.slug}`} className="block w-full h-full">
        {/* Base Card */}
        <div
          className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 transition-all duration-300 group-hover:border-blue-500/50 group-hover:shadow-[0_0_25px_rgba(37,99,235,0.2)] ${
            aspectRatio === "poster" ? "aspect-[2/3]" : "aspect-video"
          }`}
        >
          <AnimeImage
            src={anime.posterImage || bgImg}
            alt={anime.title}
            sizes={sizes || "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Subtle Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

          {/* Top Status & Score Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
            {isOngoing ? (
              <span className="px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm">
                AIRING
              </span>
            ) : <span />}

            {anime.rating && anime.rating !== "N/A" && (
              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 shadow-sm">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs font-bold text-white">{anime.rating}</span>
              </div>
            )}
          </div>

          {/* Play Overlay Icon (Visible on hover) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Bottom Title & Details */}
          <div className="absolute bottom-0 left-0 w-full p-3.5 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="text-white font-bold text-sm line-clamp-1 mb-1 leading-snug drop-shadow-md" title={anime.title}>
              {anime.title}
            </h3>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="text-slate-400">{anime.year || "Unknown"}</span>
              {anime.tags && anime.tags.length > 0 && (
                <span className="text-blue-400 text-[11px] font-semibold truncate max-w-[100px]">
                  {anime.tags[0]}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Desktop Quick-Preview Hover Popover */}
      {isHovered && anime.description && (
        <div
          className="hidden md:flex absolute -top-12 left-1/2 -translate-x-1/2 w-80 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-[0_15px_45px_rgba(0,0,0,0.8)] backdrop-blur-2xl p-4 flex-col gap-3 z-50 animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Preview Image */}
          <div className="relative w-full h-32 rounded-xl overflow-hidden bg-slate-950 border border-white/5">
            <AnimeImage
              src={bgImg}
              alt={anime.title}
              sizes="320px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <span className="text-xs font-bold text-white line-clamp-1 drop-shadow-md">
                {anime.title}
              </span>
              <div className="flex items-center gap-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-yellow-400 font-bold">
                <Star className="w-2.5 h-2.5 fill-current" />
                {anime.rating || "8.0"}
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded font-medium">
              {anime.year}
            </span>
            <span className="px-2 py-0.5 bg-white/10 text-slate-300 rounded font-medium">
              {anime.duration || "24m"}
            </span>
            <span className="px-2 py-0.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded font-bold">
              {anime.status}
            </span>
          </div>

          {/* Synopsis */}
          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
            {anime.description}
          </p>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
            <Link
              href={`/anime/${anime.slug}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch Now
            </Link>

            {/* Quick Watchlist Bookmark Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  if (bookmarkStatus) {
                    setShowStatusMenu(!showStatusMenu);
                  } else {
                    handleQuickBookmark(e, "watching");
                  }
                }}
                disabled={isBookmarking}
                className={`p-2 rounded-xl border transition-all hover:scale-105 ${
                  bookmarkStatus
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/10"
                }`}
                title="Add to Watchlist"
              >
                {bookmarkStatus ? (
                  <Check className="w-4 h-4 text-blue-400" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>

              {/* Status Picker Menu */}
              {showStatusMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
                  {Object.values(WATCHLIST_STATUSES).map((st) => (
                    <button
                      key={st.id}
                      onClick={(e) => handleQuickBookmark(e, st.id as WatchlistStatus)}
                      className={`w-full px-3 py-1.5 text-xs text-left font-medium transition-colors hover:bg-slate-800 ${
                        bookmarkStatus === st.id
                          ? "text-blue-400 font-bold bg-blue-500/10"
                          : "text-slate-200"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href={`/anime/${anime.slug}`}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 rounded-xl transition-all hover:scale-105"
              title="Anime Details"
            >
              <Info className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
