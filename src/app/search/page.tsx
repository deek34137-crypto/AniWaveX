import { searchAnime, getTrendingAnime } from "@/lib/api";
import { searchMangaList, getTrendingMangaList } from "@/lib/manga/service";
import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";
import MangaCard from "@/components/manga/MangaCard";
import SearchInput from "./SearchInput";
import Link from "next/link";
import { Sparkles, TrendingUp, Film, BookOpen, Layers } from "lucide-react";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const params = await searchParams;
  const rawQuery = params.q || "";
  const query = rawQuery.trim();
  const searchType = (params.type || "all").toLowerCase(); // 'all' | 'anime' | 'manga'

  // Fetch based on active media tab
  const shouldFetchAnime = searchType === "all" || searchType === "anime";
  const shouldFetchManga = searchType === "all" || searchType === "manga";

  const [animeResults, mangaResults] = await Promise.all([
    shouldFetchAnime
      ? query
        ? searchAnime(query, 18)
        : getTrendingAnime()
      : Promise.resolve([]),
    shouldFetchManga
      ? query
        ? searchMangaList(query, 18)
        : getTrendingMangaList(18)
      : Promise.resolve([]),
  ]);

  const isDefaultView = !query;
  const totalCount = animeResults.length + mangaResults.length;

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* In-page interactive search input */}
        <SearchInput initialQuery={query} />

        {/* Unified Media Type Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-white/10 rounded-xl w-fit">
          <Link
            href={`/search?${new URLSearchParams({ ...(query ? { q: query } : {}), type: "all" }).toString()}`}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              searchType === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            All ({totalCount})
          </Link>

          <Link
            href={`/search?${new URLSearchParams({ ...(query ? { q: query } : {}), type: "anime" }).toString()}`}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              searchType === "anime"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Anime ({animeResults.length})
          </Link>

          <Link
            href={`/search?${new URLSearchParams({ ...(query ? { q: query } : {}), type: "manga" }).toString()}`}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              searchType === "manga"
                ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Manga ({mangaResults.length})
          </Link>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDefaultView ? (
              <>
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Trending &amp; Popular {searchType === "manga" ? "Manga" : searchType === "anime" ? "Anime" : "Titles"}
                </h1>
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
          {totalCount > 0 && (
            <span className="text-xs sm:text-sm text-slate-400 font-medium">
              {totalCount} results
            </span>
          )}
        </div>

        {/* Empty State */}
        {totalCount === 0 && (
          <div className="w-full text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg sm:text-xl text-slate-200 font-semibold mb-2">No results found</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
              We couldn&apos;t find any {searchType === "all" ? "anime or manga" : searchType} matching &ldquo;{query}&rdquo;.
            </p>
          </div>
        )}

        {/* Anime Results Section */}
        {animeResults.length > 0 && (
          <div className="space-y-3">
            {searchType === "all" && (
              <h2 className="text-base font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="w-4 h-4" /> Anime Series ({animeResults.length})
              </h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {animeResults.map((anime: any) => (
                <AnimeCard
                  key={`anime-${anime.id}`}
                  anime={anime}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                />
              ))}
            </div>
          </div>
        )}

        {/* Manga Results Section */}
        {mangaResults.length > 0 && (
          <div className="space-y-3 pt-4">
            {searchType === "all" && (
              <h2 className="text-base font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Manga &amp; Comics ({mangaResults.length})
              </h2>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
              {mangaResults.map((manga) => (
                <MangaCard key={`manga-${manga.id}`} manga={manga} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
