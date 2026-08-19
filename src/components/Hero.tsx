"use client";

import { useState, useEffect } from "react";
import { Play, Bookmark, Star, Calendar, Clock, ChevronDown, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { WATCHLIST_STATUSES, WatchlistStatus } from "@/lib/watchlist";
import Image from "next/image";

interface HeroProps {
  anime: any;
  initialBookmarked?: boolean;
  initialBookmarkStatus?: WatchlistStatus | null;
  user?: any;
  lastWatchedEpisode?: number | null;
  onPlayEpisode?: (ep: any) => void;
}

export default function Hero({ 
  anime, 
  initialBookmarked = false, 
  initialBookmarkStatus = 'watching',
  user, 
  lastWatchedEpisode, 
  onPlayEpisode 
}: HeroProps) {
  const [currentUser, setCurrentUser] = useState<any>(user);
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [currentStatus, setCurrentStatus] = useState<WatchlistStatus>(initialBookmarkStatus || 'watching');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => {
    supabase.auth.getUser().then((res: any) => {
      if (res?.data?.user) setCurrentUser(res.data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setCurrentUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSetStatus = async (status: WatchlistStatus) => {
    let activeUser = currentUser || user;
    if (!activeUser) {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (liveUser) {
        activeUser = liveUser;
        setCurrentUser(liveUser);
      }
    }

    if (!activeUser) {
      alert("Please log in to save bookmarks!");
      return;
    }

    setIsSaving(true);
    setIsBookmarked(true);
    setCurrentStatus(status);
    setIsDropdownOpen(false);

    try {
      const { error } = await supabase
        .from('bookmarks')
        .upsert({
          user_id: activeUser.id, 
          anime_slug: anime.slug,
          anime_title: anime.title,
          poster_image: anime.posterImage,
          status: status,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id, anime_slug'
        });
        
      if (error) throw error;
    } catch (error) {
      console.error("Bookmark status error:", error);
      alert("Failed to update status.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBookmark = async () => {
    let activeUser = currentUser || user;
    if (!activeUser) {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (liveUser) {
        activeUser = liveUser;
        setCurrentUser(liveUser);
      }
    }

    if (!activeUser) return;
    setIsSaving(true);
    setIsBookmarked(false);
    setIsDropdownOpen(false);

    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', activeUser.id)
        .eq('anime_slug', anime.slug);
        
      if (error) throw error;
    } catch (error) {
      console.error("Remove bookmark error:", error);
      setIsBookmarked(true);
    } finally {
      setIsSaving(false);
    }
  };

  const activeStatusConfig = WATCHLIST_STATUSES[currentStatus] || WATCHLIST_STATUSES.watching;

  const bgImage = anime.backgroundImage || anime.posterImage;

  return (
    <div className="relative w-full h-[85vh] min-h-[500px] md:min-h-[600px] flex items-end overflow-hidden">
      {/* Background Image */}
      {bgImage ? (
        <div className="absolute inset-0">
          <Image
            src={bgImage}
            alt={anime.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ) : null}
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent h-1/2 bottom-0" />

      {/* Content Container */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pb-12 md:pb-24 z-10 flex flex-col md:flex-row gap-6 md:gap-10 items-end">
        
        {/* Poster (Hidden on mobile, visible on md+) */}
        {anime.posterImage ? (
          <div className="hidden md:block w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group bg-slate-900">
            <Image 
              src={anime.posterImage} 
              alt={anime.title} 
              fill
              sizes="256px"
              priority
              className="object-cover transform transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : null}

        {/* Text Details */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-md border border-blue-500/30">
              {anime.status}
            </span>
            <div className="flex gap-2">
              {anime.tags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-white/5 text-slate-300 text-xs font-medium rounded-md border border-white/5">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-xl">
            {anime.title}
          </h1>

          <div className="flex items-center gap-6 text-sm font-medium text-slate-300">
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-lg font-bold">{anime.rating}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{anime.year}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{anime.duration || '24m'}</span>
            </div>
            <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs border border-white/10">HD</span>
            <span className="px-2 py-0.5 bg-white/10 text-white rounded text-xs border border-white/10">CC</span>
          </div>

          <p className="text-slate-300 text-base md:text-lg max-w-3xl line-clamp-3 mt-2 leading-relaxed">
            {anime.description}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mt-6 w-full sm:w-auto">
            {lastWatchedEpisode ? (
              <button 
                onClick={() => {
                  const ep = anime.episodes?.find((e: any) => e.id === lastWatchedEpisode);
                  if (ep && onPlayEpisode) onPlayEpisode(ep);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Continue Ep {lastWatchedEpisode}
              </button>
            ) : (
              <button 
                onClick={() => {
                  const ep = anime.episodes?.[0];
                  if (ep && onPlayEpisode) onPlayEpisode(ep);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" />
                Watch Episode 1
              </button>
            )}
            
            {/* Categorized Watchlist Dropdown (Feature 3.5) */}
            <div className="relative w-full sm:w-auto">
              <div className={`flex items-center rounded-xl backdrop-blur-md transition-all border ${
                isBookmarked 
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                  : 'bg-slate-800/50 hover:bg-slate-700/50 text-white border-white/10'
              }`}>
                <button 
                  onClick={() => {
                    if (isBookmarked) {
                      setIsDropdownOpen(!isDropdownOpen);
                    } else {
                      handleSetStatus('watching');
                    }
                  }}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-4 font-semibold hover:scale-105 active:scale-95 transition-all"
                >
                  <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isSaving ? "Saving..." : isBookmarked ? activeStatusConfig.label : "Add to Watchlist"}
                </button>

                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-3 py-4 border-l border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-r-xl transition-colors"
                  title="Change watchlist status"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Status Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Watchlist Status
                  </div>
                  {Object.values(WATCHLIST_STATUSES).map((status) => {
                    const isSelected = isBookmarked && currentStatus === status.id;
                    return (
                      <button
                        key={status.id}
                        onClick={() => handleSetStatus(status.id as WatchlistStatus)}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left hover:bg-slate-800 transition-colors ${
                          isSelected ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${status.id === 'watching' ? 'bg-blue-400' : status.id === 'plan_to_watch' ? 'bg-amber-400' : status.id === 'completed' ? 'bg-emerald-400' : status.id === 'on_hold' ? 'bg-purple-400' : 'bg-rose-400'}`} />
                          {status.label}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                      </button>
                    );
                  })}
                  {isBookmarked && (
                    <div className="pt-1 mt-1 border-t border-slate-800">
                      <button
                        onClick={handleRemoveBookmark}
                        className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 text-left font-medium transition-colors"
                      >
                        Remove from Watchlist
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
