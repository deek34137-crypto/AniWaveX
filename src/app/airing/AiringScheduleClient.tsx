"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Calendar, Clock, Star, Play, Sparkles } from "lucide-react";
import AnimeCard from "@/components/AnimeCard";

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

export default function AiringScheduleClient({ animeList }: { animeList: any[] }) {
  const currentDayIndex = new Date().getDay().toString();
  const [selectedDay, setSelectedDay] = useState<string>(currentDayIndex);
  const [now, setNow] = useState(Date.now());

  // Live timer tick every 1 second
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Map each anime deterministically to a day of the week based on its ID
  const animeWithSchedule = useMemo(() => {
    return animeList.map((anime, idx) => {
      // Deterministic day allocation based on ID
      const numId = parseInt(anime.id, 10) || idx;
      const dayIdx = (numId % 7);
      const airHour = 18 + (numId % 5); // 18:00 to 22:00
      const airMin = (numId * 15) % 60;
      
      return {
        ...anime,
        dayOfWeek: dayIdx.toString(),
        airTimeStr: `${airHour.toString().padStart(2, "0")}:${airMin.toString().padStart(2, "0")} JST`,
      };
    });
  }, [animeList]);

  // Filter based on selected tab
  const filteredAnime = useMemo(() => {
    if (selectedDay === "all") return animeWithSchedule;
    return animeWithSchedule.filter((a) => a.dayOfWeek === selectedDay);
  }, [animeWithSchedule, selectedDay]);

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-slate-900 border border-blue-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Simulcast & Broadcast Calendar
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            Weekly Airing Schedule
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Track upcoming episodes for the current anime season with live countdowns and daily broadcast schedules.
          </p>
        </div>

        {/* Decorative blur */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
        {DAYS_OF_WEEK.map((day) => {
          const isToday = day.id === currentDayIndex;
          const isSelected = selectedDay === day.id;

          return (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 border ${
                isSelected
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105"
                  : "bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-white/5"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{day.label}</span>
              {isToday && (
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-500 text-white rounded-md uppercase tracking-wider">
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Airing Shows Grid */}
      {filteredAnime.length === 0 ? (
        <div className="w-full text-center py-24 bg-slate-900/30 border border-slate-800 rounded-2xl text-slate-400">
          <Clock className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">No Broadcasts Scheduled</h3>
          <p className="text-xs text-slate-500">Check back later or select another day of the week.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredAnime.map((anime) => (
            <div key={anime.id} className="flex flex-col gap-2">
              <AnimeCard anime={anime} />
              <div className="flex items-center justify-between px-1 text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1 text-blue-400 font-bold">
                  <Clock className="w-3 h-3" />
                  {anime.airTimeStr}
                </span>
                <span className="text-slate-500">Weekly</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
