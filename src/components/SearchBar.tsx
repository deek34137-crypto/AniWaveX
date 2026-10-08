"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Clock, X, Trash2, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImageSearchModal from "@/components/ImageSearchModal";
import {
  getSearchHistory,
  saveSearchQuery,
  removeSearchItem,
  clearSearchHistory,
} from "@/lib/search-history";

import Image from "next/image";

// Custom hook for debouncing input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearchError, setHasSearchError] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRequestIdRef = useRef(0);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setPastedFile(file);
          setIsImageModalOpen(true);
          setIsOpen(false);
          break;
        }
      }
    }
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch results when debounced query changes using internal API + AbortController
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      setHasSearchError(false);
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++searchRequestIdRef.current;

    async function fetchSearch() {
      setIsSearching(true);
      setHasSearchError(false);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=5`, {
          signal: controller.signal,
        });
        const data = await res.json();

        // Check if request is still active
        if (searchRequestIdRef.current !== currentRequestId || controller.signal.aborted) {
          return;
        }

        if (Array.isArray(data)) {
          setResults(data);
          setIsOpen(true);
        }
      } catch (error: any) {
        if (error.name !== "AbortError" && !controller.signal.aborted) {
          console.error("Search error:", error);
          if (searchRequestIdRef.current === currentRequestId) {
            setHasSearchError(true);
            setIsOpen(true);
          }
        }
      } finally {
        if (searchRequestIdRef.current === currentRequestId && !controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }

    fetchSearch();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      saveSearchQuery(query.trim());
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectHistory = (item: string) => {
    saveSearchQuery(item);
    setQuery(item);
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(item)}`);
  };

  const handleRemoveHistory = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    removeSearchItem(item);
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory();
  };

  return (
    <>
      <div className="relative w-full max-w-sm" ref={dropdownRef}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search anime..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => {
              if (results.length > 0 || history.length > 0) setIsOpen(true);
            }}
            className="w-full pl-10 pr-20 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:bg-white/10 transition-all"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            {/* Camera reverse screenshot search button */}
            <button
              type="button"
              onClick={() => {
                setPastedFile(null);
                setIsImageModalOpen(true);
                setIsOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-white/10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              title="Search anime by screenshot or image (Ctrl+V)"
              aria-label="Search anime by image"
            >
              <Camera className="w-4 h-4" />
            </button>

            {isSearching ? (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin mr-1" />
            ) : (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-slate-400 hover:text-white transition-colors"
                title="Open Command Palette (Ctrl+K)"
              >
                <span>⌘</span>K
              </button>
            )}
          </div>
        </div>

      {/* Dropdown for Recent Searches when query is empty */}
      {isOpen && !query.trim() && history.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/80">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-blue-400" />
              Recent Searches
            </span>
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors px-1.5 py-0.5 rounded hover:bg-white/5"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Clear all
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/40">
            {history.slice(0, 8).map((item) => (
              <div
                key={item}
                onClick={() => handleSelectHistory(item)}
                className="group flex items-center justify-between px-3 py-2.5 hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2 text-slate-300 group-hover:text-white truncate pr-2">
                  <Clock className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0 transition-colors" />
                  <span className="truncate">{item}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemoveHistory(e, item)}
                  className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/10 transition-colors shrink-0"
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

      {/* Dropdown for Live Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden z-[100]">
          {hasSearchError ? (
            <div className="p-4 text-center text-sm text-red-400">
              Search failed — please try again
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col">
              {results.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.slug}`}
                  onClick={() => {
                    saveSearchQuery(query.trim());
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
                >
                  <div className="relative w-10 h-14 shrink-0 rounded-md overflow-hidden bg-slate-800">
                    {anime.posterImage ? (
                      <Image 
                        src={anime.posterImage} 
                        alt={anime.title} 
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate">{anime.title}</h4>
                    <span className="text-xs text-slate-400">{anime.year}</span>
                  </div>
                </Link>
              ))}
              <button 
                onClick={() => {
                  saveSearchQuery(query.trim());
                  setIsOpen(false);
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                }}
                className="w-full p-3 text-sm text-blue-400 font-semibold hover:bg-slate-800 transition-colors bg-slate-900/50"
              >
                View all results for "{query}"
              </button>
            </div>
          ) : !isSearching && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">
              No results found for "{query}"
            </div>
          ) : null}
        </div>
      )}
      </div>

      {/* Reverse Screenshot Search Modal */}
      <ImageSearchModal
        isOpen={isImageModalOpen}
        initialFile={pastedFile}
        onClose={() => {
          setIsImageModalOpen(false);
          setPastedFile(null);
        }}
      />
    </>
  );
}
