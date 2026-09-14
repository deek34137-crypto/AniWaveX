"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

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

export default function SearchInput({ initialQuery = "" }: { initialQuery?: string }) {
  const [term, setTerm] = useState(initialQuery);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSearch = (q: string) => {
    const trimmed = q.trim();
    if (trimmed) {
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
        {term && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Quick Search Tags */}
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
      </div>
    </div>
  );
}
