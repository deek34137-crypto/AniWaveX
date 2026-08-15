import { Play, Info } from "lucide-react";
import Link from "next/link";

interface FeaturedBannerProps {
  anime: any; // We can type this strictly later
}

export default function FeaturedBanner({ anime }: FeaturedBannerProps) {
  if (!anime) return null;

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden rounded-3xl mt-6">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-700 hover:scale-105"
        style={{ backgroundImage: `url('${anime.backgroundImage || anime.posterImage}')` }}
      />
      
      {/* Gradients for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full max-w-4xl p-8 md:p-16 flex flex-col justify-end h-full">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-4 drop-shadow-2xl">
          {anime.title}
        </h1>
        
        <p className="text-slate-300 text-lg md:text-xl line-clamp-3 mb-8 max-w-2xl drop-shadow-md">
          {anime.description}
        </p>

        <div className="flex items-center gap-4">
          <Link 
            href={`/anime/${anime.slug}`}
            className="flex items-center gap-2 px-8 py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            Watch Now
          </Link>
          
          <Link 
            href={`/anime/${anime.slug}`}
            className="flex items-center gap-2 px-8 py-4 bg-slate-500/40 hover:bg-slate-500/60 text-white font-semibold rounded-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <Info className="w-5 h-5" />
            More Info
          </Link>
        </div>
      </div>
    </div>
  );
}
