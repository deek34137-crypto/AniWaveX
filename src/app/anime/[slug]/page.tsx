import { Suspense } from "react";
import { getAnimeData, getRecommendedAnime } from "@/lib/api";
import AnimePageClient from "./AnimePageClient";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await params;
  const data = await getAnimeData(p.slug);
  
  if (!data) return { title: 'Anime Not Found | AniWaveX' };
  
  const title = `${data.title} - Watch on AniWaveX`;
  const description = data.description?.slice(0, 160) || `Watch ${data.title} in high quality on AniWaveX.`;
  const imageUrl = data.posterImage || data.backgroundImage || "https://media.kitsu.io/anime/poster_images/1/large.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 1200, // typical anime poster aspect ratio
        },
      ],
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    }
  };
}

import Navbar from "@/components/Navbar";

export default async function AnimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await params;
  const data = await getAnimeData(p.slug);
  
  if (!data) {
    notFound();
  }

  const recommendations = await getRecommendedAnime(data.slug, data.tags, data.title);

  // Check bookmark and watch history status if user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let initialBookmarked = false;
  let initialBookmarkStatus = null;
  let lastWatchedEpisode = null;

  if (user) {
    const [bookmarkRes, historyRes] = await Promise.all([
      supabase.from('bookmarks').select('id, status').eq('user_id', user.id).eq('anime_slug', data.slug).maybeSingle(),
      supabase.from('watch_history').select('last_episode_watched, progress_seconds').eq('user_id', user.id).eq('anime_slug', data.slug).maybeSingle()
    ]);

    if (bookmarkRes.data) {
      initialBookmarked = true;
      initialBookmarkStatus = bookmarkRes.data.status || 'watching';
    }
    
    if (historyRes.data) {
      lastWatchedEpisode = historyRes.data.last_episode_watched;
    }
  }

  return (
    <>
      <Navbar />
      <Suspense fallback={null}>
        <AnimePageClient 
          data={data} 
          recommendations={recommendations}
          initialBookmarked={initialBookmarked} 
          initialBookmarkStatus={initialBookmarkStatus}
          user={user} 
          lastWatchedEpisode={lastWatchedEpisode} 
        />
      </Suspense>
    </>
  );
}
