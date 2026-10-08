"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Trash2, ChevronDown, BookOpen, Film, BookMarked, Play } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { WATCHLIST_STATUSES, WatchlistStatus } from "@/lib/watchlist";
import {
  MANGA_BOOKMARK_STATUSES,
  MangaBookmarkStatus,
  MangaBookmarkItem,
  getLocalMangaBookmarks,
  setLocalMangaBookmarks,
  saveMangaBookmark,
  deleteMangaBookmark,
} from "@/lib/manga/bookmarks";
import AnimeImage from "@/components/AnimeImage";
import { handleAnimeCompleted } from "@/lib/franchise";

export default function WatchlistGrid({
  initialItems,
  initialMangaItems = [],
}: {
  initialItems: any[];
  initialMangaItems?: any[];
}) {
  const [mediaType, setMediaType] = useState<"anime" | "manga">("anime");

  // Anime State
  const [items, setItems] = useState<any[]>(initialItems);
  const [selectedTab, setSelectedTab] = useState<WatchlistStatus | "all">("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Manga State
  const [mangaItems, setMangaItems] = useState<MangaBookmarkItem[]>(initialMangaItems);
  const [selectedMangaTab, setSelectedMangaTab] = useState<MangaBookmarkStatus | "all">("all");
  const [editingMangaId, setEditingMangaId] = useState<string | null>(null);

  // Undo Toast State
  const [toastItem, setToastItem] = useState<{
    type: "anime" | "manga";
    data: any;
  } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { user, supabase, removeBookmarkSlug, addBookmarkSlug } = useAuth();

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // 1. Initial hydration and syncing for Anime
  useEffect(() => {
    try {
      const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
      if (localWatchlist.length > 0) {
        setItems((prev) => {
          const map = new Map();
          [...localWatchlist, ...prev].forEach((item) => {
            if (item?.anime_slug) map.set(item.anime_slug, item);
          });
          return Array.from(map.values());
        });
      }
    } catch {}

    if (user) {
      supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100)
        .then((fetchRes: any) => {
          const data = fetchRes?.data;
          if (data && data.length > 0) {
            setItems((prev) => {
              const map = new Map();
              [...prev, ...data].forEach((item) => {
                if (item?.anime_slug) map.set(item.anime_slug, item);
              });
              return Array.from(map.values());
            });
          }
        });
    }
  }, [user, supabase]);

  // 2. Initial hydration and syncing for Manga
  useEffect(() => {
    const localManga = getLocalMangaBookmarks();
    if (localManga.length > 0) {
      setMangaItems((prev) => {
        const map = new Map();
        [...localManga, ...prev].forEach((item) => {
          if (item?.manga_id) map.set(item.manga_id, item);
        });
        return Array.from(map.values());
      });
    }

    if (user) {
      supabase
        .from("manga_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(100)
        .then((fetchRes: any) => {
          const data = fetchRes?.data;
          if (data && data.length > 0) {
            setMangaItems((prev) => {
              const map = new Map();
              [...prev, ...data].forEach((item) => {
                if (item?.manga_id) map.set(item.manga_id, item);
              });
              const merged = Array.from(map.values());
              setLocalMangaBookmarks(merged);
              return merged;
            });
          }
        });
    }

    const handleMangaBookmarkUpdated = (e: any) => {
      const updated = e?.detail || getLocalMangaBookmarks();
      if (Array.isArray(updated)) {
        setMangaItems(updated);
      }
    };

    window.addEventListener("aniwavex_manga_bookmarks_updated", handleMangaBookmarkUpdated);
    return () => {
      window.removeEventListener("aniwavex_manga_bookmarks_updated", handleMangaBookmarkUpdated);
    };
  }, [user, supabase]);

  // Anime Counts by Status
  const animeCounts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    Object.keys(WATCHLIST_STATUSES).forEach((k) => (map[k] = 0));
    items.forEach((i) => {
      const s = i.status || "watching";
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [items]);

  // Manga Counts by Status
  const mangaCounts = useMemo(() => {
    const map: Record<string, number> = { all: mangaItems.length };
    Object.keys(MANGA_BOOKMARK_STATUSES).forEach((k) => (map[k] = 0));
    mangaItems.forEach((i) => {
      const s = i.status || "reading";
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [mangaItems]);

  // Filtered Anime Items
  const filteredAnimeItems = useMemo(() => {
    if (selectedTab === "all") return items;
    return items.filter((i) => (i.status || "watching") === selectedTab);
  }, [items, selectedTab]);

  // Filtered Manga Items
  const filteredMangaItems = useMemo(() => {
    if (selectedMangaTab === "all") return mangaItems;
    return mangaItems.filter((i) => (i.status || "reading") === selectedMangaTab);
  }, [mangaItems, selectedMangaTab]);

  // Delete Anime Bookmark
  const handleDeleteAnime = async (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();

    setItems((prev) => prev.filter((i) => i.id !== item.id && i.anime_slug !== item.anime_slug));
    setToastItem({ type: "anime", data: item });

    if (item.anime_slug) {
      removeBookmarkSlug(item.anime_slug);
    }

    try {
      const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
      if (Array.isArray(localWatchlist)) {
        const filtered = localWatchlist.filter(
          (it: any) => it.id !== item.id && it.anime_slug !== item.anime_slug
        );
        localStorage.setItem("aniwavex_watchlist", JSON.stringify(filtered));
      }
    } catch {}

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastItem(null);
      toastTimerRef.current = null;
    }, 5000);

    if (user) {
      try {
        let query = supabase.from("bookmarks").delete();
        if (item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
          query = query.eq("id", item.id);
        } else if (item.anime_slug) {
          query = query.eq("user_id", user.id).eq("anime_slug", item.anime_slug);
        } else {
          query = query.eq("id", item.id);
        }
        await query;
      } catch (err) {
        console.error("Failed to delete anime bookmark", err);
      }
    }
  };

  // Update Anime Status
  const handleUpdateAnimeStatus = async (e: React.MouseEvent, item: any, newStatus: WatchlistStatus) => {
    e.preventDefault();
    e.stopPropagation();

    setEditingItemId(null);
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id || (item.anime_slug && i.anime_slug === item.anime_slug)
          ? { ...i, status: newStatus }
          : i
      )
    );

    try {
      const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
      if (Array.isArray(localWatchlist)) {
        const updated = localWatchlist.map((it: any) => {
          if (it.id === item.id || (item.anime_slug && it.anime_slug === item.anime_slug)) {
            return { ...it, status: newStatus };
          }
          return it;
        });
        localStorage.setItem("aniwavex_watchlist", JSON.stringify(updated));
      }
    } catch {}

    if (user) {
      try {
        let query = supabase.from("bookmarks").update({ status: newStatus });
        if (item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)) {
          query = query.eq("id", item.id);
        } else if (item.anime_slug) {
          query = query.eq("user_id", user.id).eq("anime_slug", item.anime_slug);
        } else {
          query = query.eq("id", item.id);
        }
        await query;
      } catch (err) {
        console.error("Failed to update bookmark status", err);
      }
    }

    if (newStatus === "completed") {
      handleAnimeCompleted({
        anime: {
          slug: item.anime_slug,
          title: item.anime_title,
          posterImage: item.poster_image,
        },
        supabase,
        userId: user?.id,
        finalEpisode: item.last_episode_watched || 12,
      });
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("aniwavex_watchlist_updated", {
          detail: { animeSlug: item.anime_slug, status: newStatus },
        })
      );
    }
  };

  // Delete Manga Bookmark
  const handleDeleteManga = async (e: React.MouseEvent, item: MangaBookmarkItem) => {
    e.preventDefault();
    e.stopPropagation();

    setMangaItems((prev) => prev.filter((i) => i.manga_id !== item.manga_id));
    setToastItem({ type: "manga", data: item });

    await deleteMangaBookmark(item.manga_id, user?.id);

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastItem(null);
      toastTimerRef.current = null;
    }, 5000);
  };

  // Update Manga Status
  const handleUpdateMangaStatus = async (
    e: React.MouseEvent,
    item: MangaBookmarkItem,
    newStatus: MangaBookmarkStatus
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setEditingMangaId(null);
    setMangaItems((prev) =>
      prev.map((i) => (i.manga_id === item.manga_id ? { ...i, status: newStatus } : i))
    );

    await saveMangaBookmark(
      {
        mangaId: item.manga_id,
        mangaTitle: item.manga_title,
        posterImage: item.poster_image,
        status: newStatus,
        lastChapterRead: item.last_chapter_read,
        lastChapterId: item.last_chapter_id,
        lastPageRead: item.last_page_read,
      },
      user?.id
    );
  };

  // Undo Handler (Works for both Anime & Manga)
  const handleUndo = async () => {
    if (!toastItem) return;

    if (toastItem.type === "anime") {
      const itemToRestore = toastItem.data;
      setToastItem(null);

      setItems((prev) =>
        [itemToRestore, ...prev].sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        )
      );

      if (itemToRestore.anime_slug) {
        addBookmarkSlug(itemToRestore.anime_slug);
      }

      try {
        const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
        const filtered = Array.isArray(localWatchlist)
          ? localWatchlist.filter(
              (it: any) => it.id !== itemToRestore.id && it.anime_slug !== itemToRestore.anime_slug
            )
          : [];
        localStorage.setItem("aniwavex_watchlist", JSON.stringify([itemToRestore, ...filtered]));
      } catch {}

      if (user) {
        try {
          await supabase.from("bookmarks").insert({
            user_id: user.id,
            anime_slug: itemToRestore.anime_slug,
            anime_title: itemToRestore.anime_title,
            poster_image: itemToRestore.poster_image,
            status: itemToRestore.status || "watching",
            created_at: itemToRestore.created_at || new Date().toISOString(),
          });
        } catch (err) {
          console.error("Failed to restore anime bookmark", err);
        }
      }
    } else {
      const itemToRestore = toastItem.data as MangaBookmarkItem;
      setToastItem(null);

      setMangaItems((prev) => [itemToRestore, ...prev]);

      await saveMangaBookmark(
        {
          mangaId: itemToRestore.manga_id,
          mangaTitle: itemToRestore.manga_title,
          posterImage: itemToRestore.poster_image,
          status: itemToRestore.status,
          lastChapterRead: itemToRestore.last_chapter_read,
          lastChapterId: itemToRestore.last_chapter_id,
          lastPageRead: itemToRestore.last_page_read,
        },
        user?.id
      );
    }
  };

  return (
    <div className="relative">
      {/* Header and Segmented Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <BookMarked className="w-7 h-7 text-cyan-400" />
            <span>My Library</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your anime watchlist and manga reading progress in one place.
          </p>
        </div>

        {/* Segmented Switch: [Anime (N)] | [Manga (N)] */}
        <div className="inline-flex p-1 bg-slate-900/90 border border-white/10 rounded-2xl shadow-xl backdrop-blur-md self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMediaType("anime")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mediaType === "anime"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Anime ({animeCounts.all})</span>
          </button>

          <button
            type="button"
            onClick={() => setMediaType("manga")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              mediaType === "manga"
                ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Manga ({mangaCounts.all})</span>
          </button>
        </div>
      </div>

      {/* ANIME SECTION */}
      {mediaType === "anime" && (
        <div className="space-y-6">
          {/* Status Filter Tabs */}
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedTab === "all"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10"
                }`}
              >
                All ({animeCounts.all})
              </button>
              {Object.values(WATCHLIST_STATUSES).map((status) => {
                const count = animeCounts[status.id] || 0;
                const isActive = selectedTab === status.id;
                return (
                  <button
                    key={status.id}
                    onClick={() => setSelectedTab(status.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10"
                    }`}
                  >
                    {status.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {!items || items.length === 0 ? (
            <div className="w-full text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl">
              <Film className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h2 className="text-xl text-slate-300 font-semibold mb-2">Your anime watchlist is empty</h2>
              <p className="text-slate-500 mb-6">Keep track of the anime you want to watch by adding them to your watchlist.</p>
              <Link href="/catalog" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                Discover Anime
              </Link>
            </div>
          ) : filteredAnimeItems.length === 0 ? (
            <div className="w-full text-center py-16 bg-slate-900/20 border border-slate-800/80 rounded-2xl text-slate-400">
              <p className="text-sm font-semibold">No anime found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredAnimeItems.map((item) => {
                const itemStatus = (item.status as WatchlistStatus) || "watching";
                const statusConfig = WATCHLIST_STATUSES[itemStatus] || WATCHLIST_STATUSES.watching;
                const isEditingThis = editingItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105 shadow-lg"
                  >
                    {/* Media & Title Link */}
                    <Link
                      href={`/anime/${item.anime_slug}`}
                      className="block aspect-[2/3] relative cursor-pointer"
                      aria-label={`View ${item.anime_title}`}
                    >
                      <AnimeImage
                        src={item.poster_image}
                        alt={item.anime_title}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                      {/* Play Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-14 h-14 bg-blue-600/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl">
                          <Play className="w-6 h-6 text-white ml-1 fill-current" />
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 w-full p-4 pointer-events-none">
                        <h3 className="text-white font-bold text-sm truncate" title={item.anime_title}>
                          {item.anime_title}
                        </h3>
                      </div>
                    </Link>

                    {/* Status Badge */}
                    <div className="absolute top-2 left-2 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingItemId(isEditingThis ? null : item.id);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-md backdrop-blur-md transition-all hover:scale-105 ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}
                        title="Click to change status"
                        aria-label={`Change status for ${item.anime_title}, currently ${statusConfig.label}`}
                      >
                        {statusConfig.label}
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {/* In-Card Status Menu */}
                      {isEditingThis && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95"
                        >
                          {Object.values(WATCHLIST_STATUSES).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={(e) => handleUpdateAnimeStatus(e, item, st.id as WatchlistStatus)}
                              className={`w-full px-3 py-1.5 text-xs text-left font-medium transition-colors hover:bg-slate-800 ${
                                itemStatus === st.id ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-200"
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteAnime(e, item)}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/90 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10 z-20"
                      title="Remove from watchlist"
                      aria-label={`Remove ${item.anime_title} from watchlist`}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MANGA SECTION */}
      {mediaType === "manga" && (
        <div className="space-y-6">
          {/* Status Filter Tabs */}
          {mangaItems.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedMangaTab("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedMangaTab === "all"
                    ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                    : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10"
                }`}
              >
                All ({mangaCounts.all})
              </button>
              {(["reading", "plan_to_read", "completed", "on_hold"] as MangaBookmarkStatus[]).map((statusKey) => {
                const conf = MANGA_BOOKMARK_STATUSES[statusKey];
                const count = mangaCounts[statusKey] || 0;
                const isActive = selectedMangaTab === statusKey;
                return (
                  <button
                    key={statusKey}
                    onClick={() => setSelectedMangaTab(statusKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                        : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10"
                    }`}
                  >
                    {conf.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {!mangaItems || mangaItems.length === 0 ? (
            <div className="w-full text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h2 className="text-xl text-slate-300 font-semibold mb-2">Your manga library is empty</h2>
              <p className="text-slate-500 mb-6">
                Keep track of the manga and manhwa you want to read by bookmarking them.
              </p>
              <Link
                href="/manga"
                className="inline-block px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-cyan-500/20"
              >
                Discover Manga
              </Link>
            </div>
          ) : filteredMangaItems.length === 0 ? (
            <div className="w-full text-center py-16 bg-slate-900/20 border border-slate-800/80 rounded-2xl text-slate-400">
              <p className="text-sm font-semibold">No manga found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredMangaItems.map((item) => {
                const itemStatus = item.status || "reading";
                const statusConfig = MANGA_BOOKMARK_STATUSES[itemStatus] || MANGA_BOOKMARK_STATUSES.reading;
                const isEditingThis = editingMangaId === item.manga_id;

                const readLink = item.last_chapter_id
                  ? `/manga/${item.manga_id}/read?chapterId=${encodeURIComponent(item.last_chapter_id)}&ch=${encodeURIComponent(item.last_chapter_read || "1")}${item.last_page_read && item.last_page_read > 1 ? `&page=${item.last_page_read}` : ""}`
                  : `/manga/${item.manga_id}`;

                return (
                  <div
                    key={item.manga_id}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105 shadow-lg flex flex-col"
                  >
                    {/* Media & Link */}
                    <Link
                      href={readLink}
                      className="block aspect-[3/4] relative cursor-pointer"
                      aria-label={`Read ${item.manga_title}`}
                    >
                      <AnimeImage
                        src={item.poster_image}
                        alt={item.manga_title}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                      {/* Read Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-12 h-12 bg-cyan-500/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl text-white">
                          <BookOpen className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Reading Progress Pill */}
                      {item.last_chapter_read && (
                        <div className="absolute bottom-12 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                          Ch. {item.last_chapter_read}
                          {item.last_page_read && item.last_page_read > 1 ? ` (p. ${item.last_page_read})` : ""}
                        </div>
                      )}

                      <div className="absolute bottom-0 left-0 w-full p-3 pointer-events-none">
                        <h3 className="text-white font-bold text-xs sm:text-sm truncate" title={item.manga_title}>
                          {item.manga_title}
                        </h3>
                      </div>
                    </Link>

                    {/* Status Badge */}
                    <div className="absolute top-2 left-2 z-20">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingMangaId(isEditingThis ? null : item.manga_id);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-md backdrop-blur-md transition-all hover:scale-105 ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}
                        title="Click to change status"
                        aria-label={`Change status for ${item.manga_title}, currently ${statusConfig.label}`}
                      >
                        {statusConfig.label}
                        <ChevronDown className="w-3 h-3" />
                      </button>

                      {/* In-Card Status Menu */}
                      {isEditingThis && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute left-0 top-full mt-1 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95"
                        >
                          {(["reading", "plan_to_read", "completed", "on_hold"] as MangaBookmarkStatus[]).map((st) => {
                            const conf = MANGA_BOOKMARK_STATUSES[st];
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={(e) => handleUpdateMangaStatus(e, item, st)}
                                className={`w-full px-3 py-1.5 text-xs text-left font-medium transition-colors hover:bg-slate-800 ${
                                  itemStatus === st ? "text-cyan-400 font-bold bg-cyan-500/10" : "text-slate-200"
                                }`}
                              >
                                {conf.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteManga(e, item)}
                      className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/90 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10 z-20"
                      title="Remove from reading list"
                      aria-label={`Remove ${item.manga_title} from library`}
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>

                    {/* Card Footer: Quick Continue Link */}
                    <div className="p-2.5 bg-slate-950/80 border-t border-white/5 flex items-center justify-between text-xs">
                      <Link
                        href={`/manga/${item.manga_id}`}
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        Details
                      </Link>
                      <Link
                        href={readLink}
                        className="text-cyan-400 font-bold hover:text-cyan-300 transition-colors flex items-center gap-1"
                      >
                        {item.last_chapter_read ? "Continue" : "Read"} →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Undo Toast */}
      {toastItem && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-800 border border-slate-700 text-white px-6 py-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <p className="text-sm font-medium">
            <span className={`font-bold ${toastItem.type === "anime" ? "text-blue-400" : "text-cyan-400"}`}>
              {toastItem.type === "anime" ? toastItem.data.anime_title : toastItem.data.manga_title}
            </span>{" "}
            removed from {toastItem.type === "anime" ? "watchlist" : "library"}.
          </p>
          <button
            onClick={handleUndo}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
