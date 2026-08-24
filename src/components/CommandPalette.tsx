"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Command, 
  Compass, 
  Calendar, 
  Film, 
  User, 
  Home, 
  Sparkles, 
  Flame, 
  Star, 
  Dices,
  X,
  Loader2,
  ArrowRight
} from "lucide-react";
import Image from "next/image";

interface SearchItem {
  id: string | number;
  slug: string;
  title: string;
  posterImage?: string;
  year?: string;
  rating?: string;
  status?: string;
}

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const staticActions = useMemo(() => [
    {
      id: "nav-home",
      label: "Home",
      category: "Navigation",
      icon: Home,
      action: () => router.push("/"),
    },
    {
      id: "nav-catalog",
      label: "Explore Catalog",
      category: "Navigation",
      icon: Compass,
      action: () => router.push("/catalog"),
    },
    {
      id: "nav-schedule",
      label: "Weekly Airing Schedule",
      category: "Navigation",
      icon: Calendar,
      action: () => router.push("/airing"),
    },
    {
      id: "nav-movies",
      label: "Anime Movies",
      category: "Navigation",
      icon: Film,
      action: () => router.push("/catalog?format=movie"),
    },
    {
      id: "nav-tierlist",
      label: "Anime Tier List Maker",
      category: "Navigation",
      icon: Layers,
      action: () => router.push("/tier-list"),
    },
    {
      id: "nav-profile",
      label: "My Watchlist & Profile",
      category: "Navigation",
      icon: User,
      action: () => router.push("/profile"),
    },
    {
      id: "act-random",
      label: "Surprise Me (Random Anime)",
      category: "Quick Actions",
      icon: Dices,
      action: async () => {
        try {
          const res = await fetch("/api/search?q=a&limit=20");
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const randomPick = data[Math.floor(Math.random() * data.length)];
            router.push(`/anime/${randomPick.slug}`);
          }
        } catch {
          router.push("/catalog");
        }
      },
    },
    {
      id: "act-trending",
      label: "Trending Now",
      category: "Quick Actions",
      icon: Flame,
      action: () => router.push("/catalog?sort=popularity"),
    },
    {
      id: "act-top",
      label: "Highest Rated Anime",
      category: "Quick Actions",
      icon: Star,
      action: () => router.push("/catalog?sort=rating"),
    },
  ], [router]);

  // Global hotkey listener (Ctrl+K, Cmd+K, or custom event)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [isOpen]);

  // Live search debounced query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=8`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setResults(data);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Palette search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Combined selectable items list
  const combinedItems = useMemo(() => {
    if (query.trim() && results.length > 0) {
      return results.map((r) => ({
        id: `anime-${r.id}`,
        label: r.title,
        category: "Anime Results",
        data: r,
        action: () => {
          setIsOpen(false);
          router.push(`/anime/${r.slug}`);
        },
      }));
    }

    if (query.trim()) {
      return [
        {
          id: "search-full",
          label: `Search for "${query.trim()}" in Catalog`,
          category: "Search",
          icon: Search,
          action: () => {
            setIsOpen(false);
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          },
        },
        ...staticActions.filter((it) =>
          it.label.toLowerCase().includes(query.toLowerCase())
        ),
      ];
    }

    return staticActions;
  }, [query, results, staticActions, router]);

  // Keyboard navigation for arrow keys and Enter
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, combinedItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedItems.length) % Math.max(1, combinedItems.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = combinedItems[selectedIndex];
      if (current) {
        setIsOpen(false);
        current.action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="relative flex items-center p-4 sm:p-5 border-b border-slate-800 gap-3">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anime, genres, shortcuts..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyNavigation}
            className="w-full bg-transparent text-white text-base sm:text-lg placeholder:text-slate-500 outline-none font-medium"
          />
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-800 flex flex-col gap-1">
          {combinedItems.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No results found for "{query}". Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300 font-mono">Enter</kbd> to search catalog.
            </div>
          ) : (
            combinedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const animeData = (item as any).data;
              const Icon = (item as any).icon || Command;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    setIsOpen(false);
                    item.action();
                  }}
                  className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all duration-150 ${
                    isSelected
                      ? "bg-blue-600/20 text-white border border-blue-500/40 shadow-md translate-x-1"
                      : "text-slate-300 hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  {animeData && animeData.posterImage ? (
                    <div className="relative w-10 h-14 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                      <Image
                        src={animeData.posterImage}
                        alt={animeData.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-400"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`text-sm font-bold truncate ${
                          isSelected ? "text-white" : "text-slate-200"
                        }`}
                      >
                        {item.label}
                      </h4>
                      {animeData?.rating && (
                        <div className="flex items-center gap-0.5 text-[10px] text-yellow-400 font-bold bg-black/60 px-1.5 py-0.5 rounded">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          {animeData.rating}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{item.category}</span>
                  </div>

                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected ? "text-blue-400 translate-x-1 opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 px-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-slate-300">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1 text-slate-500">
            <Sparkles className="w-3 h-3 text-blue-400" /> Spotlight Search
          </span>
        </div>
      </div>
    </div>
  );
}
