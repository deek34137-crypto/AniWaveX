import AnimeCard from "@/components/AnimeCard";
import { ChevronRight } from "lucide-react";

interface RecommendationsProps {
  items: any[];
}

export default function Recommendations({ items }: RecommendationsProps) {
  if (!items || items.length === 0) return null;

  const nextInSeries = items[0]?.isNextInSeries ? items[0] : null;
  const genreItems = nextInSeries ? items.slice(1) : items;

  return (
    <div className="w-full mt-24 mb-16 px-2 space-y-10">

      {/* ── Next in Series ── */}
      {nextInSeries && (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <ChevronRight className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Next in Series</h2>
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-md border border-blue-500/30 uppercase tracking-wider">
              {nextInSeries.relationType === "SEQUEL" ? "Sequel" : "Related"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            <div className="relative">
              {/* Glow border to highlight sequel */}
              <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 opacity-70 blur-sm pointer-events-none z-0" />
              <div className="relative z-10">
                <AnimeCard
                  anime={nextInSeries}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── You Might Also Like ── */}
      {genreItems.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-8">You Might Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
            {genreItems.map((item) => (
              <AnimeCard
                key={item.id}
                anime={item}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
