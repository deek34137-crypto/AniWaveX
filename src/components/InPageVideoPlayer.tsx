"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, X, Keyboard, Tv, AlertCircle, Sparkles, Maximize2, Server, ChevronLeft, ChevronRight, RotateCcw, Activity } from "lucide-react";
import NativePlayer from "./NativePlayer";
import { useAuth } from "@/providers/AuthProvider";
import { benchmarkStreamSources, getFastestServerIndex, formatLatencyBadge } from "@/lib/latency-benchmarker";
import { syncProgressToAniList } from "@/lib/sync/anilist-sync";
import type { MediaPlayerInstance } from "@vidstack/react";

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
}

function isValidEmbedUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("/api/proxy") || url.includes(".m3u8") || url.includes("animeapps.top")) {
    return false;
  }
  return url.startsWith("http://") || url.startsWith("https://");
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
  anilistId
}: InPageVideoPlayerProps) {
  const { user: authUser, supabase } = useAuth();
  const [activeTab, setActiveTab] = useState<"sub" | "dub" | "hindi">("sub");
  const [streams, setStreams] = useState<{ sub: StreamSource[], dub: StreamSource[], hindi?: StreamSource[], nativeStream?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingFallback, setIsFetchingFallback] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [ambientMode, setAmbientMode] = useState(true);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(authUser || initialUser);
  const [resumedBanner, setResumedBanner] = useState<string | null>(null);
  const [serverToast, setServerToast] = useState<string | null>(null);
  const [serverLatencies, setServerLatencies] = useState<Record<string, number>>({});
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [isScrolledPast, setIsScrolledPast] = useState(false);
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState(false);
  
  const currentUserRef = useRef<any>(authUser || initialUser);
  const playerRef = useRef<HTMLDivElement>(null);
  const mediaPlayerRef = useRef<MediaPlayerInstance>(null);
  const lastSavedTimeRef = useRef(0);
  const lastSupabaseSyncRef = useRef(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const liveUser = authUser || initialUser;
    setCurrentUser(liveUser);
    currentUserRef.current = liveUser;
  }, [authUser, initialUser]);

  // Track duration separately so it can be saved to Supabase
  const lastKnownDurationRef = useRef(0);

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
          onConflict: 'user_id, anime_slug'
        });

      if (error) console.error("Failed to sync watch history", error);
    } catch (err) {
      console.error("Failed to sync watch history", err);
    }
  }, [episode?.id, animeSlug, animeTitle, animePosterImage, supabase]);

  // Load initial resume progress from localStorage on episode change
  useEffect(() => {
    if (!episode) return;
    setFallbackToIframe(false);
    lastSavedTimeRef.current = 0;
    lastSupabaseSyncRef.current = 0;

    try {
      const storageKey = `watch_progress_${animeSlug}_ep_${episode.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentTime && parsed.currentTime > 5) {
          // If video was not completed (e.g. less than 95% of duration)
          if (!parsed.duration || parsed.currentTime < parsed.duration * 0.95) {
            const startSec = Math.floor(parsed.currentTime);
            setInitialTime(startSec);
            lastSavedTimeRef.current = startSec;
            lastSupabaseSyncRef.current = startSec;
            const mins = Math.floor(parsed.currentTime / 60);
            const secs = Math.floor(parsed.currentTime % 60).toString().padStart(2, '0');
            setResumedBanner(`Resumed from ${mins}:${secs}`);
            setTimeout(() => setResumedBanner(null), 4000);
            return;
          }
        }
      }
    } catch {
      // Ignore storage read errors
    }
    setInitialTime(0);
    setResumedBanner(null);
  }, [episode, animeSlug]);

  // Scroll to player when episode changes
  useEffect(() => {
    if (episode && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [episode]);

  // Throttled time update callback to save playback progress locally and remotely
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (!episode) return;

    const floorTime = Math.floor(currentTime);
    const floorDur = Math.floor(duration);

    // Always keep the latest known duration up-to-date
    if (floorDur > 0) {
      lastKnownDurationRef.current = floorDur;
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

    // Sync to Supabase periodically every 35 seconds during continuous playback to avoid DB write flooding
    if (Math.abs(currentTime - lastSupabaseSyncRef.current) >= 35 && floorTime > 0) {
      lastSupabaseSyncRef.current = currentTime;
      syncToSupabase(floorTime);
    }
  }, [episode?.id, episode?.title, animeSlug, animeTitle, animePosterImage, syncToSupabase]);

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
    if (storedAutoplay) setAutoplayNext(storedAutoplay === "true");

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

  // Helper to trigger temporary server toast notifications
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setServerToast(msg);
    toastTimeoutRef.current = setTimeout(() => setServerToast(null), 3500);
  }, []);

  const activeSources: StreamSource[] | undefined = activeTab === "hindi" 
    ? streams?.hindi 
    : (activeTab === "sub" ? streams?.sub : streams?.dub);

  // Ensure selectedServerIndex is within bounds
  const validServerIndex = activeSources && activeSources.length > 0 ? Math.min(selectedServerIndex, activeSources.length - 1) : 0;
  const selectedSource = activeSources?.[validServerIndex];
  const currentUrl = selectedSource?.url;
  const isM3U8 = Boolean(selectedSource?.isM3U8 || (currentUrl && currentUrl.includes('.m3u8')));
  const availableEmbedIndex = activeSources?.findIndex((s) => !s.isM3U8 && isValidEmbedUrl(s.url)) ?? -1;
  const hasEmbedOption = availableEmbedIndex !== -1;
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

      // Auto-select lowest latency server if user has not explicitly locked a server
      if (!userExplicitlySelectedServerRef.current) {
        const fastestIdx = getFastestServerIndex(activeSources, latencies);
        if (fastestIdx !== validServerIndex && latencies[activeSources[fastestIdx]?.url] < 400) {
          setSelectedServerIndex(fastestIdx);
          setFallbackToIframe(!activeSources[fastestIdx].isM3U8);
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

    // Grab current playback time
    const liveTime = mediaPlayerRef.current?.currentTime;
    const currentProgress = (typeof liveTime === 'number' && liveTime > 0) ? liveTime : (lastSavedTimeRef.current || initialTime || 0);

    if (currentProgress > 0) {
      setInitialTime(Math.floor(currentProgress));
      lastSavedTimeRef.current = currentProgress;
    }

    userExplicitlySelectedServerRef.current = true;
    setSelectedServerIndex(targetIdx);
    setFallbackToIframe(!targetSource.isM3U8);
    setPlayerError(false);

    if (isAutoFailover) {
      showToast(`Auto-switched to ${targetSource.quality}`);
    } else {
      showToast(`Switched to ${targetSource.quality}`);
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
      activeSources?.forEach((src, idx) => {
        if (failedServersRef.current.has(idx) || activeSources.length <= 2) {
          const lower = src.quality.toLowerCase();
          if (lower.includes('reanime')) excludedNames.push('reanime');
          if (lower.includes('megacloud') || lower.includes('anikoto')) excludedNames.push('anikoto', 'local-anikoto');
          if (lower.includes('justanime')) excludedNames.push('justanime');
          if (lower.includes('kickassanime') || lower.includes('kaa')) excludedNames.push('kaa');
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
      setStreams(null);
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

        if (!data.error) {
          setStreams(data);
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || controller.signal.aborted) {
          // Ignored cancelled request
          return;
        }
        if (requestIdRef.current === currentRequestId) {
          console.error("Failed to fetch stream", error);
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
  }, [episode, animeSlug, animeTitle, animeType, activeTab, anilistId]);

  const currentIndex = episodes ? episodes.findIndex((ep) => ep.id === episode?.id) : -1;
  const hasNext = episodes && currentIndex !== -1 && currentIndex < episodes.length - 1;
  const hasPrev = episodes && currentIndex > 0;

  const handleNext = useCallback(() => {
    if (hasNext && onEpisodeChange && episodes) {
      onEpisodeChange(episodes[currentIndex + 1]);
    }
  }, [hasNext, onEpisodeChange, episodes, currentIndex]);

  const handlePrev = useCallback(() => {
    if (hasPrev && onEpisodeChange && episodes) {
      onEpisodeChange(episodes[currentIndex - 1]);
    }
  }, [hasPrev, onEpisodeChange, episodes, currentIndex]);

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
          if (player) {
            e.preventDefault();
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              player.enterFullscreen().catch(() => {});
            }
          }
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
        case '?':
          setShowShortcuts((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, handleNext, handlePrev, handleNextSource, handlePrevSource]);

  if (!episode) return null;

  return (
    <div ref={playerRef} className="w-full flex flex-col gap-4 bg-slate-950 py-8 scroll-mt-20">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header / Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
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
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                Episode {episode.id}
                {resumedBanner && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-blue-600/30 text-blue-400 rounded-full border border-blue-500/30 animate-in fade-in">
                    {resumedBanner}
                  </span>
                )}
                {serverToast && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-600/30 text-indigo-300 rounded-full border border-indigo-500/30 animate-in fade-in">
                    {serverToast}
                  </span>
                )}
              </h2>
              <p className="text-slate-400">{episode.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Server Switcher with Next / Prev Source Controls */}
            {activeSources && activeSources.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
                {activeSources.length > 1 && (
                  <button
                    onClick={handlePrevSource}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Previous Source (Shift + S)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}

                <div className="flex gap-1.5 overflow-x-auto max-w-[320px] sm:max-w-none scrollbar-none py-0.5">
                  {activeSources.map((source, idx) => {
                    const latBadge = formatLatencyBadge(serverLatencies[source.url]);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectServer(idx)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                          validServerIndex === idx 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        <Server className="w-3 h-3 opacity-70" />
                        <span>{source.quality}</span>
                        {serverLatencies[source.url] !== undefined && (
                          <span className={`text-[10px] ${latBadge.colorClass}`}>
                            • {latBadge.text}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {activeSources.length > 1 && (
                  <button
                    onClick={handleNextSource}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
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
            className={`group transition-all duration-300 ${
              isFloatingPiP
                ? "fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 sm:right-6 z-50 w-72 sm:w-96 aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.9)] border border-white/20 animate-in slide-in-from-bottom-5"
                : "relative w-full h-full bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.1)] border border-white/10 flex items-center justify-center"
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

            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="font-semibold tracking-wide">Resolving Stream Servers...</p>
              </div>
            ) : playerError ? (
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
                        {source.quality}
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
                key={currentUrl}
                playerRef={mediaPlayerRef}
                url={currentUrl} 
                title={`${animeTitle} - Episode ${episode.id}`}
                poster={animePosterImage}
                subtitles={streams?.nativeStream?.subtitles}
                initialTime={initialTime}
                onTimeUpdate={handleTimeUpdate}
                onError={() => {
                  console.warn("Native HLS stream playback failed on server index", validServerIndex);
                  failedServersRef.current.add(validServerIndex);

                  // 1. Auto-failover to another unfailed HLS server first
                  const otherHlsIdx = activeSources?.findIndex((s, i) => !failedServersRef.current.has(i) && s.isM3U8);
                  if (otherHlsIdx !== undefined && otherHlsIdx !== -1) {
                    handleSelectServer(otherHlsIdx, true);
                    return;
                  }
                  // 2. Only if no unfailed HLS servers remain, fallback to a working embed server
                  const embedIdx = activeSources?.findIndex((s, i) => !failedServersRef.current.has(i) && !s.isM3U8 && isValidEmbedUrl(s.url));
                  if (embedIdx !== undefined && embedIdx !== -1) {
                    handleSelectServer(embedIdx, true);
                    return;
                  }
                  // All local servers exhausted, show clean fallback UI
                  setPlayerError(true);
                }}
                onEnded={() => {
                  const anilistToken = typeof window !== 'undefined' ? localStorage.getItem("anilist_token") : null;
                  if (anilistToken && anilistId && episode?.id && lastAniListSyncEpRef.current !== episode.id) {
                    lastAniListSyncEpRef.current = episode.id;
                    syncProgressToAniList(anilistToken, anilistId, episode.id).then((res) => {
                      if (res.success) {
                        showToast(`Synced Ep ${episode.id} to AniList ✨`);
                      }
                    });
                  }
                  if (autoplayNext && hasNext) {
                    handleNext();
                  }
                }}
              />
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
                key={currentUrl}
                playerRef={mediaPlayerRef}
                url={currentUrl} 
                title={`${animeTitle} - Episode ${episode.id}`}
                poster={animePosterImage}
                subtitles={streams?.nativeStream?.subtitles}
                initialTime={initialTime}
                onTimeUpdate={handleTimeUpdate}
                onError={() => setPlayerError(true)}
                onEnded={() => {
                  const anilistToken = typeof window !== 'undefined' ? localStorage.getItem("anilist_token") : null;
                  if (anilistToken && anilistId && episode?.id && lastAniListSyncEpRef.current !== episode.id) {
                    lastAniListSyncEpRef.current = episode.id;
                    syncProgressToAniList(anilistToken, anilistId, episode.id).then((res) => {
                      if (res.success) {
                        showToast(`Synced Ep ${episode.id} to AniList ✨`);
                      }
                    });
                  }
                  if (autoplayNext && hasNext) {
                    handleNext();
                  }
                }}
              />
            ) : (
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
            )}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between mt-4 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {/* Episode Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={!hasPrev}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  hasPrev 
                    ? "bg-slate-800 hover:bg-slate-700 text-white border border-white/10" 
                    : "bg-slate-900 text-slate-600 cursor-not-allowed border border-transparent"
                }`}
              >
                Previous Ep
              </button>
              <button
                onClick={handleNext}
                disabled={!hasNext}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  hasNext 
                    ? "bg-slate-800 hover:bg-slate-700 text-white border border-white/10" 
                    : "bg-slate-900 text-slate-600 cursor-not-allowed border border-transparent"
                }`}
              >
                Next Ep
              </button>
            </div>

            {/* Quick Source Controls */}
            {activeSources && activeSources.length > 1 && (
              <div className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-lg border border-white/5">
                <button
                  onClick={handlePrevSource}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="Previous Server (Shift + S)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Prev Source</span>
                </button>
                <span className="text-xs font-bold text-indigo-400 px-1">
                  {validServerIndex + 1}/{activeSources.length}
                </span>
                <button
                  onClick={handleNextSource}
                  className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1"
                  title="Next Server (S)"
                >
                  <span className="hidden md:inline">Next Source</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
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

            {/* Manual Player Mode Switcher (only shown if both HLS and Embed servers exist) */}
            {hasEmbedOption && (
              <button
                onClick={() => {
                  if (fallbackToIframe) {
                    const firstHlsIdx = activeSources?.findIndex((s) => s.isM3U8) ?? 0;
                    setSelectedServerIndex(firstHlsIdx >= 0 ? firstHlsIdx : 0);
                    setFallbackToIframe(false);
                  } else {
                    setSelectedServerIndex(availableEmbedIndex);
                    setFallbackToIframe(true);
                  }
                  setPlayerError(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  fallbackToIframe
                    ? "bg-amber-600/20 text-amber-300 border-amber-500/30"
                    : "bg-slate-900/50 text-slate-400 hover:text-white border-white/5"
                }`}
                title={fallbackToIframe ? "Switch to Native Player" : "Switch to Embed Player"}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>{fallbackToIframe ? "Embed Server" : "Native Player"}</span>
              </button>
            )}

            {/* Keyboard Shortcuts Info Button */}
            <button
              onClick={() => setShowShortcuts((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/50 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-lg text-xs font-semibold border border-white/5 transition-colors"
              title="Keyboard Shortcuts"
            >
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">Shortcuts</span>
            </button>

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
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">M</kbd> Mute / Unmute</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">←</kbd> / <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">→</kbd> Seek 5s</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">S</kbd> Next Source</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">Shift+S</kbd> Prev Source</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">N</kbd> Next Episode</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">P</kbd> Previous Episode</div>
          </div>
        )}
      </div>
    </div>
  );
}
