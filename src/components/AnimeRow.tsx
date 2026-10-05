"use client";

import { useRef } from "react";
import AnimeCard from "@/components/AnimeCard";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface AnimeRowProps {
  title: string;
  items: any[];
  viewAllHref?: string;
}

export default function AnimeRow({ title, items, viewAllHref }: AnimeRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -600 : 600;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full mt-10 mb-6 group/row relative">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none rounded-lg px-2 py-0.5"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      <div className="relative">
        {/* Desktop Left Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden md:flex absolute -left-3 lg:-left-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-slate-950/90 hover:bg-blue-600 border border-white/20 text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:outline-none hover:scale-110 active:scale-95"
          aria-label={`Scroll ${title} left`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Horizontal scroll container with responsive card sizes */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-3.5 sm:gap-5 pb-4 px-2 snap-x snap-mandatory hide-scrollbar scroll-smooth"
        >
          {items.map((anime) => (
            <div
              key={anime.id}
              className="snap-start shrink-0 w-[140px] sm:w-[175px] md:w-[200px] lg:w-[230px] xl:w-[250px] 2xl:w-[280px]"
            >
              <AnimeCard
                anime={anime}
                sizes="(max-width: 640px) 140px, (max-width: 768px) 175px, (max-width: 1024px) 200px, (max-width: 1280px) 230px, (max-width: 1536px) 250px, 280px"
              />
            </div>
          ))}
        </div>

        {/* Desktop Right Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="hidden md:flex absolute -right-3 lg:-right-5 top-1/2 -translate-y-1/2 z-30 w-11 h-11 items-center justify-center rounded-full bg-slate-950/90 hover:bg-blue-600 border border-white/20 text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-blue-400 focus-visible:outline-none hover:scale-110 active:scale-95"
          aria-label={`Scroll ${title} right`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
