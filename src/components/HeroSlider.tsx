"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import AnimeImage from "@/components/AnimeImage";

interface HeroSliderProps {
  animeList: any[];
}

export default function HeroSlider({ animeList }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPreloadReady, setIsPreloadReady] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Defer preloading adjacent slides until after initial paint (1.5s) to guarantee sub-second LCP
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPreloadReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-slide every 6 seconds (paused on hover or when browser tab is in background)
  useEffect(() => {
    if (!animeList || animeList.length === 0) return;
    
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !isHovered) {
        setCurrentIndex((prev) => (prev + 1) % animeList.length);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [animeList, isHovered]);

  if (!animeList || animeList.length === 0) return null;

  const nextSlide = () => {
    setIsPreloadReady(true);
    setCurrentIndex((prev) => (prev + 1) % animeList.length);
  };

  const prevSlide = () => {
    setIsPreloadReady(true);
    setCurrentIndex((prev) => (prev - 1 + animeList.length) % animeList.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    touchStartX.current = null;
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[52vh] sm:h-[65vh] md:h-[70vh] min-h-[380px] sm:min-h-[500px] overflow-hidden rounded-2xl md:rounded-3xl mt-2 sm:mt-6 group shadow-2xl"
    >
      {animeList.map((anime, index) => {
        const isActive = index === currentIndex;
        const isAdjacent = 
          index === (currentIndex + 1) % animeList.length || 
          index === (currentIndex - 1 + animeList.length) % animeList.length;
        // On initial page load, only render the active slide to give 100% bandwidth to LCP
        const shouldRenderImage = isActive || (isPreloadReady && isAdjacent);
        const imageUrl = anime.backgroundImage || anime.posterImage;

        return (
          <div 
            key={anime.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
          >
            {/* Virtualized High-Performance Background Image */}
            {imageUrl && shouldRenderImage ? (
              <div className={`absolute inset-0 transition-transform duration-[10000ms] ${isActive ? 'scale-105' : 'scale-100'}`}>
                <AnimeImage
                  src={imageUrl}
                  alt={anime.title}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover object-center"
                />
              </div>
            ) : null}
            
            {/* Gradients for readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

            {/* Content — extra bottom padding on mobile to clear bottom nav */}
            <div className="absolute bottom-0 left-0 w-full max-w-4xl p-4 pb-14 sm:p-8 sm:pb-8 md:p-16 flex flex-col justify-end h-full">
              <h1 className={`text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight mb-2 sm:mb-4 drop-shadow-2xl transition-all duration-700 delay-300 transform line-clamp-2 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                {anime.title}
              </h1>
              
              <p className={`text-slate-300 text-xs sm:text-base md:text-xl line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-8 max-w-2xl drop-shadow-md transition-all duration-700 delay-500 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                {anime.description}
              </p>

              <div className={`flex flex-row items-center gap-2.5 sm:gap-4 transition-all duration-700 delay-700 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <Link 
                  href={`/anime/${anime.slug}`}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 sm:px-8 sm:py-4 bg-white hover:bg-slate-200 text-slate-900 text-xs sm:text-base font-bold rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.25)] transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Watch Now
                </Link>
                
                <Link 
                  href={`/anime/${anime.slug}`}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 sm:px-8 sm:py-4 bg-slate-500/40 hover:bg-slate-500/60 text-white text-xs sm:text-base font-semibold rounded-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                >
                  <Info className="w-4 h-4" />
                  More Info
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows — subtle on mobile (80% opacity), hover-only on desktop */}
      <button 
        onClick={prevSlide}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform hover:scale-110 shadow-lg"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-5 h-5 md:w-8 md:h-8" />
      </button>

      <button 
        onClick={nextSlide}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-sm opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform hover:scale-110 shadow-lg"
        aria-label="Next slide"
      >
        <ChevronRight className="w-5 h-5 md:w-8 md:h-8" />
      </button>

      {/* Pagination Dots (centered at bottom) */}
      <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3">
        {animeList.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex 
                ? 'w-6 sm:w-8 h-1.5 sm:h-2 bg-blue-500' 
                : 'w-1.5 sm:w-2 h-1.5 sm:h-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
