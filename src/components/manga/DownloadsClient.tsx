"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  BookOpen,
  Trash2,
  HardDrive,
  Clock,
  Sparkles,
  WifiOff,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  RotateCcw
} from "lucide-react";
import {
  getAllOfflineChapters,
  deleteOfflineChapter,
  clearAllOfflineChapters,
  type OfflineChapter,
} from "@/lib/manga/offline-storage";

export default function DownloadsClient() {
  const [downloads, setDownloads] = useState<OfflineChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const list = await getAllOfflineChapters();
      setDownloads(list);
    } catch (err) {
      console.error("[Downloads] Failed to load offline chapters:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const handleDelete = async (mangaId: string, chapterId: string) => {
    const key = `${mangaId}_${chapterId}`;
    try {
      setDeletingId(key);
      await deleteOfflineChapter(mangaId, chapterId);
      setDownloads((prev) => prev.filter((item) => item.id !== key));
    } catch (err) {
      console.error("[Downloads] Failed to delete chapter:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllOfflineChapters();
      setDownloads([]);
      setConfirmClearAll(false);
    } catch (err) {
      console.error("[Downloads] Failed to clear offline storage:", err);
    }
  };

  // Group downloads by mangaId
  const groupedDownloads = useMemo(() => {
    const map = new Map<string, { mangaTitle: string; posterImage?: string; chapters: OfflineChapter[] }>();
    
    downloads.forEach((ch) => {
      if (!map.has(ch.mangaId)) {
        map.set(ch.mangaId, {
          mangaTitle: ch.mangaTitle,
          posterImage: ch.posterImage,
          chapters: [],
        });
      }
      map.get(ch.mangaId)!.chapters.push(ch);
    });

    // Apply search filter if query is provided
    if (!searchQuery.trim()) return Array.from(map.entries());

    const q = searchQuery.toLowerCase();
    const filtered: [string, { mangaTitle: string; posterImage?: string; chapters: OfflineChapter[] }][] = [];

    map.forEach((data, mId) => {
      const matchTitle = data.mangaTitle.toLowerCase().includes(q);
      const matchingChapters = data.chapters.filter(
        (c) =>
          c.chapterNumber.toString().includes(q) ||
          (c.chapterTitle && c.chapterTitle.toLowerCase().includes(q))
      );

      if (matchTitle) {
        filtered.push([mId, data]);
      } else if (matchingChapters.length > 0) {
        filtered.push([mId, { ...data, chapters: matchingChapters }]);
      }
    });

    return filtered;
  }, [downloads, searchQuery]);

  // Approximate total storage size
  const totalPagesCount = useMemo(() => {
    return downloads.reduce((acc, cur) => acc + (cur.totalPages || 0), 0);
  }, [downloads]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Offline Downloads</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {downloads.length} {downloads.length === 1 ? "Chapter" : "Chapters"}
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Chapters stored in your device's offline browser database. Ready to read with no internet.
              </p>
            </div>
          </div>
        </div>

        {/* Global Storage Stats & Clear Button */}
        {downloads.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>{totalPagesCount} Pages Saved</span>
            </div>

            {confirmClearAll ? (
              <div className="flex items-center gap-2 animate-in fade-in">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
                >
                  Confirm Delete All
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="px-3 py-2 rounded-xl bg-slate-950/70 hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Delete all downloaded chapters"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Search Toolbar */}
      {downloads.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search downloads by manga title or chapter..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-16 text-center rounded-3xl bg-slate-900/40 border border-white/5 space-y-3">
          <div className="w-8 h-8 mx-auto rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-slate-400">Loading your offline storage...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && downloads.length === 0 && (
        <div className="p-12 sm:p-16 text-center rounded-3xl bg-slate-900/40 border border-white/10 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Download className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-bold text-white">No Offline Downloads Yet</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              When reading any manga chapter online, click the{" "}
              <span className="inline-flex items-center gap-1 font-semibold text-cyan-400">
                <Download className="w-3.5 h-3.5 inline" /> Download
              </span>{" "}
              button in the reader header. The chapter pages will be stored locally on your device for 100% offline access.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/manga"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Manga Catalog</span>
            </Link>
          </div>
        </div>
      )}

      {/* Grouped Downloads List */}
      {!loading && groupedDownloads.length > 0 && (
        <div className="space-y-6">
          {groupedDownloads.map(([mId, group]) => (
            <div
              key={mId}
              className="rounded-3xl bg-slate-900/60 border border-white/10 overflow-hidden shadow-xl"
            >
              {/* Manga Header */}
              <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {group.posterImage && (
                    <img
                      src={group.posterImage}
                      alt={group.mangaTitle}
                      className="w-10 h-14 object-cover rounded-xl border border-white/10 shadow-md shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/manga/${mId}`}
                      className="text-base sm:text-lg font-bold text-white hover:text-cyan-400 transition-colors truncate block"
                    >
                      {group.mangaTitle}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {group.chapters.length} {group.chapters.length === 1 ? "chapter" : "chapters"} ready offline
                    </p>
                  </div>
                </div>

                <Link
                  href={`/manga/${mId}`}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <span>Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Chapters Rows */}
              <div className="divide-y divide-white/5">
                {group.chapters.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/manga/${ch.mangaId}/read?chapterId=${encodeURIComponent(ch.chapterId)}&ch=${ch.chapterNumber}`}
                          className="font-bold text-sm text-white hover:text-cyan-400 transition-colors block truncate"
                        >
                          Chapter {ch.chapterNumber}
                          {ch.chapterTitle ? ` — ${ch.chapterTitle}` : ""}
                        </Link>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-400" />
                            {ch.totalPages} pages
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {new Date(ch.downloadedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Read Now & Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/manga/${ch.mangaId}/read?chapterId=${encodeURIComponent(ch.chapterId)}&ch=${ch.chapterNumber}`}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
                      >
                        <span>Read</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(ch.mangaId, ch.chapterId)}
                        disabled={deletingId === ch.id}
                        className="p-2 rounded-xl bg-slate-950 hover:bg-red-950/40 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all disabled:opacity-50"
                        title="Delete from offline storage"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
