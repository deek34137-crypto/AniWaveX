import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";

export default function CatalogGrid({ animeList }: { animeList: any[] }) {
  if (!animeList || animeList.length === 0) {
    return (
      <div className="w-full text-center py-32 bg-slate-900/30 border border-slate-800 rounded-2xl">
        <h2 className="text-2xl text-slate-300 font-semibold mb-2">No anime found</h2>
        <p className="text-slate-500">Try adjusting your filters to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {animeList.map((anime) => (
        <Link 
          href={`/anime/${anime.slug}`} 
          key={anime.id}
          className="group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105 shadow-lg"
        >
          <div className="aspect-[2/3] relative">
            {anime.posterImage ? (
              <Image 
                src={anime.posterImage} 
                alt={anime.title} 
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                className="object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
            
            {/* Play Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-14 h-14 bg-blue-600/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
            
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
              <span className="text-xs font-bold text-white">{anime.rating}</span>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4">
              <h3 className="text-white font-bold text-sm truncate" title={anime.title}>
                {anime.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-blue-400 text-xs font-semibold">{anime.year}</span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-slate-300 text-xs">{anime.status}</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
