import { searchAnime, getTrendingAnime } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import SearchInput from "./SearchInput";
import Link from "next/link";
import { Sparkles, TrendingUp } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const rawQuery = params.q || "";
  const query = rawQuery.trim();

  // If query is present, search anime; otherwise fetch trending anime by default
  const [searchResults, defaultTrending] = await Promise.all([
    query ? searchAnime(query, 24) : Promise.resolve([]),
    !query ? getTrendingAnime() : Promise.resolve([]),
  ]);

  const results = query ? searchResults : defaultTrending;
  const isDefaultView = !query;

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-16 sm:h-20"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {/* In-page interactive search input */}
        <SearchInput initialQuery={query} />

        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isDefaultView ? (
              <>
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h1 className="text-xl sm:text-2xl font-bold text-white">Trending &amp; Popular Anime</h1>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Results for &ldquo;{query}&rdquo;
                </h1>
              </>
            )}
          </div>
          {results.length > 0 && (
            <span className="text-xs sm:text-sm text-slate-400 font-medium">
              {results.length} titles
            </span>
          )}
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {results.map((anime: any) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              />
            ))}
          </div>
        ) : (
          <div className="w-full text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg sm:text-xl text-slate-200 font-semibold mb-2">
              No results found
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              We couldn&apos;t find any anime matching &ldquo;{query}&rdquo;. Try another title, character name, or browse trending shows.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Browse Trending Anime
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
