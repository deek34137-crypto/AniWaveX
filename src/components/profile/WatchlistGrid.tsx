"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Trash2, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WATCHLIST_STATUSES, WatchlistStatus } from "@/lib/watchlist";
import AnimeImage from "@/components/AnimeImage";

export default function WatchlistGrid({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [selectedTab, setSelectedTab] = useState<WatchlistStatus | "all">("all");
  const [toastItem, setToastItem] = useState<any | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      const user = res?.data?.user;
      if (user) {
        supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)
          .then((fetchRes: any) => {
            const data = fetchRes?.data;
            if (data && data.length > 0) {
              setItems(data);
            }
          });
      }
    });
  }, [supabase]);

  // Counts by status
  const counts = useMemo(() => {
    const map: Record<string, number> = { all: items.length };
    Object.keys(WATCHLIST_STATUSES).forEach((k) => (map[k] = 0));
    items.forEach((i) => {
      const s = i.status || "watching";
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [items]);

  // Filtered items based on active tab
  const filteredItems = useMemo(() => {
    if (selectedTab === "all") return items;
    return items.filter((i) => (i.status || "watching") === selectedTab);
  }, [items, selectedTab]);

  const handleDelete = async (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic UI update
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setToastItem(item);

    // Auto-hide toast after 5 seconds
    setTimeout(() => {
      setToastItem(null);
    }, 5000);

    try {
      const { error } = await supabase.from("bookmarks").delete().eq("id", item.id);
      if (error) console.error("Failed to delete bookmark", error);
    } catch (err) {
      console.error("Failed to delete bookmark", err);
    }
  };

  const handleUpdateStatus = async (e: React.MouseEvent, item: any, newStatus: WatchlistStatus) => {
    e.preventDefault();
    e.stopPropagation();

    setEditingItemId(null);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i))
    );

    try {
      const { error } = await supabase
        .from("bookmarks")
        .update({ status: newStatus })
        .eq("id", item.id);

      if (error) console.error("Failed to update bookmark status", error);
    } catch (err) {
      console.error("Failed to update bookmark status", err);
    }
  };

  const handleUndo = async () => {
    if (!toastItem) return;

    // Optimistic Re-add
    setItems((prev) =>
      [toastItem, ...prev].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    );

    const itemToRestore = toastItem;
    setToastItem(null);

    try {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: itemToRestore.user_id,
        anime_slug: itemToRestore.anime_slug,
        anime_title: itemToRestore.anime_title,
        poster_image: itemToRestore.poster_image,
        status: itemToRestore.status || "watching",
        created_at: itemToRestore.created_at
      });
      if (error) console.error("Failed to restore bookmark", error);
    } catch (err) {
      console.error("Failed to restore bookmark", err);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-white">My Watchlist</h2>
        
        {/* Status Filter Tabs (Feature 3.5) */}
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedTab("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                selectedTab === "all"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5"
              }`}
            >
              All ({counts.all})
            </button>
            {Object.values(WATCHLIST_STATUSES).map((status) => {
              const count = counts[status.id] || 0;
              const isActive = selectedTab === status.id;
              return (
                <button
                  key={status.id}
                  onClick={() => setSelectedTab(status.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5"
                  }`}
                >
                  {status.label} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!items || items.length === 0 ? (
        <div className="w-full text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <h2 className="text-xl text-slate-300 font-semibold mb-2">Your watchlist is empty</h2>
          <p className="text-slate-500 mb-6">Keep track of the anime you want to watch by adding them to your watchlist.</p>
          <Link href="/catalog" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
            Discover Anime
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="w-full text-center py-16 bg-slate-900/20 border border-slate-800/80 rounded-2xl text-slate-400">
          <p className="text-sm font-semibold">No anime found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredItems.map((item) => {
            const itemStatus = (item.status as WatchlistStatus) || "watching";
            const statusConfig = WATCHLIST_STATUSES[itemStatus] || WATCHLIST_STATUSES.watching;
            const isEditingThis = editingItemId === item.id;

            return (
              <Link 
                href={`/anime/${item.anime_slug}`} 
                key={item.id}
                className="group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105 shadow-lg"
              >
                <div className="aspect-[2/3] relative">
                  <AnimeImage 
                    src={item.poster_image} 
                    alt={item.anime_title} 
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 left-2 z-20">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingItemId(isEditingThis ? null : item.id);
                      }}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-md backdrop-blur-md transition-all hover:scale-105 ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}
                      title="Click to change status"
                    >
                      {statusConfig.label}
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {/* In-Card Status Menu */}
                    {isEditingThis && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-1 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95"
                      >
                        {Object.values(WATCHLIST_STATUSES).map((st) => (
                          <button
                            key={st.id}
                            onClick={(e) => handleUpdateStatus(e, item, st.id as WatchlistStatus)}
                            className={`w-full px-3 py-1.5 text-xs text-left font-medium transition-colors hover:bg-slate-800 ${
                              itemStatus === st.id ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-200"
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 bg-blue-600/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl">
                      <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(e, item)}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/90 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10 z-20"
                    title="Remove from watchlist"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                  
                  <div className="absolute bottom-0 left-0 w-full p-4">
                    <h3 className="text-white font-bold text-sm truncate" title={item.anime_title}>
                      {item.anime_title}
                    </h3>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Undo Toast */}
      {toastItem && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-slate-800 border border-slate-700 text-white px-6 py-4 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-5">
          <p className="text-sm font-medium">
            <span className="font-bold text-blue-400">{toastItem.anime_title}</span> removed from watchlist.
          </p>
          <button 
            onClick={handleUndo}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded-lg transition-colors"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
