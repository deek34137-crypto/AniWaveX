"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Play, Plus, Check } from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { useAuth } from "@/providers/AuthProvider";
import { WatchlistStatus } from "@/lib/watchlist";

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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const { user, supabase } = useAuth();

  // Check initial bookmark status from localStorage & Supabase
  useEffect(() => {
    try {
      const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
      if (localWatchlist.some((it: any) => it.anime_slug === anime.slug)) {
        setIsBookmarked(true);
      }
    } catch {}

    if (user && anime.slug) {
      supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", user.id)
        .eq("anime_slug", anime.slug)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setIsBookmarked(true);
        });
    }
  }, [user, anime.slug, supabase]);

  const handleQuickBookmark = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let activeUser = user;
    if (!activeUser) {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (liveUser) activeUser = liveUser;
    }

    if (!activeUser) {
      alert("Please sign in to save anime to your watchlist.");
      return;
    }

    setIsBookmarking(true);
    const nextState = !isBookmarked;
    setIsBookmarked(nextState);

    try {
      if (nextState) {
        // 1. Check if record exists
        const { data: existing } = await supabase
          .from("bookmarks")
          .select("id")
          .eq("user_id", activeUser.id)
          .eq("anime_slug", anime.slug)
          .maybeSingle();

        if (existing?.id) {
          await supabase
            .from("bookmarks")
            .update({
              status: "watching" as WatchlistStatus,
              anime_title: anime.title,
              poster_image: anime.posterImage || anime.backgroundImage,
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("bookmarks").insert({
            user_id: activeUser.id,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: "watching" as WatchlistStatus,
          });
        }

        // Mirror to localStorage
        try {
          const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
          const item = {
            id: anime.slug,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: "watching",
            user_id: activeUser.id,
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("aniwavex_watchlist", JSON.stringify([item, ...localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)]));
        } catch {}
      } else {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("user_id", activeUser.id)
          .eq("anime_slug", anime.slug);

        try {
          const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
          localStorage.setItem("aniwavex_watchlist", JSON.stringify(localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)));
        } catch {}
      }
    } catch (err) {
      console.error("Failed to update bookmark:", err);
      // Fallback mirror to localStorage so user doesn't lose state
      try {
        const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
        if (nextState) {
          const item = {
            id: anime.slug,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: "watching",
            user_id: activeUser.id,
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("aniwavex_watchlist", JSON.stringify([item, ...localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)]));
        } else {
          localStorage.setItem("aniwavex_watchlist", JSON.stringify(localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)));
        }
      } catch {}
    } finally {
      setIsBookmarking(false);
    }
  };

  const isOngoing = anime.status === "Ongoing" || anime.status === "current";
  const bgImg = anime.posterImage || anime.backgroundImage;

  return (
    <div className={`relative group rounded-2xl cursor-pointer ${className}`}>
      <Link href={`/anime/${anime.slug}`} className="block w-full h-full">
        {/* Base Vertical Rectangle Card */}
        <div
          className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 transition-all duration-300 group-hover:border-blue-500/60 group-hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] group-hover:scale-[1.03] ${
            aspectRatio === "poster" ? "aspect-[2/3]" : "aspect-video"
          }`}
        >
          {/* Cover Poster Image */}
          <AnimeImage
            src={bgImg}
            alt={anime.title}
            sizes={sizes || "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Dark Bottom/Top Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

          {/* Top Status & Score Badges */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
            {isOngoing ? (
              <span className="px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm">
                AIRING
              </span>
            ) : (
              <span />
            )}

            {anime.rating && anime.rating !== "N/A" && (
              <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 shadow-sm">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-xs font-bold text-white">{anime.rating}</span>
              </div>
            )}
          </div>

          {/* Center Play Overlay Icon (Fade in on hover) */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>

          {/* Bottom Title & Details Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3.5 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent transform translate-y-0 transition-transform duration-300">
            <div className="flex items-start justify-between gap-1.5 mb-1">
              <h3
                className="text-white font-bold text-sm line-clamp-1 leading-snug drop-shadow-md group-hover:text-blue-400 transition-colors"
                title={anime.title}
              >
                {anime.title}
              </h3>

              {/* Quick Bookmark Button */}
              <button
                onClick={handleQuickBookmark}
                disabled={isBookmarking}
                className={`shrink-0 p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 ${
                  isBookmarked
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-black/60 hover:bg-blue-600 text-slate-300 hover:text-white border border-white/10"
                }`}
                title={isBookmarked ? "In Watchlist" : "Add to Watchlist"}
              >
                {isBookmarked ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
              </button>
            </div>

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
    </div>
  );
}
