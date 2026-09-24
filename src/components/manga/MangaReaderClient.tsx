"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface ReaderPageProps {
  mangaId: string;
  chapterId: string;
  chapterNumber?: number;
}

export default function MangaReaderClient({ mangaId, chapterId, chapterNumber }: ReaderPageProps) {
  const [pages, setPages] = useState<{ pageNumber: number; imageUrl: string; referer?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVisiblePage, setCurrentVisiblePage] = useState(1);

  const fetchPages = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manga/read?chapterId=${encodeURIComponent(chapterId)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load chapter pages");
      }
      setPages(json.data.pages || []);
    } catch (err: any) {
      setError(err.message || "Unable to load chapter images");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [chapterId]);

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col">
      {/* Sticky Reader Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/manga/${mangaId}`}
            className="p-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Back to Manga Overview"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
              Chapter {chapterNumber || chapterId}
            </h1>
            <p className="text-[11px] text-slate-400">
              Page {currentVisiblePage} of {pages.length || "?"}
            </p>
          </div>
        </div>

        {/* Chapter navigation jump controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPages}
            className="p-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Reload chapter"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Reader Container (Vertical Continuous Webtoon Flow) */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-2 sm:px-4 py-6 flex flex-col items-center gap-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm font-medium">Fetching chapter images…</p>
          </div>
        )}

        {error && (
          <div className="w-full p-6 bg-slate-900 border border-white/10 rounded-2xl text-center space-y-3 my-12">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Could not load chapter</h2>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">{error}</p>
            <button
              onClick={fetchPages}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Retry Loading
            </button>
          </div>
        )}

        {!isLoading && !error && pages.length === 0 && (
          <div className="w-full p-8 bg-slate-900/60 border border-white/10 rounded-2xl text-center space-y-2 my-12">
            <p className="text-base font-semibold text-slate-300">No pages found in this chapter source</p>
            <p className="text-xs text-slate-500">Please choose another chapter from the index.</p>
          </div>
        )}

        {!isLoading &&
          pages.map((p, index) => {
            const refererQuery = p.referer ? `&referer=${encodeURIComponent(p.referer)}` : "";
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}${refererQuery}`;
            return (
              <div
                key={p.pageNumber}
                className="relative w-full max-w-2xl bg-slate-950 rounded-lg overflow-hidden border border-white/5 shadow-2xl"
              >
                {/* Lazy loading images to prevent Android OOM crashes */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxyUrl}
                  alt={`Page ${p.pageNumber}`}
                  loading={index < 3 ? "eager" : "lazy"}
                  className="w-full h-auto object-contain select-none"
                  onLoad={() => setCurrentVisiblePage(p.pageNumber)}
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-slate-400 font-mono">
                  {p.pageNumber}
                </div>
              </div>
            );
          })}
      </main>

      {/* Reader Footer Controls */}
      <footer className="border-t border-white/10 bg-slate-950/80 px-4 py-4 text-center">
        <p className="text-xs text-slate-500">End of Chapter {chapterNumber || chapterId}</p>
        <Link
          href={`/manga/${mangaId}`}
          className="inline-block mt-2 text-sm text-cyan-400 hover:underline font-semibold"
        >
          Return to Chapter List
        </Link>
      </footer>
    </div>
  );
}
