"use client";

import { useState, useEffect, useRef } from "react";
import { Bookmark, ChevronDown, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { WATCHLIST_STATUSES, WatchlistStatus } from "@/lib/watchlist";
import AuthModal from "./AuthModal";
import { handleAnimeCompleted } from "@/lib/franchise";

export interface WatchlistDropdownAnime {
  slug: string;
  title: string;
  posterImage?: string;
  backgroundImage?: string;
  id?: any;
  animeId?: any;
  totalEpisodes?: number;
  anilistId?: number;
}

interface WatchlistDropdownProps {
  anime: WatchlistDropdownAnime;
  initialBookmarked?: boolean;
  initialBookmarkStatus?: WatchlistStatus | null;
  user?: any;
  lastWatchedEpisode?: number | null;
  size?: "default" | "compact";
  direction?: "up" | "down";
  className?: string;
}

export default function WatchlistDropdown({
  anime,
  initialBookmarked = false,
  initialBookmarkStatus = "watching",
  user: initialUser,
  lastWatchedEpisode,
  size = "default",
  direction = "up",
  className = "",
}: WatchlistDropdownProps) {
  const { user: authUser, supabase, addBookmarkSlug, removeBookmarkSlug, isBookmarked: checkBookmarked } = useAuth();
  const currentUser = authUser || initialUser;
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [currentStatus, setCurrentStatus] = useState<WatchlistStatus>(initialBookmarkStatus || "watching");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with AuthProvider bookmark state
  useEffect(() => {
    if (anime?.slug && !isSaving) {
      const bookmarked = checkBookmarked(anime.slug);
      setIsBookmarked(bookmarked);
    }
  }, [anime?.slug, checkBookmarked, isSaving]);

  // Sync when other components dispatch aniwavex_watchlist_updated
  useEffect(() => {
    const handleWatchlistUpdated = (e: any) => {
      if (e.detail?.animeSlug === anime?.slug && !isSaving) {
        if (e.detail.status) {
          setIsBookmarked(true);
          setCurrentStatus(e.detail.status);
        } else {
          setIsBookmarked(false);
        }
      }
    };
    window.addEventListener("aniwavex_watchlist_updated", handleWatchlistUpdated);
    return () => window.removeEventListener("aniwavex_watchlist_updated", handleWatchlistUpdated);
  }, [anime?.slug, isSaving]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const handleSetStatus = async (status: WatchlistStatus) => {
    let activeUser = currentUser;
    if (!activeUser) {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (liveUser) {
        activeUser = liveUser;
      }
    }

    if (!activeUser) {
      setIsDropdownOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    setIsSaving(true);
    setIsBookmarked(true);
    setCurrentStatus(status);
    setIsDropdownOpen(false);
    if (anime?.slug) {
      addBookmarkSlug(anime.slug);
    }

    try {
      // 1. Check if record already exists
      const { data: existing } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", activeUser.id)
        .eq("anime_slug", anime.slug)
        .maybeSingle();

      if (existing?.id) {
        // Update existing record
        const { error } = await supabase
          .from("bookmarks")
          .update({
            status: status,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("bookmarks")
          .insert({
            user_id: activeUser.id,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: status,
          });
        if (error) throw error;
      }

      // Also mirror to localStorage
      try {
        const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
        const updatedList = [
          {
            id: anime.slug,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: status,
            user_id: activeUser.id,
            created_at: new Date().toISOString(),
          },
          ...localWatchlist.filter((it: any) => it.anime_slug !== anime.slug),
        ];
        localStorage.setItem("aniwavex_watchlist", JSON.stringify(updatedList));
      } catch {}

      if (status === "completed") {
        handleAnimeCompleted({
          anime: {
            slug: anime.slug,
            title: anime.title,
            animeId: anime.id || anime.animeId,
            posterImage: anime.posterImage || anime.backgroundImage,
            anilistId: anime.anilistId,
          },
          supabase,
          userId: activeUser?.id,
          finalEpisode: anime.totalEpisodes || lastWatchedEpisode || 12,
        });
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("aniwavex_watchlist_updated", {
            detail: { animeSlug: anime.slug, status },
          })
        );
      }
    } catch (error: any) {
      console.error("Bookmark status error:", error);
      // Seamlessly keep local state if network or db throws
      try {
        const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
        const updatedList = [
          {
            id: anime.slug,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: status,
            user_id: activeUser.id,
            created_at: new Date().toISOString(),
          },
          ...localWatchlist.filter((it: any) => it.anime_slug !== anime.slug),
        ];
        localStorage.setItem("aniwavex_watchlist", JSON.stringify(updatedList));
      } catch {}
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBookmark = async () => {
    let activeUser = currentUser;
    if (!activeUser) {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (liveUser) {
        activeUser = liveUser;
      }
    }

    if (!activeUser) return;
    setIsSaving(true);
    setIsBookmarked(false);
    setIsDropdownOpen(false);
    if (anime?.slug) {
      removeBookmarkSlug(anime.slug);
    }

    try {
      await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", activeUser.id)
        .eq("anime_slug", anime.slug);

      try {
        const localWatchlist = JSON.parse(localStorage.getItem("aniwavex_watchlist") || "[]");
        localStorage.setItem(
          "aniwavex_watchlist",
          JSON.stringify(localWatchlist.filter((it: any) => it.anime_slug !== anime.slug))
        );
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("aniwavex_watchlist_updated", {
            detail: { animeSlug: anime.slug, status: null },
          })
        );
      }
    } catch (error) {
      console.error("Remove bookmark error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const activeStatusConfig = WATCHLIST_STATUSES[currentStatus] || WATCHLIST_STATUSES.watching;

  const isCompact = size === "compact";

  return (
    <div ref={dropdownRef} className={`relative min-w-0 ${className}`}>
      <div
        className={`flex items-center rounded-xl backdrop-blur-md transition-all border ${
          isBookmarked
            ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
            : "bg-slate-800/80 hover:bg-slate-700/80 text-white border-white/10"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (isBookmarked) {
              setIsDropdownOpen(!isDropdownOpen);
            } else {
              handleSetStatus("watching");
            }
          }}
          disabled={isSaving}
          className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 font-semibold hover:scale-105 active:scale-95 transition-all ${
            isCompact
              ? "px-3 py-2 text-xs"
              : "px-2.5 py-3 sm:px-6 sm:py-4 text-xs sm:text-base"
          }`}
          title={isBookmarked ? `Watchlist: ${activeStatusConfig.label}` : "Add to Watchlist"}
        >
          <Bookmark className={`${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} shrink-0 ${isBookmarked ? "fill-current" : ""}`} />
          <span className="truncate flex items-center gap-1.5">
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : isBookmarked ? (
              activeStatusConfig.label
            ) : (
              "Watchlist"
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={isSaving}
          className={`text-slate-400 hover:text-white transition-colors border-l border-white/10 shrink-0 ${
            isCompact ? "p-2" : "p-2.5 sm:py-4 sm:pr-3"
          }`}
          aria-label="Change Watchlist Status"
          aria-expanded={isDropdownOpen}
        >
          <ChevronDown className={`${isCompact ? "w-3 h-3" : "w-3.5 h-3.5 sm:w-4 sm:h-4"} transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Status Dropdown Menu */}
      {isDropdownOpen && (
        <div
          className={`absolute ${direction === "down" ? "top-full mt-2" : "bottom-full mb-2"} right-0 sm:left-0 w-48 sm:w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col z-50 animate-in fade-in zoom-in-95`}
        >
          <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
            Watchlist Status
          </div>
          {Object.values(WATCHLIST_STATUSES).map((status) => {
            const isSelected = isBookmarked && currentStatus === status.id;
            return (
              <button
                key={status.id}
                type="button"
                onClick={() => handleSetStatus(status.id as WatchlistStatus)}
                className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left hover:bg-slate-800 transition-colors ${
                  isSelected ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.id === "watching"
                        ? "bg-blue-400"
                        : status.id === "plan_to_watch"
                        ? "bg-amber-400"
                        : status.id === "completed"
                        ? "bg-emerald-400"
                        : status.id === "on_hold"
                        ? "bg-purple-400"
                        : "bg-rose-400"
                    }`}
                  />
                  {status.label}
                </span>
                {isSelected && <Check className="w-4 h-4 text-blue-400" />}
              </button>
            );
          })}
          {isBookmarked && (
            <div className="pt-1 mt-1 border-t border-slate-800">
              <button
                type="button"
                onClick={handleRemoveBookmark}
                className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left font-medium transition-colors"
              >
                Remove from Watchlist
              </button>
            </div>
          )}
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
