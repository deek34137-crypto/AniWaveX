"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Loader2, X, Keyboard, Tv, AlertCircle, Sparkles, Maximize2, Minimize2, Server, ChevronLeft, ChevronRight, RotateCcw, RotateCw, Activity, FastForward, Play, List, Search } from "lucide-react";
import NativePlayer from "./NativePlayer";
import SyncHudToast from "./player/SyncHudToast";
import { useAuth } from "@/providers/AuthProvider";
import { benchmarkStreamSources, getFastestServerIndex, formatLatencyBadge } from "@/lib/latency-benchmarker";
import { syncProgressToAniList } from "@/lib/sync/anilist-sync";
import { handleSequelPlaybackStarted, handleAnimeCompleted } from "@/lib/franchise";
import { getEpisodeSkipTimes, type SkipInterval } from "@/lib/aniskip";
import type { MediaPlayerInstance } from "@vidstack/react";
import type { LiveSyncResult } from "@/types/sync";

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

function isValidEmbedUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (
    url.startsWith("/api/proxy") || 
    url.includes(".m3u8") || 
    url.includes("animeapps.top") ||
    url.includes("short.ink") ||
    url.includes("vidstreaming.xyz") ||
    url.includes("ww19.")
  ) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
}

function isMegaOrVidstream(s: any): boolean {
  if (!s || s.isHindi) return false;
  const q = (s.quality || '').toLowerCase();
  const u = (s.url || '').toLowerCase();
  const srv = (s.server || '').toLowerCase();
  return (
    q.includes('megacloud') ||
    q.includes('vidstream') ||
    srv.includes('megacloud') ||
    srv.includes('vidstream') ||
    u.includes('megaplay.buzz') ||
    u.includes('vidstream')
  );
}

function sortSourcesWithMegaLast(list: StreamSource[]): StreamSource[] {
  return [...list].sort((a, b) => {
    if (a.isM3U8 && !b.isM3U8) return -1;
    if (!a.isM3U8 && b.isM3U8) return 1;
    const aMega = isMegaOrVidstream(a);
    const bMega = isMegaOrVidstream(b);
    if (!aMega && bMega) return -1;
    if (aMega && !bMega) return 1;
    return 0;
  });
}

interface InPageVideoPlayerProps {
  episode: any;
  episodes?: any[];
  onEpisodeChange?: (ep: any) => void;
  onClose?: () => void;
  animeSlug: string;
  animeTitle: string;
  animeType?: string;
  animePosterImage?: string;
  user?: any;
  anilistId?: number | null;
  animeId?: string | number;
  initialProgressSeconds?: number | null;
  targetSeekSeconds?: number | null;
}

