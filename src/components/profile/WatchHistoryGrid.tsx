"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import AnimeImage from "@/components/AnimeImage";

interface WatchHistoryItem {
  id: string;
  user_id: string;
  anime_slug: string;
  anime_title: string;
  poster_image?: string;
  last_episode_watched: number;
  progress_seconds?: number | null;
  duration_seconds?: number | null;
  updated_at: string;
}

function formatTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "0:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function WatchHistoryGrid({ initialItems }: { initialItems: WatchHistoryItem[] }) {
  const [items, setItems] = useState<WatchHistoryItem[]>(initialItems);
  const [localMeta, setLocalMeta] = useState<Record<string, { duration: number; progress: number }>>({});
  const { user, supabase } = useAuth();

  // Defer reading localStorage to client-side useEffect to prevent SSR hydration mismatch
  useEffect(() => {
    if (!initialItems || initialItems.length === 0) return;
    const metaMap: Record<string, { duration: number; progress: number }> = {};
    initialItems.forEach((item) => {
      try {
        const storageKey = `watch_progress_${item.anime_slug}_ep_${item.last_episode_watched}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.duration && parsed.duration > 0) {
            metaMap[item.id] = {
              duration: parsed.duration,
              progress: parsed.currentTime || item.progress_seconds || 0
            };
          }
        }
      } catch {
        // Ignore localStorage read errors
      }
    });
    setLocalMeta(metaMap);
  }, [initialItems]);

  useEffect(() => {
    if (user) {
      supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50)
        .then((fetchRes: any) => {
          const data = fetchRes?.data;
          if (data && data.length > 0) {
            setItems(data);
            const metaMap: Record<string, { duration: number; progress: number }> = {};
            data.forEach((item: any) => {
              try {
                const storageKey = `watch_progress_${item.anime_slug}_ep_${item.last_episode_watched}`;
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                  const parsed = JSON.parse(saved);
                  if (parsed.duration && parsed.duration > 0) {
                    metaMap[item.id] = {
                      duration: parsed.duration,
                      progress: parsed.currentTime || item.progress_seconds || 0
                    };
                  }
                }
              } catch {
                // Ignore
              }
            });
            setLocalMeta((prev) => ({ ...prev, ...metaMap }));
          }
        });
    }
  }, [user, supabase]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic UI update
    setItems((prev) => prev.filter((item) => item.id !== id));

    try {
      const { error } = await supabase.from("watch_history").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete watch history", error);
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
        {items.map((item) => {
          const resolvedDuration = localMeta[item.id]?.duration || item.duration_seconds || 1440;
          const resolvedProgress = localMeta[item.id]?.progress || item.progress_seconds || 0;
          const progressPercent = Math.min(100, Math.max(5, (resolvedProgress / resolvedDuration) * 100));

          return (
            <Link 
              href={`/anime/${item.anime_slug}`} 
              key={item.id}
              className="group relative rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105"
            >
              <div className="aspect-[16/9] relative">
                <AnimeImage 
                  src={item.poster_image} 
                  alt={item.anime_title} 
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-none" />
                
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
                  <h3 className="text-white font-bold text-sm truncate" title={item.anime_title}>
                    {item.anime_title}
                  </h3>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <p className="text-blue-400 font-semibold">
                      Episode {item.last_episode_watched}
                    </p>
                    {resolvedProgress > 0 ? (
                      <span className="text-slate-400 font-mono text-[11px]">
                        {formatTime(resolvedProgress)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Playback Progress Bar */}
                {resolvedProgress > 0 ? (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div 
                      className="h-full bg-blue-500 rounded-r shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
