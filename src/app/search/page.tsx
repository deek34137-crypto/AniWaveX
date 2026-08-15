import { searchAnime } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";

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
              <Link 
                href={`/anime/${anime.slug}`} 
                key={anime.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105"
              >
                <div className="aspect-[2/3] relative">
                  {anime.posterImage ? (
                    <Image 
                      src={anime.posterImage} 
                      alt={anime.title} 
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                      className="object-cover"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-white font-bold text-sm line-clamp-2 mb-1">
                      {anime.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                      <span>{anime.year}</span>
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Star className="w-3 h-3 fill-current" />
                        {anime.rating}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
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
