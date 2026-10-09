"use client";

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  supabase: ReturnType<typeof createClient>;
  bookmarkedSlugs: Set<string>;
  isBookmarked: (slug?: string | null) => boolean;
  toggleBookmark: (anime: {
    slug: string;
    title: string;
    posterImage?: string;
    backgroundImage?: string;
  }) => Promise<boolean>;
  removeBookmarkSlug: (slug: string) => void;
  addBookmarkSlug: (slug: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  supabase: createClient(),
  bookmarkedSlugs: new Set(),
  isBookmarked: () => false,
  toggleBookmark: async () => false,
  removeBookmarkSlug: () => {},
  addBookmarkSlug: () => {},
});

export function AuthProvider({ 
  children, 
  initialUser = null 
}: { 
  children: React.ReactNode; 
  initialUser?: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<Set<string>>(new Set());
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // 1. Initial user resolution (single network call shared across the entire app)
    supabase.auth.getUser().then((res: any) => {
      setUser(res?.data?.user ?? null);
      setLoading(false);
    });

    // 2. Global real-time auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Batch-hydrate user bookmarks once to eliminate N+1 queries across anime cards
  useEffect(() => {
    // 1. Instant local storage hydration
    try {
      const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
      if (Array.isArray(localWatchlist) && localWatchlist.length > 0) {
        const localSlugs = new Set<string>(
          localWatchlist.map((it: any) => it.anime_slug).filter(Boolean)
        );
        setBookmarkedSlugs((prev) => new Set([...prev, ...localSlugs]));
      }
    } catch {}

    // 2. Single batched query to Supabase for the authenticated user
    if (user?.id) {
      supabase
        .from("bookmarks")
        .select("anime_slug")
        .eq("user_id", user.id)
        .then((res: any) => {
          if (res?.data && Array.isArray(res.data)) {
            const dbSlugs = new Set<string>(res.data.map((b: any) => b.anime_slug).filter(Boolean));
            setBookmarkedSlugs((prev) => new Set([...prev, ...dbSlugs]));
          }
        });

      // 3. Batched Manga bookmarks cloud sync & hydration
      supabase
        .from("manga_bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .then((res: any) => {
          if (res?.data && Array.isArray(res.data)) {
            try {
              const rawLocal = localStorage.getItem("aniwavex_manga_bookmarks") || "[]";
              const localList = JSON.parse(rawLocal);
              const map = new Map();

              if (Array.isArray(localList)) {
                localList.forEach((it: any) => {
                  if (it?.manga_id) map.set(it.manga_id, it);
                });
              }

              res.data.forEach((cloudItem: any) => {
                if (cloudItem?.manga_id) {
                  const existing = map.get(cloudItem.manga_id);
                  map.set(cloudItem.manga_id, {
                    ...existing,
                    ...cloudItem,
                    id: cloudItem.manga_id,
                  });
                }
              });

              const merged = Array.from(map.values());
              localStorage.setItem("aniwavex_manga_bookmarks", JSON.stringify(merged));
              window.dispatchEvent(new CustomEvent("aniwavex_manga_bookmarks_updated", { detail: merged }));
            } catch {}
          }
        });

      // Push un-synced guest manga bookmarks to cloud
      try {
        const rawLocal = localStorage.getItem("aniwavex_manga_bookmarks") || "[]";
        const localList = JSON.parse(rawLocal);
        if (Array.isArray(localList) && localList.length > 0) {
          const toUpload = localList.filter((it: any) => !it.user_id || it.user_id !== user.id);
          if (toUpload.length > 0) {
            const records = toUpload.map((b: any) => ({
              user_id: user.id,
              manga_id: b.manga_id,
              manga_title: b.manga_title || "Manga",
              poster_image: b.poster_image || null,
              status: b.status || "reading",
              last_chapter_read: b.last_chapter_read || null,
              last_chapter_id: b.last_chapter_id || null,
              last_page_read: b.last_page_read || 1,
              updated_at: new Date().toISOString(),
            }));
            supabase.from("manga_bookmarks").upsert(records, { onConflict: "user_id,manga_id" }).then(() => {});
          }
        }
      } catch {}
    }
  }, [user?.id, supabase]);

  const isBookmarked = useCallback(
    (slug?: string | null): boolean => {
      if (!slug) return false;
      return bookmarkedSlugs.has(slug);
    },
    [bookmarkedSlugs]
  );

  const toggleBookmark = useCallback(
    async (anime: {
      slug: string;
      title: string;
      posterImage?: string;
      backgroundImage?: string;
    }): Promise<boolean> => {
      if (!anime?.slug) return false;
      const isCurrentlyBookmarked = bookmarkedSlugs.has(anime.slug);
      const nextState = !isCurrentlyBookmarked;

      // Optimistic update across all card instances simultaneously
      setBookmarkedSlugs((prev) => {
        const next = new Set(prev);
        if (nextState) next.add(anime.slug);
        else next.delete(anime.slug);
        return next;
      });

      // Update localStorage
      try {
        const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
        const filtered = Array.isArray(localWatchlist)
          ? localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)
          : [];

        if (nextState) {
          const item = {
            id: anime.slug,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage || "",
            status: "watching",
            user_id: user?.id || null,
            created_at: new Date().toISOString(),
          };
          localStorage.setItem("aniwavex_watchlist", JSON.stringify([item, ...filtered]));
        } else {
          localStorage.setItem("aniwavex_watchlist", JSON.stringify(filtered));
        }
      } catch {}

      // Sync to Supabase if authenticated
      if (user?.id) {
        try {
          if (nextState) {
            await supabase.from("bookmarks").upsert(
              {
                user_id: user.id,
                anime_slug: anime.slug,
                anime_title: anime.title,
                poster_image: anime.posterImage || anime.backgroundImage || "",
                status: "watching",
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,anime_slug" }
            );
          } else {
            await supabase
              .from("bookmarks")
              .delete()
              .eq("user_id", user.id)
              .eq("anime_slug", anime.slug);
          }
        } catch (err) {
          console.error("Failed to sync bookmark change to Supabase:", err);
        }
      }

      return nextState;
    },
    [bookmarkedSlugs, user, supabase]
  );

  const removeBookmarkSlug = useCallback((slug: string) => {
    if (!slug) return;
    setBookmarkedSlugs((prev) => {
      if (!prev.has(slug)) return prev;
      const next = new Set(prev);
      next.delete(slug);
      return next;
    });
  }, []);

  const addBookmarkSlug = useCallback((slug: string) => {
    if (!slug) return;
    setBookmarkedSlugs((prev) => {
      if (prev.has(slug)) return prev;
      const next = new Set(prev);
      next.add(slug);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    supabase,
    bookmarkedSlugs,
    isBookmarked,
    toggleBookmark,
    removeBookmarkSlug,
    addBookmarkSlug,
  }), [user, loading, supabase, bookmarkedSlugs, isBookmarked, toggleBookmark, removeBookmarkSlug, addBookmarkSlug]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
