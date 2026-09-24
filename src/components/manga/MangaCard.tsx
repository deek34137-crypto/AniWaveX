import Link from "next/link";
import Image from "next/image";
import { Star, BookOpen } from "lucide-react";
import { MangaItem } from "@/lib/manga/types";

export default function MangaCard({ manga }: { manga: MangaItem }) {
  return (
    <Link
      href={`/manga/${manga.id}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-800">
        {manga.posterImage ? (
          <Image
            src={manga.posterImage}
            alt={manga.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <BookOpen className="w-8 h-8" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />

        {/* Rating badge */}
        {manga.rating !== "N/A" && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-amber-300 text-xs font-bold flex items-center gap-1 border border-white/10">
            <Star className="w-3 h-3 fill-current" />
            {manga.rating}
          </div>
        )}

        {/* Type / Format badge */}
        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-cyan-500/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider">
          {manga.type}
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1 justify-between">
        <h3 className="font-bold text-sm text-white line-clamp-2 group-hover:text-cyan-400 transition-colors">
          {manga.title}
        </h3>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs text-slate-400">
          <span>{manga.status}</span>
          {manga.totalChapters ? <span>{manga.totalChapters} ch</span> : <span>Active</span>}
        </div>
      </div>
    </Link>
  );
}
