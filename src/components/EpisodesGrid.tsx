import { LayoutGrid, List, Play, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Episode {
  id: number;
  title: string;
  streams?: any;
}

interface EpisodesGridProps {
  episodes: Episode[];
  onPlay?: (episode: Episode) => void;
}

export default function EpisodesGrid({ episodes, onPlay }: EpisodesGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(24);

  const visibleEpisodes = episodes.slice(0, visibleCount);
  const hasMore = visibleCount < episodes.length;

  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + 24, episodes.length));
  };

  return (
    <div className="w-full mt-16 px-2">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-bold text-white tracking-tight">Episodes</h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Episodes Container */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
        {visibleEpisodes.map((episode) => (
          <div 
            key={episode.id}
            onClick={() => onPlay?.(episode)}
            className={`group relative flex items-start p-5 glass hover:bg-white/[0.08] transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden ${viewMode === "grid" ? "gap-4" : "gap-6 items-center"}`}
          >
            {/* Subtle gradient glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className={`flex-1 min-w-0 ${viewMode === "list" ? "flex items-center gap-4" : ""}`}>
              <p className={`text-xs font-bold text-blue-400 uppercase tracking-wider ${viewMode === "grid" ? "mb-1.5" : "w-16 shrink-0"}`}>
                EP {episode.id}
              </p>
              <h3 className={`text-sm font-medium text-slate-200 leading-snug group-hover:text-white transition-colors ${viewMode === "grid" ? "line-clamp-2" : "truncate"}`}>
                {episode.title}
              </h3>
            </div>
            
            <button className="flex-shrink-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-300 z-10">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={handleShowMore}
            className="group flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-300 hover:text-white font-medium transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            Show More Episodes ({episodes.length - visibleCount} remaining)
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}
