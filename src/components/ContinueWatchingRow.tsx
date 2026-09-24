"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Play, PlayCircle, X, Bookmark } from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { useAuth } from "@/providers/AuthProvider";
import { filterActiveSequelPrequels, checkAnimeHasSequel } from "@/lib/franchise";

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
  const { user, supabase, isBookmarked: checkBookmarked, toggleBookmark } = useAuth();

  const loadWatchHistory = useCallback(async () => {
    try {
      let dbMapped: WatchHistoryItem[] = [];
      if (user) {
        const { data: records } = await supabase
          .from("watch_history")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(12);

        if (records && records.length > 0) {
          dbMapped = records.map((r: any) => {
            const slug = r.anime_slug;
            const epId = r.last_episode_watched || 1;

            // Pull per-episode localStorage progress as a more accurate source
            let localProgress = 0;
            let localDuration = 0;
            try {
              const localRaw = localStorage.getItem(`watch_progress_${slug}_ep_${epId}`);
              if (localRaw) {
                const lp = JSON.parse(localRaw);
                localProgress = lp.currentTime || 0;
                localDuration = lp.duration || 0;
              }
            } catch {}

            // Use the higher of DB vs localStorage progress
            const dbProgress = r.progress_seconds || 0;
            const bestProgress = Math.max(dbProgress, Math.floor(localProgress));

            // Use localStorage duration if DB has none yet
            const dbDuration = r.total_seconds > 0 ? r.total_seconds : 0;
            const bestDuration = dbDuration > 0 ? dbDuration : (localDuration > 0 ? Math.floor(localDuration) : 1440);

            return {
              animeSlug: slug,
              animeTitle: r.anime_title,
              posterImage: r.poster_image,
              episodeId: epId,
              progressSeconds: bestProgress,
              totalSeconds: bestDuration,
              updatedAt: new Date(r.updated_at).getTime(),
            };
          });
        }
      }

      // Read from localStorage
      let localItems: WatchHistoryItem[] = [];
      try {
        const raw = localStorage.getItem("aniwavex_recent_watches");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localItems = parsed;
          }
        }
      } catch {}

      // Merge DB items with local items (DB items take precedence)
      const mergedMap = new Map<string, WatchHistoryItem>();
      dbMapped.forEach((it) => {
        if (it.animeSlug) mergedMap.set(it.animeSlug, it);
      });
      localItems.forEach((it) => {
        if (it.animeSlug && !mergedMap.has(it.animeSlug)) {
          mergedMap.set(it.animeSlug, it);
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );

      // Collect completed anime slugs from localStorage & Supabase
      const completedSlugs = new Set<string>();
      try {
        const rawWatchlist = localStorage.getItem("aniwavex_watchlist");
        if (rawWatchlist) {
          const parsed = JSON.parse(rawWatchlist);
          if (Array.isArray(parsed)) {
            parsed.forEach((w: any) => {
              if (w.status === "completed" && w.anime_slug) {
                completedSlugs.add(w.anime_slug);
              }
            });
          }
        }
      } catch {}

      if (user) {
        try {
          const { data: dbCompleted } = await supabase
            .from("bookmarks")
            .select("anime_slug")
            .eq("user_id", user.id)
            .eq("status", "completed");
          if (dbCompleted) {
            dbCompleted.forEach((b: any) => {
              if (b.anime_slug) completedSlugs.add(b.anime_slug);
            });
          }
        } catch {}
      }

      // If user is actively watching a sequel, remove the completed prequel from Continue Watching
      const filteredList = filterActiveSequelPrequels(mergedList, completedSlugs);

      setItems(filteredList.slice(0, 12));

      // Check completed anime in batch: if they have NO sequel, remove from Continue Watching
      // Only use completedSlugs as the source of truth (not the >= 11 magic number) (bug #5)
      const completedItems = mergedList.filter((item) => completedSlugs.has(item.animeSlug));
      if (completedItems.length > 0) {
        await Promise.all(
          completedItems.map(async (item) => {
            const hasSequel = await checkAnimeHasSequel({ slug: item.animeSlug, title: item.animeTitle });
            if (!hasSequel) {
              // Remove from localStorage
              try {
                const rawRecent = localStorage.getItem("aniwavex_recent_watches");
                if (rawRecent) {
                  const list = JSON.parse(rawRecent);
                  const updated = list.filter((x: any) => (x.animeSlug || x.slug) !== item.animeSlug);
                  localStorage.setItem("aniwavex_recent_watches", JSON.stringify(updated));
                }
              } catch {}

              // Remove from Supabase
              if (user) {
                supabase
                  .from("watch_history")
                  .delete()
                  .eq("user_id", user.id)
                  .eq("anime_slug", item.animeSlug)
                  .then(() => {});
              }

              // Update local state
              setItems((prev) => prev.filter((it) => it.animeSlug !== item.animeSlug));
            }
          })
        );
      }
    } catch (err) {
      console.error("Failed to load continue watching history:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadWatchHistory();

    const handleWatchUpdate = () => {
      loadWatchHistory();
    };

    // Only reload on relevant localStorage keys — not every 2s progress write (bug #20)
    const handleStorageUpdate = (e: StorageEvent) => {
      if (!e.key || e.key === "aniwavex_recent_watches" || e.key === "aniwavex_watchlist") {
        loadWatchHistory();
      }
    };

    window.addEventListener("aniwavex_watch_updated", handleWatchUpdate);
    window.addEventListener("aniwavex_watchlist_updated", handleWatchUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      window.removeEventListener("aniwavex_watch_updated", handleWatchUpdate);
      window.removeEventListener("aniwavex_watchlist_updated", handleWatchUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, [loadWatchHistory]);

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

  const handleToggleBookmark = async (e: React.MouseEvent, item: WatchHistoryItem) => {
    e.preventDefault();
    e.stopPropagation();

    await toggleBookmark({
      slug: item.animeSlug,
      title: item.animeTitle,
      posterImage: item.posterImage,
    });
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
          const totalSec = item.totalSeconds || 0;
          const progSec = item.progressSeconds || 0;
          // Only show progress if we have both timestamps; avoid misleading % with a hardcoded duration fallback (bug #26)
          const hasDuration = totalSec > 0;
          const pct = hasDuration ? Math.min(100, Math.round((progSec / totalSec) * 100)) : 0;
          const isSaved = checkBookmarked(item.animeSlug);

          return (
            <div
              key={item.animeSlug}
              className="snap-start shrink-0 w-[155px] sm:w-[185px] md:w-[205px] group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] hover:scale-[1.02]"
            >
              {/* Media & Title Link */}
              <Link
                href={`/anime/${item.animeSlug}${item.episodeId ? `?ep=${item.episodeId}` : ""}`}
                prefetch={true}
                className="block relative aspect-[2/3] w-full overflow-hidden bg-slate-950 cursor-pointer"
                aria-label={`Continue watching ${item.animeTitle} Episode ${item.episodeId}`}
              >
                <AnimeImage
                  src={item.posterImage}
                  alt={item.animeTitle}
                  sizes="(max-width: 640px) 155px, (max-width: 1024px) 185px, 205px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                {/* Top Badge (Matches watchlist badge style) */}
                <div className="absolute top-2 left-2 z-10 pointer-events-none">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-md backdrop-blur-md bg-blue-600/20 text-blue-400 border-blue-500/30">
                    EP {item.episodeId}
                  </span>
                </div>

                {/* Play Hover Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-600/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Bottom Title & Progress Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none">
                  <h3
                    className="text-white font-bold text-sm truncate mb-1 group-hover:text-blue-400 transition-colors drop-shadow-md"
                    title={item.animeTitle}
                  >
                    {item.animeTitle}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                    <span className="text-slate-400">Episode {item.episodeId}</span>
                    {hasDuration && <span className="text-blue-400 font-bold">{pct}%</span>}
                  </div>

                  {/* Bottom Progress Bar — only rendered when we know total duration (bug #26) */}
                  {hasDuration && (
                    <div className="mt-2 w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>

              {/* Action Buttons: Add to List + Remove from Continue Watching (Always visible on touch/mobile, hover on desktop) */}
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {/* Add/Remove to Watchlist Button */}
                <button
                  type="button"
                  onClick={(e) => handleToggleBookmark(e, item)}
                  className={`p-1.5 rounded-full transition-colors backdrop-blur-md border border-white/10 ${
                    isSaved
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-black/75 hover:bg-blue-600 text-slate-300 hover:text-white"
                  }`}
                  title={isSaved ? "In Watchlist" : "Add to Watchlist"}
                  aria-label={isSaved ? `In watchlist` : `Add ${item.animeTitle} to watchlist`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
                </button>

                {/* Remove from Continue Watching Button */}
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, item.animeSlug)}
                  className="p-1.5 bg-black/75 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
                  title="Remove from Continue Watching"
                  aria-label={`Remove ${item.animeTitle} from continue watching`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
