"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, PlayCircle, X } from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { useAuth } from "@/providers/AuthProvider";

interface WatchHistoryItem {
  animeSlug: string;
  animeTitle: string;
  posterImage?: string;
  episodeId: number;
  episodeTitle?: string;
  progressSeconds?: number;
  totalSeconds?: number;
  updatedAt?: number;
}

export default function ContinueWatchingRow() {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, supabase } = useAuth();

  useEffect(() => {
    async function loadWatchHistory() {
      try {
        // 1. Try fetching from Supabase if logged in
        if (user) {
          const { data: records } = await supabase
            .from("watch_history")
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(12);

          if (records && records.length > 0) {
            const mapped: WatchHistoryItem[] = records.map((r: any) => ({
              animeSlug: r.anime_slug,
              animeTitle: r.anime_title,
              posterImage: r.poster_image,
              episodeId: r.last_episode_watched || 1,
              progressSeconds: r.progress_seconds || 0,
              totalSeconds: 1440, // 24m fallback
              updatedAt: new Date(r.updated_at).getTime(),
            }));
            setItems(mapped);
            setLoading(false);
            return;
          }
        }

        // 2. Fallback to localStorage for guests
        const raw = localStorage.getItem("aniwavex_recent_watches");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        }
      } catch (err) {
        console.error("Failed to load continue watching history:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWatchHistory();
  }, [user, supabase]);

  const handleRemove = (e: React.MouseEvent, animeSlug: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Remove from local state
    setItems((prev) => prev.filter((it) => it.animeSlug !== animeSlug));

    // 2. Remove from localStorage
    try {
      const raw = localStorage.getItem("aniwavex_recent_watches");
      if (raw) {
        let list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list = list.filter((it: any) => it.animeSlug !== animeSlug);
          localStorage.setItem("aniwavex_recent_watches", JSON.stringify(list));
        }
      }
    } catch {}

    // 3. Remove from Supabase if authenticated
    if (user) {
      supabase
        .from("watch_history")
        .delete()
        .eq("user_id", user.id)
        .eq("anime_slug", animeSlug)
        .then(() => {});
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="w-full mt-10 mb-8 px-2 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <PlayCircle className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Continue Watching
          </h2>
        </div>
      </div>

      {/* Horizontal Carousel with Vertical Rectangle Cards */}
      <div className="flex overflow-x-auto gap-4 pb-4 px-1 snap-x snap-mandatory hide-scrollbar">
        {items.map((item) => {
          const totalSec = item.totalSeconds || 1440;
          const progSec = item.progressSeconds || 0;
          const pct = Math.min(100, Math.max(5, Math.round((progSec / totalSec) * 100)));

          return (
            <Link
              key={item.animeSlug}
              href={`/anime/${item.animeSlug}`}
              className="snap-start shrink-0 w-[155px] sm:w-[185px] md:w-[205px] group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] hover:scale-[1.02]"
            >
              {/* Vertical Aspect Container (aspect-[2/3]) */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                <AnimeImage
                  src={item.posterImage}
                  alt={item.animeTitle}
                  sizes="(max-width: 640px) 155px, (max-width: 1024px) 185px, 205px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none" />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                  <span className="px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm">
                    EP {item.episodeId}
                  </span>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => handleRemove(e, item.animeSlug)}
                    className="p-1 bg-black/70 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm border border-white/10"
                    title="Remove from Continue Watching"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Play Hover Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Bottom Title & Progress Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
                  <h3
                    className="text-white font-bold text-sm line-clamp-1 mb-1 group-hover:text-blue-400 transition-colors drop-shadow-md"
                    title={item.animeTitle}
                  >
                    {item.animeTitle}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                    <span className="text-slate-400">Episode {item.episodeId}</span>
                    <span className="text-blue-400 font-bold">{pct}%</span>
                  </div>

                  {/* Bottom Progress Bar */}
                  <div className="mt-2 w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
