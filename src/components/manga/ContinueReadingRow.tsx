"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookOpen, Play, X } from "lucide-react";

interface MangaProgressItem {
  mangaId: string;
  mangaTitle: string;
  posterImage?: string;
  chapterId: string;
  chapterNumber: number;
  pageNumber: number;
  updatedAt: number;
}

export default function ContinueReadingRow() {
  const [items, setItems] = useState<MangaProgressItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReadingHistory = useCallback(() => {
    try {
      const historyMap = new Map<string, MangaProgressItem>();

      // 1. First read from unified recents list (aniwavex_recent_manga)
      const listRaw = localStorage.getItem("aniwavex_recent_manga");
      if (listRaw) {
        const list = JSON.parse(listRaw);
        if (Array.isArray(list)) {
          list.forEach((entry: any) => {
            if (entry && entry.mangaId && entry.chapterId) {
              historyMap.set(String(entry.mangaId), {
                mangaId: String(entry.mangaId),
                mangaTitle: entry.mangaTitle || "Manga",
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

      // 2. Scan per-manga localStorage keys (aniwavex_manga_progress_*) to backfill any existing reads
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
                    mangaId: String(entry.mangaId),
                    mangaTitle: entry.mangaTitle || existing?.mangaTitle || "Manga",
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

      const sortedList = Array.from(historyMap.values())
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 12);

      setItems(sortedList);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReadingHistory();

    const handleProgressUpdate = () => {
      loadReadingHistory();
    };

    window.addEventListener("aniwavex_manga_progress_updated", handleProgressUpdate);
    window.addEventListener("storage", handleProgressUpdate);

    return () => {
      window.removeEventListener("aniwavex_manga_progress_updated", handleProgressUpdate);
      window.removeEventListener("storage", handleProgressUpdate);
    };
  }, [loadReadingHistory]);

  const handleRemove = (e: React.MouseEvent, mangaId: string) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Update component state
    setItems((prev) => prev.filter((it) => it.mangaId !== mangaId));

    // 2. Remove from localStorage
    try {
      localStorage.removeItem(`aniwavex_manga_progress_${mangaId}`);
      const raw = localStorage.getItem("aniwavex_recent_manga");
      if (raw) {
        let list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list = list.filter((it: any) => it.mangaId !== mangaId);
          localStorage.setItem("aniwavex_recent_manga", JSON.stringify(list));
        }
      }
    } catch {}
  };

  if (loading || items.length === 0) return null;

  return (
    <div className="w-full mt-10 mb-8 px-2 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-cyan-600/20 text-cyan-400 rounded-lg border border-cyan-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Continue Reading
          </h2>
        </div>
      </div>

      {/* Horizontal Carousel with Vertical Cards matching ContinueWatchingRow */}
      <div 
        data-tv-rail="true"
        className="tv-horizontal-rail flex overflow-x-auto gap-4 tv:gap-6 pb-4 px-1 snap-x snap-mandatory hide-scrollbar scroll-smooth"
      >
        {items.map((item) => (
          <div
            key={item.mangaId}
            className="snap-start shrink-0 w-[155px] sm:w-[185px] md:w-[210px] lg:w-[230px] xl:w-[250px] 2xl:w-[270px] tv:w-[290px] group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-cyan-500/50 group-focus-within:border-cyan-400 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:scale-[1.02] group-focus-within:scale-[1.03]"
          >
            {/* Media & Title Link -> Navigates to MANGA OVERVIEW PAGE */}
            <Link
              href={`/manga/${item.mangaId}`}
              prefetch={true}
              className="block relative aspect-[2/3] w-full overflow-hidden bg-slate-950 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:rounded-2xl"
              aria-label={`Open overview for ${item.mangaTitle}`}
            >
              {item.posterImage ? (
                <Image
                  src={item.posterImage}
                  alt={item.mangaTitle}
                  fill
                  sizes="(max-width: 640px) 155px, (max-width: 1024px) 185px, (max-width: 1280px) 230px, (max-width: 1920px) 270px, 290px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 to-slate-950 text-slate-500">
                  <BookOpen className="w-10 h-10 mb-2 text-cyan-500/50" />
                  <span className="text-xs font-bold text-slate-400 text-center line-clamp-2">
                    {item.mangaTitle}
                  </span>
                </div>
              )}

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

              {/* Top Badge: CH X (P. Y) */}
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-md backdrop-blur-md bg-cyan-600/20 text-cyan-400 border-cyan-500/30">
                  CH. {item.chapterNumber} (P. {item.pageNumber || 1})
                </span>
              </div>

              {/* Bottom Title & Progress Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none">
                <h3
                  className="text-white font-bold text-sm truncate mb-1 group-hover:text-cyan-400 transition-colors drop-shadow-md"
                  title={item.mangaTitle}
                >
                  {item.mangaTitle}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                  <span className="text-slate-400">Chapter {item.chapterNumber}</span>
                  <span className="text-cyan-400 font-bold">Page {item.pageNumber || 1}</span>
                </div>
              </div>
            </Link>

            {/* Direct Play/Read Hover Button -> Directly opens chapter at page Y */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
              <Link
                href={`/manga/${item.mangaId}/read?chapterId=${encodeURIComponent(item.chapterId)}&ch=${item.chapterNumber}&page=${item.pageNumber || 1}`}
                className="pointer-events-auto w-12 h-12 sm:w-14 sm:h-14 bg-cyan-600/95 hover:bg-cyan-500 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-all duration-300 hover:scale-110 cursor-pointer focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
                title={`Read Chapter ${item.chapterNumber} (p. ${item.pageNumber || 1}) directly`}
                aria-label={`Read Chapter ${item.chapterNumber} directly`}
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white ml-0.5 fill-current" />
              </Link>
            </div>

            {/* Action Buttons: Remove from Continue Reading */}
            <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => handleRemove(e, item.mangaId)}
                className="p-1.5 bg-black/75 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
                title="Remove from Continue Reading"
                aria-label={`Remove ${item.mangaTitle} from continue reading`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
