"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WatchHistoryGrid({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const supabase = createClient();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic UI update
    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      const { error } = await supabase.from("watch_history").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete watch history", error);
        // If it fails, we should ideally revert, but we'll keep it simple for now
      }
    } catch (err) {
      console.error("Failed to delete watch history", err);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Star className="w-6 h-6 text-yellow-400" />
        Continue Watching
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.map((item) => (
          <Link 
            href={`/anime/${item.anime_slug}`} 
            key={item.id}
            className="group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105"
          >
            <div className="aspect-[16/9] relative">
              <img 
                src={item.poster_image} 
                alt={item.anime_title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
              
              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(e, item.id)}
                className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/90 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                title="Remove from history"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
              
              <div className="absolute bottom-0 left-0 w-full p-4">
                <h3 className="text-white font-bold text-sm truncate">
                  {item.anime_title}
                </h3>
                <p className="text-blue-400 text-xs font-semibold mt-1">
                  Episode {item.last_episode_watched}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
