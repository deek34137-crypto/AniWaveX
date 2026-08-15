import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";

interface AnimeRowProps {
  title: string;
  items: any[];
}

export default function AnimeRow({ title, items }: AnimeRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full mt-12 mb-8">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-6 px-2">
        {title}
      </h2>
      
      {/* Horizontal scroll container */}
      <div className="flex overflow-x-auto gap-4 pb-4 px-2 snap-x snap-mandatory hide-scrollbar">
        {items.map((anime) => (
          <Link 
            href={`/anime/${anime.slug}`} 
            key={anime.id}
            className="snap-start shrink-0 w-[200px] md:w-[240px] group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-900"
          >
            <div className="aspect-[2/3] relative">
              {anime.posterImage ? (
                <Image 
                  src={anime.posterImage} 
                  alt={anime.title} 
                  fill
                  sizes="(max-width: 768px) 200px, 240px"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Top Badge */}
              {anime.status === "Ongoing" && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold tracking-wider rounded-md">
                  NEW EP
                </div>
              )}
              
              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 w-full p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-white font-bold text-sm line-clamp-1 mb-1">
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
    </div>
  );
}
