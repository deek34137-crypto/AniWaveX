"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Hero from "@/components/Hero";
import EpisodesGrid from "@/components/EpisodesGrid";
import Recommendations from "@/components/Recommendations";
import InPageVideoPlayer from "@/components/InPageVideoPlayer";
import { useAuth } from "@/providers/AuthProvider";

function parseTimestamp(raw?: string | null): number | null {
  if (!raw) return null;
  const str = raw.trim();
  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return Math.floor(parts[0] * 60 + parts[1]);
    }
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
    }
  }
  const num = parseFloat(str);
  return !isNaN(num) && num > 0 ? Math.floor(num) : null;
}

export default function AnimePageClient({ 
  data, 
  recommendations,
  initialBookmarked, 
  initialBookmarkStatus,
  user: initialUser, 
  lastWatchedEpisode: serverLastWatched,
  serverProgressSeconds,
  serverTotalSeconds
}: { 
  data: any, 
  recommendations: any[],
  initialBookmarked?: boolean, 
  initialBookmarkStatus?: any,
  user?: any, 
  lastWatchedEpisode?: number | null,
  serverProgressSeconds?: number | null,
  serverTotalSeconds?: number | null
}) {
  const [activeEpisode, setActiveEpisode] = useState<any | null>(null);
  const [lastWatchedEpisode, setLastWatchedEpisode] = useState<number | null>(serverLastWatched ?? null);
  const { user: authUser } = useAuth();
  const currentUser = authUser || initialUser;
  const searchParams = useSearchParams();
  const [targetSeekSeconds, setTargetSeekSeconds] = useState<number | null>(() => {
    return parseTimestamp(searchParams.get("t") || searchParams.get("time"));
  });

  // Notify MobileBottomNav when an episode is actively playing on this anime page
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("aniwavex-player-state", {
        detail: { active: Boolean(activeEpisode) },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("aniwavex-player-state", {
          detail: { active: false },
        })
      );
    };
  }, [activeEpisode]);

  // On mount: handle ?ep= param (from Continue Watching / Screenshot Search) or resolve best episode (local + server)
  useEffect(() => {
    if (!data) return;

    const epParam = searchParams.get("ep");
    const playParam = searchParams.get("play");
    const timeParam = searchParams.get("t") || searchParams.get("time");

    // Helper to auto-play if ?play=1 is requested
    const triggerAutoPlayIfRequested = (targetEpId?: number | null) => {
      if (playParam === "1" && data.episodes && data.episodes.length > 0) {
        const ep = targetEpId
          ? (data.episodes.find((e: any) => Number(e.id) === Number(targetEpId)) || data.episodes[0])
          : data.episodes[0];
        if (ep) {
          setActiveEpisode(ep);
        }
      }
    };

    if (epParam) {
      const epId = parseInt(epParam, 10);
      setLastWatchedEpisode(epId);

      // Direct auto-play if ?play=1 is present
      if (playParam === "1") {
        const ep = data.episodes?.find((e: any) => e.id === epId);
        if (ep) {
          setActiveEpisode(ep);
          return;
        }
      }
    }

    // Helper to advance to next episode if the previous episode was completed (>= 90%)
    const getNextEpisodeIfCompleted = (epId: number, progress: number, total: number): number => {
      const isCompleted = (total > 0 && progress >= total * 0.90) || (total > 60 && total - progress < 60);
      if (!isCompleted || !data.episodes || data.episodes.length === 0) return epId;
      const curIdx = data.episodes.findIndex((e: any) => Number(e.id) === Number(epId));
      if (curIdx !== -1 && curIdx < data.episodes.length - 1) {
        return data.episodes[curIdx + 1].id;
      }
      return epId;
    };

    // 1. Check unified recent watches list (often freshest on the active device)
    try {
      const raw = localStorage.getItem("aniwavex_recent_watches");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const entry = list.find((it: any) => it.animeSlug === data.slug);
          if (entry?.episodeId) {
            const resolvedEp = getNextEpisodeIfCompleted(
              Number(entry.episodeId),
              Number(entry.progressSeconds || 0),
              Number(entry.totalSeconds || 0)
            );
            setLastWatchedEpisode(resolvedEp);
            triggerAutoPlayIfRequested(resolvedEp);
            return;
          }
        }
      }
    } catch {}

    // 2. Check server-provided last watched (from Supabase watch_history)
    if (serverLastWatched) {
      const resolvedEp = getNextEpisodeIfCompleted(
        Number(serverLastWatched),
        Number(serverProgressSeconds || 0),
        Number(serverTotalSeconds || 0)
      );
      setLastWatchedEpisode(resolvedEp);
      triggerAutoPlayIfRequested(resolvedEp);
      return;
    }

    // 3. Scan per-episode localStorage keys as a fallback
    try {
      const epIds = (data.episodes || []).map((e: any) => e.id).filter(Boolean);
      let bestEpId: number | null = null;
      let bestTime = 0;
      let bestProgress = 0;
      let bestDuration = 0;
      for (const epId of epIds) {
        const epRaw = localStorage.getItem(`watch_progress_${data.slug}_ep_${epId}`);
        if (epRaw) {
          const parsed = JSON.parse(epRaw);
          if ((parsed.updatedAt || 0) > bestTime) {
            bestTime = parsed.updatedAt || 0;
            bestEpId = epId;
            bestProgress = parsed.currentTime || 0;
            bestDuration = parsed.duration || 0;
          }
        }
      }
      if (bestEpId) {
        const resolvedEp = getNextEpisodeIfCompleted(bestEpId, bestProgress, bestDuration);
        setLastWatchedEpisode(resolvedEp);
        triggerAutoPlayIfRequested(resolvedEp);
        return;
      }
    } catch {}

    // Fallback: If ?play=1 requested but no watch history existed, auto-play first episode
    triggerAutoPlayIfRequested(data.episodes?.[0]?.id ?? 1);
  }, [data, searchParams, serverLastWatched, serverProgressSeconds, serverTotalSeconds]);

  // Listen for live episode updates from player or background sync
  useEffect(() => {
    const handleWatchUpdated = (e: any) => {
      if (e.detail?.animeSlug === data?.slug && e.detail?.episodeId) {
        setLastWatchedEpisode(e.detail.episodeId);
      }
    };
    window.addEventListener("aniwavex_watch_updated", handleWatchUpdated);
    return () => {
      window.removeEventListener("aniwavex_watch_updated", handleWatchUpdated);
    };
  }, [data?.slug]);

  if (!data) return <div className="text-white p-10">Loading...</div>;

  return (
    <main className="min-h-screen bg-slate-950 pb-32" style={{ paddingTop: "var(--navbar-total, 3.5rem)" }}>
      <div className="tv-safe-container space-y-6 tv:space-y-10">
        
        {activeEpisode ? (
          <InPageVideoPlayer 
            episode={activeEpisode} 
            episodes={data.episodes}
            initialProgressSeconds={activeEpisode?.id === serverLastWatched ? serverProgressSeconds : null}
            targetSeekSeconds={targetSeekSeconds}
            onEpisodeChange={(ep) => {
              setActiveEpisode(ep);
              setTargetSeekSeconds(null);
              if (ep?.id) setLastWatchedEpisode(ep.id);
              // Only scroll to top if not in fullscreen mode
              if (typeof document !== 'undefined' && !document.fullscreenElement) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            onClose={() => {
              setActiveEpisode(null);
              setTargetSeekSeconds(null);
            }}
            animeSlug={data.slug}
            animeTitle={data.title}
            animeType={data.type}
            animePosterImage={data.posterImage}
            user={currentUser}
            anilistId={data.anilistId}
            animeId={data.animeId || data.id}
          />
        ) : (
          <Hero 
            anime={data}
            initialBookmarked={initialBookmarked}
            initialBookmarkStatus={initialBookmarkStatus}
            user={currentUser}
            lastWatchedEpisode={lastWatchedEpisode}
            onPlayEpisode={(ep) => {
              setActiveEpisode(ep);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
        
        <EpisodesGrid 
          episodes={data.episodes} 
          activeEpisodeId={activeEpisode?.id}
          onPlay={(episode) => {
            setActiveEpisode(episode);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          animeSlug={data.slug}
          animeId={data.animeId || data.id}
          lastWatchedEpisode={lastWatchedEpisode}
        />
        
        <Recommendations items={recommendations} />
      </div>
    </main>
  );
}