export function getStoredEpisodeProgress(
  animeSlug: string, 
  episodeId: number | string | undefined,
  serverProgress?: number | null
): number {
  if (typeof window === "undefined" || !animeSlug || !episodeId) {
    return (serverProgress && serverProgress > 5) ? Math.floor(serverProgress) : 0;
  }

  // 1. Check episode-specific key in localStorage
  try {
    const storageKey = `watch_progress_${animeSlug}_ep_${episodeId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.currentTime && parsed.currentTime > 5) {
        if (!parsed.duration || parsed.currentTime < parsed.duration * 0.92) {
          return Math.floor(parsed.currentTime);
        }
      }
    }
  } catch {}

  // 2. Check unified recent watches list as fallback
  try {
    const rawRecent = localStorage.getItem("aniwavex_recent_watches");
    if (rawRecent) {
      const list = JSON.parse(rawRecent);
      if (Array.isArray(list)) {
        const entry = list.find((it: any) => it.animeSlug === animeSlug && Number(it.episodeId) === Number(episodeId));
        if (entry && entry.progressSeconds && entry.progressSeconds > 5) {
          if (!entry.totalSeconds || entry.progressSeconds < entry.totalSeconds * 0.92) {
            return Math.floor(entry.progressSeconds);
          }
        }
      }
    }
  } catch {}

  // 3. Fall back to server progress if provided (for logged-in users on new devices)
  if (serverProgress && serverProgress > 5) {
    return Math.floor(serverProgress);
  }

  return 0;
}

export function cleanServerLabel(quality: string): string {
  if (!quality) return "Server";
  return quality
    .replace(/hianime/gi, "HD-2")
    .replace(/justanime/gi, "HD-1")
    .replace(/kickassanime|kaa/gi, "Server 2")
    .replace(/reanime/gi, "Ultra HD")
    .replace(/anikoto|megacloud/gi, "Server 1")
    .replace(/toonstream/gi, "Server Hindi")
    .replace(/vidmoly/gi, "Server Stream")
    .replace(/gogoanime/gi, "Server Fast")
    .trim();
}

export default function InPageVideoPlayer({ 
  episode, 
  episodes, 
  animeSlug, 
  animeTitle, 
  animeType, 
  animePosterImage, 
  onEpisodeChange, 
  onClose, 
  user: initialUser, 
  anilistId, 
  animeId,
  initialProgressSeconds,
  targetSeekSeconds
}: InPageVideoPlayerProps) {
  const { user: authUser, supabase } = useAuth();
  const [activeTab, setActiveTab] = useState<"sub" | "dub" | "hindi">("sub");
  const [streams, setStreams] = useState<{ sub: StreamSource[], dub: StreamSource[], hindi?: StreamSource[], sources?: StreamSource[], nativeStream?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [ambientMode, setAmbientMode] = useState(true);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [initialTime, setInitialTime] = useState<number>(() => {
    if (typeof targetSeekSeconds === "number" && targetSeekSeconds > 0) {
      return Math.floor(targetSeekSeconds);
    }
    return getStoredEpisodeProgress(animeSlug, episode?.id, initialProgressSeconds);
  });
  const [currentUser, setCurrentUser] = useState<any>(authUser || initialUser);
  const [resumedBanner, setResumedBanner] = useState<string | null>(null);
  const [serverToast, setServerToast] = useState<string | null>(null);
  const [serverLatencies, setServerLatencies] = useState<Record<string, number>>({});
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [liveSyncResult, setLiveSyncResult] = useState<LiveSyncResult | null>(null);
  const completionSyncedEpisodeRef = useRef<number | null>(null);
  const hasInitialSeekSettledRef = useRef<boolean>(true);

  // In-Player Slide-Over Episode Drawer State
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [drawerSearchQuery, setDrawerSearchQuery] = useState("");

  const filteredDrawerEpisodes = useMemo(() => {
    if (!episodes || episodes.length === 0) return [];
    if (!drawerSearchQuery.trim()) return episodes;
    const q = drawerSearchQuery.trim().toLowerCase();
    return episodes.filter((ep: any) => {
      const idMatch = String(ep.id).includes(q);
      const titleMatch = (ep.title || "").toLowerCase().includes(q);
      return idMatch || titleMatch;
    });
  }, [episodes, drawerSearchQuery]);

  // AniSkip & Next Episode Endscreen State
  const [skipIntervals, setSkipIntervals] = useState<SkipInterval[]>([]);
  const [activeSkip, setActiveSkip] = useState<SkipInterval | null>(null);
  const [autoSkip, setAutoSkip] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("aniwavex_auto_skip") === "true";
  });
  const [showNextEpOverlay, setShowNextEpOverlay] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(5);
  const dismissedEndscreenEpisodeRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoSkippedRef = useRef<Set<string>>(new Set());
  
  const currentUserRef = useRef<any>(authUser || initialUser);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const mediaPlayerRef = useRef<MediaPlayerInstance>(null);
  const lastSavedTimeRef = useRef(0);
  const lastSupabaseSyncRef = useRef(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Timestamp of the last manual server switch — auto-failover is suppressed for 8s after a manual switch
  const manualSwitchAtRef = useRef<number>(0);

  // Helper to trigger temporary server toast notifications
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setServerToast(msg);
    toastTimeoutRef.current = setTimeout(() => setServerToast(null), 3500);
  }, []);

  const currentIndex = episodes ? episodes.findIndex((ep) => ep.id === episode?.id) : -1;
  const hasNext = Boolean(episodes && currentIndex !== -1 && currentIndex < episodes.length - 1);
  const hasPrev = Boolean(episodes && currentIndex > 0);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const liveUser = authUser || initialUser;
    setCurrentUser(liveUser);
    currentUserRef.current = liveUser;
  }, [authUser, initialUser]);

  useEffect(() => {
    if (targetSeekSeconds && targetSeekSeconds > 0) {
      const mins = Math.floor(targetSeekSeconds / 60);
      const secs = Math.floor(targetSeekSeconds % 60);
      const formatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      showToast(`Jumped to screenshot scene at ${formatted} ⏱️`);
    }
  }, [targetSeekSeconds, showToast]);


  // Track duration separately so it can be saved to Supabase
  const lastKnownDurationRef = useRef(0);
  const [mediaDuration, setMediaDuration] = useState(0);

  // Helper to upsert watch history to Supabase
  const syncToSupabase = useCallback(async (progressSeconds: number) => {
    if (!episode) return;

    let activeUserId = currentUserRef.current?.id;
    if (!activeUserId) {
      try {
        const { data: { user: liveUser } } = await supabase.auth.getUser();
        if (liveUser) {
          activeUserId = liveUser.id;
          currentUserRef.current = liveUser;
          setCurrentUser(liveUser);
        }
      } catch {
        // Ignore session read errors
      }
    }

    if (!activeUserId) return;

    try {
      const payload: any = {
        user_id: activeUserId,
        anime_slug: animeSlug,
        anime_title: animeTitle,
        poster_image: animePosterImage,
        last_episode_watched: episode.id,
        updated_at: new Date().toISOString()
      };

      if (progressSeconds > 0) {
        payload.progress_seconds = Math.floor(progressSeconds);
      }

      // Save total_seconds so % calculation is accurate when restored
      const knownDur = lastKnownDurationRef.current;
      if (knownDur > 0) {
        payload.total_seconds = knownDur;
      }

      const { error } = await supabase
        .from('watch_history')
        .upsert(payload, {
          onConflict: 'user_id,anime_slug'
        });

      if (error) console.error("Failed to sync watch history", error);
    } catch (err) {
      console.error("Failed to sync watch history", err);
    }
  }, [episode?.id, animeSlug, animeTitle, animePosterImage, supabase]);

  // Load initial resume progress from storage on episode change
  useEffect(() => {
    if (!episode) return;
    setFallbackToIframe(false);
    lastSavedTimeRef.current = 0;
    lastSupabaseSyncRef.current = 0;
    completionSyncedEpisodeRef.current = null;
    setLiveSyncResult(null);

    const foundResumeTime = getStoredEpisodeProgress(animeSlug, episode.id, initialProgressSeconds);

    if (foundResumeTime > 0) {
      setInitialTime(foundResumeTime);
      lastSavedTimeRef.current = foundResumeTime;
      lastSupabaseSyncRef.current = foundResumeTime;
      hasInitialSeekSettledRef.current = false;
      const mins = Math.floor(foundResumeTime / 60);
      const secs = Math.floor(foundResumeTime % 60).toString().padStart(2, '0');
      setResumedBanner(`Resumed from ${mins}:${secs}`);
      setTimeout(() => setResumedBanner(null), 4000);
    } else {
      setInitialTime(0);
      hasInitialSeekSettledRef.current = true;
      setResumedBanner(null);
    }
  }, [episode?.id, animeSlug, initialProgressSeconds]);

  // Scroll to player when episode changes (only when not in fullscreen)
  useEffect(() => {
    if (episode && playerRef.current && typeof document !== 'undefined' && !document.fullscreenElement) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [episode]);

  // Live progress sync to AniList & MAL in background
  const triggerLiveProgressSync = useCallback(async (isCompleted = false, currentPos?: number, totalDur?: number) => {
    if (!episode?.id || !animeSlug) return;
    const pos = typeof currentPos === 'number' ? currentPos : (lastSavedTimeRef.current || 0);
    const dur = typeof totalDur === 'number' ? totalDur : (lastKnownDurationRef.current || 0);

    try {
      const res = await fetch('/api/account/sync/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeSlug,
          animeTitle,
          animePosterImage,
          kitsuId: animeId,
          anilistId,
          episodeNumber: episode.id,
          episodeId: episode.id,
          lastPosition: pos,
          duration: dur,
          completed: isCompleted,
        }),
      });

      if (res.ok) {
        const data: LiveSyncResult = await res.json();
        if (data.completed) {
          setLiveSyncResult(data);
        }
      }
    } catch (err) {
      console.error('[InPageVideoPlayer] Live progress sync error:', err);
    }
  }, [episode, animeSlug, animeTitle, animePosterImage, animeId, anilistId]);

  const handleRetrySync = useCallback(async () => {
    if (episode?.id) {
      await triggerLiveProgressSync(true, lastKnownDurationRef.current, lastKnownDurationRef.current);
    }
  }, [episode, triggerLiveProgressSync]);

  // Throttled time update callback to save playback progress locally and remotely
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (!episode) return;

    const floorTime = Math.floor(currentTime);
    const floorDur = Math.floor(duration);

    // If initialTime > 5, protect stored progress from being overwritten by 0-5s updates before seek settles
    if (!hasInitialSeekSettledRef.current && initialTime > 5) {
      if (floorTime < initialTime - 5) {
        // Player is still warming up from 0 before seek settles — do NOT overwrite saved position
        return;
      }
      hasInitialSeekSettledRef.current = true;
    }

    // Always keep the latest known duration up-to-date
    if (floorDur > 0 && floorDur !== lastKnownDurationRef.current) {
      lastKnownDurationRef.current = floorDur;
      setMediaDuration(floorDur);
    }

    // 88%+ Completion Threshold: Automatically sync episode completion to AniList & MAL
    if (floorDur > 60 && floorTime / floorDur >= 0.88) {
      if (completionSyncedEpisodeRef.current !== episode.id) {
        completionSyncedEpisodeRef.current = episode.id;
        triggerLiveProgressSync(true, floorTime, floorDur);
      }
    }

    // Save to localStorage every 2 seconds
    if (Math.abs(currentTime - lastSavedTimeRef.current) >= 2) {
      lastSavedTimeRef.current = currentTime;
      try {
        const storageKey = `watch_progress_${animeSlug}_ep_${episode.id}`;
        localStorage.setItem(storageKey, JSON.stringify({
          currentTime: floorTime,
          duration: floorDur,
          updatedAt: Date.now()
        }));

        // Update unified recent watches list for Continue Watching row
        const rawRecent = localStorage.getItem("aniwavex_recent_watches");
        let recentList = rawRecent ? JSON.parse(rawRecent) : [];
        if (!Array.isArray(recentList)) recentList = [];
        recentList = recentList.filter((x: any) => x.animeSlug !== animeSlug);
        recentList.unshift({
          animeSlug,
          animeTitle,
          posterImage: animePosterImage,
          episodeId: episode.id,
          episodeTitle: episode.title,
          progressSeconds: floorTime,
          totalSeconds: floorDur,
          updatedAt: Date.now()
        });
        if (recentList.length > 20) recentList = recentList.slice(0, 20);
        localStorage.setItem("aniwavex_recent_watches", JSON.stringify(recentList));
      } catch {
        // Ignore localStorage quota errors
      }
    }

    // AniSkip check
    if (skipIntervals && skipIntervals.length > 0) {
      const currentSkip = skipIntervals.find(
        (int) => floorTime >= Math.floor(int.startTime) && floorTime < Math.floor(int.endTime)
      );

      if (currentSkip) {
        const skipKey = `${episode.id}_${currentSkip.type}_${Math.floor(currentSkip.startTime)}`;
        if (autoSkip && !hasAutoSkippedRef.current.has(skipKey)) {
          hasAutoSkippedRef.current.add(skipKey);
          if (mediaPlayerRef.current) {
            try {
              mediaPlayerRef.current.currentTime = currentSkip.endTime;
            } catch {}
            const skipLabel = currentSkip.type === "op" ? "Intro" : (currentSkip.type === "ed" ? "Outro" : "Recap");
            showToast(`Auto-skipped ${skipLabel} ⏭`);
          }
        } else if (!autoSkip) {
          // Visible for starting 10 seconds of the intro/outro sequence
          const secondsSinceStart = currentTime - currentSkip.startTime;
          if (secondsSinceStart >= 0 && secondsSinceStart <= 10) {
            setActiveSkip((prev) => (prev === currentSkip ? prev : currentSkip));
          } else {
            setActiveSkip((prev) => (prev ? null : prev));
          }
        }
      } else {
        setActiveSkip((prev) => (prev ? null : prev));
      }
    } else {
      setActiveSkip((prev) => (prev ? null : prev));
    }

    // Next Episode Endscreen trigger: within 25 seconds of end or >= 95% of episode
    if (hasNext && floorDur > 60 && (floorTime >= floorDur - 25 || (floorDur > 0 && floorTime / floorDur >= 0.95))) {
      if (dismissedEndscreenEpisodeRef.current !== episode.id && !showNextEpOverlay) {
        setShowNextEpOverlay(true);
      }
    }

    // Sync to Supabase periodically every 35 seconds during continuous playback to avoid DB write flooding
    if (Math.abs(currentTime - lastSupabaseSyncRef.current) >= 35 && floorTime > 0) {
      lastSupabaseSyncRef.current = currentTime;
      syncToSupabase(floorTime);
    }
  }, [episode?.id, episode?.title, animeSlug, animeTitle, animePosterImage, syncToSupabase, skipIntervals, autoSkip, hasNext, showNextEpOverlay, showToast]);

  // Fetch AniSkip timestamps whenever episode changes
  useEffect(() => {
    if (!episode?.id) return;
    hasAutoSkippedRef.current.clear();
    setSkipIntervals([]);
    setActiveSkip(null);
    setShowNextEpOverlay(false);
    dismissedEndscreenEpisodeRef.current = null;

    getEpisodeSkipTimes({
      anilistId,
      kitsuId: animeId,
      episodeNumber: Number(episode.id),
      duration: lastKnownDurationRef.current || 1440,
    }).then((intervals) => {
      setSkipIntervals(intervals);
    }).catch(() => {});
  }, [episode?.id, anilistId, animeId]);

  const toggleAutoSkip = useCallback(() => {
    setAutoSkip((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("aniwavex_auto_skip", String(next));
      } catch {}
      showToast(next ? "Auto-Skip OP/ED Enabled" : "Auto-Skip OP/ED Disabled");
      return next;
    });
  }, [showToast]);

  // Initial watch history sync + flush on unmount / episode change
  useEffect(() => {
    if (!episode) return;

    // Initial record after 2s of loading episode
    const timer = setTimeout(() => {
      const initialProgress = lastSavedTimeRef.current || initialTime || 0;
      syncToSupabase(Math.floor(initialProgress));
    }, 2000);

    return () => {
      clearTimeout(timer);
      // Flush latest playback progress on unmount or episode switch only if user has active progress
      if (lastSavedTimeRef.current > 5) {
        syncToSupabase(Math.floor(lastSavedTimeRef.current));
      }
    };
  }, [episode?.id, animeSlug, syncToSupabase, initialTime]);

  // When user starts playing this anime, check if it is a sequel of a completed prequel.
  // If so, remove the completed prequel from Continue Watching and ensure it is preserved in Watched Anime (completed).
  useEffect(() => {
    if (!episode) return;
    const activeUserId = currentUserRef.current?.id || currentUser?.id || authUser?.id || initialUser?.id;
    handleSequelPlaybackStarted({
      currentAnime: {
        slug: animeSlug,
        title: animeTitle,
        animeId,
        posterImage: animePosterImage,
      },
      supabase,
      userId: activeUserId,
    });
  }, [animeSlug, animeTitle, animeId, animePosterImage, episode?.id, authUser?.id, initialUser?.id, supabase]);

  // Window beforeunload listener to flush progress on page close/reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (lastSavedTimeRef.current > 5) {
        syncToSupabase(Math.floor(lastSavedTimeRef.current));
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [syncToSupabase]);

  // Read autoplay & ambient preferences from localStorage on mount
  useEffect(() => {
    const storedAutoplay = localStorage.getItem("autoplayNext");
    // Default is ON — only turn off if user explicitly set it to "false"
    if (storedAutoplay !== null) setAutoplayNext(storedAutoplay !== "false");

    const storedAmbient = localStorage.getItem("ambientMode");
    if (storedAmbient !== null) setAmbientMode(storedAmbient === "true");
  }, []);

  // IntersectionObserver for undocking into floating mini-player
  useEffect(() => {
    const target = playerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setIsScrolledPast(isPast);
        if (!isPast) {
          setIsMiniPlayerDismissed(false);
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const toggleAutoplay = () => {
    const newVal = !autoplayNext;
    setAutoplayNext(newVal);
    localStorage.setItem("autoplayNext", newVal.toString());
  };

  const toggleAmbientMode = () => {
    const newVal = !ambientMode;
    setAmbientMode(newVal);
    localStorage.setItem("ambientMode", newVal.toString());
  };

  const requestIdRef = useRef(0);
  const failedServersRef = useRef<Set<number>>(new Set());
  const lastFailoverAtRef = useRef(0);


  const activeSources: StreamSource[] | undefined = useMemo(() => {
    if (!streams) return undefined;

    let selected: StreamSource[] = [];

    if (activeTab === "hindi") {
      const rawHindi = (streams.hindi || []).filter((s: any) => 
        !s.url?.includes("short.ink") &&
        !s.url?.includes("vidstreaming.xyz") &&
        !s.url?.includes("ww19.")
      );
      const strictlyHindi = rawHindi.filter((s: any) => 
        s.isHindi === true || 
        /hindi|toonstream|as-cdn/i.test(s.quality || '') ||
        /hindi|toonstream|as-cdn/i.test(s.server || '')
      );
      selected = strictlyHindi.length > 0 ? strictlyHindi : rawHindi;
    } else if (activeTab === "sub") {
      const rawSub = streams.sub || streams.sources || [];
      selected = rawSub.filter((s: any) => 
        !s.isHindi && 
        !/hindi|toonstream/i.test(s.quality || '') &&
        !/eng dub|\[dub\]|\(dub\)/i.test(s.quality || '')
      );
    } else if (activeTab === "dub") {
      const rawDub = streams.dub || streams.sources || [];
      selected = rawDub.filter((s: any) => 
        !s.isHindi && 
        !/hindi|toonstream/i.test(s.quality || '') &&
        (/eng dub|\[dub\]|\(dub\)/i.test(s.quality || '') || !/\[sub\]|\(sub\)/i.test(s.quality || ''))
      );
    } else {
      selected = (streams.sources || []).filter((s: any) => 
        !s.url?.includes("short.ink") &&
        !s.url?.includes("vidstreaming.xyz") &&
        !s.url?.includes("ww19.")
      );
    }

    return sortSourcesWithMegaLast(selected);
  }, [streams, activeTab]);

  // Ensure selectedServerIndex is within bounds
  const validServerIndex = activeSources && activeSources.length > 0 ? Math.min(selectedServerIndex, activeSources.length - 1) : 0;
  const selectedSource = activeSources?.[validServerIndex];
  const currentUrl = selectedSource?.url;
  const isM3U8 = Boolean(selectedSource?.isM3U8 || (currentUrl && currentUrl.includes('.m3u8')));
  const isFloatingPiP = isScrolledPast && !isMiniPlayerDismissed && Boolean(currentUrl) && !playerError && !isLoading;
  const userExplicitlySelectedServerRef = useRef(false);
  const lastAniListSyncEpRef = useRef<number | null>(null);

  // Smart Server Latency Benchmarker & Auto-Selection
  useEffect(() => {
    if (!activeSources || activeSources.length === 0) return;
    let isCancelled = false;

    benchmarkStreamSources(activeSources).then((latencies) => {
      if (isCancelled) return;
      setServerLatencies(latencies);

      // Only auto-switch if user has not explicitly locked a server and playback has not already commenced
      if (!userExplicitlySelectedServerRef.current) {
        let liveTime = 0;
        try {
          liveTime = mediaPlayerRef.current?.currentTime || 0;
        } catch {
          liveTime = 0;
        }
        if (liveTime < 1) {
          const fastestIdx = getFastestServerIndex(activeSources, latencies);
          if (fastestIdx !== validServerIndex && latencies[activeSources[fastestIdx]?.url] < 300) {
            setSelectedServerIndex(fastestIdx);
            setFallbackToIframe(!activeSources[fastestIdx].isM3U8);
          }
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeSources]);

  // Preserve timestamp when switching servers
  const handleSelectServer = useCallback((newIdx: number, isAutoFailover = false) => {
    if (!activeSources || activeSources.length === 0) return;
    const targetIdx = Math.max(0, Math.min(newIdx, activeSources.length - 1));
    const targetSource = activeSources[targetIdx];
    if (!targetSource) return;

    // Grab current playback time as accurately as possible
    let liveTime: number | undefined;
    try {
      liveTime = mediaPlayerRef.current?.currentTime;
    } catch {
      liveTime = undefined;
    }
    const currentProgress = (typeof liveTime === 'number' && liveTime > 0) ? liveTime : (lastSavedTimeRef.current || initialTime || 0);

    if (currentProgress > 0) {
      setInitialTime(Math.floor(currentProgress));
      lastSavedTimeRef.current = currentProgress;
    }

    if (!isAutoFailover) {
      // User explicitly clicked — clear any failed mark on the target server so it gets a fresh chance
      failedServersRef.current.delete(targetIdx);
      // Record this timestamp so auto-failover is suppressed for 8 seconds after a manual switch
      manualSwitchAtRef.current = Date.now();
    }

    userExplicitlySelectedServerRef.current = true;
    setSelectedServerIndex(targetIdx);
    setFallbackToIframe(!targetSource.isM3U8);
    setPlayerError(false);

    if (isAutoFailover) {
      showToast(`Auto-switched to ${targetSource.quality}`);
    } else {
      showToast(`Switching to ${targetSource.quality}...`);
    }
  }, [activeSources, initialTime, showToast]);

  // Dynamic fallback fetch to bypass failed providers and load fresh ones
  const fetchFallbackProviders = useCallback(async () => {
    if (!episode || isFetchingFallback) return;
    setIsFetchingFallback(true);
    showToast("Resolving alternate backup providers...");

    try {
      // Gather provider names to exclude based on failed servers
      const excludedNames: string[] = [];
      activeSources?.forEach((src: any, idx) => {
        if (failedServersRef.current.has(idx)) {
          const lower = `${src.provider || ''} ${src.quality || ''}`.toLowerCase();
          if (lower.includes('reanime') || lower.includes('ultra hd')) excludedNames.push('reanime');
          if (lower.includes('megacloud') || lower.includes('anikoto') || lower.includes('server cloud') || lower.includes('server 1')) excludedNames.push('anikoto', 'local-anikoto');
          if (lower.includes('justanime') || lower.includes('hd-1')) excludedNames.push('justanime');
          if (lower.includes('kickassanime') || lower.includes('kaa') || lower.includes('server 2')) excludedNames.push('kaa');
          if (lower.includes('hianime') || lower.includes('hd-2')) excludedNames.push('hianime');
          if (lower.includes('animegg')) excludedNames.push('animegg');
          if (lower.includes('anibd')) excludedNames.push('anibd');
        }
      });

      const typeParam = animeType ? `&type=${encodeURIComponent(animeType)}` : '';
      const audioParam = `&audio=${activeTab}`;
      const anilistParam = anilistId ? `&anilistId=${encodeURIComponent(anilistId)}` : '';
      const excludeParam = excludedNames.length > 0 ? `&exclude=${encodeURIComponent(Array.from(new Set(excludedNames)).join(','))}` : '';
      
      const res = await fetch(
        `/api/stream?id=${encodeURIComponent(animeSlug)}&ep=${episode.id}&title=${encodeURIComponent(animeTitle)}${typeParam}${audioParam}${anilistParam}${excludeParam}`
      );
      const data = await res.json();

      if (!data.error && data.sources?.length > 0) {
        failedServersRef.current.clear();
        setStreams(data);
        setSelectedServerIndex(0);
        setPlayerError(false);
        showToast("Loaded alternate stream sources");
      } else {
        showToast("No additional alternate streams found");
      }
    } catch {
      showToast("Failed to fetch alternate sources");
    } finally {
      setIsFetchingFallback(false);
    }
  }, [episode, isFetchingFallback, showToast, activeSources, animeType, activeTab, anilistId, animeSlug, animeTitle]);

  const handleNextSource = useCallback(() => {
    if (!activeSources || activeSources.length === 0) return;
    if (activeSources.length > 1) {
      const nextIdx = (validServerIndex + 1) % activeSources.length;
      handleSelectServer(nextIdx);
    } else {
      fetchFallbackProviders();
    }
  }, [activeSources, validServerIndex, handleSelectServer, fetchFallbackProviders]);

  const handlePrevSource = useCallback(() => {
    if (!activeSources || activeSources.length === 0) return;
    const prevIdx = (validServerIndex - 1 + activeSources.length) % activeSources.length;
    handleSelectServer(prevIdx);
  }, [activeSources, validServerIndex, handleSelectServer]);

  useEffect(() => {
    if (!episode) return;

    const controller = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    const fetchStream = async () => {
      setIsLoading(true);
      // Keep previous streams mounted during episode transitions so the player DOM element is not destroyed (retains fullscreen)
      failedServersRef.current.clear();
      setSelectedServerIndex(0); // Reset server index
      setFallbackToIframe(false);
      setPlayerError(false);
      try {
        const typeParam = animeType ? `&type=${encodeURIComponent(animeType)}` : '';
        const audioParam = `&audio=${activeTab}`;
        const anilistParam = anilistId ? `&anilistId=${encodeURIComponent(anilistId)}` : '';
        const baseUrl = "/api/stream";
        const res = await fetch(
          `${baseUrl}?id=${encodeURIComponent(animeSlug)}&ep=${episode.id}&title=${encodeURIComponent(animeTitle)}${typeParam}${audioParam}${anilistParam}`,
          { signal: controller.signal }
        );
        const data = await res.json();

        // Stale guard: verify request ID is still active and request was not aborted
        if (requestIdRef.current !== currentRequestId || controller.signal.aborted) {
          return;
        }

        if (!data.error && data.sources && data.sources.length > 0) {
          setStreams(data);
          if (activeTab === 'hindi') {
            if (data.isFallback || data.fallbackReason === 'hindi_unavailable') {
              showToast("Hindi Dub unavailable for this episode — playing Japanese Sub fallback 🇯🇵");
            } else {
              showToast("Playing Hindi Dub 🇮🇳");
            }
          }
        } else {
          // If Hindi stream returned no sources or error, gracefully fallback to Japanese (sub)
          if (activeTab === 'hindi') {
            showToast("Hindi Dub not found — switching to Japanese Sub 🇯🇵");
            setActiveTab("sub");
            return;
          }
          if (data.error) {
            setPlayerError(true);
          }
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || controller.signal.aborted) {
          // Ignored cancelled request
          return;
        }
        if (requestIdRef.current === currentRequestId) {
          console.error("Failed to fetch stream", error);
          if (activeTab === 'hindi') {
            showToast("Hindi Dub failed — switching to Japanese Sub 🇯🇵");
            setActiveTab("sub");
            return;
          }
        }
      } finally {
        if (requestIdRef.current === currentRequestId && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchStream();

    return () => {
      controller.abort();
    };
  }, [episode, animeSlug, animeTitle, animeType, activeTab, anilistId, showToast]);


  const handleNext = useCallback(() => {
    if (hasNext && onEpisodeChange && episodes) {
      setInitialTime(0);
      lastSavedTimeRef.current = 0;
      const nextEp = episodes[currentIndex + 1];
      showToast(`Loading Episode ${nextEp?.id} ⏭`);
      onEpisodeChange(nextEp);
    }
  }, [hasNext, onEpisodeChange, episodes, currentIndex, showToast]);

  const handleExecuteSkip = useCallback(() => {
    if (!activeSkip) return;
    const dur = lastKnownDurationRef.current || 1440;
    const isPostCredits = activeSkip.type === "ed" && (dur - activeSkip.endTime > 90);

    if (activeSkip.type === "ed" && hasNext && !isPostCredits) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setShowNextEpOverlay(false);
      dismissedEndscreenEpisodeRef.current = episode?.id;
      setActiveSkip(null);
      handleNext();
      return;
    }

    if (mediaPlayerRef.current) {
      try {
        mediaPlayerRef.current.currentTime = activeSkip.endTime;
      } catch {}
    }
    const skipName = activeSkip.type === "op" ? "Intro" : (activeSkip.type === "ed" ? "Outro" : "Recap");
    showToast(`Skipped ${skipName} ⏭`);
    setActiveSkip(null);
  }, [activeSkip, hasNext, handleNext, showToast, episode?.id]);

  const handleDismissNextEpOverlay = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setShowNextEpOverlay(false);
    dismissedEndscreenEpisodeRef.current = episode?.id;
  }, [episode?.id]);

  const handleWatchNow = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setShowNextEpOverlay(false);
    dismissedEndscreenEpisodeRef.current = episode?.id;
    handleNext();
  }, [handleNext, episode?.id]);

  const handlePrev = useCallback(() => {
    if (hasPrev && onEpisodeChange && episodes) {
      setInitialTime(0);
      lastSavedTimeRef.current = 0;
      const prevEp = episodes[currentIndex - 1];
      showToast(`Loading Episode ${prevEp?.id} ⏮`);
      onEpisodeChange(prevEp);
    }
  }, [hasPrev, onEpisodeChange, episodes, currentIndex, showToast]);

  const handleEnded = useCallback(() => {
    // 1. Live automatic progress synchronization to AniList & MAL
    if (completionSyncedEpisodeRef.current !== episode?.id && episode?.id) {
      completionSyncedEpisodeRef.current = episode.id;
      triggerLiveProgressSync(true, lastKnownDurationRef.current, lastKnownDurationRef.current);
    }

    const anilistToken = typeof window !== 'undefined' ? localStorage.getItem("anilist_token") : null;
    if (anilistToken && anilistId && episode?.id && lastAniListSyncEpRef.current !== episode.id) {
      lastAniListSyncEpRef.current = episode.id;
      syncProgressToAniList(anilistToken, anilistId, episode.id).then((res) => {
        if (res.success) {
          showToast(`Synced Ep ${episode.id} to AniList ✨`);
        }
      });
    }

    // If final episode of series has ended, automatically mark anime as completed
    // and remove from Continue Watching if it has no sequel
    if (!hasNext) {
      const activeUserId = currentUserRef.current?.id || currentUser?.id || authUser?.id || initialUser?.id;
      const finalEp = episode?.id || episodes?.length || 12;

      handleAnimeCompleted({
        anime: {
          slug: animeSlug,
          title: animeTitle,
          animeId,
          posterImage: animePosterImage,
          anilistId,
        },
        supabase,
        userId: activeUserId,
        finalEpisode: finalEp,
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("aniwavex_watch_updated", {
        detail: { animeSlug, episodeId: episode?.id }
      }));
    }

    if (autoplayNext && hasNext) {
      setShowNextEpOverlay(true);
    }
  }, [anilistId, episode, autoplayNext, hasNext, showToast, currentUser, authUser, initialUser, animeSlug, animeTitle, animePosterImage, supabase, episodes, animeId, triggerLiveProgressSync]);

  // Countdown effect for Next Episode Endscreen Overlay
  useEffect(() => {
    if (!showNextEpOverlay) {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setNextEpCountdown(5);
      return;
    }

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    setNextEpCountdown(5);
    countdownTimerRef.current = setInterval(() => {
      setNextEpCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          setShowNextEpOverlay(false);
          dismissedEndscreenEpisodeRef.current = episode?.id;
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [showNextEpOverlay, handleNext, episode?.id]);

  const toggleFullscreen = useCallback(() => {
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      const player = mediaPlayerRef.current;
      const container = videoContainerRef.current;
      if (!fallbackToIframe && isM3U8 && player) {
        player.enterFullscreen().catch(() => {
          container?.requestFullscreen().catch(() => {});
        });
      } else if (container) {
        container.requestFullscreen().catch(() => {});
      }
    }
  }, [fallbackToIframe, isM3U8]);

  // Listen for video ended events dispatched via postMessage from embed providers
  useEffect(() => {
    const handleWindowMessage = (event: MessageEvent) => {
      try {
        let data = event.data;
        if (typeof data === "string") {
          try { data = JSON.parse(data); } catch {}
        }
        const eventName = (data?.event || data?.type || data?.action || (typeof data === "string" ? data : "")).toLowerCase();
        if (
          eventName === "ended" ||
          eventName === "video:ended" ||
          eventName === "player:ended" ||
          eventName === "player_ended" ||
          eventName === "finish" ||
          data?.status === "ended"
        ) {
          handleEnded();
        }
      } catch {}
    };
    window.addEventListener("message", handleWindowMessage);
    return () => window.removeEventListener("message", handleWindowMessage);
  }, [handleEnded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input field or any modal dialog/overlay/palette is active
      const targetEl = e.target as HTMLElement | null;
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      
      if (
        activeTag === 'input' || 
        activeTag === 'textarea' || 
        activeTag === 'select' || 
        targetEl?.isContentEditable ||
        targetEl?.closest('input, textarea, select, [role="dialog"], [aria-modal="true"], .command-palette') ||
        showShortcuts ||
        document.body.classList.contains('overflow-hidden') ||
        document.querySelector('[role="dialog"]') ||
        document.querySelector('[aria-modal="true"]') ||
        document.querySelector('.fixed.z-\\[200\\]') ||
        document.querySelector('.fixed.z-\\[100\\]') ||
        document.querySelector('[data-state="open"]') ||
        document.querySelector('dialog[open]')
      ) {
        return;
      }

      const player = mediaPlayerRef.current;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          if (player) {
            e.preventDefault();
            if (player.paused) {
              player.play();
            } else {
              player.pause();
            }
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          if (player) {
            e.preventDefault();
            player.muted = !player.muted;
          }
          break;
        case 'ArrowLeft':
          if (player) {
            e.preventDefault();
            const cur = player.currentTime || 0;
            player.currentTime = Math.max(0, cur - 5);
          }
          break;
        case 'ArrowRight':
          if (player) {
            e.preventDefault();
            const dur = player.duration;
            const cur = player.currentTime || 0;
            player.currentTime = (dur && !isNaN(dur) && dur > 0) ? Math.min(dur, cur + 5) : cur + 5;
          }
          break;
        case 's':
          e.preventDefault();
          handleNextSource();
          break;
        case 'S':
          e.preventDefault();
          if (e.shiftKey) {
            handlePrevSource();
          } else {
            handleNextSource();
          }
          break;
        case 'n':
        case 'N':
          if (hasNext) {
            e.preventDefault();
            handleNext();
          }
          break;
        case 'p':
        case 'P':
          if (hasPrev) {
            e.preventDefault();
            handlePrev();
          }
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          setIsEpisodeDrawerOpen((prev) => !prev);
          break;
        case 'Escape':
          if (isEpisodeDrawerOpen) {
            e.preventDefault();
            setIsEpisodeDrawerOpen(false);
          }
          break;
        case '?':
          setShowShortcuts((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, handleNext, handlePrev, handleNextSource, handlePrevSource, toggleFullscreen, showShortcuts, isEpisodeDrawerOpen]);

  if (!episode) return null;

  const playbackOverlays = (
    <>
      {/* On-Screen Skip / Watch Next Button Matching Reference UI */}
      {activeSkip && !playerError && !isLoading && (() => {
        const dur = mediaDuration || 1440;
        const isPostCredits = activeSkip.type === "ed" && (dur - activeSkip.endTime > 90);
        const buttonLabel = activeSkip.type === "op"
          ? "Skip Intro"
          : activeSkip.type === "ed"
          ? (hasNext && !isPostCredits ? "Watch Next" : "Skip Outro")
          : "Skip Recap";

        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleExecuteSkip();
            }}
            className="absolute bottom-16 sm:bottom-[4.5rem] right-4 sm:right-6 z-40 overflow-hidden min-w-[128px] sm:min-w-[144px] h-9 sm:h-10 px-6 sm:px-7 rounded-md bg-black/70 hover:bg-black/90 border border-white/80 text-white font-semibold text-xs sm:text-sm backdrop-blur-sm shadow-2xl opacity-70 hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer pointer-events-auto active:scale-95 animate-in fade-in whitespace-nowrap"
            title={`${buttonLabel} (${Math.round(activeSkip.endTime - activeSkip.startTime)}s)`}
          >
            {/* Left-to-Right Fill Progress Effect (Hardware-accelerated CSS animation) */}
            <div
              className="absolute inset-y-0 left-0 bg-white/20 border-r border-white/40 pointer-events-none"
              style={{ animation: "skipProgressFill 10s linear forwards" }}
            />

            <span className="relative z-10 select-none tracking-wide text-white whitespace-nowrap">
              {buttonLabel}
            </span>
          </button>
        );
      })()}

      {/* Netflix-Style Next Episode Endscreen Overlay */}
      {showNextEpOverlay && hasNext && episodes && currentIndex !== -1 && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-16 sm:bottom-[4.5rem] right-4 sm:right-6 z-40 w-72 sm:w-80 p-3.5 sm:p-4 bg-slate-950/95 border border-white/20 rounded-2xl backdrop-blur-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-left pointer-events-auto"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider block">
                Up Next in {nextEpCountdown}s
              </span>
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                Episode {episodes[currentIndex + 1]?.id} {episodes[currentIndex + 1]?.title ? `• ${episodes[currentIndex + 1]?.title}` : ''}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleDismissNextEpOverlay}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              title="Dismiss next episode countdown"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Countdown Progress Bar */}
          <div className="w-full bg-slate-800 h-1 rounded-full my-2.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${((5 - nextEpCountdown) / 5) * 100}%` }}
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleWatchNow}
              className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/30 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Watch Now</span>
            </button>
            <button
              type="button"
              onClick={handleDismissNextEpOverlay}
              className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-white/10 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div ref={playerRef} className="w-full flex flex-col gap-4 bg-slate-950 py-8 scroll-mt-20">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header / Tabs */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-4 max-w-full min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-white/10"
                title="Close player and return to overview"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-bold text-white">
                  Episode {episode.id}
                </h2>
                {resumedBanner && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-600/20 text-blue-400 rounded-md border border-blue-500/30 animate-in fade-in">
                    {resumedBanner}
                  </span>
                )}
                {serverToast && (
                  <span className="text-xs font-medium px-2.5 py-0.5 bg-indigo-950/80 text-indigo-300 rounded-md border border-indigo-500/30 animate-in fade-in flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                    {serverToast}
                  </span>
                )}
              </div>
              <p className="text-slate-400">{episode.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap max-w-full min-w-0">
            {/* Server Switcher with Next / Prev Source Controls */}
            {activeSources && activeSources.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10 max-w-full min-w-0">
                {activeSources.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrevSource();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="Previous Source (Shift + S)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div className="flex gap-1.5 overflow-x-auto max-w-[240px] sm:max-w-[320px] md:max-w-[420px] lg:max-w-[480px] scrollbar-none py-0.5 min-w-0">
                  {activeSources.map((source, idx) => {
                    const latency = serverLatencies[source.url];
                    const latBadge = formatLatencyBadge(latency);
                    return (
                      <button
                        key={`${source.url}-${idx}`}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSelectServer(idx);
                        }}
                        title={latency !== undefined ? `Server: ${cleanServerLabel(source.quality)} • ${latBadge.text}` : `Server: ${cleanServerLabel(source.quality)}`}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer select-none ${
                          validServerIndex === idx 
                            ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400' 
                            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Server className="w-3 h-3 opacity-70 shrink-0" />
                        <span>{cleanServerLabel(source.quality)}</span>
                        {latency !== undefined && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              latency < 150
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse'
                                : latency < 400
                                ? 'bg-blue-400'
                                : 'bg-amber-400'
                            }`}
                            aria-label={latBadge.text}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {activeSources.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleNextSource();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                    title="Next Source (S)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Language Selector: SUB / ENG DUB / HINDI DUB */}
            <div className="flex p-1 bg-white/5 rounded-lg border border-white/10 shrink-0 gap-1">
              <button 
                onClick={() => {
                  setActiveTab("sub");
                  setSelectedServerIndex(0);
                  setPlayerError(false);
                  setFallbackToIframe(false);
                }}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'sub' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                SUB (JP)
              </button>
              <button 
                onClick={() => {
                  setActiveTab("dub");
                  setSelectedServerIndex(0);
                  setPlayerError(false);
                  setFallbackToIframe(false);
                }}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'dub' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                ENG DUB
              </button>
              <button 
                onClick={() => {
                  setActiveTab("hindi");
                  setSelectedServerIndex(0);
                  setPlayerError(false);
                  setFallbackToIframe(false);
                }}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'hindi' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-amber-300'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'hindi' ? 'bg-white' : 'bg-amber-400 animate-pulse'}`} />
                HINDI DUB
              </button>
            </div>
          </div>
        </div>

        {/* Video Player Container with Dynamic Ambient Cinema Glow */}
        <div className="relative w-full aspect-video">
          {/* Dynamic Ambient Cinema Glow */}
          {ambientMode && !isFloatingPiP && (
            <div 
              className="absolute -inset-4 md:-inset-10 rounded-3xl opacity-40 blur-3xl -z-10 pointer-events-none transition-all duration-1000"
              style={{
                background: `radial-gradient(ellipse at center, rgba(59, 130, 246, 0.45) 0%, rgba(99, 102, 241, 0.25) 50%, rgba(15, 23, 42, 0) 80%)`
              }}
            />
          )}

          {/* Placeholder in document flow when player is undocked into floating PiP mode */}
          {isFloatingPiP && (
            <div className="w-full h-full bg-slate-950/80 rounded-2xl border border-white/10 flex flex-col items-center justify-center gap-3 text-slate-400 select-none">
              <Tv className="w-8 h-8 text-blue-500/70 animate-pulse" />
              <p className="text-xs sm:text-sm font-medium">Playing in Picture-in-Picture mode</p>
              <button
                onClick={() => {
                  playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold border border-white/10 transition-colors"
              >
                Scroll to Player
              </button>
            </div>
          )}

          {/* Single Unified Video Player Container (Docked or Floating PiP) */}
          <div 
            ref={videoContainerRef}
            onMouseEnter={() => {
              if (typeof window !== 'undefined') window.focus();
            }}
            onMouseMove={() => {
              if (typeof window !== 'undefined' && document.activeElement?.tagName === 'IFRAME') {
                window.focus();
              }
            }}
            className={`group transition-all duration-300 ${
              isFloatingPiP
                ? "fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 sm:right-6 z-50 w-72 sm:w-96 aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.9)] border border-white/20 animate-in slide-in-from-bottom-5"
                : "relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.1)] border border-white/10 flex items-center justify-center [&:fullscreen]:w-screen [&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0 [&:fullscreen]:max-w-none"
            }`}
          >
            {/* Floating Mini Player Controls Overlay */}
            {isFloatingPiP && (
              <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-between pointer-events-auto z-30">
                <span className="text-xs font-bold text-white line-clamp-1">
                  EP {episode.id}: {episode.title}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="p-1.5 bg-black/60 hover:bg-slate-800 text-white rounded-lg transition-colors border border-white/10"
                    title="Expand to Full Player"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsMiniPlayerDismissed(true)}
                    className="p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg transition-colors border border-white/10"
                    title="Dismiss Mini Player"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Floating HUD (Hover / Fullscreen across all providers) */}
            {!isFloatingPiP && (
              <div 
                className="absolute top-3 left-3 z-30 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto"
                onMouseEnter={() => {
                  if (typeof window !== 'undefined') window.focus();
                }}
              >
                {hasPrev && (
                  <button
                    onClick={handlePrev}
                    className="px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-md border border-white/15 shadow-xl flex items-center gap-1 transition-transform active:scale-95"
                    title="Previous Episode (P)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="font-mono text-[10px] text-slate-400">P</span>
                  </button>
                )}
                {hasNext && (
                  <button
                    onClick={handleNext}
                    className="px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-slate-800 text-white text-xs font-semibold backdrop-blur-md border border-white/15 shadow-xl flex items-center gap-1.5 transition-transform active:scale-95"
                    title="Next Episode (N)"
                  >
                    <span>Next Ep</span>
                    <span className="font-mono text-[10px] bg-white/20 text-white px-1 py-0.5 rounded">N</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {episodes && episodes.length > 0 && (
                  <button
                    onClick={() => setIsEpisodeDrawerOpen((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-lg text-white text-xs font-semibold backdrop-blur-md border shadow-xl flex items-center gap-1.5 transition-transform active:scale-95 ${
                      isEpisodeDrawerOpen ? "bg-blue-600 border-blue-400" : "bg-black/80 hover:bg-slate-800 border-white/15"
                    }`}
                    title="Quick Episode List (E)"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Episodes</span>
                    <span className="font-mono text-[10px] bg-white/20 text-white px-1 py-0.5 rounded">E</span>
                  </button>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg bg-black/80 hover:bg-slate-800 text-white backdrop-blur-md border border-white/15 shadow-xl transition-transform active:scale-95"
                  title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* In-Player Slide-Over Episode Drawer (Accessible in Fullscreen & TV) */}
            {isEpisodeDrawerOpen && (
              <>
                <div 
                  onClick={() => setIsEpisodeDrawerOpen(false)}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200 pointer-events-auto"
                />
                <div
                  role="dialog"
                  aria-label="Episodes list"
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-0 right-0 bottom-0 z-50 w-72 sm:w-80 md:w-96 bg-slate-950/95 backdrop-blur-2xl border-l border-white/15 shadow-2xl flex flex-col pointer-events-auto animate-in slide-in-from-right duration-300"
                >
                  <div className="p-3.5 sm:p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <List className="w-4 h-4 text-blue-400" />
                      <h3 className="text-sm font-bold text-white">Episodes</h3>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono font-semibold">
                        {episodes?.length || 0}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEpisodeDrawerOpen(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                      aria-label="Close episode drawer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {episodes && episodes.length > 12 && (
                    <div className="p-2.5 border-b border-white/5 shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search / jump to episode..."
                          value={drawerSearchQuery}
                          onChange={(e) => setDrawerSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                    {filteredDrawerEpisodes.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No episodes found matching &quot;{drawerSearchQuery}&quot;
                      </div>
                    ) : (
                      filteredDrawerEpisodes.map((ep: any) => {
                        const isCurrent = Number(ep.id) === Number(episode?.id);
                        return (
                          <button
                            key={ep.id}
                            type="button"
                            onClick={() => {
                              if (onEpisodeChange) onEpisodeChange(ep);
                              setIsEpisodeDrawerOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left border transition-all active:scale-[0.98] cursor-pointer ${
                              isCurrent
                                ? "bg-blue-600/25 border-blue-500/50 text-white font-bold shadow-md ring-1 ring-blue-500/30"
                                : "bg-slate-900/60 hover:bg-slate-800/80 border-white/5 hover:border-white/15 text-slate-300 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`text-[11px] font-mono font-black px-1.5 py-0.5 rounded ${
                                isCurrent ? "bg-blue-600 text-white" : "bg-white/10 text-slate-300"
                              }`}>
                                {ep.id}
                              </span>
                              <span className="text-xs truncate font-medium">
                                {ep.title || `Episode ${ep.id}`}
                              </span>
                            </div>

                            {isCurrent ? (
                              <span className="flex items-center gap-1 text-[10px] text-blue-400 font-bold uppercase tracking-wider shrink-0 ml-2">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                Playing
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Loading Overlay (keeps player mounted underneath during episode transitions to maintain fullscreen) */}
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm gap-4 text-slate-400 pointer-events-auto animate-in fade-in duration-200">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-semibold tracking-wide text-white">
                  {episode ? `Loading Episode ${episode.id}...` : "Resolving Stream Servers..."}
                </p>
              </div>
            )}

            {playerError ? (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-3 w-full h-full bg-slate-950/90">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Stream Playback Issue</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  Unable to load this server feed. Please switch to an alternate server or fetch backup sources.
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                  {activeSources && activeSources.length > 1 && (
                    <button
                      onClick={handleNextSource}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                    >
                      <ChevronRight className="w-4 h-4" />
                      Try Next Server
                    </button>
                  )}
                  {activeSources && activeSources.length > 1 && (
                    activeSources.map((source, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectServer(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          validServerIndex === idx
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {cleanServerLabel(source.quality)}
                      </button>
                    ))
                  )}
                  <button
                    onClick={fetchFallbackProviders}
                    disabled={isFetchingFallback}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-amber-500/20 transition-colors flex items-center gap-1.5"
                  >
                    {isFetchingFallback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Fetch More Alternate Sources
                  </button>
                </div>
              </div>
            ) : !fallbackToIframe && isM3U8 && currentUrl ? (
              <NativePlayer 
                playerRef={mediaPlayerRef}
                url={currentUrl} 
                title={`${animeTitle} - Episode ${episode.id}`}
                poster={animePosterImage}
                subtitles={streams?.nativeStream?.subtitles}
                initialTime={initialTime}
                onTimeUpdate={handleTimeUpdate}
                onError={() => {
                  console.warn("Native HLS stream playback failed on server index", validServerIndex);
                  const now = Date.now();
                  if (now - lastFailoverAtRef.current < 600) return;
                  lastFailoverAtRef.current = now;

                  failedServersRef.current.add(validServerIndex);

                  // If the user manually selected this server within the last 8 seconds,
                  // do NOT auto-bounce away — show error state and let them choose.
                  if (now - manualSwitchAtRef.current < 8000) {
                    setPlayerError(true);
                    return;
                  }

                  // 1. Auto-failover to another unfailed HLS server first
                  const otherHlsIdx = activeSources?.findIndex((s, i) => !failedServersRef.current.has(i) && s.isM3U8);
                  if (otherHlsIdx !== undefined && otherHlsIdx !== -1) {
                    handleSelectServer(otherHlsIdx, true);
                    return;
                  }
                  // 2. Try non-MegaCloud / non-Vidstream embed servers first
                  const nonMegaEmbedIdx = activeSources?.findIndex((s, i) => !failedServersRef.current.has(i) && !s.isM3U8 && isValidEmbedUrl(s.url) && !isMegaOrVidstream(s));
                  if (nonMegaEmbedIdx !== undefined && nonMegaEmbedIdx !== -1) {
                    handleSelectServer(nonMegaEmbedIdx, true);
                    return;
                  }
                  // 3. Last resort: MegaCloud / Vidstream embed
                  const embedIdx = activeSources?.findIndex((s, i) => !failedServersRef.current.has(i) && !s.isM3U8 && isValidEmbedUrl(s.url));
                  if (embedIdx !== undefined && embedIdx !== -1) {
                    handleSelectServer(embedIdx, true);
                    return;
                  }
                  // All local servers exhausted, stop switching and show clean fallback UI
                  setPlayerError(true);
                }}
                onEnded={handleEnded}
              >
                {playbackOverlays}
              </NativePlayer>
            ) : isValidEmbedUrl(currentUrl) ? (
              <iframe 
                key={currentUrl}
                src={currentUrl}
                className="w-full h-full border-0 bg-black"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
                referrerPolicy="no-referrer-when-downgrade"
                onError={() => setPlayerError(true)}
              />
            ) : isM3U8 && currentUrl ? (
              <NativePlayer 
                playerRef={mediaPlayerRef}
                url={currentUrl} 
                title={`${animeTitle} - Episode ${episode.id}`}
                poster={animePosterImage}
                subtitles={streams?.nativeStream?.subtitles}
                initialTime={initialTime}
                onTimeUpdate={handleTimeUpdate}
                onError={() => setPlayerError(true)}
                onEnded={handleEnded}
              >
                {playbackOverlays}
              </NativePlayer>
            ) : !isLoading ? (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-3 w-full h-full bg-slate-950/80">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Tv className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Stream Not Available Yet</h3>
                <p className="text-xs text-slate-400 max-w-md">
                  This episode is either an upcoming release or has not been indexed by upstream streaming servers yet.
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                  {activeTab !== 'sub' && (
                    <button
                      onClick={() => setActiveTab('sub')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/10 transition-colors"
                    >
                      Switch to SUB (JP)
                    </button>
                  )}
                  {activeTab !== 'dub' && (
                    <button
                      onClick={() => setActiveTab('dub')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-white/10 transition-colors"
                    >
                      Switch to ENG DUB
                    </button>
                  )}
                  {activeTab !== 'hindi' && (
                    <button
                      onClick={() => setActiveTab('hindi')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-amber-500/20 transition-colors"
                    >
                      Try HINDI DUB
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {/* Live Progress Sync HUD Toast Overlay */}
            <SyncHudToast 
              result={liveSyncResult} 
              onDismiss={() => setLiveSyncResult(null)} 
              onRetry={handleRetrySync} 
            />

            {/* Fallback Overlays when playing via iframe (since iframe can't embed React children) */}
            {(fallbackToIframe || !isM3U8) && isValidEmbedUrl(currentUrl) && playbackOverlays}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between mt-3 gap-3">
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-start">
            {/* Episode Navigation */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap active:scale-95 ${
                  hasPrev 
                    ? "bg-slate-800 hover:bg-slate-700 text-white border border-white/10" 
                    : "bg-slate-900/60 text-slate-600 cursor-not-allowed border border-transparent"
                }`}
                title="Previous Episode"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev Ep</span>
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap active:scale-95 ${
                  hasNext 
                    ? "bg-slate-800 hover:bg-slate-700 text-white border border-white/10" 
                    : "bg-slate-900/60 text-slate-600 cursor-not-allowed border border-transparent"
                }`}
                title="Next Episode"
              >
                <span>Next Ep</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {episodes && episodes.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsEpisodeDrawerOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap active:scale-95 cursor-pointer ${
                    isEpisodeDrawerOpen
                      ? "bg-blue-600 border-blue-500 text-white shadow-md"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
                  }`}
                  title="Toggle Quick Episode Drawer (E)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Episodes ({episodes.length})</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Ambient Cinema Glow Toggle */}
            <button
              onClick={toggleAmbientMode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                ambientMode
                  ? "bg-blue-600/20 text-blue-400 border-blue-500/30"
                  : "bg-slate-900/50 text-slate-400 hover:text-white border-white/5"
              }`}
              title="Toggle Dynamic Cinema Ambient Glow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ambient Glow</span>
            </button>

            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-lg text-xs font-semibold border border-white/5 transition-colors"
              title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
            </button>

            {/* Keyboard Shortcuts Info Button */}
            <button
              onClick={() => setShowShortcuts((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-lg text-xs font-semibold border border-white/5 transition-colors"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">Shortcuts</span>
            </button>

            {/* Auto-Skip OP/ED Toggle */}
            <div className="flex items-center gap-2.5 bg-slate-900/50 px-3.5 py-2 rounded-lg border border-white/5">
              <span className="text-xs sm:text-sm font-medium text-slate-300 whitespace-nowrap">Auto-Skip OP/ED</span>
              <button 
                type="button"
                onClick={toggleAutoSkip}
                className={`relative w-11 h-6 rounded-full transition-colors ${autoSkip ? 'bg-blue-600' : 'bg-slate-700'}`}
                title="Automatically skip opening and ending sequences"
              >
                <div 
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoSkip ? 'translate-x-5' : 'translate-x-0'}`} 
                />
              </button>
            </div>

            {/* Autoplay Toggle */}
            <div className="flex items-center gap-3 bg-slate-900/50 px-4 py-2 rounded-lg border border-white/5">
              <span className="text-sm font-medium text-slate-300">Autoplay Next</span>
              <button 
                onClick={toggleAutoplay}
                className={`relative w-12 h-6 rounded-full transition-colors ${autoplayNext ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <div 
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${autoplayNext ? 'translate-x-6' : 'translate-x-0'}`} 
                />
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && (
          <div className="mt-4 p-4 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in">
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">Space</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white">K</kbd> Play / Pause</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">F</kbd> Fullscreen</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">E</kbd> Episode Drawer</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">N</kbd> Next Ep (All Providers)</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">P</kbd> Previous Ep</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">M</kbd> Mute / Unmute</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">←</kbd> / <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">→</kbd> Seek 5s</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">S</kbd> Next Source</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">Shift+S</kbd> Prev Source</div>
          </div>
        )}
      </div>
    </div>
  );
}
