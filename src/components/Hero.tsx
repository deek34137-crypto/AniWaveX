"use client";

import { Play, Star, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import { WatchlistStatus } from "@/lib/watchlist";
import AnimeImage from "@/components/AnimeImage";
import WatchlistDropdown from "@/components/WatchlistDropdown";

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
  const { user: authUser } = useAuth();
  const currentUser = authUser || initialUser;

  const bgImage = anime.backgroundImage || anime.posterImage;

  return (
    <div className="relative -mx-4 sm:mx-0 w-[calc(100%+2rem)] sm:w-full min-h-[380px] sm:min-h-[480px] md:min-h-[560px] tv:min-h-[640px] flex items-end overflow-hidden pt-6 sm:pt-16 md:pt-20 tv:pt-24 pb-6 md:pb-12 tv:pb-16 rounded-3xl tv:rounded-[2rem] border border-white/5 shadow-2xl">
      {/* Background Image Container with Ambient Glow for Mobile Fitting */}
      {bgImage ? (
        <div className="absolute inset-0 overflow-hidden">
          {/* Ambient blurred backdrop on mobile to prevent empty black edges on odd-aspect banners */}
          <div className="absolute inset-0 sm:hidden">
            <AnimeImage
              src={bgImage}
              alt={`${anime.title} ambient backdrop`}
              fill
              sizes="100vw"
              className="object-cover blur-2xl opacity-40 scale-110"
            />
          </div>
          {/* Main Sharp Hero Banner */}
          <AnimeImage
            src={bgImage}
            alt={`${anime.title} official visual banner`}
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
      <div className="relative w-full max-w-7xl tv:max-w-none mx-auto px-4 sm:px-6 tv:px-12 z-10 flex flex-col md:flex-row gap-4 sm:gap-6 md:gap-10 tv:gap-14 items-end">
        
        {/* Small Anime Poster Card (Mobile View Only) */}
        {anime.posterImage ? (
          <div className="flex md:hidden items-end gap-3.5 w-full mb-1">
            <div className="w-24 aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-2xl border border-white/20 relative group bg-slate-900 shadow-black/80">
              <AnimeImage 
                src={anime.posterImage} 
                alt={`${anime.title} poster visual`} 
                fill
                priority
                sizes="96px"
                className="object-cover transform transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Mobile Title & Meta next to small anime card */}
            <div className="flex-1 min-w-0 flex flex-col gap-1 pb-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {anime.status && (
                  <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-md border border-blue-500/30">
                    {anime.status}
                  </span>
                )}
                {anime.tags && anime.tags[0] && (
                  <Link
                    href={`/genre/${anime.tags[0].toLowerCase().replace(/\s+/g, '-')}`}
                    className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-medium rounded-md border border-white/5 truncate max-w-[120px] transition-colors"
                  >
                    {anime.tags[0]}
                  </Link>
                )}
              </div>
              <p className="text-base sm:text-2xl font-black text-white tracking-tight drop-shadow-xl leading-snug line-clamp-2" aria-hidden="true">
                {anime.title}
              </p>
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                {anime.rating && anime.rating !== "N/A" && (
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{anime.rating}</span>
                  </div>
                )}
                {anime.year && (
                  <Link href={`/year/${anime.year}`} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{anime.year}</span>
                  </Link>
                )}
                <span className="px-1.5 py-0.5 bg-white/10 text-white rounded text-[10px] border border-white/10 font-bold">HD</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Desktop Poster (Hidden on mobile, visible on md+) */}
        {anime.posterImage ? (
          <div className="hidden md:block w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group bg-slate-900">
            <AnimeImage 
              src={anime.posterImage} 
              alt={`${anime.title} key visual poster`} 
              fill
              sizes="256px"
              className="object-cover transform transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ) : null}

        {/* Text Details */}
        <div className="flex-1 flex flex-col gap-2.5 sm:gap-4 w-full">
          {/* Status & Genre Badges (Shown on desktop, or on mobile only if no poster) */}
          <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2.5 ${anime.posterImage ? 'hidden md:flex' : 'flex'}`}>
            {anime.status && (
              <span className="px-2.5 py-0.5 bg-blue-600/20 text-blue-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-md border border-blue-500/30">
                {anime.status}
              </span>
            )}
            {anime.tags && anime.tags.length > 0 ? (
              anime.tags.slice(0, 5).map((tag: string) => (
                <Link 
                  key={tag} 
                  href={`/genre/${tag.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-2.5 py-0.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-[11px] sm:text-xs font-medium rounded-md border border-white/5 hover:border-cyan-500/30 transition-colors"
                >
                  {tag}
                </Link>
              ))
            ) : null}
          </div>

          {/* Main Title (Semantic H1 for page SEO) */}
          <h1 className={`text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-xl leading-tight line-clamp-2 ${anime.posterImage ? 'hidden md:block' : 'block'}`}>
            {anime.title}
          </h1>

          {/* Meta Details Row (Shown on desktop, or on mobile only if no poster) */}
          <div className={`items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-slate-300 ${anime.posterImage ? 'hidden md:flex' : 'flex flex-wrap'}`}>
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm sm:text-base font-bold">{anime.rating}</span>
            </div>
            {anime.year && (
              <Link href={`/year/${anime.year}`} className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{anime.year}</span>
              </Link>
            )}
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
            <WatchlistDropdown
              anime={anime}
              initialBookmarked={initialBookmarked}
              initialBookmarkStatus={initialBookmarkStatus}
              user={currentUser}
              lastWatchedEpisode={lastWatchedEpisode}
              size="default"
              direction="up"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
