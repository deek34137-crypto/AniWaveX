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
  Download,
  CheckCircle2,
  Columns,
  ScrollText,
  Cloud,
  Palette,
} from "lucide-react";
import { MangaChapter } from "@/lib/manga/types";
import {
  saveChapterOffline,
  getOfflineChapter,
  isChapterDownloaded,
  deleteOfflineChapter,
  type OfflineChapter,
} from "@/lib/manga/offline-storage";

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
export type ReadingMode = "webtoon" | "paged-rtl" | "paged-ltr";
export type ReadingTone = "dark" | "oled" | "sepia";

export interface ReadingToneConfig {
  id: ReadingTone;
  label: string;
  bodyBg: string;
  headerBg: string;
  textColor: string;
  subtextColor: string;
  border: string;
  buttonBg: string;
  imageBorder: string;
  floatingPillBg: string;
}

export const READING_TONES: Record<ReadingTone, ReadingToneConfig> = {
  dark: {
    id: "dark",
    label: "Dark (Default)",
    bodyBg: "bg-black text-slate-100",
    headerBg: "bg-slate-950/95 border-white/10 text-white",
    textColor: "text-white",
    subtextColor: "text-slate-400",
    border: "border-white/10",
    buttonBg: "bg-slate-900 hover:bg-slate-800 border-white/15 text-slate-200",
    imageBorder: "border-white/10 bg-slate-950",
    floatingPillBg: "bg-black/75 text-slate-300 border-white/10",
  },
  oled: {
    id: "oled",
    label: "OLED Pure Black",
    bodyBg: "bg-black text-white",
    headerBg: "bg-black/95 border-neutral-900 text-white",
    textColor: "text-white",
    subtextColor: "text-neutral-400",
    border: "border-neutral-900",
    buttonBg: "bg-neutral-950 hover:bg-neutral-900 border-neutral-800 text-white",
    imageBorder: "border-neutral-900 bg-black",
    floatingPillBg: "bg-black/90 text-neutral-300 border-neutral-800",
  },
  sepia: {
    id: "sepia",
    label: "Warm Sepia",
    bodyBg: "bg-[#f4ecd8] text-[#2c251a]",
    headerBg: "bg-[#eae0c8]/95 border-[#d8cbaf] text-[#2c251a]",
    textColor: "text-[#2c251a]",
    subtextColor: "text-[#6b5d4d]",
    border: "border-[#d8cbaf]",
    buttonBg: "bg-[#eae0c8] hover:bg-[#dfd4bc] border-[#d8cbaf] text-[#2c251a]",
    imageBorder: "border-[#d8cbaf] bg-[#eae0c8]",
    floatingPillBg: "bg-[#eae0c8]/95 text-[#2c251a] border-[#d8cbaf]",
  },
};

const WIDTH_LABELS: Record<ReaderWidth, string> = {
  standard: "Standard (768px)",
  "fit-screen": "Fit Screen (Height)",
  wide: "Wide (1024px)",
  full: "Full Width (1280px+)",
};

