import Link from "next/link";
import Image from "next/image";
import { Star, BookOpen } from "lucide-react";
import { MangaItem } from "@/lib/manga/types";

export default function MangaCard({ manga }: { manga: MangaItem }) {
  return (
    <Link
      href={`/manga/${manga.id}`}
      prefetch={true}
      className="group relative flex flex-col rounded-2xl overflow-hidden bg-slate-900/70 border border-white/10 hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/20 hover:scale-[1.03] focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:border-cyan-400 focus-visible:scale-[1.04] focus-visible:z-20 focus-visible:outline-none transition-all duration-300"
      aria-label={`Read ${manga.title}`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-800">
        {manga.posterImage ? (
          <Image
            src={manga.posterImage}
            alt={manga.title}
            fill
            className="object-cover group-hover:scale-105 group-focus-visible:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 20vw, 12vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500">
            <BookOpen className="w-8 h-8" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-85" />

        {/* Rating badge */}
        {manga.rating !== "N/A" && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-300 text-xs font-bold flex items-center gap-1 border border-white/10 shadow-sm">
            <Star className="w-3 h-3 fill-current" />
            {manga.rating}
          </div>
        )}

        {/* Type / Format badge */}
        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-md bg-cyan-500/90 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
          {manga.type}
        </div>
      </div>

      <div className="p-3.5 flex flex-col flex-1 justify-between bg-gradient-to-t from-slate-950/90 to-transparent">
        <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug group-hover:text-cyan-400 group-focus-visible:text-cyan-400 transition-colors drop-shadow-sm">
          {manga.title}
        </h3>

        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/5 text-xs text-slate-400">
          <span className="font-medium">{manga.status}</span>
          {manga.totalChapters ? (
            <span className="font-semibold text-cyan-400/90">{manga.totalChapters} ch</span>
          ) : (
            <span className="text-slate-500">Active</span>
          )}
        </div>
      </div>
    </Link>
  );
}
