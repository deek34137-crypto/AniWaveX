"use client";

import { useState } from "react";
import { Play, Bookmark, Share2, MessageSquare, Star, Calendar, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
interface HeroProps {
  title: string;
  year: string;
  rating: number;
  status: string;
  tags: string[];
  anime: any;
  initialBookmarked?: boolean;
  user?: any;
  lastWatchedEpisode?: number | null;
  onPlayEpisode?: (ep: any) => void;
}

export default function Hero({ anime, initialBookmarked = false, user, lastWatchedEpisode, onPlayEpisode }: HeroProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const handleBookmark = async () => {
    if (!user) {
      alert("Please log in to save bookmarks!");
      return;
    }

    // Optimistic UI update
    setIsBookmarked(!isBookmarked);
    setIsSaving(true);

    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('anime_slug', anime.slug);
          
        if (error) throw error;
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id, 
            anime_slug: anime.slug,
            anime_title: anime.title,
            poster_image: anime.posterImage
          });
          
        if (error) throw error;
      }
    } catch (error) {
      console.error("Bookmark error:", error);
      // Revert optimistic update
      setIsBookmarked(isBookmarked);
      alert("Failed to save bookmark.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full h-[85vh] min-h-[600px] flex items-end">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${anime.backgroundImage || anime.posterImage}')` }}
      />
      
      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent h-1/2 bottom-0" />

      {/* Content Container */}
      <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pb-24 z-10 flex flex-col md:flex-row gap-10 items-end">
        
        {/* Poster (Hidden on mobile, visible on md+) */}
        <div className="hidden md:block w-64 shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
          <img 
            src={anime.posterImage} 
            alt={anime.title} 
            className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
          />
        </div>

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

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight drop-shadow-xl">
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
            
            <button 
              onClick={handleBookmark}
              disabled={isSaving}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 font-semibold rounded-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 border ${
                isBookmarked 
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' 
                  : 'bg-slate-800/50 hover:bg-slate-700/50 text-white border-white/10'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
              {isSaving ? "Saving..." : isBookmarked ? "Saved to Watchlist" : "Add to Watchlist"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