const MODE_LABELS: Record<ReadingMode, string> = {
  webtoon: "Vertical Webtoon",
  "paged-rtl": "Manga (Right to Left)",
  "paged-ltr": "Comic (Left to Right)",
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
  const [readingMode, setReadingMode] = useState<ReadingMode>("webtoon");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<number, number>>({});

  // Offline Chapter Download & Playback State
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [offlineBlobs, setOfflineBlobs] = useState<Record<number, string>>({});

  // Reading Tone & Mobile Chrome Visibility State (starts hidden for maximum immersion)
  const [readingTone, setReadingTone] = useState<ReadingTone>("dark");
  const [isToneMenuOpen, setIsToneMenuOpen] = useState(false);
  const [isChromeVisible, setIsChromeVisible] = useState(false);
  const toneMenuRef = useRef<HTMLDivElement | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Cloud Sync Status Indicator
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastCloudSyncAt, setLastCloudSyncAt] = useState<number | null>(null);

  // Chapter modal search & sort
  const [modalSearch, setModalSearch] = useState("");
  const [modalSortOrder, setModalSortOrder] = useState<"asc" | "desc">("asc");
  const activeChapterButtonRef = useRef<HTMLButtonElement | null>(null);

  // Chapter-to-Chapter navigation uses router.replace to avoid history pollution
  const navigateToChapter = useCallback(
    (targetChapter: MangaChapter) => {
      setIsChapterListOpen(false);
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

  // Unified page navigation callbacks
  const handlePrevPage = useCallback(() => {
    if (readingMode === "webtoon") {
      const prevP = Math.max(1, currentVisiblePage - 1);
      setCurrentVisiblePage(prevP);
      const el = document.querySelector(`[data-page="${prevP}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (currentVisiblePage > 1) {
      setCurrentVisiblePage((prev) => prev - 1);
    } else if (prevChapter) {
      navigateToChapter(prevChapter);
    }
  }, [currentVisiblePage, readingMode, prevChapter, navigateToChapter]);

  const handleNextPage = useCallback(() => {
    if (readingMode === "webtoon") {
      const nextP = Math.min(pages.length, currentVisiblePage + 1);
      setCurrentVisiblePage(nextP);
      const el = document.querySelector(`[data-page="${nextP}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (currentVisiblePage < pages.length) {
      setCurrentVisiblePage((prev) => prev + 1);
    } else if (nextChapter) {
      navigateToChapter(nextChapter);
    }
  }, [currentVisiblePage, pages.length, readingMode, nextChapter, navigateToChapter]);

  // Standardized Tap Gestures: Center 30% toggles UI, Left/Right 35% advances/reverses in paged mode
  const handleTapAction = useCallback((clientX: number) => {
    const screenWidth = window.innerWidth;
    const isRTL = readingMode === "paged-rtl";

    // Center 30% [35% -> 65%]: Toggles header & footer controls
    if (clientX >= screenWidth * 0.35 && clientX <= screenWidth * 0.65) {
      setIsChromeVisible((prev) => !prev);
      return;
    }

    // In Webtoon continuous mode: tapping toggles header & scrub bar
    if (readingMode === "webtoon") {
      setIsChromeVisible((prev) => !prev);
      return;
    }

    // In Paged Mode:
    // Left 35% (< 0.35)
    if (clientX < screenWidth * 0.35) {
      if (isRTL) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
      return;
    }

    // Right 35% (> 0.65)
    if (clientX > screenWidth * 0.65) {
      if (isRTL) {
        handlePrevPage();
      } else {
        handleNextPage();
      }
      return;
    }
  }, [readingMode, handleNextPage, handlePrevPage]);

  // Sync state if props change from external URL change
  useEffect(() => {
    setActiveChapterId(chapterId);
    setActiveChapterNum(chapterNumber);
  }, [chapterId, chapterNumber]);

  // Restore saved width, reading mode, and tone preferences from localStorage
  useEffect(() => {
    try {
      const savedWidth = localStorage.getItem("aniwavex_manga_reader_width") as ReaderWidth;
      if (savedWidth && ["standard", "fit-screen", "wide", "full"].includes(savedWidth)) {
        setReaderWidth(savedWidth);
      }
      const savedMode = localStorage.getItem("aniwavex_manga_reading_mode") as ReadingMode;
      if (savedMode && ["webtoon", "paged-rtl", "paged-ltr"].includes(savedMode)) {
        setReadingMode(savedMode);
      }
      const savedTone = localStorage.getItem("aniwavex_manga_reading_tone") as ReadingTone;
      if (savedTone && ["dark", "oled", "sepia"].includes(savedTone)) {
        setReadingTone(savedTone);
      }
    } catch {}
  }, []);

  // Close tone menu on click outside
  useEffect(() => {
    if (!isToneMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (toneMenuRef.current && !toneMenuRef.current.contains(e.target as Node)) {
        setIsToneMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isToneMenuOpen]);

  // Gesture tap-center detection to toggle top/bottom chrome
  const handleReaderTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleReaderTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || e.changedTouches.length === 0) return;

    const diffX = Math.abs(e.changedTouches[0].clientX - touchStartPosRef.current.x);
    const diffY = Math.abs(e.changedTouches[0].clientY - touchStartPosRef.current.y);
    const duration = Date.now() - touchStartPosRef.current.time;
    touchStartPosRef.current = null;

    // Must be a deliberate tap with minimal travel (< 15px, < 350ms)
    if (diffX < 15 && diffY < 15 && duration < 350) {
      handleTapAction(e.changedTouches[0].clientX);
    }
  };

  const handleReaderClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, [role='button'], .no-toggle-ui")) return;
    handleTapAction(e.clientX);
  };

  // Check if current chapter is saved offline in IndexedDB
  useEffect(() => {
    let isMounted = true;
    if (!activeChapterId) return;

    isChapterDownloaded(mangaId, activeChapterId)
      .then((downloaded) => {
        if (!isMounted) return;
        setIsDownloaded(downloaded);
        if (downloaded) {
          getOfflineChapter(mangaId, activeChapterId).then((offlineCh) => {
            if (!isMounted || !offlineCh) return;
            const blobsMap: Record<number, string> = {};
            offlineCh.pages.forEach((p) => {
              blobsMap[p.pageNumber] = URL.createObjectURL(p.blob);
            });
            setOfflineBlobs(blobsMap);
          });
        } else {
          setOfflineBlobs({});
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [mangaId, activeChapterId]);

  // Clean up object URLs on unmount or chapter change
  useEffect(() => {
    return () => {
      Object.values(offlineBlobs).forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, [offlineBlobs]);


  // Fullscreen state listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Download entire current chapter for 100% offline access
  const handleDownloadChapterOffline = useCallback(async () => {
    if (pages.length === 0 || isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const downloadedPageBlobs: OfflineChapter["pages"] = [];
      const blobsMap: Record<number, string> = {};

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const refererQuery = p.referer ? `&referer=${encodeURIComponent(p.referer)}` : "";
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}${refererQuery}`;

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`Failed to download page ${p.pageNumber}`);
        const blob = await res.blob();

        downloadedPageBlobs.push({
          pageNumber: p.pageNumber,
          blob,
          mimeType: blob.type || "image/jpeg",
        });

        blobsMap[p.pageNumber] = URL.createObjectURL(blob);
        setDownloadProgress(Math.round(((i + 1) / pages.length) * 100));
      }

      await saveChapterOffline({
        id: `${mangaId}_${activeChapterId}`,
        mangaId,
        mangaTitle,
        posterImage,
        chapterId: activeChapterId,
        chapterNumber: activeChapterNum || currentChapterObj?.chapterNumber || 1,
        chapterTitle: currentChapterObj?.title,
        downloadedAt: Date.now(),
        totalPages: pages.length,
        pages: downloadedPageBlobs,
      });

      setOfflineBlobs(blobsMap);
      setIsDownloaded(true);
    } catch (err: any) {
      console.error("[Offline Download] Error:", err);
      alert("Failed to download chapter offline: " + (err.message || "Network issue"));
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [pages, isDownloading, mangaId, activeChapterId, activeChapterNum, currentChapterObj, mangaTitle, posterImage]);

  const handleRemoveOfflineChapter = async () => {
    try {
      await deleteOfflineChapter(mangaId, activeChapterId);
      setIsDownloaded(false);
      setOfflineBlobs({});
    } catch (err) {
      console.error("[Offline Removal] Error:", err);
    }
  };

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

  // Track currently visible page using IntersectionObserver during scroll (Webtoon mode only)
  useEffect(() => {
    if (pages.length === 0 || readingMode !== "webtoon") return;

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
  }, [pages, readingMode]);

  // Restore scroll to target page (Page Y) when opening chapter in Webtoon mode
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

      // Fallback: Check Supabase cloud progress if not found in local storage
      if (!targetPage && !hasRestoredPageRef.current) {
        fetch(`/api/manga/progress?mangaId=${encodeURIComponent(mangaId)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.progress && !hasRestoredPageRef.current) {
              const p = data.progress;
              if (
                (p.chapter_id === activeChapterId || Number(p.chapter_number) === activeChapterNum) &&
                p.page_number > 1
              ) {
                hasRestoredPageRef.current = true;
                setCurrentVisiblePage(p.page_number);
                if (readingMode === "webtoon") {
                  setTimeout(() => {
                    const pageEl = document.querySelector(`[data-page="${p.page_number}"]`);
                    if (pageEl) pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 300);
                }
              }
            }
          })
          .catch(() => {});
      }
    }

    if (targetPage && targetPage > 1 && !hasRestoredPageRef.current) {
      hasRestoredPageRef.current = true;
      setCurrentVisiblePage(targetPage);

      if (readingMode === "webtoon") {
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
    }
  }, [pages, isLoading, initialPage, activeChapterId, activeChapterNum, mangaId, readingMode]);

  // Save reading progress to localStorage and sync to Supabase in background
  const lastCloudSyncRef = useRef<number>(0);

  useEffect(() => {
    if (isLoading || pages.length === 0) return;
    if (initialPage && initialPage > 1 && !hasRestoredPageRef.current) return;

    const progressRecord = {
      mangaId,
      mangaTitle,
      posterImage: posterImage || undefined,
      chapterId: activeChapterId,
      chapterNumber: activeChapterNum || currentChapterObj?.chapterNumber || 1,
      pageNumber: currentVisiblePage,
      totalPages: pages.length,
      readingMode,
      updatedAt: Date.now(),
    };

    // 1. Local storage & broadcast
    try {
      localStorage.setItem(`aniwavex_manga_progress_${mangaId}`, JSON.stringify(progressRecord));

      try {
        const listRaw = localStorage.getItem("aniwavex_recent_manga");
        let list = listRaw ? JSON.parse(listRaw) : [];
        if (!Array.isArray(list)) list = [];
        list = list.filter((it: any) => it.mangaId !== mangaId);
        list.unshift(progressRecord);
        localStorage.setItem("aniwavex_recent_manga", JSON.stringify(list.slice(0, 20)));
      } catch {}

      // Keep local manga bookmarks list synchronized with current chapter & page
      try {
        const bookmarksRaw = localStorage.getItem("aniwavex_manga_bookmarks");
        if (bookmarksRaw) {
          const bList = JSON.parse(bookmarksRaw);
          if (Array.isArray(bList)) {
            const idx = bList.findIndex((it: any) => it.manga_id === mangaId);
            if (idx >= 0) {
              bList[idx] = {
                ...bList[idx],
                last_chapter_read: String(progressRecord.chapterNumber),
                last_chapter_id: progressRecord.chapterId,
                last_page_read: progressRecord.pageNumber,
                updated_at: new Date().toISOString(),
              };
              localStorage.setItem("aniwavex_manga_bookmarks", JSON.stringify(bList));
              window.dispatchEvent(new CustomEvent("aniwavex_manga_bookmarks_updated", { detail: bList }));
            }
          }
        }
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("aniwavex_manga_progress_updated", {
            detail: progressRecord,
          })
        );
      }
    } catch {}

    // 2. Debounced Cloud sync to Supabase (/api/manga/progress)
    const now = Date.now();
    if (now - lastCloudSyncRef.current > 4000) {
      lastCloudSyncRef.current = now;
      setIsSyncingCloud(true);

      fetch("/api/manga/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progressRecord),
      })
        .then((res) => {
          if (res.ok) {
            setLastCloudSyncAt(Date.now());
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsSyncingCloud(false);
        });
    }
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
    readingMode,
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

  useEffect(() => {
    hasRestoredPageRef.current = false;
  }, [activeChapterId]);


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
        if (readingMode === "paged-rtl") {
          // Right to Left: Left Arrow advances forward
          if (currentVisiblePage < pages.length) {
            setCurrentVisiblePage((p) => p + 1);
          } else if (nextChapter && !isChapterListOpen) {
            navigateToChapter(nextChapter);
          }
        } else if (readingMode === "paged-ltr") {
          // Left to Right: Left Arrow goes back
          if (currentVisiblePage > 1) {
            setCurrentVisiblePage((p) => p - 1);
          } else if (prevChapter && !isChapterListOpen) {
            navigateToChapter(prevChapter);
          }
        } else {
          // Webtoon: navigate chapters
          if (prevChapter && !isChapterListOpen) {
            navigateToChapter(prevChapter);
          }
        }
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (readingMode === "paged-rtl") {
          // Right to Left: Right Arrow goes backward
          if (currentVisiblePage > 1) {
            setCurrentVisiblePage((p) => p - 1);
          } else if (prevChapter && !isChapterListOpen) {
            navigateToChapter(prevChapter);
          }
        } else if (readingMode === "paged-ltr") {
          // Left to Right: Right Arrow goes forward
          if (currentVisiblePage < pages.length) {
            setCurrentVisiblePage((p) => p + 1);
          } else if (nextChapter && !isChapterListOpen) {
            navigateToChapter(nextChapter);
          }
        } else {
          // Webtoon: navigate chapters
          if (nextChapter && !isChapterListOpen) {
            navigateToChapter(nextChapter);
          }
        }
      } else if (e.key === "ArrowDown") {
        if (readingMode === "webtoon") {
          window.scrollBy({ top: 400, behavior: "smooth" });
        } else {
          if (currentVisiblePage < pages.length) setCurrentVisiblePage((p) => p + 1);
        }
      } else if (e.key === "ArrowUp") {
        if (readingMode === "webtoon") {
          window.scrollBy({ top: -400, behavior: "smooth" });
        } else {
          if (currentVisiblePage > 1) setCurrentVisiblePage((p) => p - 1);
        }
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    prevChapter,
    nextChapter,
    isChapterListOpen,
    handleBackToOverview,
    navigateToChapter,
    toggleFullscreen,
    readingMode,
    currentVisiblePage,
    pages.length,
  ]);

  // Mode cycle helper
  const cycleReadingMode = () => {
    const modes: ReadingMode[] = ["webtoon", "paged-rtl", "paged-ltr"];
    const nextIdx = (modes.indexOf(readingMode) + 1) % modes.length;
    const nextMode = modes[nextIdx];
    setReadingMode(nextMode);
    try {
      localStorage.setItem("aniwavex_manga_reading_mode", nextMode);
    } catch {}
  };

  // Retry individual broken image (capped at MAX_IMAGE_RETRIES to prevent infinite reload loops)
  const MAX_IMAGE_RETRIES = 3;
  const handleImageError = (pageNumber: number, forceUserRetry = false) => {
    setFailedImages((prev) => {
      const current = prev[pageNumber] || 0;
      if (forceUserRetry) {
        return { ...prev, [pageNumber]: 1 };
      }
      if (current >= MAX_IMAGE_RETRIES) {
        return prev;
      }
      return {
        ...prev,
        [pageNumber]: current + 1,
      };
    });
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
    if (readerWidth === "fit-screen" || readingMode !== "webtoon") {
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

  const currentToneConfig = READING_TONES[readingTone] || READING_TONES.dark;
  const isRTL = readingMode === "paged-rtl";

  return (
    <div className={`min-h-screen ${currentToneConfig.bodyBg} flex flex-col select-none transition-colors duration-200`}>
      {/* Sticky Reader Header (Desktop + TV Friendly, auto-collapses on tap) */}
      <header
        className={`sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shadow-2xl backdrop-blur-xl border-b transition-all duration-300 ease-in-out ${
          currentToneConfig.headerBg
        } ${
          isChromeVisible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        {/* Left: Back to Manga & Title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            type="button"
            onClick={handleBackToOverview}
            className={`p-2 sm:p-2.5 rounded-xl border transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none focus-visible:scale-105 shrink-0 ${currentToneConfig.buttonBg}`}
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
              <h1 className="text-sm sm:text-base font-bold truncate max-w-[160px] sm:max-w-md">
                {currentChapterObj?.title || `Chapter ${activeChapterNum ?? activeChapterId}`}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-[11px] sm:text-xs font-mono ${currentToneConfig.subtextColor}`}>
                Page {currentVisiblePage} of {pages.length || "?"}
              </p>
              {isSyncingCloud && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                  <Cloud className="w-3 h-3 animate-pulse" />
                  Syncing
                </span>
              )}
              {isDownloaded && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Offline
                </span>
              )}
            </div>
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
                ? `${currentToneConfig.buttonBg} cursor-pointer`
                : "opacity-40 border-transparent cursor-not-allowed"
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
              className={`px-2.5 sm:px-3.5 py-2 rounded-xl border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer ${currentToneConfig.buttonBg}`}
              title="Select Chapter from List"
              aria-label="Select Chapter"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chapters</span>
              <span className="text-[10px] opacity-70 font-mono">({chapters.length})</span>
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
                : "opacity-40 border-transparent cursor-not-allowed"
            }`}
            title={nextChapter ? `Next: Ch. ${nextChapter.chapterNumber} (Right Arrow)` : "No next chapter"}
            aria-label="Next Chapter"
          >
            <span className="hidden md:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Reading Mode Switcher Button */}
          <button
            type="button"
            onClick={cycleReadingMode}
            className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer ${currentToneConfig.buttonBg}`}
            title={`Reading Mode: ${MODE_LABELS[readingMode]} (Click to cycle)`}
            aria-label="Cycle reading mode"
          >
            {readingMode === "webtoon" ? (
              <ScrollText className="w-4 h-4 text-cyan-400" />
            ) : (
              <Columns className="w-4 h-4 text-indigo-400" />
            )}
            <span className="text-[11px] font-mono capitalize hidden lg:inline">
              {readingMode === "webtoon" ? "Webtoon" : readingMode === "paged-rtl" ? "Manga (RTL)" : "Comic (LTR)"}
            </span>
          </button>

          {/* Reading Tone Selector (Dark, OLED Black, Warm Sepia) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsToneMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer ${currentToneConfig.buttonBg}`}
              title={`Reading Tone: ${currentToneConfig.label}`}
              aria-label="Toggle Reading Tone"
            >
              <Palette className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] font-mono capitalize hidden 2xl:inline">
                {readingTone === "dark" ? "Dark" : readingTone === "oled" ? "OLED" : "Sepia"}
              </span>
            </button>

            {isToneMenuOpen && (
              <div
                ref={toneMenuRef}
                className={`absolute right-0 top-full mt-2 w-48 rounded-2xl p-1.5 shadow-2xl border backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 ${
                  readingTone === "sepia"
                    ? "bg-[#eae0c8] border-[#d8cbaf] text-[#2c251a]"
                    : "bg-slate-900/95 border-white/15 text-slate-200"
                }`}
              >
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider opacity-60 border-b border-black/10 dark:border-white/10 mb-1">
                  Reading Tone
                </div>
                {(["dark", "oled", "sepia"] as ReadingTone[]).map((tKey) => {
                  const conf = READING_TONES[tKey];
                  const isSelected = readingTone === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => {
                        setReadingTone(tKey);
                        setIsToneMenuOpen(false);
                        try {
                          localStorage.setItem("aniwavex_manga_reading_tone", tKey);
                        } catch {}
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-400 font-bold"
                          : readingTone === "sepia"
                          ? "hover:bg-black/5 text-[#2c251a]"
                          : "hover:bg-white/10 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border ${
                            tKey === "dark"
                              ? "bg-slate-900 border-slate-700"
                              : tKey === "oled"
                              ? "bg-black border-neutral-800"
                              : "bg-[#f4ecd8] border-[#d8cbaf]"
                          }`}
                        />
                        <span>{conf.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Offline Download Button */}
          {pages.length > 0 && (
            <button
              type="button"
              onClick={isDownloaded ? handleRemoveOfflineChapter : handleDownloadChapterOffline}
              disabled={isDownloading}
              className={`p-2 rounded-xl border transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer ${
                isDownloaded
                  ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30"
                  : isDownloading
                  ? "bg-cyan-900/30 border-cyan-500/30 text-cyan-300"
                  : "bg-slate-900 hover:bg-slate-800 border-white/15 text-slate-300 hover:text-white"
              }`}
              title={
                isDownloaded
                  ? "Chapter downloaded offline. Click to remove from cache."
                  : isDownloading
                  ? `Downloading chapter offline (${downloadProgress}%)...`
                  : "Download chapter for offline reading"
              }
              aria-label="Toggle offline chapter storage"
            >
              {isDownloading ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span className="text-[10px] font-mono hidden md:inline">{downloadProgress}%</span>
                </div>
              ) : isDownloaded ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </button>
          )}

          {/* Width Mode Toggle (Desktop only) */}
          <button
            type="button"
            onClick={cycleWidth}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
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
            className="hidden sm:flex p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Reload Chapter */}
          <button
            type="button"
            onClick={fetchPages}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-300 hover:text-white transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
            title="Reload chapter"
            aria-label="Reload chapter"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Reader Container (Vertical Continuous Webtoon Flow or Paged View) */}
      <main
        onClick={handleReaderClick}
        onTouchStart={handleReaderTouchStart}
        onTouchEnd={handleReaderTouchEnd}
        className={`flex-1 w-full mx-auto px-2 sm:px-4 py-4 sm:py-8 flex flex-col items-center gap-3 transition-all duration-300 ${getWidthClass()}`}
      >
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

        {/* Webtoon Mode: Vertical Continuous Stream */}
        {!isLoading && readingMode === "webtoon" &&
          pages.map((p, index) => {
            const refererQuery = p.referer ? `&referer=${encodeURIComponent(p.referer)}` : "";
            const retryCount = failedImages[p.pageNumber] || 0;
            const liveProxyUrl = `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}${refererQuery}${retryCount > 0 ? `&_r=${retryCount}` : ""}`;
            const srcUrl = offlineBlobs[p.pageNumber] || liveProxyUrl;

            return (
              <div
                key={p.pageNumber}
                data-page={p.pageNumber}
                className={`relative w-full rounded-xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[300px] border transition-colors ${currentToneConfig.imageBorder}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={srcUrl}
                  alt={`Page ${p.pageNumber}`}
                  loading={index < 3 ? "eager" : "lazy"}
                  className={`${getImageClass()} ${readingTone === "sepia" ? "sepia-[0.08]" : ""}`}
                  onError={() => {
                    if (retryCount < MAX_IMAGE_RETRIES) {
                      handleImageError(p.pageNumber);
                    }
                  }}
                />

                {/* Individual Failed Image Overlay with Retry Button */}
                {retryCount > 0 && !offlineBlobs[p.pageNumber] && (
                  <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center gap-3">
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                    <p className="text-sm font-semibold text-slate-200">Failed to load Page {p.pageNumber}</p>
                    <p className="text-xs text-slate-400">Upstream image server temporarily timed out</p>
                    <button
                      type="button"
                      onClick={() => handleImageError(p.pageNumber, true)}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry Page {p.pageNumber}
                    </button>
                  </div>
                )}

                {/* Page number badge */}
                <div className={`absolute bottom-3 right-3 px-2.5 py-1 rounded-md backdrop-blur-md text-[11px] font-mono border pointer-events-none transition-colors ${currentToneConfig.floatingPillBg}`}>
                  {p.pageNumber} / {pages.length}
                </div>
              </div>
            );
          })}

        {/* Paged Mode (Manga RTL or Comic LTR): Single Focused Page with Tap Navigation */}
        {!isLoading && readingMode !== "webtoon" && pages.length > 0 && (() => {
          const activePageIndex = Math.max(0, Math.min(pages.length - 1, currentVisiblePage - 1));
          const p = pages[activePageIndex];
          const refererQuery = p.referer ? `&referer=${encodeURIComponent(p.referer)}` : "";
          const retryCount = failedImages[p.pageNumber] || 0;
          const liveProxyUrl = `/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}${refererQuery}${retryCount > 0 ? `&_r=${retryCount}` : ""}`;
          const srcUrl = offlineBlobs[p.pageNumber] || liveProxyUrl;


          return (
            <div className="relative w-full flex flex-col items-center select-none">
              {/* Main Paged Frame */}
              <div className={`relative w-full rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[60vh] max-h-[90vh] border transition-colors ${currentToneConfig.imageBorder}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={srcUrl}
                  alt={`Page ${p.pageNumber}`}
                  className={`max-h-[85vh] 2xl:max-h-[88vh] w-auto max-w-full object-contain mx-auto ${readingTone === "sepia" ? "sepia-[0.08]" : ""}`}
                  onError={() => {
                    if (retryCount < MAX_IMAGE_RETRIES) {
                      handleImageError(p.pageNumber);
                    }
                  }}
                />

                {/* Tap Zones: Left (30%) & Right (30%) */}
                <button
                  type="button"
                  onClick={isRTL ? handleNextPage : handlePrevPage}
                  className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-w-resize opacity-0 hover:opacity-100 bg-gradient-to-r from-black/20 to-transparent transition-opacity flex items-center justify-start pl-4"
                  title={isRTL ? "Next Page (RTL)" : "Previous Page (LTR)"}
                >
                  <ChevronLeft className="w-8 h-8 text-white/70" />
                </button>

                <button
                  type="button"
                  onClick={isRTL ? handlePrevPage : handleNextPage}
                  className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-e-resize opacity-0 hover:opacity-100 bg-gradient-to-l from-black/20 to-transparent transition-opacity flex items-center justify-end pr-4"
                  title={isRTL ? "Previous Page (RTL)" : "Next Page (LTR)"}
                >
                  <ChevronRight className="w-8 h-8 text-white/70" />
                </button>

                {/* Page number badge */}
                <div className={`absolute bottom-3 right-3 px-3 py-1 rounded-md backdrop-blur-md text-xs font-mono border pointer-events-none z-30 transition-colors ${currentToneConfig.floatingPillBg}`}>
                  {p.pageNumber} / {pages.length}
                </div>
              </div>

              {/* Paged Navigation Bar */}
              <div className="w-full flex items-center justify-between gap-3 mt-4 px-2">
                <button
                  type="button"
                  onClick={isRTL ? handleNextPage : handlePrevPage}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${currentToneConfig.buttonBg}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{isRTL ? "Next Page" : "Prev Page"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${currentToneConfig.subtextColor}`}>
                    {p.pageNumber} / {pages.length}
                  </span>
                  <span className={`text-[10px] font-mono opacity-60 ${currentToneConfig.subtextColor}`}>
                    ({isRTL ? "RTL Manga" : "LTR Comic"})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={isRTL ? handlePrevPage : handleNextPage}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${currentToneConfig.buttonBg}`}
                >
                  <span>{isRTL ? "Prev Page" : "Next Page"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}
      </main>

      {/* Floating Bottom Page Indicator Pill when chrome is hidden */}
      {!isChromeVisible && !isLoading && pages.length > 0 && (
        <div
          onClick={() => setIsChromeVisible(true)}
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full backdrop-blur-md shadow-xl text-xs font-mono font-semibold border cursor-pointer animate-in fade-in transition-all active:scale-95 ${currentToneConfig.floatingPillBg}`}
          title="Tap center or click to show reader controls"
        >
          Page {currentVisiblePage} / {pages.length} • Tap for Menu
        </div>
      )}

      {/* Bottom Scrub Bar (Shown when controls are visible) */}
      <footer
        className={`fixed bottom-0 inset-x-0 z-40 px-3 sm:px-6 py-2.5 sm:py-3 shadow-2xl backdrop-blur-xl border-t transition-all duration-300 ease-in-out ${
          currentToneConfig.headerBg
        } ${
          isChromeVisible && !isLoading && pages.length > 0
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
          {/* Quick Prev Page */}
          <button
            type="button"
            onClick={isRTL ? handleNextPage : handlePrevPage}
            disabled={
              readingMode !== "webtoon"
                ? isRTL
                  ? currentVisiblePage >= pages.length && !nextChapter
                  : currentVisiblePage <= 1 && !prevChapter
                : !prevChapter && currentVisiblePage <= 1
            }
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${currentToneConfig.buttonBg}`}
            title="Previous Page / Chapter"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Scrub Slider & Page Counter */}
          <div className="flex-1 flex items-center gap-3">
            <span className={`text-xs font-mono font-semibold shrink-0 ${currentToneConfig.subtextColor}`}>
              {currentVisiblePage}
            </span>

            <input
              type="range"
              min={1}
              max={pages.length || 1}
              value={currentVisiblePage}
              onChange={(e) => {
                const targetP = parseInt(e.target.value, 10);
                if (!isNaN(targetP)) {
                  setCurrentVisiblePage(targetP);
                  if (readingMode === "webtoon") {
                    const el = document.querySelector(`[data-page="${targetP}"]`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }
              }}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              aria-label="Manga page scrub slider"
            />

            <span className={`text-xs font-mono font-semibold shrink-0 ${currentToneConfig.subtextColor}`}>
              {pages.length}
            </span>
          </div>

          {/* Quick Next Page */}
          <button
            type="button"
            onClick={isRTL ? handlePrevPage : handleNextPage}
            disabled={
              readingMode !== "webtoon"
                ? isRTL
                  ? currentVisiblePage <= 1 && !prevChapter
                  : currentVisiblePage >= pages.length && !nextChapter
                : !nextChapter && currentVisiblePage >= pages.length
            }
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all focus-visible:ring-4 focus-visible:ring-cyan-400 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${currentToneConfig.buttonBg}`}
            title="Next Page / Chapter"
            aria-label="Next Page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* End of Chapter Section — Obvious Continuous Flow (Phase 5, 6, 7) */}
      {!isLoading && !error && pages.length > 0 && (
        <section
          className={`w-full border-t backdrop-blur-2xl py-12 px-4 text-center mt-4 shadow-2xl transition-colors ${
            readingTone === "sepia"
              ? "bg-[#eae0c8]/95 border-[#d8cbaf] text-[#2c251a]"
              : readingTone === "oled"
              ? "bg-black border-neutral-900 text-white"
              : "bg-slate-950/95 border-white/10 text-white"
          }`}
        >
          <div className="max-w-xl mx-auto space-y-6">
            {nextChapter ? (
              <>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
                    <Check className="w-3.5 h-3.5 text-cyan-400" />
                    Completed Chapter {activeChapterNum ?? activeChapterId}
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black tracking-tight">
                    Up Next: {nextChapter.title || `Chapter ${nextChapter.chapterNumber}`}
                  </h2>
                  <p className={`text-xs sm:text-sm ${currentToneConfig.subtextColor}`}>
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
                      className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${currentToneConfig.buttonBg}`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev Ch. {prevChapter.chapterNumber}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleBackToOverview}
                    className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${currentToneConfig.buttonBg}`}
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
                  <h2 className="text-xl sm:text-3xl font-black tracking-tight">
                    Final Chapter Reached
                  </h2>
                  <p className={`text-xs sm:text-sm max-w-sm mx-auto leading-relaxed ${currentToneConfig.subtextColor}`}>
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
                      className={`px-4 py-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${currentToneConfig.buttonBg}`}
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
