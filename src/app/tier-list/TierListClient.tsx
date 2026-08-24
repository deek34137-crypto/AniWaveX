"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Trophy, 
  Download, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Search, 
  Bookmark, 
  Sparkles, 
  Save, 
  Check, 
  Loader2, 
  MoveUp, 
  MoveDown,
  Layers,
  Settings2,
  X,
  Share2
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { DEFAULT_TIER_ROWS, TierRow, TierItem, AnimeTierList } from "@/lib/tierlist";
import { useAuth } from "@/providers/AuthProvider";

export default function TierListClient({ initialPresetAnime = [] }: { initialPresetAnime?: any[] }) {
  const [rows, setRows] = useState<TierRow[]>(DEFAULT_TIER_ROWS);
  const [pool, setPool] = useState<TierItem[]>(() => {
    return initialPresetAnime.map((a: any) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      posterImage: a.posterImage || a.backgroundImage || "",
      rating: a.rating,
      year: a.year,
    }));
  });

  const [title, setTitle] = useState("Seasonal Anime Tier List");
  const [description, setDescription] = useState("");
  
  // Drag & drop state
  const [draggedItem, setDraggedItem] = useState<{ item: TierItem; sourceRowId: string | "pool" } | null>(null);
  
  // Click-to-place selected item for mobile tap interactions
  const [selectedItem, setSelectedItem] = useState<{ item: TierItem; sourceRowId: string | "pool" } | null>(null);

  // Search anime modal
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Save / Export state
  const [isExporting, setIsExporting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { user, supabase } = useAuth();
  const tierGridRef = useRef<HTMLDivElement>(null);

  // Debounced search for adding new anime
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.anime || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Import Watchlist
  const handleImportWatchlist = async () => {
    try {
      let imported: TierItem[] = [];

      if (user) {
        const { data: records } = await supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", user.id);

        if (records && records.length > 0) {
          imported = records.map((r: any) => ({
            id: r.id || r.anime_slug,
            slug: r.anime_slug,
            title: r.anime_title,
            posterImage: r.poster_image,
            rating: r.rating,
          }));
        }
      }

      if (imported.length === 0) {
        // Fallback to recent watches
        const raw = localStorage.getItem("aniwavex_recent_watches");
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            imported = list.map((it: any) => ({
              id: it.animeSlug,
              slug: it.animeSlug,
              title: it.animeTitle,
              posterImage: it.posterImage || "",
            }));
          }
        }
      }

      if (imported.length > 0) {
        // Deduplicate
        const existingSlugs = new Set([
          ...pool.map((it) => it.slug),
          ...rows.flatMap((r) => r.items.map((it) => it.slug)),
        ]);
        const unique = imported.filter((it) => !existingSlugs.has(it.slug));
        setPool((prev) => [...prev, ...unique]);
        alert(`Imported ${unique.length} anime from your watchlist!`);
      } else {
        alert("No watchlist items found to import.");
      }
    } catch (err) {
      console.error("Failed to import watchlist:", err);
    }
  };

  // Move item logic
  const moveItem = (item: TierItem, sourceRowId: string | "pool", targetRowId: string | "pool") => {
    if (sourceRowId === targetRowId) return;

    // 1. Remove from source
    if (sourceRowId === "pool") {
      setPool((prev) => prev.filter((it) => it.slug !== item.slug));
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.id === sourceRowId ? { ...r, items: r.items.filter((it) => it.slug !== item.slug) } : r
        )
      );
    }

    // 2. Add to target
    if (targetRowId === "pool") {
      setPool((prev) => [...prev, item]);
    } else {
      setRows((prev) =>
        prev.map((r) => (r.id === targetRowId ? { ...r, items: [...r.items, item] } : r))
      );
    }

    setSelectedItem(null);
    setDraggedItem(null);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, item: TierItem, sourceRowId: string | "pool") => {
    setDraggedItem({ item, sourceRowId });
    e.dataTransfer.setData("text/plain", item.slug);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetRowId: string | "pool") => {
    e.preventDefault();
    if (draggedItem) {
      moveItem(draggedItem.item, draggedItem.sourceRowId, targetRowId);
    }
  };

  // Add custom anime to pool
  const handleAddCustomAnime = (anime: any) => {
    const newItem: TierItem = {
      id: anime.id,
      slug: anime.slug,
      title: anime.title,
      posterImage: anime.posterImage || anime.backgroundImage || "",
      rating: anime.rating,
      year: anime.year,
    };

    const exists =
      pool.some((it) => it.slug === newItem.slug) ||
      rows.some((r) => r.items.some((it) => it.slug === newItem.slug));

    if (exists) {
      alert("This anime is already in your tier list.");
      return;
    }

    setPool((prev) => [newItem, ...prev]);
    setShowSearchModal(false);
    setSearchQuery("");
  };

  // Row controls
  const handleMoveRow = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= rows.length) return;
    const newRows = [...rows];
    const temp = newRows[index];
    newRows[index] = newRows[targetIdx];
    newRows[targetIdx] = temp;
    setRows(newRows);
  };

  const handleClearRow = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row || row.items.length === 0) return;
    setPool((prev) => [...prev, ...row.items]);
    setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, items: [] } : r)));
  };

  const handleDeleteRow = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (row && row.items.length > 0) {
      setPool((prev) => [...prev, ...row.items]);
    }
    setRows((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleAddRow = () => {
    const newRow: TierRow = {
      id: `tier-${Date.now()}`,
      label: "NEW",
      color: "#8b5cf6",
      bgGradient: "from-purple-600 to-indigo-600",
      items: [],
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleReset = () => {
    if (confirm("Reset tier list back to default?")) {
      const allItems = [...rows.flatMap((r) => r.items), ...pool];
      setRows(DEFAULT_TIER_ROWS);
      setPool(allItems);
    }
  };

  // Save Tier List
  const handleSaveTierList = () => {
    const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "guest";
    const tierListObj: AnimeTierList = {
      id: `tierlist_${Date.now()}`,
      title: title.trim() || "My Anime Tier List",
      description: description.trim(),
      username,
      userId: user?.id,
      rows,
      unrankedPool: pool,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const key = `aniwavex_tierlists_${username.toLowerCase()}`;
      const raw = localStorage.getItem(key);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(tierListObj);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 15)));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      alert("Tier list saved to your profile!");
    } catch (err) {
      console.error("Failed to save tier list:", err);
    }
  };

  // Export as Image
  const handleExportImage = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not available");

      const width = 1200;
      const rowHeight = 110;
      const headerHeight = 90;
      const footerHeight = 40;
      const totalHeight = headerHeight + rows.length * rowHeight + footerHeight;

      canvas.width = width;
      canvas.height = totalHeight;

      // Draw dark backdrop
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, totalHeight);

      // Draw Title Header
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(title || "AniWaveX Tier List", 40, 50);

      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("AniWaveX • aniwavex.bond", width - 240, 50);

      // Draw Rows
      let currentY = headerHeight;
      for (const row of rows) {
        // Row background
        ctx.fillStyle = "#111827";
        ctx.fillRect(20, currentY, width - 40, rowHeight - 6);

        // Tier Label Box
        ctx.fillStyle = row.color || "#ef4444";
        ctx.fillRect(20, currentY, 100, rowHeight - 6);

        // Tier Label Text
        ctx.fillStyle = "#ffffff";
        ctx.font = "black 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(row.label, 70, currentY + 62);
        ctx.textAlign = "left";

        currentY += rowHeight;
      }

      // Draw Footer
      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.fillText("Generated on AniWaveX - The Ultimate Anime Experience", 40, totalHeight - 15);

      // Convert to downloadable image
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-tierlist.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      console.error("Export error:", err);
      alert("Failed to export image: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Header & Controls */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-500/20 p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">
              <Sparkles className="w-4 h-4" />
              Interactive Tier Maker
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl sm:text-4xl font-black text-white bg-transparent border-b border-white/20 focus:border-blue-500 outline-none pb-1 w-full tracking-tight mb-2"
              placeholder="Enter Tier List Title..."
            />
            <p className="text-slate-300 text-xs sm:text-sm">
              Drag & drop anime into tiers, customize rows, or click to place. Export as a high-res image for Discord & Twitter.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add Anime</span>
            </button>

            <button
              onClick={handleImportWatchlist}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all border border-white/10 shadow-lg hover:scale-105"
              title="Import all anime from your Watchlist"
            >
              <Bookmark className="w-4 h-4 text-blue-400" />
              <span>Import Watchlist</span>
            </button>

            <button
              onClick={handleSaveTierList}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl text-xs font-bold transition-all border border-white/10 shadow-lg hover:scale-105"
            >
              {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{savedSuccess ? "Saved!" : "Save List"}</span>
            </button>

            <button
              onClick={handleExportImage}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:scale-105"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Image</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all border border-white/10"
              title="Reset Tier List"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Item Notification (Mobile / Tap Assist) */}
      {selectedItem && (
        <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl p-4 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-blue-300">
              Selected: <strong className="text-white">{selectedItem.item.title}</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              Tap any Tier row below to place it
            </span>
          </div>
          <button
            onClick={() => setSelectedItem(null)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Interactive Tier Rows Grid */}
      <div ref={tierGridRef} className="space-y-3 bg-slate-950/80 p-3 sm:p-5 rounded-3xl border border-white/10 shadow-2xl">
        {rows.map((row, index) => (
          <div
            key={row.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, row.id)}
            onClick={() => selectedItem && moveItem(selectedItem.item, selectedItem.sourceRowId, row.id)}
            className="group relative flex flex-col sm:flex-row items-stretch rounded-2xl overflow-hidden bg-slate-900/90 border border-white/10 hover:border-white/20 transition-all min-h-[110px]"
          >
            {/* Left Tier Header */}
            <div
              className="sm:w-28 flex items-center justify-center p-3 text-white font-black text-2xl sm:text-3xl shrink-0 shadow-lg select-none"
              style={{ backgroundColor: row.color }}
            >
              <input
                type="text"
                value={row.label}
                onChange={(e) => {
                  const newLabel = e.target.value;
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, label: newLabel } : r))
                  );
                }}
                className="bg-transparent text-center font-black outline-none w-full cursor-text"
                title="Click to rename tier"
              />
            </div>

            {/* Anime Items Row Container */}
            <div className="flex-1 flex items-center flex-wrap gap-2.5 p-3 min-h-[90px] overflow-x-auto">
              {row.items.length === 0 ? (
                <div className="text-xs text-slate-600 font-medium italic pl-2 pointer-events-none select-none">
                  Drag anime here or click to assign...
                </div>
              ) : (
                row.items.map((item) => (
                  <div
                    key={item.slug}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, row.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem({ item, sourceRowId: row.id });
                    }}
                    className={`group/card relative w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden bg-slate-950 border cursor-grab active:cursor-grabbing hover:scale-105 transition-all shadow-md shrink-0 ${
                      selectedItem?.item.slug === item.slug
                        ? "border-blue-400 ring-2 ring-blue-500 scale-105"
                        : "border-white/10 hover:border-blue-400"
                    }`}
                  >
                    <AnimeImage
                      src={item.posterImage}
                      alt={item.title}
                      sizes="80px"
                      className="object-cover pointer-events-none"
                    />

                    {/* Quick Move to Pool Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveItem(item, row.id, "pool");
                      }}
                      className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-colors opacity-0 group-hover/card:opacity-100"
                      title="Move back to pool"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>

                    {/* Title tooltip overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-1 bg-slate-950/90 text-[9px] text-white font-bold truncate opacity-0 group-hover/card:opacity-100 transition-opacity">
                      {item.title}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Row Controls */}
            <div className="flex sm:flex-col items-center justify-center gap-1 p-2 bg-slate-950/80 border-t sm:border-t-0 sm:border-l border-white/5 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleMoveRow(index, "up")}
                disabled={index === 0}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                title="Move Row Up"
              >
                <MoveUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleMoveRow(index, "down")}
                disabled={index === rows.length - 1}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-20"
                title="Move Row Down"
              >
                <MoveDown className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleClearRow(row.id)}
                className="p-1 text-slate-400 hover:text-amber-400"
                title="Clear Row items back to pool"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDeleteRow(row.id)}
                className="p-1 text-slate-400 hover:text-red-400"
                title="Delete Row"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Add Tier Row Button */}
        <button
          onClick={handleAddRow}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/50 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/40 transition-all"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          Add New Tier Row
        </button>
      </div>

      {/* 3. Unranked Anime Pool */}
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, "pool")}
        onClick={() => selectedItem && moveItem(selectedItem.item, selectedItem.sourceRowId, "pool")}
        className="bg-slate-900/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Unranked Anime Pool ({pool.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag any anime card onto a tier above, or click on it to select and place.
            </p>
          </div>

          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10"
          >
            <Plus className="w-3.5 h-3.5" />
            Add More Anime
          </button>
        </div>

        {pool.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-white/5 rounded-2xl">
            All anime have been placed in tiers! Click &quot;Add More Anime&quot; or import from your watchlist.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 max-h-96 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-800">
            {pool.map((item) => (
              <div
                key={item.slug}
                draggable
                onDragStart={(e) => handleDragStart(e, item, "pool")}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem({ item, sourceRowId: "pool" });
                }}
                className={`group/card relative w-20 sm:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-slate-950 border cursor-grab active:cursor-grabbing hover:scale-105 transition-all shadow-md shrink-0 ${
                  selectedItem?.item.slug === item.slug
                    ? "border-blue-400 ring-2 ring-blue-500 scale-105"
                    : "border-white/10 hover:border-blue-400"
                }`}
              >
                <AnimeImage
                  src={item.posterImage}
                  alt={item.title}
                  sizes="96px"
                  className="object-cover pointer-events-none"
                />

                {/* Delete from pool */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPool(pool.filter((it) => it.slug !== item.slug));
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-colors opacity-0 group-hover/card:opacity-100"
                  title="Remove from pool"
                >
                  <X className="w-2.5 h-2.5" />
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent text-[10px] text-white font-bold truncate">
                  {item.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Anime Live Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 max-h-[80vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                Add Anime to Tier Maker
              </h3>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                }}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search anime title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {isSearching ? (
                <div className="py-12 flex items-center justify-center text-slate-400 text-xs">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((anime) => (
                  <div
                    key={anime.id}
                    onClick={() => handleAddCustomAnime(anime)}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 hover:bg-blue-600/20 border border-white/5 hover:border-blue-500/30 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                        <AnimeImage
                          src={anime.posterImage}
                          alt={anime.title}
                          sizes="40px"
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                          {anime.title}
                        </h4>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {anime.year || "Anime"}
                        </div>
                      </div>
                    </div>

                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shrink-0">
                      Add
                    </button>
                  </div>
                ))
              ) : searchQuery.length >= 2 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No anime found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Type at least 2 characters to search...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
