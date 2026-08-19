"use client";

import { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import EpisodesGrid from "@/components/EpisodesGrid";
import Recommendations from "@/components/Recommendations";
import InPageVideoPlayer from "@/components/InPageVideoPlayer";
import { createClient } from "@/lib/supabase/client";

export default function AnimePageClient({ 
  data, 
  recommendations,
  initialBookmarked, 
  initialBookmarkStatus,
  user: initialUser, 
  lastWatchedEpisode 
}: { 
  data: any, 
  recommendations: any[],
  initialBookmarked?: boolean, 
  initialBookmarkStatus?: any,
  user?: any, 
  lastWatchedEpisode?: number | null 
}) {
  const [activeEpisode, setActiveEpisode] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(initialUser);
  const supabase = createClient();

  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    // 1. Fetch active session user on mount
    supabase.auth.getUser().then((res: any) => {
      if (res?.data?.user) setCurrentUser(res.data.user);
    });

    // 2. Real-time auth state subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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
        />
        
        <Recommendations items={recommendations} />
      </div>
    </main>
  );
}
