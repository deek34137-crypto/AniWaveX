import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogAnime, GENRE_MAP } from "@/lib/api";
import { generateGenreMetadata } from "@/lib/seo/metadata";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { Compass, Sparkles, Flame } from "lucide-react";
import type { Metadata } from "next";

const GENRE_DESCRIPTIONS: Record<string, string> = {
  action: "Action anime features adrenaline-pumping battles, martial arts duels, supernatural conflicts, and heroic journeys.",
  romance: "Romance anime focuses on heartfelt emotional journeys, blossoming relationships, school crushes, and dramatic love stories.",
  comedy: "Comedy anime brings laughter with hilarious parody, absurd gags, slice-of-life misunderstandings, and witty banter.",
  fantasy: "Fantasy anime transports viewers to magical realms filled with swordcraft, mythical beasts, legendary quests, and mystical powers.",
  "sci-fi": "Sci-Fi anime explores futuristic cyberpunk worlds, space operas, time travel, advanced artificial intelligence, and dystopian societies.",
  horror: "Horror anime delivers psychological dread, haunting suspense, paranormal mysteries, and spine-chilling encounters.",
  sports: "Sports anime showcases intense tournament rivalries, team camaraderie, athletic discipline, and underdog triumphs.",
  "slice-of-life": "Slice of Life anime captures the beauty of daily life, touching friendships, school memories, and heartwarming moments.",
  isekai: "Isekai anime follows protagonists transported, reincarnated, or summoned into fantastical new worlds with unique cheat abilities.",
  drama: "Drama anime presents deeply moving stories exploring human struggles, complex interpersonal relationships, and impactful life lessons.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lowerSlug = slug.toLowerCase();
  if (!GENRE_MAP[lowerSlug]) {
    return { title: "Genre Not Found | AniWaveX" };
  }
  return generateGenreMetadata(lowerSlug);
}

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const sParams = searchParams ? await searchParams : {};
  const lowerSlug = slug.toLowerCase();

  if (!GENRE_MAP[lowerSlug]) {
    notFound();
  }

  const page = sParams.page ? Math.max(1, parseInt(sParams.page, 10) || 1) : 1;
  const { data, meta } = await getCatalogAnime({
    genre: lowerSlug,
    page,
    sort: "popularity",
  });

  const totalCount = meta.count || 0;
  const totalPages = Math.ceil(totalCount / 20);
  const formattedGenre = lowerSlug.charAt(0).toUpperCase() + lowerSlug.slice(1);
  const genreDesc = GENRE_DESCRIPTIONS[lowerSlug] || `Explore top rated and trending ${formattedGenre} anime titles on AniWaveX.`;

  const otherGenres = Object.keys(GENRE_MAP).filter((g) => g !== lowerSlug);

  const itemList = data.map((item: any) => ({
    name: item.title,
    path: `/anime/${item.slug}`,
    image: item.posterImage || item.backgroundImage,
  }));

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <JsonLd schema={createItemListSchema(`Top ${formattedGenre} Anime`, itemList)} />
      <Navbar />
      <div className="page-top-spacer" />

      <div className="tv-safe-container pt-4 space-y-8">
        <Breadcrumbs
          items={[
            { name: "Anime", path: "/anime" },
            { name: `${formattedGenre} Anime`, path: `/genre/${lowerSlug}` },
          ]}
        />

        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-white/10 p-6 sm:p-10 shadow-2xl">
          <div className="max-w-3xl space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Anime Genre Hub
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight">
              Best {formattedGenre} Anime Series &amp; Movies
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {genreDesc} Browse {totalCount.toLocaleString()} curated titles ranked by community popularity and scores.
            </p>
          </div>
        </div>

        {/* Anime Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              {formattedGenre} Anime Titles {page > 1 ? `(Page ${page})` : ""}
            </h2>
            <span className="text-xs sm:text-sm text-slate-400 font-medium">
              {totalCount.toLocaleString()} total series
            </span>
          </div>

          {data.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-slate-400">
              No anime found for this genre page.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {data.map((item: any) => (
                <AnimeCard key={item.id} anime={item} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                searchParams={sParams}
              />
            </div>
          )}
        </div>

        {/* Internal Cross-Linking: Related Genres */}
        <div className="pt-8 border-t border-white/10 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Explore Other Anime Genres
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherGenres.map((g) => (
              <Link
                key={g}
                href={`/genre/${g}`}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/40 text-xs font-semibold text-slate-300 hover:text-white capitalize transition-all"
              >
                {g} Anime
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
