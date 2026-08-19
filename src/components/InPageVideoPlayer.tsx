"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, X, Keyboard, Tv } from "lucide-react";
import NativePlayer from "./NativePlayer";
import { createClient } from "@/lib/supabase/client";
import type { MediaPlayerInstance } from "@vidstack/react";

interface StreamSource {
  url: string;
  quality: string;
  isM3U8: boolean;
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
  user
}: InPageVideoPlayerProps) {
  const [activeTab, setActiveTab] = useState<"sub" | "dub" | "hindi">("sub");
  const [streams, setStreams] = useState<{ sub: StreamSource[], dub: StreamSource[], hindi?: StreamSource[], nativeStream?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [resumedBanner, setResumedBanner] = useState<string | null>(null);
  const [fallbackToIframe, setFallbackToIframe] = useState(false);
  
  const playerRef = useRef<HTMLDivElement>(null);
  const mediaPlayerRef = useRef<MediaPlayerInstance>(null);
  const lastSavedTimeRef = useRef(0);
  const supabase = createClient();

  // Load initial resume progress from localStorage on episode change
  useEffect(() => {
    if (!episode) return;
    setFallbackToIframe(false);
    try {
      const storageKey = `watch_progress_${animeSlug}_ep_${episode.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentTime && parsed.currentTime > 5) {
          // If video was not completed (e.g. less than 95% of duration)
          if (!parsed.duration || parsed.currentTime < parsed.duration * 0.95) {
            setInitialTime(Math.floor(parsed.currentTime));
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
  }, [episode?.id, animeSlug]);

  // Scroll to player when episode changes
  useEffect(() => {
    if (episode && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [episode]);

  // Throttled time update callback to save playback progress
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (!episode) return;

    // Save to localStorage every 2 seconds
    if (Math.abs(currentTime - lastSavedTimeRef.current) >= 2) {
      lastSavedTimeRef.current = currentTime;
      try {
        const storageKey = `watch_progress_${animeSlug}_ep_${episode.id}`;
        localStorage.setItem(storageKey, JSON.stringify({
          currentTime: Math.floor(currentTime),
          duration: Math.floor(duration),
          updatedAt: Date.now()
        }));
      } catch {
        // Ignore localStorage quota errors
      }
    }
  }, [episode, animeSlug]);

  // Debounced watch history upsert when episode loads (2.5s delay)
  useEffect(() => {
    if (!episode || !user) return;

    const timer = setTimeout(async () => {
      try {
        const progressSeconds = Math.floor(lastSavedTimeRef.current || 0);
        const { error } = await supabase
          .from('watch_history')
          .upsert({
            user_id: user.id,
            anime_slug: animeSlug,
            anime_title: animeTitle,
            poster_image: animePosterImage,
            last_episode_watched: episode.id,
            progress_seconds: progressSeconds > 0 ? progressSeconds : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id, anime_slug'
          });
          
        if (error) console.error("Failed to save watch history", error);
      } catch (err) {
        console.error("Failed to save watch history", err);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [episode?.id, user?.id, animeSlug, animeTitle, animePosterImage, supabase]);

  // Read autoplay preference from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("autoplayNext");
    if (stored) setAutoplayNext(stored === "true");
  }, []);

  const toggleAutoplay = () => {
    const newVal = !autoplayNext;
    setAutoplayNext(newVal);
    localStorage.setItem("autoplayNext", newVal.toString());
  };

  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!episode) return;

    const controller = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    const fetchStream = async () => {
      setIsLoading(true);
      setStreams(null);
      setSelectedServerIndex(0); // Reset server index
      setFallbackToIframe(false);
      try {
        const typeParam = animeType ? `&type=${encodeURIComponent(animeType)}` : '';
        const audioParam = `&audio=${activeTab}`;
        const baseUrl = "/api/stream";
        const res = await fetch(
          `${baseUrl}?id=${encodeURIComponent(animeSlug)}&ep=${episode.id}&title=${encodeURIComponent(animeTitle)}${typeParam}${audioParam}`,
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
  }, [episode, animeSlug, animeTitle, animeType, activeTab]);

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

  // Global Keyboard Shortcuts (Feature 3.3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input field
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || (document.activeElement as HTMLElement)?.isContentEditable) {
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
            player.currentTime = Math.max(0, player.currentTime - 5);
          }
          break;
        case 'ArrowRight':
          if (player) {
            e.preventDefault();
            player.currentTime = Math.min(player.duration || player.currentTime + 5, player.currentTime + 5);
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
  }, [hasNext, hasPrev, handleNext, handlePrev]);

  if (!episode) return null;

  const activeSources: StreamSource[] | undefined = activeTab === "hindi" 
    ? streams?.hindi 
    : (activeTab === "sub" ? streams?.sub : streams?.dub);
  // Ensure selectedServerIndex is within bounds
  const validServerIndex = activeSources && activeSources.length > 0 ? Math.min(selectedServerIndex, activeSources.length - 1) : 0;
  const selectedSource = activeSources?.[validServerIndex];
  const currentUrl = selectedSource?.url;
  const isM3U8 = Boolean(selectedSource?.isM3U8 || (currentUrl && currentUrl.includes('.m3u8')));

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
              </h2>
              <p className="text-slate-400">{episode.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap">
            {/* Server Switcher */}
            {activeSources && activeSources.length > 1 && (
              <div className="flex gap-2">
                {activeSources.map((source, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedServerIndex(idx);
                      setFallbackToIframe(false);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${validServerIndex === idx ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                  >
                    Server {source.quality}
                  </button>
                ))}
              </div>
            )}

            {/* Language Selector: SUB / ENG DUB / HINDI DUB */}
            <div className="flex p-1 bg-white/5 rounded-lg border border-white/10 shrink-0 gap-1">
              <button 
                onClick={() => setActiveTab("sub")}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'sub' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                SUB (JP)
              </button>
              <button 
                onClick={() => setActiveTab("dub")}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors ${activeTab === 'dub' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
              >
                ENG DUB
              </button>
              <button 
                onClick={() => setActiveTab("hindi")}
                className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'hindi' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-amber-300'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'hindi' ? 'bg-white' : 'bg-amber-400 animate-pulse'}`} />
                HINDI DUB
              </button>
            </div>
          </div>
        </div>

        {/* Video Player Container */}
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.1)] border border-white/10 flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <p className="font-semibold tracking-wide">Resolving Stream Servers...</p>
            </div>
          ) : isM3U8 && currentUrl && !fallbackToIframe ? (
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
                console.warn("Native HLS stream playback failed, switching to backup embed server");
                const firstEmbedIdx = activeSources?.findIndex(s => !s.isM3U8 && !s.url.includes('.m3u8') && !s.url.includes('animeapps.top'));
                if (firstEmbedIdx !== undefined && firstEmbedIdx !== -1) {
                  setSelectedServerIndex(firstEmbedIdx);
                  setFallbackToIframe(false);
                } else {
                  setFallbackToIframe(true);
                }
              }}
              onEnded={() => {
                if (autoplayNext && hasNext) {
                  handleNext();
                }
              }}
            />
          ) : currentUrl && !currentUrl.includes('embed.filmu.in') && !currentUrl.includes('animeapps.top') ? (
            <iframe 
              key={currentUrl}
              src={currentUrl}
              className="w-full h-full border-0 bg-black"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
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

        {/* Footer Navigation */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between mt-4 gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                hasPrev 
                  ? "bg-slate-800 hover:bg-slate-700 text-white border border-white/10" 
                  : "bg-slate-900 text-slate-600 cursor-not-allowed border border-transparent"
              }`}
            >
              Previous
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
              Next
            </button>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Manual Player Mode Switcher (if m3u8) */}
            {isM3U8 && currentUrl && (
              <button
                onClick={() => setFallbackToIframe(!fallbackToIframe)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  fallbackToIframe
                    ? "bg-amber-600/20 text-amber-300 border-amber-500/30"
                    : "bg-slate-900/50 text-slate-400 hover:text-white border-white/5"
                }`}
                title={fallbackToIframe ? "Switch to Native Player" : "Switch to Embed Player"}
              >
                <Tv className="w-3.5 h-3.5" />
                <span>{fallbackToIframe ? "Embed Mode" : "Native Mode"}</span>
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
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">N</kbd> Next Episode</div>
            <div><kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-white font-bold">P</kbd> Previous Episode</div>
          </div>
        )}
      </div>
    </div>
  );
}
