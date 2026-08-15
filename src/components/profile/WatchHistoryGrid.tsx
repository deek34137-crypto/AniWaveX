"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

import Image from "next/image";

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
              {item.poster_image ? (
                <Image 
                  src={item.poster_image} 
                  alt={item.anime_title} 
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover"
                />
              ) : null}
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
                <div className="flex items-center justify-between text-xs mt-1">
                  <p className="text-blue-400 font-semibold">
                    Episode {item.last_episode_watched}
                  </p>
                  {item.progress_seconds && item.progress_seconds > 0 ? (
                    <span className="text-slate-400 font-mono text-[11px]">
                      {Math.floor(item.progress_seconds / 60)}:{Math.floor(item.progress_seconds % 60).toString().padStart(2, '0')}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Playback Progress Bar */}
              {item.progress_seconds && item.progress_seconds > 0 ? (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div 
                    className="h-full bg-blue-500 rounded-r shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                    style={{ 
                      width: `${Math.min(100, Math.max(5, (item.progress_seconds / (item.duration_seconds || 1440)) * 100))}%` 
                    }}
                  />
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
