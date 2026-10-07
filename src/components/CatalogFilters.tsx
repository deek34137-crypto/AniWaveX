"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Loader2, RotateCcw, ChevronDown, Check, X, SlidersHorizontal } from "lucide-react";
import { useState, useRef, useEffect, useTransition } from "react";

const GENRES = ["Action", "Romance", "Comedy", "Fantasy", "Sci-Fi", "Horror", "Sports", "Slice-of-Life", "Isekai", "Drama"];
const SEASONS = ["Winter", "Spring", "Summer", "Fall"];
const FORMATS = [
  { label: "TV Series", value: "tv" },
  { label: "Movie", value: "movie" },
  { label: "OVA", value: "ova" },
  { label: "Special", value: "special" },
];
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
  const [isPending, startTransition] = useTransition();

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Current values
  const currentGenre = searchParams.get("genre") || "";
  const currentYear = searchParams.get("year") || "";
  const currentSeason = searchParams.get("season") || "";
  const currentFormat = searchParams.get("format") || "";
  const rawSort = searchParams.get("sort") || "popularity";
  const currentSort = rawSort === "rated" ? "rating" : rawSort === "trending" ? "popularity" : rawSort;

  const hasActiveFilters = Boolean(
    currentGenre || 
    currentYear || 
    currentSeason || 
    currentFormat || 
    (currentSort && currentSort !== 'popularity')
  );

  const handleFilterChange = (key: string, value: string) => {
    setOpenDropdown(null);
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

    startTransition(() => {
      router.push(`/catalog?${params.toString()}`);
    });
  };

  const handleResetFilters = () => {
    setOpenDropdown(null);
    startTransition(() => {
      router.push('/catalog');
    });
  };

  // Generate year options from 1990 to current year + 1
  const currentYearNum = new Date().getFullYear();
  const years = Array.from({ length: currentYearNum - 1990 + 2 }, (_, i) => (currentYearNum + 1 - i).toString());

  const currentSortLabel = SORTS.find(s => s.value === currentSort)?.label || "Most Popular";
  const currentFormatLabel = FORMATS.find(f => f.value === currentFormat.toLowerCase())?.label || "Format";
  const currentSeasonLabel = SEASONS.find(s => s.toLowerCase() === currentSeason.toLowerCase()) || "Season";

  return (
    <div
      ref={containerRef}
      className="bg-slate-900/75 backdrop-blur-2xl border-y border-white/10 sticky z-40 shadow-xl transition-all"
      style={{ top: "var(--navbar-total, 3.5rem)" }}
    >
      <div className="max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 py-3 space-y-3">
        {/* Top Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          {/* Left: Section Header & Reset */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 text-white font-bold text-base sm:text-lg">
              {isPending ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 animate-spin" />
              ) : (
                <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              )}
              <span>Discover</span>
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg transition-colors border border-white/10 active:scale-95"
                title="Reset all filters to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: Custom Dropdowns (Year, Season, Format, Sort) */}
          <div className={`flex flex-wrap items-center gap-2 w-full md:w-auto transition-opacity ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
            
            {/* Format Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "format" ? null : "format")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  currentFormat 
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30" 
                    : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-white/10"
                }`}
              >
                <span>{currentFormat ? currentFormatLabel : "All Formats"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === "format" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "format" && (
                <div className="absolute top-full mt-1.5 left-0 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => handleFilterChange("format", "")}
                    className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${!currentFormat ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'}`}
                  >
                    <span>All Formats</span>
                    {!currentFormat && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                  {FORMATS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => handleFilterChange("format", f.value)}
                      className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${currentFormat === f.value ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'}`}
                    >
                      <span>{f.label}</span>
                      {currentFormat === f.value && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Season Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "season" ? null : "season")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  currentSeason 
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30" 
                    : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-white/10"
                }`}
              >
                <span>{currentSeason ? currentSeasonLabel : "All Seasons"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === "season" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "season" && (
                <div className="absolute top-full mt-1.5 left-0 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => handleFilterChange("season", "")}
                    className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${!currentSeason ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'}`}
                  >
                    <span>All Seasons</span>
                    {!currentSeason && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                  {SEASONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleFilterChange("season", s.toLowerCase())}
                      className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${currentSeason.toLowerCase() === s.toLowerCase() ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'}`}
                    >
                      <span>{s}</span>
                      {currentSeason.toLowerCase() === s.toLowerCase() && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Year Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "year" ? null : "year")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  currentYear 
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30" 
                    : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-white/10"
                }`}
              >
                <span>{currentYear ? currentYear : "All Years"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === "year" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "year" && (
                <div className="absolute top-full mt-1.5 left-0 w-36 max-h-56 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 scrollbar-thin">
                  <button
                    onClick={() => handleFilterChange("year", "")}
                    className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${!currentYear ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'}`}
                  >
                    <span>All Years</span>
                    {!currentYear && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => handleFilterChange("year", y)}
                      className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${currentYear === y ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'}`}
                    >
                      <span>{y}</span>
                      {currentYear === y && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative ml-auto md:ml-0">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === "sort" ? null : "sort")}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-white border border-white/10 transition-all shadow-sm"
              >
                <span className="text-slate-400">Sort:</span>
                <span>{currentSortLabel}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openDropdown === "sort" ? "rotate-180" : ""}`} />
              </button>
              {openDropdown === "sort" && (
                <div className="absolute top-full mt-1.5 right-0 w-44 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
                  {SORTS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => handleFilterChange("sort", s.value)}
                      className={`w-full px-3 py-1.5 text-xs text-left font-medium flex items-center justify-between hover:bg-slate-800 transition-colors ${currentSort === s.value ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'}`}
                    >
                      <span>{s.label}</span>
                      {currentSort === s.value && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Horizontal Genre Filter Chips Rail */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => handleFilterChange("genre", "")}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 ${
              !currentGenre
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                : "bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-white/10"
            }`}
          >
            All Genres
          </button>
          {GENRES.map((g) => {
            const isSelected = currentGenre.toLowerCase() === g.toLowerCase();
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleFilterChange("genre", isSelected ? "" : g.toLowerCase())}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                    : "bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-white/10"
                }`}
              >
                <span>{g}</span>
                {isSelected && <X className="w-3 h-3 text-white/80 hover:text-white" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
