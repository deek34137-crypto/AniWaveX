import { searchAnime } from "@/lib/api";
import Navbar from "@/components/Navbar";
import AnimeCard from "@/components/AnimeCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";
  const results = query ? await searchAnime(query, 20) : [];

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-24"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h1 className="text-3xl font-bold text-white mb-8">
          {query ? `Search Results for "${query}"` : "Search Anime"}
        </h1>

        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {results.map((anime: any) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              />
            ))}
          </div>
        ) : (
          <div className="w-full text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl">
            <h2 className="text-xl text-slate-300 font-semibold mb-2">No results found</h2>
            <p className="text-slate-500">We couldn't find any anime matching "{query}". Try a different term.</p>
          </div>
        )}
      </div>
    </main>
  );
}
