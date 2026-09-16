"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Dices, Clock, Trash2 } from "lucide-react";
import {
  getSearchHistory,
  saveSearchQuery,
  removeSearchItem,
  clearSearchHistory,
} from "@/lib/search-history";

const POPULAR_TAGS = [
  "Solo Leveling",
  "One Piece",
  "Jujutsu Kaisen",
  "Demon Slayer",
  "Naruto",
  "Bleach",
  "Attack on Titan",
  "Isekai",
];

const RANDOM_SEEDS = [
  "hero", "dragon", "titan", "hunter", "demon", "sword",
  "fate", "jujutsu", "star", "night", "soul", "shin",
  "zero", "punch", "piece", "bleach", "clover", "alchemist",
  "space", "magic", "moon", "shadow", "cyber", "gate"
];

export default function SearchInput({ initialQuery = "" }: { initialQuery?: string }) {
  const [term, setTerm] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>([]);
  const [isSurprising, setIsSurprising] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setHistory(getSearchHistory());

    const handleUpdate = () => {
      setHistory(getSearchHistory());
    };

    window.addEventListener("search-history-updated", handleUpdate);
    return () => {
      window.removeEventListener("search-history-updated", handleUpdate);
    };
  }, []);

  const handleSearch = (q: string) => {
    const trimmed = q.trim();
    if (trimmed) {
      saveSearchQuery(trimmed);
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/search");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(term);
  };

  const handleClear = () => {
    setTerm("");
    router.push("/search");
  };

  const handleTagClick = (tag: string) => {
    setTerm(tag);
    handleSearch(tag);
  };

  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    removeSearchItem(item);
  };

  const handleClearHistory = () => {
    clearSearchHistory();
  };

  const handleSurpriseMe = async () => {
    if (isSurprising) return;
    setIsSurprising(true);
    try {
      const randomSeed = RANDOM_SEEDS[Math.floor(Math.random() * RANDOM_SEEDS.length)];
      const res = await fetch(`/api/search?q=${encodeURIComponent(randomSeed)}&limit=20`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const randomPick = data[Math.floor(Math.random() * data.length)];
        router.push(`/anime/${randomPick.slug}`);
      } else {
        router.push("/catalog");
      }
    } catch {
      router.push("/catalog");
    } finally {
      setIsSurprising(false);
    }
  };

  return (
    <div className="w-full mb-8">
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl mx-auto mb-4">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by anime title, character, or genre..."
          className="w-full pl-12 pr-12 py-3.5 bg-slate-900/90 border border-slate-700/60 rounded-2xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base shadow-lg transition-all"
        />
        {term ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSurpriseMe}
            disabled={isSurprising}
            title="Surprise Me — pick a random anime"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-purple-400 rounded-full hover:bg-purple-500/10 transition-colors"
          >
            <Dices className={`w-4 h-4 ${isSurprising ? "animate-spin" : ""}`} />
          </button>
        )}
      </form>

      {/* Recent Searches Section */}
      {history.length > 0 && (
        <div className="max-w-2xl mx-auto mb-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Recent Searches</span>
            </div>
            <button
              type="button"
              onClick={handleClearHistory}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 transition-colors font-medium px-2 py-0.5 rounded-lg hover:bg-red-500/10"
              title="Clear all search history"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear history</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
            {history.map((item) => (
              <div
                key={item}
                onClick={() => {
                  setTerm(item);
                  handleSearch(item);
                }}
                className="group flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium cursor-pointer transition-all shrink-0 active:scale-95"
              >
                <Clock className="w-3 h-3 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0" />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">{item}</span>
                <button
                  type="button"
                  onClick={(e) => handleRemoveHistory(e, item)}
                  className="text-slate-500 hover:text-red-400 p-0.5 rounded hover:bg-white/10 transition-colors ml-0.5"
                  title={`Remove "${item}" from history`}
                  aria-label={`Remove "${item}" from history`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popular tags + Surprise Me button row */}
      <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 max-w-2xl mx-auto">
        <span className="text-xs text-slate-400 font-medium shrink-0">Popular:</span>
        {POPULAR_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => handleTagClick(tag)}
            className="px-3 py-1 bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0"
          >
            {tag}
          </button>
        ))}

        {/* Surprise Me pill — always visible at the end */}
        <button
          type="button"
          onClick={handleSurpriseMe}
          disabled={isSurprising}
          className="flex items-center gap-1.5 px-3 py-1 bg-purple-900/40 border border-purple-500/40 hover:bg-purple-800/60 hover:border-purple-400/60 text-purple-300 hover:text-purple-200 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 active:scale-95"
        >
          <Dices className={`w-3.5 h-3.5 ${isSurprising ? "animate-spin" : ""}`} />
          {isSurprising ? "Finding..." : "Surprise Me"}
        </button>
      </div>
    </div>
  );
}

