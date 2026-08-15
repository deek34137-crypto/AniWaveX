"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

const GENRES = ["Action", "Romance", "Comedy", "Fantasy", "Sci-Fi", "Horror", "Sports", "Slice-of-Life", "Isekai", "Drama"];
const SEASONS = ["Winter", "Spring", "Summer", "Fall"];
const FORMATS = ["TV", "Movie", "OVA", "Special"];
const SORTS = [
  { label: "Most Popular", value: "popularity" },
  { label: "Highest Rated", value: "rating" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Recently Updated", value: "updated" }
];

export default function CatalogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Current values
  const currentGenre = searchParams.get("genre") || "";
  const currentYear = searchParams.get("year") || "";
  const currentSeason = searchParams.get("season") || "";
  const currentFormat = searchParams.get("format") || "";
  const currentSort = searchParams.get("sort") || "popularity";

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Reset page to 1 when filters change
    if (key !== "page") {
      params.set("page", "1");
    }

    router.push(`/catalog?${params.toString()}`);
  };

  // Generate year options from 1990 to current year + 1
  const currentYearNum = new Date().getFullYear();
  const years = Array.from({ length: currentYearNum - 1990 + 2 }, (_, i) => (currentYearNum + 1 - i).toString());

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border-y border-white/10 sticky top-16 z-40 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Filter className="w-5 h-5 text-blue-500" />
            Discover
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Genre Filter */}
            <select 
              value={currentGenre} 
              onChange={(e) => handleFilterChange("genre", e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors w-full sm:w-auto"
            >
              <option value="">All Genres</option>
              {GENRES.map(g => <option key={g} value={g.toLowerCase()}>{g}</option>)}
            </select>

            {/* Year Filter */}
            <select 
              value={currentYear} 
              onChange={(e) => handleFilterChange("year", e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors w-full sm:w-auto"
            >
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Season Filter */}
            <select 
              value={currentSeason} 
              onChange={(e) => handleFilterChange("season", e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors w-full sm:w-auto"
            >
              <option value="">All Seasons</option>
              {SEASONS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
            </select>

            {/* Format Filter */}
            <select 
              value={currentFormat} 
              onChange={(e) => handleFilterChange("format", e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors w-full sm:w-auto"
            >
              <option value="">All Formats</option>
              {FORMATS.map(f => <option key={f} value={f.toLowerCase()}>{f}</option>)}
            </select>

            {/* Sort Filter */}
            <select 
              value={currentSort} 
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors w-full sm:w-auto sm:ml-auto col-span-2 sm:col-span-1"
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          
        </div>
      </div>
    </div>
  );
}
