"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Search,
  ArrowUpDown,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Loader2,
  RotateCw,
} from "lucide-react";
import { MangaChapter } from "@/lib/manga/types";
import MangaBookmarkButton from "@/components/manga/MangaBookmarkButton";

interface MangaDetailChaptersClientProps {
  mangaId: string;
  chapters: MangaChapter[];
  mangaTitle?: string;
  posterImage?: string;
}

interface MangaReadingProgress {
  mangaId: string;
  chapterId: string;
  chapterNumber: number;
  pageNumber: number;
  updatedAt: number;
  mangaTitle?: string;
  posterImage?: string;
}

export default function MangaDetailChaptersClient({
  mangaId,
  chapters,
  mangaTitle,
  posterImage,
}: MangaDetailChaptersClientProps) {
  const [chapterList, setChapterList] = useState<MangaChapter[]>(chapters || []);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [progress, setProgress] = useState<MangaReadingProgress | null>(null);

  useEffect(() => {
    if (chapters && chapters.length > 0) {
      setChapterList(chapters);
    }
  }, [chapters]);

  const fetchFallbackChapters = React.useCallback(() => {
    if (!mangaTitle) return;
    setIsFetching(true);
    fetch(`/api/manga/chapters?title=${encodeURIComponent(mangaTitle)}&id=${encodeURIComponent(mangaId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.chapters && Array.isArray(data.chapters) && data.chapters.length > 0) {
          setChapterList(data.chapters);
        }
      })
      .catch(() => {})
      .finally(() => setIsFetching(false));
  }, [mangaId, mangaTitle]);

  useEffect(() => {
    if (chapterList.length === 0 && mangaTitle) {
      fetchFallbackChapters();
    }
  }, [mangaId, mangaTitle, chapterList.length, fetchFallbackChapters]);

  // Restore saved reading progress from localStorage and sync from Supabase
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`aniwavex_manga_progress_${mangaId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.chapterId) {
          setProgress(parsed);

          // Backfill recent list with poster & title if missing
          const enriched = {
            ...parsed,
            mangaTitle: parsed.mangaTitle || mangaTitle || "Manga",
            posterImage: parsed.posterImage || posterImage,
          };
          localStorage.setItem(`aniwavex_manga_progress_${mangaId}`, JSON.stringify(enriched));

          try {
            const listRaw = localStorage.getItem("aniwavex_recent_manga");
            let list = listRaw ? JSON.parse(listRaw) : [];
            if (!Array.isArray(list)) list = [];
            list = list.filter((it: any) => it.mangaId !== mangaId);
            list.unshift(enriched);
            localStorage.setItem("aniwavex_recent_manga", JSON.stringify(list.slice(0, 20)));
          } catch {}

          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("aniwavex_manga_progress_updated", {
                detail: enriched,
              })
            );
          }
        }
      }
    } catch {}

    // Check cloud progress from Supabase (/api/manga/progress?mangaId=...)
    fetch(`/api/manga/progress?mangaId=${encodeURIComponent(mangaId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.progress) {
          const cloudP = data.progress;
          const cloudUpdatedAt = new Date(cloudP.updated_at).getTime();

          setProgress((currentLocal) => {
            if (!currentLocal || cloudUpdatedAt > (currentLocal.updatedAt || 0)) {
              const mapped: MangaReadingProgress = {
                mangaId: cloudP.manga_id,
                chapterId: cloudP.chapter_id,
                chapterNumber: Number(cloudP.chapter_number),
                pageNumber: cloudP.page_number,
                updatedAt: cloudUpdatedAt,
                mangaTitle: cloudP.manga_title || mangaTitle,
                posterImage: cloudP.poster_image || posterImage,
              };
              try {
                localStorage.setItem(`aniwavex_manga_progress_${mangaId}`, JSON.stringify(mapped));
              } catch {}
              return mapped;
            }
            return currentLocal;
          });
        }
      })
      .catch(() => {});
  }, [mangaId, mangaTitle, posterImage]);

  // Filter and sort chapters
  const filteredChapters = useMemo(() => {
    let result = [...chapterList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (ch) =>
          ch.title.toLowerCase().includes(q) ||
          ch.chapterNumber.toString().includes(q)
      );
    }

    if (sortOrder === "desc") {
      result.sort((a, b) => b.chapterNumber - a.chapterNumber);
    } else {
      result.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }

    return result;
  }, [chapterList, searchQuery, sortOrder]);

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const resumeChapter = useMemo(() => {
    if (!progress) return null;
    return (
      chapterList.find((c) => c.id === progress.chapterId) ||
      chapterList.find((c) => c.chapterNumber === progress.chapterNumber) ||
      null
    );
  }, [chapterList, progress]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar: Start / Resume Reading + Search & Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/60 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Chapters ({chapterList.length})
          </h2>
          {isFetching && (
            <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-normal">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Syncing chapters...
            </span>
          )}
        </div>

        {/* Action Buttons: Resume / Start Reading */}
        <div className="flex flex-wrap items-center gap-2.5">
          {resumeChapter && (
            <Link
              href={`/manga/${mangaId}/read?chapterId=${encodeURIComponent(resumeChapter.id)}&ch=${resumeChapter.chapterNumber}${progress?.pageNumber ? `&page=${progress.pageNumber}` : ""}`}
              onClick={() => {
                try {
                  sessionStorage.setItem(`aniwavex_from_overview_${mangaId}`, "1");
                } catch {}
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              <Bookmark className="w-4 h-4 fill-current" />
              Resume Ch. {resumeChapter.chapterNumber}
              {progress?.pageNumber ? ` (p. ${progress.pageNumber})` : ""}
            </Link>
          )}

          {chapterList.length > 0 && (
            <Link
              href={`/manga/${mangaId}/read?chapterId=${encodeURIComponent(chapterList[0].id)}&ch=${chapterList[0].chapterNumber}`}
              onClick={() => {
                try {
                  sessionStorage.setItem(`aniwavex_from_overview_${mangaId}`, "1");
                } catch {}
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              <Sparkles className="w-4 h-4" />
              Start Ch. {chapterList[0].chapterNumber}
            </Link>
          )}

          <MangaBookmarkButton
            mangaId={mangaId}
            mangaTitle={mangaTitle || "Manga"}
            posterImage={posterImage}
            variant="hero"
          />
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters (e.g. 10, Prologue)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSort}
          className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none shrink-0"
          title={`Order: ${sortOrder === "asc" ? "Oldest First" : "Newest First"}`}
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span>{sortOrder === "asc" ? "1 → N" : "N → 1"}</span>
        </button>
      </div>

      {/* Chapters Grid (Desktop-first expansive columns & TV focus) */}
      {filteredChapters.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/30 border border-white/5 rounded-2xl text-slate-400 space-y-3">
          {isFetching ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <p className="text-sm font-semibold text-slate-300">Searching providers for available chapters...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold">
                {searchQuery ? `No chapters found matching "${searchQuery}"` : "No chapters found matching this title."}
              </p>
              <button
                type="button"
                onClick={fetchFallbackChapters}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold border border-white/10 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Retry Search
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {filteredChapters.map((ch) => {
            const isLastRead = progress && (ch.id === progress.chapterId || ch.chapterNumber === progress.chapterNumber);

            return (
              <Link
                key={ch.id}
                href={`/manga/${mangaId}/read?chapterId=${encodeURIComponent(ch.id)}&ch=${ch.chapterNumber}`}
                onClick={() => {
                  try {
                    sessionStorage.setItem(`aniwavex_from_overview_${mangaId}`, "1");
                  } catch {}
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl transition-all group border focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none focus-visible:scale-[1.02] ${
                  isLastRead
                    ? "bg-cyan-950/30 border-cyan-500/50 shadow-md shadow-cyan-500/10"
                    : "bg-slate-900/70 hover:bg-slate-800 border-white/10 hover:border-cyan-500/40"
                }`}
              >
                <div className="min-w-0 pr-2 flex items-center gap-2">
                  <span
                    className={`font-semibold text-sm block truncate transition-colors ${
                      isLastRead
                        ? "text-cyan-300 font-bold"
                        : "text-white group-hover:text-cyan-400"
                    }`}
                  >
                    {ch.title}
                  </span>
                  {isLastRead && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold flex items-center gap-0.5 border border-cyan-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Read
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
