"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bookmark,
  Check,
  ChevronDown,
  Loader2,
  Trash2,
  BookOpen,
  Clock,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  MangaBookmarkStatus,
  MANGA_BOOKMARK_STATUSES,
  getLocalMangaBookmark,
  saveMangaBookmark,
  deleteMangaBookmark,
  MangaBookmarkItem,
} from "@/lib/manga/bookmarks";

interface MangaBookmarkButtonProps {
  mangaId: string;
  mangaTitle: string;
  posterImage?: string;
  variant?: "card" | "hero";
  className?: string;
  onStatusChange?: (status: MangaBookmarkStatus | null) => void;
}

const STATUS_ICONS: Record<MangaBookmarkStatus, React.ComponentType<{ className?: string }>> = {
  reading: BookOpen,
  plan_to_read: Clock,
  completed: CheckCircle2,
  on_hold: PauseCircle,
  dropped: Trash2,
};

export default function MangaBookmarkButton({
  mangaId,
  mangaTitle,
  posterImage,
  variant = "card",
  className = "",
  onStatusChange,
}: MangaBookmarkButtonProps) {
  const { user } = useAuth();
  const [currentBookmark, setCurrentBookmark] = useState<MangaBookmarkItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Sync state with local storage and events
  useEffect(() => {
    const existing = getLocalMangaBookmark(mangaId);
    setCurrentBookmark(existing);

    const handleUpdate = () => {
      const updated = getLocalMangaBookmark(mangaId);
      setCurrentBookmark(updated);
    };

    window.addEventListener("aniwavex_manga_bookmarks_updated", handleUpdate);
    return () => {
      window.removeEventListener("aniwavex_manga_bookmarks_updated", handleUpdate);
    };
  }, [mangaId]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelectStatus = async (
    e: React.MouseEvent,
    status: MangaBookmarkStatus | null
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsSaving(true);
    try {
      if (status === null) {
        await deleteMangaBookmark(mangaId, user?.id);
        setCurrentBookmark(null);
        onStatusChange?.(null);
      } else {
        const saved = await saveMangaBookmark(
          {
            mangaId,
            mangaTitle,
            posterImage,
            status,
          },
          user?.id
        );
        setCurrentBookmark(saved);
        onStatusChange?.(status);
      }
    } catch (err) {
      console.error("Failed to update manga bookmark:", err);
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  const handleQuickToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  const activeStatus = currentBookmark?.status;
  const isBookmarked = !!activeStatus;
  const statusConfig = activeStatus ? MANGA_BOOKMARK_STATUSES[activeStatus] : null;

  if (variant === "card") {
    return (
      <div ref={dropdownRef} className={`relative shrink-0 ${className}`}>
        <button
          type="button"
          onClick={handleQuickToggle}
          disabled={isSaving}
          aria-label={
            isBookmarked
              ? `${mangaTitle} in library (${statusConfig?.label}). Click to change.`
              : `Add ${mangaTitle} to reading list`
          }
          title={isBookmarked ? `Library: ${statusConfig?.label}` : "Add to Library"}
          className={`w-7 h-7 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg transition-all active:scale-90 touch-manipulation backdrop-blur-md shadow-md focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
            isBookmarked
              ? "bg-cyan-500 text-white shadow-cyan-500/30 shadow-sm"
              : "bg-black/75 hover:bg-cyan-600/90 text-slate-300 hover:text-white border border-white/15"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isBookmarked ? (
            <Bookmark className="w-4 h-4 sm:w-3.5 sm:h-3.5 fill-current" />
          ) : (
            <Bookmark className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          )}
        </button>

        {isOpen && (
          <div
            className="absolute right-0 top-9 w-44 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl backdrop-blur-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 mb-1">
              Reading Status
            </div>

            {(["reading", "plan_to_read", "completed", "on_hold"] as MangaBookmarkStatus[]).map(
              (st) => {
                const conf = MANGA_BOOKMARK_STATUSES[st];
                const IconComponent = STATUS_ICONS[st];
                const isSelected = activeStatus === st;

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={(e) => handleSelectStatus(e, st)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 font-bold"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconComponent className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-slate-400"}`} />
                      <span>{conf.label}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              }
            )}

            {isBookmarked && (
              <>
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  onClick={(e) => handleSelectStatus(e, null)}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Library</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Hero / Detailed Variant (for MangaDetailPage)
  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <div className="inline-flex rounded-xl shadow-lg shadow-cyan-500/10">
        <button
          type="button"
          onClick={handleQuickToggle}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm backdrop-blur-md transition-all border focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${
            isBookmarked
              ? `${statusConfig?.badgeBg} ${statusConfig?.badgeText} ${statusConfig?.badgeBorder} hover:brightness-110 shadow-md`
              : "bg-slate-900/90 hover:bg-slate-800 text-white border-white/15 hover:border-cyan-500/40"
          }`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-current" : "text-cyan-400"}`} />
          )}

          <span>
            {isBookmarked ? statusConfig?.label : "Add to Reading List"}
          </span>

          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          className="absolute left-0 top-12 w-52 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 mb-1.5">
            Reading Status
          </div>

          {(["reading", "plan_to_read", "completed", "on_hold"] as MangaBookmarkStatus[]).map(
            (st) => {
              const conf = MANGA_BOOKMARK_STATUSES[st];
              const IconComponent = STATUS_ICONS[st];
              const isSelected = activeStatus === st;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={(e) => handleSelectStatus(e, st)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 font-bold"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComponent className={`w-4 h-4 ${isSelected ? "text-cyan-400" : "text-slate-400"}`} />
                    <span>{conf.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                </button>
              );
            }
          )}

          {isBookmarked && (
            <>
              <div className="my-1.5 border-t border-white/10" />
              <button
                type="button"
                onClick={(e) => handleSelectStatus(e, null)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove from Library</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
