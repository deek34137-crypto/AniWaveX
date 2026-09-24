"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import MangaCard from "@/components/manga/MangaCard";
import { MangaItem } from "@/lib/manga/types";
import { Search, X, Loader2, Sparkles, Flame, BookOpen } from "lucide-react";

interface CategoryDef {
  id: string;
  label: string;
  title: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: "all", label: "All Manga", title: "Popular & Trending Manga" },
  { id: "manhwa", label: "Manhwa (Korean)", title: "Top Korean Manhwa" },
  { id: "manhua", label: "Manhua (Chinese)", title: "Top Chinese Manhua" },
  { id: "action", label: "Action", title: "Action Manga & Manhwa" },
  { id: "romance", label: "Romance", title: "Romance Manga & Manhwa" },
  { id: "fantasy", label: "Fantasy", title: "Fantasy Manga" },
  { id: "isekai", label: "Isekai", title: "Isekai Manga & Manhwa" },
  { id: "adventure", label: "Adventure", title: "Adventure Manga" },
  { id: "comedy", label: "Comedy", title: "Comedy Manga" },
  { id: "drama", label: "Drama", title: "Drama Manga" },
  { id: "supernatural", label: "Supernatural", title: "Supernatural Manga" },
  { id: "scifi", label: "Sci-Fi", title: "Sci-Fi Manga" },
];

export default function MangaCatalogClient({
  initialManga,
}: {
  initialManga: MangaItem[];
}) {
  const [mangaList, setMangaList] = useState<MangaItem[]>(initialManga);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Background fetch function for categories or search
  const fetchCatalog = async (category: string, query?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query && query.trim()) {
        params.set("q", query.trim());
      } else if (category && category !== "all") {
        params.set("category", category);
      }

      const res = await fetch(`/api/manga/browse?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load manga");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        startTransition(() => {
          setMangaList(json.data);
        });
      }
    } catch (err) {
      console.error("[MangaCatalog] Background fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle category switch (100% in background, no redirects)
  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSearchQuery(""); // Clear search so category results take over cleanly
    if (categoryId === "all") {
      setMangaList(initialManga);
    } else {
      fetchCatalog(categoryId);
    }
  };

  // Handle search input with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!val.trim()) {
      // Revert back to active category immediately
      if (activeCategory === "all") {
        setMangaList(initialManga);
      } else {
        fetchCatalog(activeCategory);
      }
      return;
    }

    searchDebounceRef.current = setTimeout(() => {
      fetchCatalog(activeCategory, val);
    }, 350);
  };

  // Clear search input button
  const handleClearSearch = () => {
    setSearchQuery("");
    if (activeCategory === "all") {
      setMangaList(initialManga);
    } else {
      fetchCatalog(activeCategory);
    }
  };

  // Determine current display title
  const currentCategoryDef = CATEGORIES.find((c) => c.id === activeCategory);
  const displayTitle = searchQuery.trim()
    ? `Manga matching "${searchQuery.trim()}"`
    : currentCategoryDef?.title || "Popular & Trending Manga";

  return (
    <div className="space-y-8">
      {/* Unified In-Catalog Manga Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <div className="relative flex items-center bg-slate-900/90 border border-white/10 hover:border-cyan-500/40 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/20 rounded-2xl transition-all shadow-xl backdrop-blur-md">
          <div className="pl-4 text-slate-400">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
            ) : (
              <Search className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search all manga, manhwa & comics directly..."
            className="w-full bg-transparent px-3.5 py-3 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              type="button"
              className="pr-4 text-slate-400 hover:text-white transition-colors"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Categories Slider (Seamless In-Page Filter) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id && !searchQuery.trim();
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategorySelect(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                isActive
                  ? "bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/20 scale-[1.02]"
                  : "bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:border-white/20 hover:bg-slate-850"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Manga Grid Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            {searchQuery.trim() ? (
              <Search className="w-5 h-5 text-cyan-400" />
            ) : (
              <Flame className="w-5 h-5 text-amber-400" />
            )}
            {displayTitle}
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {isLoading ? "Searching…" : `${mangaList.length} titles`}
          </span>
        </div>

        {/* Loading Skeleton */}
        {isLoading && mangaList.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-slate-900/60 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : mangaList.length > 0 ? (
          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6 transition-opacity duration-200 ${
              isLoading ? "opacity-60" : "opacity-100"
            }`}
          >
            {mangaList.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        ) : (
          /* Clean Empty State */
          <div className="py-20 text-center space-y-4 bg-slate-900/40 rounded-2xl border border-white/5 p-8">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">No manga found</h3>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                {searchQuery.trim()
                  ? `No results matching "${searchQuery}". Try a different spelling or keyword.`
                  : "No titles currently available for this category."}
              </p>
            </div>
            <button
              onClick={() => handleCategorySelect("all")}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
            >
              Back to All Manga
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
