"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import EpisodesGrid from "@/components/EpisodesGrid";
import Recommendations from "@/components/Recommendations";
import InPageVideoPlayer from "@/components/InPageVideoPlayer";

export default function AnimePageClient({ 
  data, 
  recommendations,
  initialBookmarked, 
  initialBookmarkStatus,
  user, 
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
            user={user}
            anilistId={data.anilistId}
          />
        ) : (
          <Hero 
            anime={data}
            initialBookmarked={initialBookmarked}
            initialBookmarkStatus={initialBookmarkStatus}
            user={user}
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
