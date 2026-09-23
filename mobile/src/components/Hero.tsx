"use client";

import { useState, useEffect } from "react";
import { Play, Bookmark, Star, Calendar, Clock, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { WATCHLIST_STATUSES, WatchlistStatus } from "@/lib/watchlist";
import AnimeImage from "@/components/AnimeImage";
import AuthModal from "./AuthModal";
import { handleAnimeCompleted } from "@/lib/franchise";

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
  user: initialUser, 
  lastWatchedEpisode, 
  onPlayEpisode 
}: HeroProps) {
  const { user: authUser, supabase, addBookmarkSlug, removeBookmarkSlug } = useAuth();
  const currentUser = authUser || initialUser;
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [currentStatus, setCurrentStatus] = useState<WatchlistStatus>(initialBookmarkStatus || 'watching');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSetStatus = async (status: WatchlistStatus) => {
    let activeUser = currentUser;
    if (!activeUser) {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (liveUser) {
        activeUser = liveUser;
      }
    }

    if (!activeUser) {
      setIsDropdownOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    setIsSaving(true);
    setIsBookmarked(true);
    setCurrentStatus(status);
    setIsDropdownOpen(false);
    if (anime?.slug) {
      addBookmarkSlug(anime.slug);
    }

    try {
      // 1. Check if record already exists
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', activeUser.id)
        .eq('anime_slug', anime.slug)
        .maybeSingle();

      if (existing?.id) {
        // Update existing record
        const { error } = await supabase
          .from('bookmarks')
          .update({
            status: status,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: activeUser.id,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: status
          });
        if (error) throw error;
      }

      // Also mirror to localStorage
      try {
        const localWatchlist = JSON.parse(localStorage.getItem('aniwavex_watchlist') || '[]');
        const updatedList = [
          {
            id: anime.slug,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: status,
            user_id: activeUser.id,
            created_at: new Date().toISOString()
          },
          ...localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)
        ];
        localStorage.setItem('aniwavex_watchlist', JSON.stringify(updatedList));
      } catch {}

      if (status === 'completed') {
        handleAnimeCompleted({
          anime: {
            slug: anime.slug,
            title: anime.title,
            animeId: anime.id || anime.animeId,
            posterImage: anime.posterImage || anime.backgroundImage,
            anilistId: anime.anilistId
          },
          supabase,
          userId: activeUser?.id,
          finalEpisode: anime.totalEpisodes || lastWatchedEpisode || 12
        });
      } else if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("aniwavex_watchlist_updated", {
          detail: { animeSlug: anime.slug, status }
        }));
      }
    } catch (error: any) {
      console.error("Bookmark status error:", error);
      // Seamlessly keep local state if network or db throws
      try {
        const localWatchlist = JSON.parse(localStorage.getItem('aniwavex_watchlist') || '[]');
        const updatedList = [
          {
            id: anime.slug,
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage || anime.backgroundImage,
            status: status,
            user_id: activeUser.id,
            created_at: new Date().toISOString()
          },
          ...localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)
        ];
        localStorage.setItem('aniwavex_watchlist', JSON.stringify(updatedList));
      } catch {}
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveBookmark = async () => {
    let activeUser = currentUser;
    if (!activeUser) {
      const { data: { user: liveUser } } = await supabase.auth.getUser();
      if (liveUser) {
        activeUser = liveUser;
      }
    }

    if (!activeUser) return;
    setIsSaving(true);
    setIsBookmarked(false);
    setIsDropdownOpen(false);
    if (anime?.slug) {
      removeBookmarkSlug(anime.slug);
    }

    try {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', activeUser.id)
        .eq('anime_slug', anime.slug);

      try {
        const localWatchlist = JSON.parse(localStorage.getItem('aniwavex_watchlist') || '[]');
        localStorage.setItem('aniwavex_watchlist', JSON.stringify(localWatchlist.filter((it: any) => it.anime_slug !== anime.slug)));
      } catch {}
    } catch (error) {
      console.error("Remove bookmark error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const activeStatusConfig = WATCHLIST_STATUSES[currentStatus] || WATCHLIST_STATUSES.watching;

  const bgImage = anime.backgroundImage || anime.posterImage;

  return (
    <div className="relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full min-h-[380px] sm:min-h-[500px] md:min-h-[620px] flex items-end overflow-hidden pt-6 sm:pt-24 md:pt-32 pb-6 md:pb-16">
      {/* Background Image Container with Ambient Glow for Mobile Fitting */}
      {bgImage ? (
        <div className="absolute inset-0 overflow-hidden">
          {/* Ambient blurred backdrop on mobile to prevent empty black edges on odd-aspect banners */}
          <div className="absolute inset-0 sm:hidden">
            <AnimeImage
              src={bgImage}
              alt=""
              fill
              sizes="100vw"
              className="object-cover blur-2xl opacity-40 scale-110"
            />
          </div>
          {/* Main Sharp Hero Banner */}
          <AnimeImage
            src={bgImage}
            alt={anime.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
      ) : null}
      
      {/* Desktop side gradient (hidden on mobile to prevent blacking out 75% of mobile screen) */}
      <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      {/* Vertical gradient: transparent at top so banner artwork is visible, fading to dark behind details at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent sm:via-slate-950/50" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent h-1/2 bottom-0" />
      {/* Top subtle shadow on mobile for navbar clarity */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-slate-950/70 to-transparent pointer-events-none md:hidden" />

      {/* Content Container */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 z-10 flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-10 items-end">
        
        {/* Poster (Hidden on mobile, visible on md+) */}
        {anime.posterImage ? (
          <div className="hidden md:block w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group bg-slate-900">
            <AnimeImage 
              src={anime.posterImage} 
              alt={anime.title} 
              fill
              sizes="256px"
              className="object-cover transform transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : null}

        {/* Text Details */}
        <div className="flex-1 flex flex-col gap-2.5 sm:gap-4 w-full">
          {/* Status & Genre Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            {anime.status && (
              <span className="px-2.5 py-0.5 bg-blue-600/20 text-blue-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-md border border-blue-500/30">
                {anime.status}
              </span>
            )}
            {anime.tags && anime.tags.length > 0 ? (
              anime.tags.slice(0, 5).map((tag: string) => (
                <span key={tag} className="px-2.5 py-0.5 bg-white/5 text-slate-300 text-[11px] sm:text-xs font-medium rounded-md border border-white/5">
                  {tag}
                </span>
              ))
            ) : null}
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-xl leading-tight line-clamp-2">
            {anime.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-slate-300">
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm sm:text-base font-bold">{anime.rating}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{anime.year}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{anime.duration || '24m'}</span>
            </div>
            <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] sm:text-xs border border-white/10 font-bold">HD</span>
            <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] sm:text-xs border border-white/10 font-bold">CC</span>
          </div>

          <p className="text-slate-300 text-xs sm:text-base md:text-lg max-w-3xl line-clamp-2 sm:line-clamp-3 mt-1 leading-relaxed">
            {anime.description}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-4 mt-3 sm:mt-6 w-full sm:w-auto">
            {lastWatchedEpisode ? (
              <button 
                onClick={() => {
                  const ep = anime.episodes?.find((e: any) => e.id === lastWatchedEpisode);
                  if (ep && onPlayEpisode) onPlayEpisode(ep);
                }}
                className="min-w-0 flex items-center justify-center gap-1.5 px-3 py-3 sm:px-8 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-base font-bold rounded-xl shadow-[0_0_25px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span className="truncate">Continue Ep {lastWatchedEpisode}</span>
              </button>
            ) : (
              <button 
                onClick={() => {
                  const ep = anime.episodes?.[0];
                  if (ep && onPlayEpisode) onPlayEpisode(ep);
                }}
                className="min-w-0 flex items-center justify-center gap-1.5 px-3 py-3 sm:px-8 sm:py-4 bg-white hover:bg-slate-200 text-slate-900 text-xs sm:text-base font-bold rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span className="truncate">Watch Ep {anime.episodes?.[0]?.id ?? 1}</span>
              </button>
            )}
            
            {/* Categorized Watchlist Dropdown */}
            <div className="relative min-w-0">
              <div className={`flex items-center rounded-xl backdrop-blur-md transition-all border ${
                isBookmarked 
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-white border-white/10'
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
                  className="flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2.5 py-3 sm:px-6 sm:py-4 text-xs sm:text-base font-semibold hover:scale-105 active:scale-95 transition-all"
                >
                  <Bookmark className={`w-4 h-4 shrink-0 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span className="truncate">
                    {isSaving ? "Saving..." : isBookmarked ? activeStatusConfig.label : "Watchlist"}
                  </span>
                </button>

                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  disabled={isSaving}
                  className="p-2.5 sm:py-4 sm:pr-3 text-slate-400 hover:text-white transition-colors border-l border-white/10 shrink-0"
                  aria-label="Change Watchlist Status"
                >
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>

              {/* Status Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 sm:left-0 bottom-full mb-2 w-48 sm:w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col z-50 animate-in fade-in zoom-in-95">
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
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
