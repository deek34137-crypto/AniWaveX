"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Zap,
  BookOpen,
  X,
  Bookmark,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { useAuth } from "@/providers/AuthProvider";
import { filterActiveSequelPrequels, checkAnimeHasSequel } from "@/lib/franchise";

export type JumpBackInFilter = "all" | "anime" | "manga";

export interface UnifiedHistoryItem {
  type: "anime" | "manga";
  id: string; // animeSlug or mangaId
  title: string;
  posterImage?: string;
  updatedAt: number;

  // Anime-specific fields
  animeSlug?: string;
  episodeId?: number;
  episodeTitle?: string;
  progressSeconds?: number;
  totalSeconds?: number;

  // Manga-specific fields
  mangaId?: string;
  chapterId?: string;
  chapterNumber?: number;
  pageNumber?: number;
}

export default function JumpBackInRow() {
  const [animeItems, setAnimeItems] = useState<UnifiedHistoryItem[]>([]);
  const [mangaItems, setMangaItems] = useState<UnifiedHistoryItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<JumpBackInFilter>("all");
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { user, supabase, isBookmarked: checkBookmarked, toggleBookmark } = useAuth();

  // ── Load Anime Watch History ─────────────────────────────────────────────
  const loadAnimeHistory = useCallback(async () => {
    try {
      let dbMapped: UnifiedHistoryItem[] = [];
      if (user) {
        const { data: records } = await supabase
          .from("watch_history")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(16);

        if (records && records.length > 0) {
          dbMapped = records.map((r: any) => {
            const slug = r.anime_slug;
            const epId = r.last_episode_watched || 1;

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

            const dbProgress = r.progress_seconds || 0;
            const bestProgress = Math.max(dbProgress, Math.floor(localProgress));
            const dbDuration = r.total_seconds > 0 ? r.total_seconds : 0;
            const bestDuration =
              dbDuration > 0
                ? dbDuration
                : localDuration > 0
                ? Math.floor(localDuration)
                : 1440;

            let displayEpId = epId;
            let displayProgress = bestProgress;
            let displayDuration = bestDuration;
            if (bestDuration > 0 && bestProgress >= bestDuration * 0.9) {
              displayEpId = epId + 1;
              displayProgress = 0;
              try {
                const nextRaw = localStorage.getItem(`watch_progress_${slug}_ep_${displayEpId}`);
                if (nextRaw) {
                  const np = JSON.parse(nextRaw);
                  displayProgress = np.currentTime || 0;
                  displayDuration = np.duration || bestDuration;
                }
              } catch {}
            }

            return {
              type: "anime" as const,
              id: slug,
              animeSlug: slug,
              title: r.anime_title || "Anime",
              posterImage: r.poster_image,
              episodeId: displayEpId,
              progressSeconds: displayProgress,
              totalSeconds: displayDuration,
              updatedAt: new Date(r.updated_at).getTime(),
            };
          });
        }
      }

      let localItems: UnifiedHistoryItem[] = [];
      try {
        const raw = localStorage.getItem("aniwavex_recent_watches");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localItems = parsed.map((item: any) => {
              let epId = Number(item.episodeId) || 1;
              let prog = Number(item.progressSeconds) || 0;
              let dur = Number(item.totalSeconds) || 1440;
              if (dur > 0 && prog >= dur * 0.9) {
                epId = epId + 1;
                prog = 0;
                try {
                  const nextRaw = localStorage.getItem(`watch_progress_${item.animeSlug}_ep_${epId}`);
                  if (nextRaw) {
                    const np = JSON.parse(nextRaw);
                    prog = np.currentTime || 0;
                    dur = np.duration || dur;
                  }
                } catch {}
              }
              return {
                type: "anime" as const,
                id: item.animeSlug,
                animeSlug: item.animeSlug,
                title: item.animeTitle || "Anime",
                posterImage: item.posterImage,
                episodeId: epId,
                progressSeconds: prog,
                totalSeconds: dur,
                updatedAt: Number(item.updatedAt) || 0,
              };
            });
          }
        }
      } catch {}

      const mergedMap = new Map<string, UnifiedHistoryItem>();
      dbMapped.forEach((it) => {
        if (it.id) mergedMap.set(it.id, it);
      });
      localItems.forEach((it) => {
        if (it.id && !mergedMap.has(it.id)) {
          mergedMap.set(it.id, it);
        }
      });

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
      );

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

        try {
          const { data: dbHistoryCompleted } = await supabase
            .from("watch_history")
            .select("anime_slug")
            .eq("user_id", user.id)
            .eq("completed", true);
          if (dbHistoryCompleted) {
            dbHistoryCompleted.forEach((h: any) => {
              if (h.anime_slug) completedSlugs.add(h.anime_slug);
            });
          }
        } catch {}
      }

      // Filter out completed prequels if active on sequel
      const filteredAnime = filterActiveSequelPrequels(
        mergedList.map((it) => ({
          animeSlug: it.animeSlug!,
          animeTitle: it.title,
          posterImage: it.posterImage,
          episodeId: it.episodeId!,
          progressSeconds: it.progressSeconds,
          totalSeconds: it.totalSeconds,
          updatedAt: it.updatedAt,
        })),
        completedSlugs
      ).map((it) => ({
        type: "anime" as const,
        id: it.animeSlug,
        animeSlug: it.animeSlug,
        title: it.animeTitle,
        posterImage: it.posterImage,
        episodeId: it.episodeId,
        progressSeconds: it.progressSeconds,
        totalSeconds: it.totalSeconds,
        updatedAt: it.updatedAt,
      }));

      setAnimeItems(filteredAnime.slice(0, 16));

      // Asynchronously clean up completed items without sequels
      const completedItems = mergedList.filter((item) => completedSlugs.has(item.id));
      if (completedItems.length > 0) {
        Promise.all(
          completedItems.map(async (item) => {
            const hasSequel = await checkAnimeHasSequel({
              slug: item.id,
              title: item.title,
            });
            if (!hasSequel) {
              try {
                const rawRecent = localStorage.getItem("aniwavex_recent_watches");
                if (rawRecent) {
                  const arr = JSON.parse(rawRecent);
                  const updated = arr.filter((x: any) => x.animeSlug !== item.id);
                  localStorage.setItem("aniwavex_recent_watches", JSON.stringify(updated));
                }
              } catch {}
            }
          })
        ).catch(() => {});
      }
    } catch {
      setAnimeItems([]);
    }
  }, [user, supabase]);

  // ── Load Manga Reading History ───────────────────────────────────────────
  const loadMangaHistory = useCallback(async () => {
    try {
      const historyMap = new Map<string, UnifiedHistoryItem>();

      // 1. Read from unified recents list (aniwavex_recent_manga)
      const listRaw = localStorage.getItem("aniwavex_recent_manga");
      if (listRaw) {
        const list = JSON.parse(listRaw);
        if (Array.isArray(list)) {
          list.forEach((entry: any) => {
            if (entry && entry.mangaId && entry.chapterId) {
              historyMap.set(String(entry.mangaId), {
                type: "manga" as const,
                id: String(entry.mangaId),
                mangaId: String(entry.mangaId),
                title: entry.mangaTitle || "Manga",
                posterImage: entry.posterImage || undefined,
                chapterId: String(entry.chapterId),
                chapterNumber: Number(entry.chapterNumber) || 1,
                pageNumber: Number(entry.pageNumber) || 1,
                updatedAt: Number(entry.updatedAt) || 0,
              });
            }
          });
        }
      }

      // 2. Scan per-manga localStorage keys (aniwavex_manga_progress_*)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("aniwavex_manga_progress_")) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const entry = JSON.parse(raw);
              if (entry && entry.mangaId && entry.chapterId) {
                const existing = historyMap.get(String(entry.mangaId));
                const entryTime = Number(entry.updatedAt) || 0;
                if (!existing || entryTime > existing.updatedAt) {
                  historyMap.set(String(entry.mangaId), {
                    type: "manga" as const,
                    id: String(entry.mangaId),
                    mangaId: String(entry.mangaId),
                    title: entry.mangaTitle || existing?.title || "Manga",
                    posterImage: entry.posterImage || existing?.posterImage || undefined,
                    chapterId: String(entry.chapterId),
                    chapterNumber: Number(entry.chapterNumber) || 1,
                    pageNumber: Number(entry.pageNumber) || 1,
                    updatedAt: entryTime,
                  });
                }
              }
            }
          } catch {}
        }
      }

      // 3. Fetch cloud progress if logged in (/api/manga/progress)
      try {
        const res = await fetch("/api/manga/progress");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.history)) {
            data.history.forEach((cloudP: any) => {
              const mId = String(cloudP.manga_id);
              const cloudUpdatedAt = new Date(cloudP.updated_at).getTime();
              const existing = historyMap.get(mId);
              if (!existing || cloudUpdatedAt > existing.updatedAt) {
                historyMap.set(mId, {
                  type: "manga" as const,
                  id: mId,
                  mangaId: mId,
                  title: cloudP.manga_title || existing?.title || "Manga",
                  posterImage: cloudP.poster_image || existing?.posterImage,
                  chapterId: String(cloudP.chapter_id),
                  chapterNumber: Number(cloudP.chapter_number) || 1,
                  pageNumber: Number(cloudP.page_number) || 1,
                  updatedAt: cloudUpdatedAt,
                });
              }
            });
          }
        }
      } catch {}

      const sortedManga = Array.from(historyMap.values())
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 16);

      setMangaItems(sortedManga);
    } catch {
      setMangaItems([]);
    }
  }, []);

  // Initial load & real-time sync
  useEffect(() => {
    Promise.all([loadAnimeHistory(), loadMangaHistory()]).finally(() => {
      setLoading(false);
    });

    const handleProgressUpdate = () => {
      loadAnimeHistory();
      loadMangaHistory();
    };

    window.addEventListener("watch_progress_updated", handleProgressUpdate);
    window.addEventListener("aniwavex_manga_progress_updated", handleProgressUpdate);
    window.addEventListener("storage", handleProgressUpdate);

    return () => {
      window.removeEventListener("watch_progress_updated", handleProgressUpdate);
      window.removeEventListener("aniwavex_manga_progress_updated", handleProgressUpdate);
      window.removeEventListener("storage", handleProgressUpdate);
    };
  }, [loadAnimeHistory, loadMangaHistory]);

  // Combined and filtered items
  const combinedItems = useMemo(() => {
    let list: UnifiedHistoryItem[] = [];
    if (activeFilter === "all") {
      list = [...animeItems, ...mangaItems];
    } else if (activeFilter === "anime") {
      list = [...animeItems];
    } else {
      list = [...mangaItems];
    }

    return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [animeItems, mangaItems, activeFilter]);

  // Remove single item
  const handleRemove = async (e: React.MouseEvent, item: UnifiedHistoryItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (item.type === "anime") {
      setAnimeItems((prev) => prev.filter((it) => it.id !== item.id));

      try {
        const raw = localStorage.getItem("aniwavex_recent_watches");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((it: any) => it.animeSlug !== item.id);
            localStorage.setItem("aniwavex_recent_watches", JSON.stringify(filtered));
          }
        }
      } catch {}

      if (user) {
        try {
          await supabase.from("watch_history").delete().eq("user_id", user.id).eq("anime_slug", item.id);
        } catch {}
      }

      window.dispatchEvent(new Event("watch_progress_updated"));
    } else {
      setMangaItems((prev) => prev.filter((it) => it.id !== item.id));

      try {
        localStorage.removeItem(`aniwavex_manga_progress_${item.id}`);
        const raw = localStorage.getItem("aniwavex_recent_manga");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter((it: any) => it.mangaId !== item.id);
            localStorage.setItem("aniwavex_recent_manga", JSON.stringify(filtered));
          }
        }
      } catch {}

      window.dispatchEvent(new CustomEvent("aniwavex_manga_progress_updated", { detail: null }));
    }
  };

  // Clear all history
  const handleClearAll = async () => {
    if (!window.confirm("Clear your entire watch and reading history?")) return;

    setAnimeItems([]);
    setMangaItems([]);

    try {
      localStorage.removeItem("aniwavex_recent_watches");
      localStorage.removeItem("aniwavex_recent_manga");

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("watch_progress_") || key.startsWith("aniwavex_manga_progress_"))) {
          localStorage.removeItem(key);
        }
      }
    } catch {}

    if (user) {
      try {
        await supabase.from("watch_history").delete().eq("user_id", user.id);
      } catch {}
    }

    window.dispatchEvent(new Event("watch_progress_updated"));
    window.dispatchEvent(new CustomEvent("aniwavex_manga_progress_updated", { detail: null }));
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const amount = direction === "left" ? -500 : 500;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (loading || (animeItems.length === 0 && mangaItems.length === 0)) {
    return null;
  }

  const hasBothTypes = animeItems.length > 0 && mangaItems.length > 0;

  return (
    <section className="w-full mt-8 mb-6 group/row relative animate-in fade-in duration-500">
      {/* Section Header: Title + Filter Pills + Clear Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Jump Back In</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hidden md:inline-block">
                {combinedItems.length} active
              </span>
            </h2>
          </div>
        </div>

        {/* Filter Pills and Actions */}
        <div className="flex items-center gap-2">
          {hasBothTypes && (
            <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/10 backdrop-blur-md">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                  activeFilter === "all"
                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({animeItems.length + mangaItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("anime")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                  activeFilter === "anime"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Play className="w-2.5 h-2.5 fill-current" />
                Anime ({animeItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("manga")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                  activeFilter === "manga"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Manga ({mangaItems.length})
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs font-semibold text-slate-400 hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-red-500/10 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:outline-none"
            title="Clear watch & reading history"
          >
            Clear History
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Desktop / TV Left Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden md:flex absolute -left-3 lg:-left-5 tv:-left-7 top-1/2 -translate-y-1/2 z-30 w-11 h-11 tv:w-14 tv:h-14 items-center justify-center rounded-full bg-slate-950/90 hover:bg-cyan-600 border border-white/20 text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none hover:scale-110 active:scale-95"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6 tv:w-8 tv:h-8" />
        </button>

        {/* Horizontal Rail of Unified Cards */}
        <div
          ref={scrollContainerRef}
          data-tv-rail="true"
          className="tv-horizontal-rail flex overflow-x-auto gap-3.5 sm:gap-5 tv:gap-6 pb-4 px-2 snap-x snap-mandatory hide-scrollbar scroll-smooth"
        >
          {combinedItems.map((item) => {
            if (item.type === "anime") {
              const currentSec = item.progressSeconds || 0;
              const durSec = item.totalSeconds || 1440;
              const pct = durSec > 0 ? Math.min(Math.round((currentSec / durSec) * 100), 100) : 0;
              const isBookmarked = checkBookmarked(item.id);

              return (
                <div
                  key={`anime-${item.id}`}
                  className="snap-start shrink-0 w-[150px] sm:w-[180px] md:w-[205px] lg:w-[225px] xl:w-[245px] 2xl:w-[265px] tv:w-[285px] group/card relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500/60 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:scale-[1.02] flex flex-col focus-within:ring-4 focus-within:ring-cyan-400"
                >
                  <Link
                    href={`/anime/${item.animeSlug || item.id}`}
                    prefetch={true}
                    className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950 block focus:outline-none"
                  >
                    <AnimeImage
                      src={item.posterImage}
                      alt={item.title}
                      sizes="(max-width: 640px) 150px, (max-width: 768px) 180px, (max-width: 1024px) 205px, 265px"
                      className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-blue-600/90 text-white backdrop-blur-md shadow-sm flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        EP {item.episodeId}
                      </span>

                      <div className="flex items-center gap-1 pointer-events-auto">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleBookmark({
                              slug: item.animeSlug || item.id,
                              title: item.title,
                              posterImage: item.posterImage,
                            });
                          }}
                          className={`p-1.5 rounded-lg backdrop-blur-md transition-colors ${
                            isBookmarked
                              ? "bg-cyan-500 text-slate-950"
                              : "bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-white"
                          }`}
                          title={isBookmarked ? "Bookmarked" : "Add to Watchlist"}
                        >
                          <Bookmark className={`w-3 h-3 ${isBookmarked ? "fill-current" : ""}`} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleRemove(e, item)}
                          className="p-1.5 rounded-lg bg-slate-950/70 hover:bg-red-500 text-slate-400 hover:text-white backdrop-blur-md transition-colors"
                          title="Remove from history"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Play Hover Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                      <Link
                        href={`/anime/${item.animeSlug || item.id}?ep=${item.episodeId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto w-11 h-11 bg-blue-600/90 hover:bg-blue-500 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover/card:scale-100 transition-all hover:scale-110 active:scale-95"
                        title={`Resume Episode ${item.episodeId}`}
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </Link>
                    </div>

                    {/* Bottom Metadata & Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-10 pointer-events-none">
                      {/* Video Progress Bar */}
                      <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-mono">
                        <span className="text-blue-400 font-bold uppercase tracking-wider">
                          Anime
                        </span>
                        <span>
                          {formatTime(currentSec)} / {formatTime(durSec)}
                        </span>
                      </div>

                      <h3
                        className="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover/card:text-blue-400 transition-colors drop-shadow-md"
                        title={item.title}
                      >
                        {item.title}
                      </h3>
                    </div>
                  </Link>
                </div>
              );
            }

            // Manga Card
            return (
              <div
                key={`manga-${item.id}`}
                className="snap-start shrink-0 w-[150px] sm:w-[180px] md:w-[205px] lg:w-[225px] xl:w-[245px] 2xl:w-[265px] tv:w-[285px] group/card relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:scale-[1.02] flex flex-col focus-within:ring-4 focus-within:ring-emerald-400"
              >
                <Link
                  href={`/manga/${item.id}`}
                  prefetch={true}
                  className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950 block focus:outline-none"
                >
                  <AnimeImage
                    src={item.posterImage}
                    alt={item.title}
                    sizes="(max-width: 640px) 150px, (max-width: 768px) 180px, (max-width: 1024px) 205px, 265px"
                    className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-600/90 text-white backdrop-blur-md shadow-sm flex items-center gap-1">
                      <BookOpen className="w-2.5 h-2.5" />
                      Ch. {item.chapterNumber}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, item)}
                      className="pointer-events-auto p-1.5 rounded-lg bg-slate-950/70 hover:bg-red-500 text-slate-400 hover:text-white backdrop-blur-md transition-colors"
                      title="Remove from history"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Quick Read Hover Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    <Link
                      href={`/manga/${item.id}/read?chapterId=${encodeURIComponent(item.chapterId || "")}&ch=${item.chapterNumber}${item.pageNumber ? `&page=${item.pageNumber}` : ""}`}
                      onClick={(e) => e.stopPropagation()}
                      className="pointer-events-auto w-11 h-11 bg-emerald-600/90 hover:bg-emerald-500 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover/card:scale-100 transition-all hover:scale-110 active:scale-95"
                      title={`Resume Chapter ${item.chapterNumber}`}
                    >
                      <BookOpen className="w-5 h-5 ml-0.5" />
                    </Link>
                  </div>

                  {/* Bottom Metadata & Page Progress */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-10 pointer-events-none">
                    {/* Manga Reading Indicator Bar */}
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-full" />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="text-emerald-400 font-bold uppercase tracking-wider">
                        Manga
                      </span>
                      <span className="font-semibold text-slate-300">
                        {item.pageNumber ? `Page ${item.pageNumber}` : "Reading"}
                      </span>
                    </div>

                    <h3
                      className="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover/card:text-emerald-400 transition-colors drop-shadow-md"
                      title={item.title}
                    >
                      {item.title}
                    </h3>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {/* Desktop / TV Right Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="hidden md:flex absolute -right-3 lg:-right-5 tv:-right-7 top-1/2 -translate-y-1/2 z-30 w-11 h-11 tv:w-14 tv:h-14 items-center justify-center rounded-full bg-slate-950/90 hover:bg-cyan-600 border border-white/20 text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none hover:scale-110 active:scale-95"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6 tv:w-8 tv:h-8" />
        </button>
      </div>
    </section>
  );
}
