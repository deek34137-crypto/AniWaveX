"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  Maximize2,
  Minimize2,
  BookOpen,
  SlidersHorizontal,
  X,
  Check,
  Search,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";
import { MangaChapter } from "@/lib/manga/types";

interface ReaderPageProps {
  mangaId: string;
  mangaTitle?: string;
  posterImage?: string;
  chapterId: string;
  chapterNumber?: number;
  chapters?: MangaChapter[];
  initialPage?: number;
}

type ReaderWidth = "standard" | "fit-screen" | "wide" | "full";

const WIDTH_LABELS: Record<ReaderWidth, string> = {
  standard: "Standard (768px)",
  "fit-screen": "Fit Screen (Height)",
  wide: "Wide (1024px)",
  full: "Full Width (1280px+)",
};

export default function MangaReaderClient({
  mangaId,
  mangaTitle = "Manga",
  posterImage,
  chapterId,
  chapterNumber,
  chapters = [],
  initialPage,
}: ReaderPageProps) {
  const router = useRouter();

  // Active chapter state: initialized from props, updated immediately on client navigation
  const [activeChapterId, setActiveChapterId] = useState(chapterId);
  const [activeChapterNum, setActiveChapterNum] = useState<number | undefined>(chapterNumber);

  const [pages, setPages] = useState<{ pageNumber: number; imageUrl: string; referer?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVisiblePage, setCurrentVisiblePage] = useState(initialPage || 1);
  const [readerWidth, setReaderWidth] = useState<ReaderWidth>("standard");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, number>>({});

  // Chapter modal search & sort
  const [modalSearch, setModalSearch] = useState("");
  const [modalSortOrder, setModalSortOrder] = useState<"asc" | "desc">("asc");
  const activeChapterButtonRef = useRef<HTMLButtonElement | null>(null);

  // Sync state if props change from external URL change
  useEffect(() => {
    setActiveChapterId(chapterId);
    setActiveChapterNum(chapterNumber);
  }, [chapterId, chapterNumber]);

  // Restore saved width preference from localStorage
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem("aniwavex_manga_reader_width") as ReaderWidth;
      if (savedWidth && ["standard", "fit-screen", "wide", "full"].includes(savedWidth)) {
        setReaderWidth(savedWidth);
      }
    } catch {}
  }, []);

  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Determine current chapter index, previous chapter, and next chapter
  const currentIndex = useMemo(() => {
    if (!chapters || chapters.length === 0) return -1;
    const byId = chapters.findIndex((c) => c.id === activeChapterId);
    if (byId !== -1) return byId;
    return chapters.findIndex((c) => c.chapterNumber === activeChapterNum);
  }, [chapters, activeChapterId, activeChapterNum]);

  const currentChapterObj = currentIndex >= 0 ? chapters[currentIndex] : null;
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  // Fetch chapter pages
  const fetchPages = useCallback(async () => {
    if (!activeChapterId) return;
    setIsLoading(true);
    setError(null);
    setFailedImages({});
    try {
      const res = await fetch(`/api/manga/read?chapterId=${encodeURIComponent(activeChapterId)}`);
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
  }, [activeChapterId]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // Track currently visible page using IntersectionObserver during scroll
  useEffect(() => {
    if (pages.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting);
        if (intersecting.length > 0) {
          intersecting.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const pNum = Number(intersecting[0].target.getAttribute("data-page"));
          if (pNum && !isNaN(pNum)) {
            setCurrentVisiblePage(pNum);
          }
        }
      },
      {
        threshold: [0.1, 0.4, 0.8],
        rootMargin: "-10% 0px -40% 0px",
      }
    );

    const elements = document.querySelectorAll("[data-page]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pages]);

  // Restore scroll to target page (Page Y) when opening chapter
  const hasRestoredPageRef = useRef(false);

  useEffect(() => {
    if (pages.length === 0 || isLoading) return;

    let targetPage = initialPage;
    if (!targetPage && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlP = urlParams.get("page") || urlParams.get("p");
      if (urlP) targetPage = parseInt(urlP, 10);
    }

    if (!targetPage && typeof window !== "undefined") {
      try {
        const savedRaw = localStorage.getItem(`aniwavex_manga_progress_${mangaId}`);
        if (savedRaw) {
          const saved = JSON.parse(savedRaw);
          if (
            (saved.chapterId === activeChapterId || saved.chapterNumber === activeChapterNum) &&
            saved.pageNumber > 1
          ) {
            targetPage = saved.pageNumber;
          }
        }
      } catch {}
    }

    if (targetPage && targetPage > 1 && !hasRestoredPageRef.current) {
      hasRestoredPageRef.current = true;
      setCurrentVisiblePage(targetPage);

      const performScroll = () => {
        const pageEl = document.querySelector(`[data-page="${targetPage}"]`);
        if (pageEl) {
          pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      };

      const t1 = setTimeout(performScroll, 100);
      const t2 = setTimeout(performScroll, 350);
      const t3 = setTimeout(performScroll, 700);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [pages, isLoading, initialPage, activeChapterId, activeChapterNum, mangaId]);

  // Save reading progress to localStorage
  useEffect(() => {
    if (isLoading || pages.length === 0) return;
    // Prevent premature overwrite before scroll restoration finishes
    if (initialPage && initialPage > 1 && !hasRestoredPageRef.current) return;

    try {
      const progressRecord = {
        mangaId,
        mangaTitle,
        posterImage: posterImage || undefined,
        chapterId: activeChapterId,
        chapterNumber: activeChapterNum || currentChapterObj?.chapterNumber || 1,
        pageNumber: currentVisiblePage,
        updatedAt: Date.now(),
      };
      localStorage.setItem(`aniwavex_manga_progress_${mangaId}`, JSON.stringify(progressRecord));

      // Also maintain recent manga list for Continue Reading row
      try {
        const listRaw = localStorage.getItem("aniwavex_recent_manga");
        let list = listRaw ? JSON.parse(listRaw) : [];
        if (!Array.isArray(list)) list = [];
        list = list.filter((it: any) => it.mangaId !== mangaId);
        list.unshift(progressRecord);
        localStorage.setItem("aniwavex_recent_manga", JSON.stringify(list.slice(0, 20)));
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("aniwavex_manga_progress_updated", {
            detail: progressRecord,
          })
        );
      }
    } catch {}
  }, [
    mangaId,
    mangaTitle,
    posterImage,
    activeChapterId,
    activeChapterNum,
    currentChapterObj,
    currentVisiblePage,
    isLoading,
    pages.length,
    initialPage,
  ]);

  // Back to Manga Overview: cleanly pops the reader entry when navigated from overview
  const handleBackToOverview = useCallback(() => {
    if (typeof window !== "undefined") {
      const cameFromOverview =
        sessionStorage.getItem(`aniwavex_from_overview_${mangaId}`) === "1" ||
        (document.referrer && document.referrer.includes(`/manga/${mangaId}`));
      if (cameFromOverview && window.history.length > 1) {
        router.back();
        return;
      }
    }
    // Direct entry fallback
    router.replace(`/manga/${mangaId}`);
  }, [router, mangaId]);

  // Chapter-to-Chapter navigation uses router.replace to avoid history pollution
  const navigateToChapter = useCallback(
    (targetChapter: MangaChapter) => {
      setIsChapterListOpen(false);
      hasRestoredPageRef.current = false;
      // Immediately transition client state to eliminate stale page flash
      setActiveChapterId(targetChapter.id);
      setActiveChapterNum(targetChapter.chapterNumber);
      setPages([]);
      setIsLoading(true);
      setError(null);
      setFailedImages({});
      setCurrentVisiblePage(1);
      window.scrollTo({ top: 0, behavior: "instant" });

      const url = `/manga/${mangaId}/read?chapterId=${encodeURIComponent(targetChapter.id)}&ch=${targetChapter.chapterNumber}`;
      router.replace(url, { scroll: false });
    },
    [router, mangaId]
  );

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Width mode toggle
  const cycleWidth = useCallback(() => {
    const order: ReaderWidth[] = ["standard", "fit-screen", "wide", "full"];
    const nextIdx = (order.indexOf(readerWidth) + 1) % order.length;
    const next = order[nextIdx];
    setReaderWidth(next);
    try {
      localStorage.setItem("aniwavex_manga_reader_width", next);
    } catch {}
  }, [readerWidth]);

  // Keyboard and Remote D-pad navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused or modal open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape" || e.key === "Backspace") {
        if (isChapterListOpen) {
          setIsChapterListOpen(false);
        } else {
          handleBackToOverview();
        }
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (prevChapter && !isChapterListOpen) {
          navigateToChapter(prevChapter);
        }
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (nextChapter && !isChapterListOpen) {
          navigateToChapter(nextChapter);
        }
      } else if (e.key === "ArrowDown") {
        window.scrollBy({ top: 400, behavior: "smooth" });
      } else if (e.key === "ArrowUp") {
        window.scrollBy({ top: -400, behavior: "smooth" });
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prevChapter, nextChapter, isChapterListOpen, handleBackToOverview, navigateToChapter, toggleFullscreen]);

  // Retry individual broken image
  const handleImageError = (pageNumber: number) => {
    setFailedImages((prev) => ({
      ...prev,
      [pageNumber]: (prev[pageNumber] || 0) + 1,
    }));
  };

  const getWidthClass = () => {
    switch (readerWidth) {
      case "fit-screen":
        return "max-w-5xl";
      case "wide":
        return "max-w-5xl";
      case "full":
        return "max-w-7xl 2xl:max-w-[1600px]";
      case "standard":
      default:
        return "max-w-3xl";
    }
  };

  const getImageClass = () => {
    if (readerWidth === "fit-screen") {
      return "max-h-[88vh] 2xl:max-h-[90vh] w-auto max-w-full object-contain mx-auto select-none";
    }
    return "w-full max-w-full h-auto object-contain select-none";
  };

  // Filtered & sorted chapters for modal
  const filteredModalChapters = useMemo(() => {
    let result = [...chapters];
    if (modalSearch.trim()) {
      const q = modalSearch.toLowerCase().trim();
      result = result.filter(
        (ch) => ch.title.toLowerCase().includes(q) || ch.chapterNumber.toString().includes(q)
      );
    }
    if (modalSortOrder === "desc") {
      result.sort((a, b) => b.chapterNumber - a.chapterNumber);
    } else {
      result.sort((a, b) => a.chapterNumber - b.chapterNumber);
    }
    return result;
  }, [chapters, modalSearch, modalSortOrder]);

  // Auto-scroll to active chapter when modal opens
  useEffect(() => {
    if (isChapterListOpen && activeChapterButtonRef.current) {
      activeChapterButtonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isChapterListOpen]);

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col select-none">
      {/* Sticky Reader Header (Desktop + TV Friendly) */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-xl border-b border-white/10 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shadow-2xl">
        {/* Left: Back to Manga & Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={handleBackToOverview}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-200 hover:text-white transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none focus-visible:scale-105 shrink-0"
            title="Back to Manga Overview (Esc / Backspace)"
            aria-label="Back to Manga Overview"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-400" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-semibold text-cyan-400 truncate hidden xs:inline max-w-[140px] sm:max-w-xs">
                {mangaTitle}
              </span>
              <span className="text-slate-500 hidden xs:inline">•</span>
              <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[160px] sm:max-w-md">
                {currentChapterObj?.title || `Chapter ${activeChapterNum ?? activeChapterId}`}
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
              Page {currentVisiblePage} of {pages.length || "?"}
            </p>
          </div>
        </div>

        {/* Center/Right: Chapter Navigation & Reader Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Previous Chapter Button */}
          <button
            type="button"
            onClick={() => prevChapter && navigateToChapter(prevChapter)}
            disabled={!prevChapter}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border flex items-center gap-1 text-xs font-semibold transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${
              prevChapter
                ? "bg-slate-900 hover:bg-slate-800 border-white/15 text-slate-200 hover:text-white cursor-pointer"
                : "bg-slate-950 border-white/5 text-slate-600 cursor-not-allowed"
            }`}
            title={prevChapter ? `Previous: Ch. ${prevChapter.chapterNumber} (Left Arrow)` : "No previous chapter"}
            aria-label="Previous Chapter"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden md:inline">Prev</span>
          </button>

          {/* Chapter Selector Jump Trigger */}
          {chapters.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setModalSearch("");
                setIsChapterListOpen(true);
              }}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
              title="Select Chapter from List"
              aria-label="Select Chapter"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chapters</span>
              <span className="text-[10px] text-slate-400 font-mono">({chapters.length})</span>
            </button>
          )}

          {/* Next Chapter Button */}
          <button
            type="button"
            onClick={() => nextChapter && navigateToChapter(nextChapter)}
            disabled={!nextChapter}
            className={`p-2 sm:px-3 sm:py-2 rounded-xl border flex items-center gap-1 text-xs font-semibold transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${
              nextChapter
                ? "bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-500/40 text-cyan-300 hover:text-white cursor-pointer shadow-md shadow-cyan-500/10"
                : "bg-slate-950 border-white/5 text-slate-600 cursor-not-allowed"
            }`}
            title={nextChapter ? `Next: Ch. ${nextChapter.chapterNumber} (Right Arrow)` : "No next chapter"}
            aria-label="Next Chapter"
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Width Mode Toggle (Desktop only) */}
          <button
            type="button"
            onClick={cycleWidth}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
            title={`Reading Width: ${WIDTH_LABELS[readerWidth]} (Click to cycle)`}
            aria-label="Toggle reader width"
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-mono capitalize hidden xl:inline">{readerWidth.replace("-", " ")}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
            title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Reload Chapter */}
          <button
            type="button"
            onClick={fetchPages}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
            title="Reload chapter"
            aria-label="Reload chapter"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Reader Container (Vertical Continuous Webtoon Flow) */}
      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center gap-3 transition-all duration-300 ${getWidthClass()}`}>
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-36 text-slate-400 gap-4 animate-in fade-in">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
            <p className="text-base font-semibold text-slate-200">Loading Chapter {activeChapterNum ?? activeChapterId}…</p>
            <p className="text-xs text-slate-500">Fetching high quality pages from source</p>
          </div>
        )}

        {error && (
          <div className="w-full max-w-lg p-8 bg-slate-900/90 border border-rose-500/30 rounded-3xl text-center space-y-4 my-16 shadow-2xl">
            <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Could not load chapter</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={fetchPages}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-600/20 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
              >
                Retry Loading
              </button>
              <button
                type="button"
                onClick={handleBackToOverview}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-all border border-white/10"
              >
                Back to Manga
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && pages.length === 0 && (
          <div className="w-full max-w-lg p-10 bg-slate-900/70 border border-white/10 rounded-3xl text-center space-y-3 my-16">
            <p className="text-lg font-bold text-slate-200">No pages found in this chapter source</p>
            <p className="text-xs text-slate-400">Please choose another chapter or return to the manga index.</p>
            <button
              type="button"
              onClick={handleBackToOverview}
              className="mt-4 px-5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-xl text-sm transition-all border border-cyan-500/30"
            >
              Return to Chapter List
            </button>
          </div>
        )}

        {!isLoading &&
          pages.map((p, index) => {
            const refererQuery = p.referer ? `&referer=${encodeURIComponent(p.referer)}` : "";
            const retryCount = failedImages[p.pageNumber] || 0;
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}${refererQuery}${retryCount > 0 ? `&_r=${retryCount}` : ""}`;

            return (
              <div
                key={p.pageNumber}
                data-page={p.pageNumber}
                className="relative w-full bg-slate-950 rounded-xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center min-h-[300px]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={proxyUrl}
                  alt={`Page ${p.pageNumber}`}
                  loading={index < 3 ? "eager" : "lazy"}
                  className={getImageClass()}
                  onError={() => handleImageError(p.pageNumber)}
                />

                {/* Individual Failed Image Overlay with Retry Button (Phase 17) */}
                {retryCount > 0 && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center gap-3">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <p className="text-sm font-semibold text-slate-200">Failed to load Page {p.pageNumber}</p>
                    <p className="text-xs text-slate-400">Upstream image server temporarily timed out</p>
                    <button
                      type="button"
                      onClick={() => handleImageError(p.pageNumber)}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Page {p.pageNumber}
                    </button>
                  </div>
                )}

                {/* Page number badge */}
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-md text-[11px] text-slate-300 font-mono border border-white/10 pointer-events-none">
                  {p.pageNumber} / {pages.length}
                </div>
              </div>
            );
          })}
      </main>

      {/* End of Chapter Section — Obvious Continuous Flow (Phase 5, 6, 7) */}
      {!isLoading && !error && pages.length > 0 && (
        <section className="w-full border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl py-12 px-4 text-center mt-4 shadow-2xl">
          <div className="max-w-xl mx-auto space-y-6">
            {nextChapter ? (
              <>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    Completed Chapter {activeChapterNum ?? activeChapterId}
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                    Up Next: {nextChapter.title || `Chapter ${nextChapter.chapterNumber}`}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Continue reading seamlessly without returning to the overview.
                  </p>
                </div>

                {/* Strong Primary Action: Read Next Chapter */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigateToChapter(nextChapter)}
                    className="w-full sm:w-auto min-w-[280px] px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-sm sm:text-base transition-all shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mx-auto focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
                    title={`Read Chapter ${nextChapter.chapterNumber}`}
                  >
                    <span>Read Next Chapter ({nextChapter.chapterNumber})</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Secondary Actions Row */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {prevChapter && (
                    <button
                      type="button"
                      onClick={() => navigateToChapter(prevChapter)}
                      className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev Ch. {prevChapter.chapterNumber}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleBackToOverview}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
                  >
                    <ArrowLeft className="w-4 h-4 text-cyan-400" />
                    Back to Manga
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    You&apos;re All Caught Up!
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                    Final Chapter Reached
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                    You have finished the latest available chapter of {mangaTitle}. Check back later for new releases!
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToOverview}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm sm:text-base transition-all shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Return to Manga Overview
                  </button>

                  {prevChapter && (
                    <button
                      type="button"
                      onClick={() => navigateToChapter(prevChapter)}
                      className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev Ch. {prevChapter.chapterNumber}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Chapter Selection Modal / Drawer with Search & Sort (Phase 9) */}
      {isChapterListOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-400" />
                  Jump to Chapter
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-xs">{mangaTitle} • {chapters.length} chapters</p>
              </div>
              <button
                type="button"
                onClick={() => setIsChapterListOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close chapter menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Sort Toolbar */}
            <div className="p-3 sm:p-4 border-b border-white/5 flex items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Filter chapters (e.g. 25, Prologue)..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
                  autoFocus
                />
                {modalSearch && (
                  <button
                    onClick={() => setModalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setModalSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                title={`Order: ${modalSortOrder === "asc" ? "1 → N" : "N → 1"}`}
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>{modalSortOrder === "asc" ? "1 → N" : "N → 1"}</span>
              </button>
            </div>

            {/* Chapter Items Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 hide-scrollbar">
              {filteredModalChapters.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs text-slate-500">
                  No chapters match &ldquo;{modalSearch}&rdquo;
                </div>
              ) : (
                filteredModalChapters.map((ch) => {
                  const isCurrent = ch.id === activeChapterId || ch.chapterNumber === activeChapterNum;
                  return (
                    <button
                      key={ch.id}
                      ref={isCurrent ? activeChapterButtonRef : null}
                      type="button"
                      onClick={() => navigateToChapter(ch)}
                      className={`p-3 rounded-xl text-left border flex items-center justify-between transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                        isCurrent
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold shadow-md shadow-cyan-500/10"
                          : "bg-slate-950/60 hover:bg-slate-800 border-white/5 text-slate-200"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs sm:text-sm font-semibold truncate">{ch.title}</p>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
