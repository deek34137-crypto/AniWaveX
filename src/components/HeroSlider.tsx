"use client";

import { useState, useEffect } from "react";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import Image from "next/image";

interface HeroSliderProps {
  animeList: any[];
}

export default function HeroSlider({ animeList }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-slide every 6 seconds
  useEffect(() => {
    if (!animeList || animeList.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % animeList.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [animeList]);

  if (!animeList || animeList.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % animeList.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + animeList.length) % animeList.length);
  };

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] overflow-hidden rounded-3xl mt-6 group">
      {animeList.map((anime, index) => {
        const isActive = index === currentIndex;
        const imageUrl = anime.backgroundImage || anime.posterImage;
        return (
          <div 
            key={anime.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
          >
            {/* Optimized Background Image */}
            {imageUrl ? (
              <div className={`absolute inset-0 transition-transform duration-[10000ms] ${isActive ? 'scale-105' : 'scale-100'}`}>
                <Image
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
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute bottom-0 left-0 w-full max-w-4xl p-8 md:p-16 flex flex-col justify-end h-full">
              <h1 className={`text-5xl md:text-7xl font-black text-white tracking-tight mb-4 drop-shadow-2xl transition-all duration-700 delay-300 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                {anime.title}
              </h1>
              
              <p className={`text-slate-300 text-lg md:text-xl line-clamp-3 mb-8 max-w-2xl drop-shadow-md transition-all duration-700 delay-500 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                {anime.description}
              </p>

              <div className={`flex flex-col sm:flex-row items-center gap-4 transition-all duration-700 delay-700 transform ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
                <Link 
                  href={`/anime/${anime.slug}`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Watch Now
                </Link>
                
                <Link 
                  href={`/anime/${anime.slug}`}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-slate-500/40 hover:bg-slate-500/60 text-white font-semibold rounded-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95"
                >
                  <Info className="w-5 h-5" />
                  More Info
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Navigation Arrows */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
      >
        <ChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
      </button>

      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 md:p-3 rounded-full bg-black/30 hover:bg-black/60 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
      >
        <ChevronRight className="w-6 h-6 md:w-8 md:h-8" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-6 right-8 z-20 flex items-center gap-3">
        {animeList.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`transition-all duration-300 rounded-full ${
              idx === currentIndex 
                ? 'w-8 h-2 bg-blue-500' 
                : 'w-2 h-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
