"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { 
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
  X,
  ArrowDownToLine,
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { DEFAULT_TIER_ROWS, TierRow, TierItem, AnimeTierList } from "@/lib/tierlist";
import { useAuth } from "@/providers/AuthProvider";

// ── Auto-scroll while dragging ───────────────────────────────────────────────
const EDGE_THRESHOLD_PX = 90;
const MAX_SCROLL_SPEED = 16;

function useAutoScrollOnDrag() {
  const rafId = useRef<number | null>(null);
  const pointerY = useRef<number | null>(null);
  const isDragging = useRef(false);

  const loop = useCallback(() => {
    if (!isDragging.current || pointerY.current === null) return;
    const y = pointerY.current;
    const vh = window.innerHeight;

    if (y < EDGE_THRESHOLD_PX) {
      const factor = 1 - Math.max(0, y) / EDGE_THRESHOLD_PX;
      window.scrollBy(0, -Math.round(MAX_SCROLL_SPEED * factor));
    } else if (y > vh - EDGE_THRESHOLD_PX) {
      const factor = (y - (vh - EDGE_THRESHOLD_PX)) / EDGE_THRESHOLD_PX;
      window.scrollBy(0, Math.round(MAX_SCROLL_SPEED * factor));
    }

    rafId.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      pointerY.current = e.clientY;
      if (!isDragging.current) {
        isDragging.current = true;
        if (rafId.current) cancelAnimationFrame(rafId.current);
        rafId.current = requestAnimationFrame(loop);
      }
    };

    const handleDragEnd = () => {
      isDragging.current = false;
      pointerY.current = null;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };

    window.addEventListener("dragover", handleDragOver, { passive: true });
    window.addEventListener("dragend", handleDragEnd, { passive: true });
    window.addEventListener("drop", handleDragEnd, { passive: true });

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragend", handleDragEnd);
      window.removeEventListener("drop", handleDragEnd);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [loop]);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function TierListClient({ initialPresetAnime = [] }: { initialPresetAnime?: any[] }) {
  const [rows, setRows] = useState<TierRow[]>(DEFAULT_TIER_ROWS);
  const [pool, setPool] = useState<TierItem[]>(() =>
    initialPresetAnime.map((a: any) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      posterImage: a.posterImage || a.backgroundImage || "",
      rating: a.rating,
      year: a.year,
    }))
  );

  const [title, setTitle] = useState("Seasonal Anime Tier List");
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);

  // Persistent ref for active drag item (prevents React state closure drops)
  const draggedItemRef = useRef<{ item: TierItem; sourceRowId: string | "pool" } | null>(null);

  // Tap-to-place selected item
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

  // Activate auto scroll
  useAutoScrollOnDrag();

  // Search anime with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : data.anime || []);
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

  // Move item between rows / pool
  const moveItem = useCallback((item: TierItem, sourceRowId: string | "pool", targetRowId: string | "pool") => {
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
    draggedItemRef.current = null;
    setActiveDropTarget(null);
  }, []);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, item: TierItem, sourceRowId: string | "pool") => {
    draggedItemRef.current = { item, sourceRowId };
    try {
      e.dataTransfer.setData("text/plain", JSON.stringify({ item, sourceRowId }));
      e.dataTransfer.effectAllowed = "move";
    } catch {}
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.dataTransfer.dropEffect = "move";
    } catch {}
    if (activeDropTarget !== targetId) {
      setActiveDropTarget(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (activeDropTarget === targetId) {
      setActiveDropTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetRowId: string | "pool") => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropTarget(null);

    let dragData = draggedItemRef.current;
    if (!dragData) {
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (raw) {
          dragData = JSON.parse(raw);
        }
      } catch {}
    }

    if (dragData?.item) {
      moveItem(dragData.item, dragData.sourceRowId, targetRowId);
    }
  };

  // Added anime flash notification
  const [lastAddedFeedback, setLastAddedFeedback] = useState<string | null>(null);

  // Add anime from search modal (can specify targetRowId or defaults to "pool")
  const handleAddCustomAnime = (anime: any, targetRowId: string | "pool" = "pool") => {
    const slug = anime.slug || anime.id?.toString() || `anime-${Date.now()}`;
    const newItem: TierItem = {
      id: anime.id || slug,
      slug,
      title: anime.title || "Unknown Anime",
      posterImage: anime.posterImage || anime.backgroundImage || "",
      rating: anime.rating,
      year: anime.year,
    };

    const exists =
      pool.some((it) => it.slug === newItem.slug) ||
      rows.some((r) => r.items.some((it) => it.slug === newItem.slug));

    if (exists) {
      setLastAddedFeedback(`"${newItem.title}" is already in your tier list!`);
      setTimeout(() => setLastAddedFeedback(null), 3000);
      return;
    }

    if (targetRowId === "pool") {
      setPool((prev) => [newItem, ...prev]);
      setLastAddedFeedback(`Added "${newItem.title}" to Unranked Pool!`);
    } else {
      const targetRow = rows.find((r) => r.id === targetRowId);
      setRows((prev) =>
        prev.map((r) => (r.id === targetRowId ? { ...r, items: [...r.items, newItem] } : r))
      );
      setLastAddedFeedback(`Added "${newItem.title}" to ${targetRow?.label || "Tier"}!`);
    }

    setTimeout(() => setLastAddedFeedback(null), 3500);
  };

  // Row controls
  const handleMoveRow = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= rows.length) return;
    const newRows = [...rows];
    [newRows[index], newRows[targetIdx]] = [newRows[targetIdx], newRows[index]];
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
      setSelectedItem(null);
    }
  };

  // Save Tier List
  const handleSaveTierList = () => {
    const username = user?.user_metadata?.username || user?.email?.split("@")[0] || "guest";
    const tierListObj: AnimeTierList = {
      id: `tierlist_${Date.now()}`,
      title: title.trim() || "My Anime Tier List",
      description: "",
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

      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, width, totalHeight);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(title || "AniWaveX Tier List", 40, 50);

      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("AniWaveX • aniwavex.bond", width - 240, 50);

      let currentY = headerHeight;
      for (const row of rows) {
        ctx.fillStyle = "#111827";
        ctx.fillRect(20, currentY, width - 40, rowHeight - 6);

        ctx.fillStyle = row.color || "#ef4444";
        ctx.fillRect(20, currentY, 100, rowHeight - 6);

        ctx.fillStyle = "#ffffff";
        ctx.font = "black 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(row.label, 70, currentY + 62);
        ctx.textAlign = "left";

        currentY += rowHeight;
      }

      ctx.fillStyle = "#64748b";
      ctx.font = "12px sans-serif";
      ctx.fillText("Generated on AniWaveX - The Ultimate Anime Experience", 40, totalHeight - 15);

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
              Drag &amp; drop anime into tiers, customize rows, or click to place. Auto-scrolls while dragging.
            </p>
          </div>

          {/* Action Buttons */}
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
        <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl p-4 flex items-center justify-between animate-in fade-in sticky top-20 z-30 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-11 rounded-lg overflow-hidden shrink-0 border border-blue-400">
              <AnimeImage src={selectedItem.item.posterImage} alt={selectedItem.item.title} className="object-cover" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Selected: {selectedItem.item.title}
              </span>
              <span className="text-[11px] text-blue-300">
                Click any Tier below or choose where to move it:
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => moveItem(selectedItem.item, selectedItem.sourceRowId, r.id)}
                className="px-2.5 py-1 text-xs font-black text-white rounded-lg shadow-sm hover:scale-105 transition-transform"
                style={{ backgroundColor: r.color }}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => moveItem(selectedItem.item, selectedItem.sourceRowId, "pool")}
              className="px-2.5 py-1 text-xs font-bold bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-white/10"
            >
              Pool
            </button>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tier Rows */}
      <div ref={tierGridRef} className="space-y-3 bg-slate-950/80 p-3 sm:p-5 rounded-3xl border border-white/10 shadow-2xl">
        {rows.map((row, index) => {
          const isTargeted = activeDropTarget === row.id;

          return (
            <div
              key={row.id}
              onDragOver={(e) => handleDragOver(e, row.id)}
              onDragLeave={(e) => handleDragLeave(e, row.id)}
              onDrop={(e) => handleDrop(e, row.id)}
              onClick={() => selectedItem && moveItem(selectedItem.item, selectedItem.sourceRowId, row.id)}
              className={`group relative flex flex-col sm:flex-row items-stretch rounded-2xl overflow-hidden bg-slate-900/90 border transition-all duration-200 min-h-[110px] ${
                isTargeted
                  ? "border-blue-400 ring-2 ring-blue-500/60 bg-blue-950/40"
                  : "border-white/10 hover:border-white/20"
              }`}
            >
              {/* Tier Label Box */}
              <div
                className="sm:w-28 flex items-center justify-center p-3 text-white font-black text-2xl sm:text-3xl shrink-0 shadow-lg select-none"
                style={{ backgroundColor: row.color }}
              >
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r))
                    )
                  }
                  className="bg-transparent text-center font-black outline-none w-full cursor-text"
                  title="Click to rename tier"
                />
              </div>

              {/* Items Row Area */}
              <div 
                className="flex-1 flex items-center flex-wrap gap-2.5 p-3 min-h-[90px] overflow-x-auto"
                onDragOver={(e) => handleDragOver(e, row.id)}
                onDrop={(e) => handleDrop(e, row.id)}
              >
                {row.items.length === 0 ? (
                  <div className="text-xs text-slate-500 font-medium italic pl-2 pointer-events-none select-none flex items-center gap-2">
                    <ArrowDownToLine className="w-3.5 h-3.5 opacity-50" />
                    Drag anime here or click to assign…
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
                        sizes="(max-width: 640px) 180px, 280px"
                        quality={95}
                        className="object-cover pointer-events-none"
                      />
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
                      <div className="absolute bottom-0 left-0 right-0 p-1 bg-slate-950/90 text-[9px] text-white font-bold truncate opacity-0 group-hover/card:opacity-100 transition-opacity">
                        {item.title}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Row Controls */}
              <div className="flex sm:flex-col items-center justify-center gap-1 p-2 bg-slate-950/80 border-t sm:border-t-0 sm:border-l border-white/5 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleMoveRow(index, "up")} disabled={index === 0} className="p-1 text-slate-400 hover:text-white disabled:opacity-20" title="Move Row Up">
                  <MoveUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleMoveRow(index, "down")} disabled={index === rows.length - 1} className="p-1 text-slate-400 hover:text-white disabled:opacity-20" title="Move Row Down">
                  <MoveDown className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleClearRow(row.id)} className="p-1 text-slate-400 hover:text-amber-400" title="Clear Row">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDeleteRow(row.id)} className="p-1 text-slate-400 hover:text-red-400" title="Delete Row">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Tier Row */}
        <button
          onClick={handleAddRow}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-blue-500/50 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/40 transition-all"
        >
          <Plus className="w-4 h-4 text-blue-400" />
          Add New Tier Row
        </button>
      </div>

      {/* Unranked Pool */}
      <div
        onDragOver={(e) => handleDragOver(e, "pool")}
        onDragLeave={(e) => handleDragLeave(e, "pool")}
        onDrop={(e) => handleDrop(e, "pool")}
        onClick={() => selectedItem && moveItem(selectedItem.item, selectedItem.sourceRowId, "pool")}
        className={`bg-slate-900/80 border rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl transition-all duration-200 ${
          activeDropTarget === "pool"
            ? "border-blue-400 ring-2 ring-blue-500/60 bg-blue-950/40"
            : "border-white/10"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Unranked Anime Pool ({pool.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag any card onto a tier above, or click on a card to quickly place it.
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
            All anime placed in tiers! Click &quot;Add More Anime&quot; or import from your watchlist.
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
                  sizes="(max-width: 640px) 240px, 360px"
                  quality={95}
                  className="object-cover pointer-events-none"
                />
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

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 max-h-[80vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                Add Anime to Tier List
              </h3>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
              <input
                type="text"
                autoFocus
                placeholder="Search anime title…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Notification Banner */}
            {lastAddedFeedback && (
              <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
                <span>{lastAddedFeedback}</span>
                <span className="text-[10px] text-emerald-400/80">Available in list below</span>
              </div>
            )}

            {/* Results */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800" style={{ maxHeight: "50vh" }}>
              {searchResults.length > 0 ? (
                searchResults.map((anime) => {
                  const slug = anime.slug || anime.id?.toString();
                  const isAlreadyAdded =
                    pool.some((it) => it.slug === slug) ||
                    rows.some((r) => r.items.some((it) => it.slug === slug));

                  return (
                    <div
                      key={anime.id || anime.slug}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/50 border border-white/5 transition-all gap-2"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                          <AnimeImage
                            src={anime.posterImage}
                            alt={anime.title}
                            sizes="120px"
                            quality={95}
                            className="object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs sm:text-sm font-bold text-white transition-colors line-clamp-1">
                            {anime.title}
                          </h4>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {anime.year || "Anime"}{anime.rating ? ` · ★ ${anime.rating}` : ""}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {isAlreadyAdded ? (
                          <span className="px-3 py-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Added
                          </span>
                        ) : (
                          <>
                            {/* Quick add to specific tier rows */}
                            {rows.slice(0, 4).map((r) => (
                              <button
                                key={r.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddCustomAnime(anime, r.id);
                                }}
                                className="px-2 py-1 text-[11px] font-black text-white rounded-md shadow-sm hover:scale-110 transition-transform"
                                style={{ backgroundColor: r.color }}
                                title={`Add directly to ${r.label}`}
                              >
                                +{r.label}
                              </button>
                            ))}
                            {/* Add to Pool */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddCustomAnime(anime, "pool");
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm hover:scale-105"
                            >
                              + Pool
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : searchQuery.length >= 2 && !isSearching ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No anime found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Type at least 2 characters to search…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
