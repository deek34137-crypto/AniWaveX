"use client";

import { LayoutGrid, List, Play, Search, X } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

interface Episode {
  id: number;
  title: string;
  streams?: any;
}

interface EpisodesGridProps {
  episodes: Episode[];
  activeEpisodeId?: number | null;
  onPlay?: (episode: Episode) => void;
}

const CHUNK_SIZE = 25;

export default function EpisodesGrid({ episodes, activeEpisodeId, onPlay }: EpisodesGridProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);

  // Generate range chunks if > 25 episodes (e.g. 1-25, 26-50, 51-75)
  const rangeChunks = useMemo(() => {
    if (!episodes || episodes.length <= CHUNK_SIZE) return [];
    const chunks: { label: string; start: number; end: number }[] = [];
    for (let i = 0; i < episodes.length; i += CHUNK_SIZE) {
      const start = i + 1;
      const end = Math.min(i + CHUNK_SIZE, episodes.length);
      chunks.push({ label: `${start} - ${end}`, start, end });
    }
    return chunks;
  }, [episodes]);

  // If active episode changes and is outside current range, select its range
  useEffect(() => {
    if (activeEpisodeId && rangeChunks.length > 0) {
      const chunkIdx = Math.floor((activeEpisodeId - 1) / CHUNK_SIZE);
      if (chunkIdx >= 0 && chunkIdx < rangeChunks.length) {
        setSelectedRangeIndex(chunkIdx);
      }
    }
  }, [activeEpisodeId, rangeChunks.length]);

  // Filtered episodes based on search query or selected range chunk
  const displayedEpisodes = useMemo(() => {
    if (!episodes) return [];
    
    // 1. If searching, search across all episodes
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return episodes.filter((ep) => 
        ep.id.toString() === q ||
        `ep ${ep.id}`.includes(q) ||
        `episode ${ep.id}`.includes(q) ||
        ep.title.toLowerCase().includes(q)
      );
    }

    // 2. If range chunks exist, show selected chunk
    if (rangeChunks.length > 0) {
      const chunk = rangeChunks[selectedRangeIndex];
      if (chunk) {
        return episodes.slice(chunk.start - 1, chunk.end);
      }
    }

    return episodes;
  }, [episodes, searchQuery, rangeChunks, selectedRangeIndex]);

  return (
    <div className="w-full mt-16 px-2">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-white tracking-tight">Episodes</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-white/10 text-slate-300 rounded-full">
            {episodes.length} Total
          </span>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Episode Quick Search / Jump */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search or Jump to Ep #"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10 shrink-0">
            <button 
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white"}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Episode Range Selector (Feature 3.4) */}
      {!searchQuery && rangeChunks.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin scrollbar-thumb-slate-800">
          <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">Range:</span>
          {rangeChunks.map((chunk, idx) => (
            <button
              key={chunk.label}
              onClick={() => setSelectedRangeIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                selectedRangeIndex === idx
                  ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                  : "bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-white border border-white/5"
              }`}
            >
              {chunk.label}
            </button>
          ))}
        </div>
      )}

      {/* Search Filter Count */}
      {searchQuery && (
        <div className="text-xs text-slate-400 mb-4">
          Found <span className="text-white font-bold">{displayedEpisodes.length}</span> episodes matching "{searchQuery}"
        </div>
      )}

      {/* Episodes Container */}
      {displayedEpisodes.length === 0 ? (
        <div className="w-full text-center py-16 bg-slate-900/30 border border-slate-800 rounded-2xl text-slate-400">
          <p className="text-sm font-semibold">No episodes found matching "{searchQuery}"</p>
          <button 
            onClick={() => setSearchQuery("")}
            className="mt-3 text-xs text-blue-400 hover:underline"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
          {displayedEpisodes.map((episode) => {
            const isActive = episode.id === activeEpisodeId;
            return (
              <div 
                key={episode.id}
                onClick={() => onPlay?.(episode)}
                className={`group relative flex items-start p-5 glass transition-all duration-300 rounded-2xl cursor-pointer overflow-hidden border ${
                  isActive 
                    ? 'border-blue-500/80 bg-blue-600/10 shadow-[0_0_25px_rgba(37,99,235,0.25)] ring-1 ring-blue-500/50' 
                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.08]'
                } ${viewMode === "grid" ? "gap-4" : "gap-6 items-center"}`}
              >
                {/* Gradient glow */}
                <div className={`absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                
                <div className={`flex-1 min-w-0 ${viewMode === "list" ? "flex items-center gap-4" : ""}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-blue-400 font-extrabold' : 'text-blue-400'}`}>
                      EP {episode.id}
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 bg-blue-600 text-white rounded-full animate-pulse">
                        PLAYING
                      </span>
                    )}
                  </div>
                  <h3 className={`text-sm font-medium leading-snug transition-colors ${isActive ? 'text-white font-semibold' : 'text-slate-200 group-hover:text-white'} ${viewMode === "grid" ? "line-clamp-2" : "truncate"}`}>
                    {episode.title}
                  </h3>
                </div>
                
                <button className={`flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-300 z-10 ${
                  isActive 
                    ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.6)] scale-105' 
                    : 'bg-white/5 border-white/10 text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 group-hover:scale-110'
                }`}>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
