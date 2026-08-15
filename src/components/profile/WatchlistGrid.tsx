"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WatchlistGrid({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [toastItem, setToastItem] = useState<any | null>(null);
  const supabase = createClient();

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

  const handleUndo = async () => {
    if (!toastItem) return;

    // Optimistic Re-add
    setItems((prev) => [toastItem, ...prev].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));
    
    const itemToRestore = toastItem;
    setToastItem(null);

    try {
      // We re-insert it with the same details (Supabase handles ID if generated or we can omit it)
      const { error } = await supabase.from("bookmarks").insert({
        user_id: itemToRestore.user_id,
        anime_slug: itemToRestore.anime_slug,
        anime_title: itemToRestore.anime_title,
        poster_image: itemToRestore.poster_image,
        created_at: itemToRestore.created_at
      });
      if (error) console.error("Failed to restore bookmark", error);
    } catch (err) {
      console.error("Failed to restore bookmark", err);
    }
  };

  return (
    <div className="relative">
      <h2 className="text-2xl font-bold text-white mb-6">My Watchlist</h2>

      {!items || items.length === 0 ? (
        <div className="w-full text-center py-20 bg-slate-900/30 border border-slate-800 rounded-2xl">
          <h2 className="text-xl text-slate-300 font-semibold mb-2">Your watchlist is empty</h2>
          <p className="text-slate-500 mb-6">Keep track of the anime you want to watch by adding them to your watchlist.</p>
          <Link href="/catalog" className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors">
            Discover Anime
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {items.map((item) => (
            <Link 
              href={`/anime/${item.anime_slug}`} 
              key={item.id}
              className="group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105 shadow-lg"
            >
              <div className="aspect-[2/3] relative">
                <img 
                  src={item.poster_image} 
                  alt={item.anime_title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                
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
                  className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/90 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
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
          ))}
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
