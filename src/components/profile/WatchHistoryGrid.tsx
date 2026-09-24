"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Star, Trash2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import AnimeImage from "@/components/AnimeImage";
import { filterActiveSequelPrequels, checkAnimeHasSequel } from "@/lib/franchise";

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

export default function WatchHistoryGrid({ 
  initialItems, 
  isOwner = true 
}: { 
  initialItems: WatchHistoryItem[]; 
  isOwner?: boolean; 
}) {
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

            // Background check for completed items without sequel
            data.forEach((item: any) => {
              if (item.last_episode_watched >= 11) {
                checkAnimeHasSequel({ slug: item.anime_slug, title: item.anime_title }).then((hasSequel) => {
                  if (!hasSequel) {
                    supabase
                      .from("watch_history")
                      .delete()
                      .eq("id", item.id)
                      .then(() => {});
                    setItems((prev) => prev.filter((it) => it.id !== item.id));
                  }
                });
              }
            });
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

  const visibleItems = filterActiveSequelPrequels(items);

  if (!visibleItems || visibleItems.length === 0) {
    return (
      <div className="w-full text-center py-16 px-4 bg-slate-900/40 border border-white/5 rounded-3xl flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-1">
          <Star className="w-6 h-6 text-yellow-400 fill-current" />
        </div>
        <h3 className="text-base font-bold text-white">No Watch History Yet</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Your recently watched anime episodes will automatically appear here.
        </p>
        <Link
          href="/catalog"
          className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
        >
          Discover Anime
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Star className="w-6 h-6 text-yellow-400" />
        Continue Watching
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {visibleItems.map((item) => {
          const resolvedDuration = localMeta[item.id]?.duration || item.duration_seconds || 1440;
          const resolvedProgress = localMeta[item.id]?.progress || item.progress_seconds || 0;
          const progressPercent = Math.min(100, Math.max(5, (resolvedProgress / resolvedDuration) * 100));

          return (
            <div 
              key={item.id}
              className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 transition-transform duration-300 hover:scale-105 shadow-lg"
            >
              {/* Media & Title Link */}
              <Link 
                href={`/anime/${item.anime_slug}${item.last_episode_watched ? `?ep=${item.last_episode_watched}` : ""}`} 
                className="block aspect-[2/3] relative cursor-pointer"
                aria-label={`Continue watching ${item.anime_title} Episode ${item.last_episode_watched || 1}`}
              >
                <AnimeImage 
                  src={item.poster_image} 
                  alt={item.anime_title} 
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
                
                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="w-14 h-14 bg-blue-600/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-xl">
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                
                {/* Bottom Title & Progress Info Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-3 sm:p-4 pointer-events-none bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                  <h3 className="text-white font-bold text-sm truncate" title={item.anime_title}>
                    {item.anime_title}
                  </h3>
                  <div className="flex items-center justify-between text-xs mt-1">
                    <p className="text-blue-400 font-semibold text-[11px]">
                      Episode {item.last_episode_watched || 1}
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
              </Link>

              {/* Status / Episode Badge (matches Watchlist badge style) */}
              <div className="absolute top-2 left-2 z-20 pointer-events-none">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-md backdrop-blur-md bg-blue-600/20 text-blue-400 border-blue-500/30">
                  Episode {item.last_episode_watched || 1}
                </span>
              </div>

              {/* Delete Button (only if owner) */}
              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 hover:bg-red-500/90 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                  title="Remove from history"
                  aria-label={`Remove ${item.anime_title} from history`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
