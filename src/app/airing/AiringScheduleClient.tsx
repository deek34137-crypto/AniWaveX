"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Clock, 
  Star, 
  Play, 
  Sparkles, 
  Search, 
  Tv, 
  Filter
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import type { AiringAnimeScheduleItem } from "@/lib/schedule";

const DAYS_OF_WEEK = [
  { id: "all", label: "All Airing", short: "All" },
  { id: "0", label: "Sunday", short: "Sun" },
  { id: "1", label: "Monday", short: "Mon" },
  { id: "2", label: "Tuesday", short: "Tue" },
  { id: "3", label: "Wednesday", short: "Wed" },
  { id: "4", label: "Thursday", short: "Thu" },
  { id: "5", label: "Friday", short: "Fri" },
  { id: "6", label: "Saturday", short: "Sat" },
];

function formatCountdown(targetEpochSeconds: number, nowEpochMs: number) {
  const diffSeconds = targetEpochSeconds - Math.floor(nowEpochMs / 1000);
  if (diffSeconds <= 0) {
    return { text: "Aired", isLive: true };
  }

  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  const mins = Math.floor((diffSeconds % 3600) / 60);
  const secs = diffSeconds % 60;

  if (days > 0) {
    return { text: `${days}d ${hours}h`, isLive: false };
  }
  if (hours > 0) {
    return { text: `${hours}h ${mins}m`, isLive: false };
  }
  return { text: `${mins}m ${secs}s`, isLive: false };
}

export default function AiringScheduleClient({ animeList }: { animeList: AiringAnimeScheduleItem[] }) {
  const currentDayIndex = new Date().getDay().toString();
  const [selectedDay, setSelectedDay] = useState<string>(currentDayIndex);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [now, setNow] = useState(Date.now());

  // Real-time 1s ticking clock for live countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Extract all unique genres
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    animeList.forEach((a) => a.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [animeList]);

  // Filter shows by Day, Search Query, and Genre
  const filteredAnime = useMemo(() => {
    return animeList.filter((anime) => {
      // 1. Day of week filter
      if (selectedDay !== "all" && anime.dayOfWeek.toString() !== selectedDay) {
        return false;
      }

      // 2. Genre filter
      if (selectedGenre !== "all" && !anime.genres?.includes(selectedGenre)) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = anime.title.toLowerCase().includes(q);
        const matchesRomaji = anime.romajiTitle?.toLowerCase().includes(q);
        const matchesGenre = anime.genres?.some((g) => g.toLowerCase().includes(q));
        if (!matchesTitle && !matchesRomaji && !matchesGenre) return false;
      }

      return true;
    });
  }, [animeList, selectedDay, selectedGenre, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/50 via-indigo-900/30 to-slate-900 border border-blue-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Tsuzuki & AniList Airing Engine
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            Weekly Airing Schedule
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Real-time simulcast releases, broadcast timers, and live countdowns across {animeList.length} seasonal anime series.
          </p>

          {/* Quick Search & Genre Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search anime title or genre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 outline-none focus:border-blue-500 transition-all backdrop-blur-md"
              />
            </div>

            {allGenres.length > 0 && (
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full sm:w-auto bg-slate-950/80 border border-white/15 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 outline-none focus:border-blue-500 transition-all backdrop-blur-md cursor-pointer"
              >
                <option value="all">All Genres</option>
                {allGenres.map((g) => (
                  <option key={g} value={g} className="bg-slate-900 text-white">
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Decorative blur backdrop */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        {DAYS_OF_WEEK.map((day) => {
          const isToday = day.id === currentDayIndex;
          const isSelected = selectedDay === day.id;
          const countForDay =
            day.id === "all"
              ? animeList.length
              : animeList.filter((a) => a.dayOfWeek.toString() === day.id).length;

          return (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 border ${
                isSelected
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] scale-105"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-white/5"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{day.label}</span>
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full font-extrabold ${
                  isSelected ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                }`}
              >
                {countForDay}
              </span>
              {isToday && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-500 text-white rounded-md uppercase tracking-wider shadow-sm">
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Airing Shows Grid with Vertical Rectangle Cards (aspect-[2/3]) */}
      {filteredAnime.length === 0 ? (
        <div className="w-full text-center py-24 bg-slate-900/30 border border-slate-800 rounded-3xl text-slate-400">
          <Clock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Broadcasts Found</h3>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No anime found matching "${searchQuery}".`
              : "No scheduled releases on this day. Select another day of the week."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {filteredAnime.map((anime) => {
            const countdown = formatCountdown(anime.airingAt, now);

            return (
              <Link
                key={anime.id}
                href={`/anime/${anime.slug}`}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] hover:scale-[1.02] flex flex-col"
              >
                {/* Vertical Poster Aspect Container (aspect-[2/3]) */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                  <AnimeImage
                    src={anime.posterImage}
                    alt={anime.title}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                    <span className="px-2 py-0.5 bg-blue-600/90 text-white text-[10px] font-extrabold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm">
                      EP {anime.nextEpisodeNumber}
                    </span>

                    {anime.rating && anime.rating !== "N/A" && (
                      <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 shadow-sm">
                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                        <span className="text-[11px] font-bold text-white">{anime.rating}</span>
                      </div>
                    )}
                  </div>

                  {/* Play Overlay Icon (Visible on hover) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
                    {/* Live Countdown Badge */}
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400">
                        <Clock className="w-3 h-3" />
                        {anime.airTimeStr}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          countdown.isLive
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                            : "bg-blue-600/20 text-blue-300 border border-blue-500/30 font-mono"
                        }`}
                      >
                        {countdown.text}
                      </span>
                    </div>

                    {/* Anime Title */}
                    <h3
                      className="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-blue-400 transition-colors drop-shadow-md"
                      title={anime.title}
                    >
                      {anime.title}
                    </h3>

                    {/* Genre / Streaming Tag */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="truncate max-w-[90px]">
                        {anime.genres && anime.genres.length > 0 ? anime.genres[0] : "Anime"}
                      </span>
                      {anime.streamingPlatforms && anime.streamingPlatforms.length > 0 ? (
                        <span className="text-slate-300 font-semibold truncate max-w-[70px]">
                          {anime.streamingPlatforms[0].site}
                        </span>
                      ) : (
                        <span className="text-slate-500">{anime.format || "TV"}</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
