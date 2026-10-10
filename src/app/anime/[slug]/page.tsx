import { Suspense } from "react";
import { getAnimeData, getRecommendedAnime, GENRE_MAP } from "@/lib/api";
import { getMangaAdaptation } from "@/lib/manga/service";
import AnimePageClient from "./AnimePageClient";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { generateAnimeMetadata } from "@/lib/seo/metadata";
import { JsonLd, createAnimeSeriesSchema, createBreadcrumbSchema } from "@/lib/seo/jsonld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await params;
  const data = await getAnimeData(p.slug);

  if (!data) {
    return {
      title: "Anime Not Found | AniWaveX",
      robots: { index: false, follow: true },
    };
  }

  return generateAnimeMetadata(data);
}

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

  // Parallelize recommendations, auth retrieval, and manga adaptation resolution
  const [recommendations, supabase, mangaAdaptation] = await Promise.all([
    getRecommendedAnime(data.slug, data.tags, data.title),
    createClient(),
    getMangaAdaptation(data.title, data.anilistId).catch(() => null),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let initialBookmarked = false;
  let initialBookmarkStatus = null;
  let lastWatchedEpisode = null;
  let serverProgressSeconds = null;
  let serverTotalSeconds = null;

  if (user) {
    const [bookmarkRes, historyRes] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("anime_slug", data.slug)
        .maybeSingle(),
      supabase
        .from("watch_history")
        .select("last_episode_watched, progress_seconds, total_seconds")
        .eq("user_id", user.id)
        .eq("anime_slug", data.slug)
        .maybeSingle(),
    ]);

    if (bookmarkRes.data) {
      initialBookmarked = true;
      initialBookmarkStatus = bookmarkRes.data.status || "watching";
    }

    if (historyRes.data) {
      lastWatchedEpisode = historyRes.data.last_episode_watched;
      serverProgressSeconds = historyRes.data.progress_seconds;
      serverTotalSeconds = historyRes.data.total_seconds;
    }
  }

  // Determine primary genre for breadcrumbs
  const primaryGenre = (data.tags || []).find(
    (t: string) => GENRE_MAP[t.toLowerCase()]
  );
  const primaryGenreSlug = primaryGenre ? primaryGenre.toLowerCase() : null;

  const breadcrumbItems = [
    { name: "Anime", path: "/anime" },
    ...(primaryGenreSlug
      ? [{ name: `${primaryGenre} Anime`, path: `/genre/${primaryGenreSlug}` }]
      : []),
    { name: data.title, path: `/anime/${data.slug}` },
  ];

  return (
    <>
      <JsonLd schema={createAnimeSeriesSchema(data)} />
      <JsonLd schema={createBreadcrumbSchema(breadcrumbItems)} />
      <Navbar />
      <div className="page-top-spacer" />
      <Suspense fallback={null}>
        <AnimePageClient
          data={data}
          recommendations={recommendations}
          initialBookmarked={initialBookmarked}
          initialBookmarkStatus={initialBookmarkStatus}
          user={user}
          lastWatchedEpisode={lastWatchedEpisode}
          serverProgressSeconds={serverProgressSeconds}
          serverTotalSeconds={serverTotalSeconds}
          mangaAdaptation={mangaAdaptation}
        />
      </Suspense>
    </>
  );
}
