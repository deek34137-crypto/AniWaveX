import AnimeCard from "@/components/AnimeCard";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface AnimeRowProps {
  title: string;
  items: any[];
  viewAllHref?: string;
}

export default function AnimeRow({ title, items, viewAllHref }: AnimeRowProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="w-full mt-10 mb-6">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
      
      {/* Horizontal scroll container */}
      <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 px-2 snap-x snap-mandatory hide-scrollbar">
        {items.map((anime) => (
          <div key={anime.id} className="snap-start shrink-0 w-[140px] sm:w-[180px] md:w-[220px]">
            <AnimeCard
              anime={anime}
              sizes="(max-width: 640px) 140px, (max-width: 768px) 180px, 220px"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
