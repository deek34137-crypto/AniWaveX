import { Star, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface RecommendationsProps {
  items: any[];
}

export default function Recommendations({ items }: RecommendationsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full mt-24 mb-16 px-2">
      <h2 className="text-2xl font-bold text-white tracking-tight mb-8">You Might Also Like</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {items.map((item) => {
          const imageUrl = item.posterImage || item.backgroundImage;
          return (
            <Link href={`/anime/${item.slug}`} key={item.id} className="group relative cursor-pointer block">
              
              {/* Poster Card */}
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-slate-900 shadow-lg">
                {imageUrl ? (
                  <Image 
                    src={imageUrl} 
                    alt={item.title} 
                    fill
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : null}
                
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Top Badges */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-blue-600 rounded">
                  {item.status === 'Ongoing' ? 'AIRING' : 'COMPLETED'}
                </span>
              </div>

              {/* Play Button Overlay (Visible on Hover) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="w-12 h-12 rounded-full bg-blue-600/90 backdrop-blur-sm flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <h3 className="text-sm font-semibold text-white leading-snug line-clamp-1 mb-1">
                  {item.title}
                </h3>
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span>{item.year}</span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-3 h-3 fill-current" />
                    {item.rating}
                  </span>
                </div>
              </div>

              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
