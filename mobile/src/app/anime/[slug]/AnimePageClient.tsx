"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Hero from "@/components/Hero";
import EpisodesGrid from "@/components/EpisodesGrid";
import Recommendations from "@/components/Recommendations";
import InPageVideoPlayer from "@/components/InPageVideoPlayer";
import { useAuth } from "@/providers/AuthProvider";

export default function AnimePageClient({ 
  data, 
  recommendations,
  initialBookmarked, 
  initialBookmarkStatus,
  user: initialUser, 
  lastWatchedEpisode: serverLastWatched
}: { 
  data: any, 
  recommendations: any[],
  initialBookmarked?: boolean, 
  initialBookmarkStatus?: any,
  user?: any, 
  lastWatchedEpisode?: number | null 
}) {
  const [activeEpisode, setActiveEpisode] = useState<any | null>(null);
  const [lastWatchedEpisode, setLastWatchedEpisode] = useState<number | null>(serverLastWatched ?? null);
  const { user: authUser } = useAuth();
  const currentUser = authUser || initialUser;
  const searchParams = useSearchParams();

  // On mount: handle ?ep= param (from Continue Watching) or read localStorage for guests
  useEffect(() => {
    if (!data) return;

    const epParam = searchParams.get("ep");

    if (epParam) {
      // ?ep=N passed from Continue Watching row → auto-play that episode
      const epId = parseInt(epParam, 10);
      const ep = data.episodes?.find((e: any) => e.id === epId);
      if (ep) {
        setActiveEpisode(ep);
        setLastWatchedEpisode(epId);
        return;
      }
    }

    // Server already gave us the episode (logged-in user via SSR)
    if (serverLastWatched) {
      setLastWatchedEpisode(serverLastWatched);
      return;
    }

    // Fallback: read from localStorage (works for guests AND logged-in users
    // when the SSR Supabase cookie auth doesn't fire correctly)
    try {
      // 1. Check the unified recent watches list
      const raw = localStorage.getItem("aniwavex_recent_watches");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          const entry = list.find((it: any) => it.animeSlug === data.slug);
          if (entry?.episodeId) {
            setLastWatchedEpisode(entry.episodeId);
            return;
          }
        }
      }

      // 2. Scan per-episode keys as a last resort
      const epIds = (data.episodes || []).map((e: any) => e.id).filter(Boolean);
      let bestEpId: number | null = null;
      let bestTime = 0;
      for (const epId of epIds) {
        const epRaw = localStorage.getItem(`watch_progress_${data.slug}_ep_${epId}`);
        if (epRaw) {
          const parsed = JSON.parse(epRaw);
          if ((parsed.updatedAt || 0) > bestTime) {
            bestTime = parsed.updatedAt || 0;
            bestEpId = epId;
          }
        }
      }
      if (bestEpId) setLastWatchedEpisode(bestEpId);
    } catch {}
  }, [data, searchParams, serverLastWatched]);

  if (!data) return <div className="text-white p-10">Loading...</div>;

  return (
    <main className="min-h-screen bg-slate-950 pb-32 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {activeEpisode ? (
          <InPageVideoPlayer 
            episode={activeEpisode} 
            episodes={data.episodes}
            onEpisodeChange={setActiveEpisode}
            onClose={() => setActiveEpisode(null)}
            animeSlug={data.slug}
            animeTitle={data.title}
            animeType={data.type}
            animePosterImage={data.posterImage}
            user={currentUser}
            anilistId={data.anilistId}
          />
        ) : (
          <Hero 
            anime={data}
            initialBookmarked={initialBookmarked}
            initialBookmarkStatus={initialBookmarkStatus}
            user={currentUser}
            lastWatchedEpisode={lastWatchedEpisode}
            onPlayEpisode={(ep) => setActiveEpisode(ep)}
          />
        )}
        
        <EpisodesGrid 
          episodes={data.episodes} 
          activeEpisodeId={activeEpisode?.id}
          onPlay={(episode) => setActiveEpisode(episode)} 
          animeSlug={data.slug}
          animeId={data.animeId || data.id}
          lastWatchedEpisode={lastWatchedEpisode}
        />
        
        <Recommendations items={recommendations} />
      </div>
    </main>
  );
}
