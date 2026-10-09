"use client";

import React, { useState, useEffect, useMemo, useRef, memo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Star,
  Radio,
  Play,
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import type { AiringAnimeScheduleItem } from "@/lib/schedule";

type TimezoneMode = "local" | "jst";
const JST_TIMEZONE = "Asia/Tokyo";

const WEEKDAYS_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function computeDayOfWeek(epochSeconds: number, mode: TimezoneMode): number {
  const date = new Date(epochSeconds * 1000);
  if (mode === "jst") {
    try {
      const weekdayStr = new Intl.DateTimeFormat("en-US", {
        timeZone: JST_TIMEZONE,
        weekday: "short",
      }).format(date);
      return WEEKDAYS_MAP[weekdayStr] ?? date.getUTCDay();
    } catch {
      return date.getUTCDay();
    }
  }
  return date.getDay();
}

function computeTodayDayId(mode: TimezoneMode): number {
  const now = new Date();
  if (mode === "jst") {
    try {
      const weekdayStr = new Intl.DateTimeFormat("en-US", {
        timeZone: JST_TIMEZONE,
        weekday: "short",
      }).format(now);
      return WEEKDAYS_MAP[weekdayStr] ?? now.getUTCDay();
    } catch {
      return now.getUTCDay();
    }
  }
  return now.getDay();
}

function computeAirTimeDisplay(epochSeconds: number, mode: TimezoneMode): string {
  if (!epochSeconds) return "--:--";
  const date = new Date(epochSeconds * 1000);
  const options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  if (mode === "jst") {
    options.timeZone = JST_TIMEZONE;
  }
  try {
    return new Intl.DateTimeFormat([], options).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

// Countdown timer helper
function getCountdown(targetEpochSeconds?: number, nowEpochSeconds = Math.floor(Date.now() / 1000)) {
  if (!targetEpochSeconds) return { text: "", isLive: false };
  const diff = targetEpochSeconds - nowEpochSeconds;
  if (diff <= 0) return { text: "Airing Now", isLive: true };

  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);

  let text: string;
  if (d > 0) text = `In ${d}d ${h}h`;
  else if (h > 0) text = `In ${h}h ${m}m`;
  else text = `In ${m}m`;

  return { text, isLive: false };
}

const AiringCountdownBadge = memo(function AiringCountdownBadge({
  airingAt,
}: {
  airingAt?: number;
}) {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!airingAt) return;
    if (airingAt - Math.floor(Date.now() / 1000) <= 0) return;

    const t = setInterval(() => {
      const remaining = airingAt - Math.floor(Date.now() / 1000);
      setNowSec(Math.floor(Date.now() / 1000));
      if (remaining <= 0) clearInterval(t);
    }, 1000);

    return () => clearInterval(t);
  }, [airingAt]);

  const countdown = getCountdown(airingAt, nowSec);

  if (countdown.isLive) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-red-600/30 text-red-400 border border-red-500/50 animate-pulse">
        <Radio className="w-2.5 h-2.5" />
        LIVE
      </span>
    );
  }

  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 font-mono">
      {countdown.text}
    </span>
  );
});

interface TodayAiringRowProps {
  initialSchedule?: AiringAnimeScheduleItem[];
}

export default function TodayAiringRow({ initialSchedule = [] }: TodayAiringRowProps) {
  const [schedule, setSchedule] = useState<AiringAnimeScheduleItem[]>(initialSchedule);
  const [hasMounted, setHasMounted] = useState(false);
  const [tzMode, setTzMode] = useState<TimezoneMode>("local");
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Client-side timezone preference check & fallback fetch if initialSchedule is empty
  useEffect(() => {
    setHasMounted(true);
    try {
      const stored = localStorage.getItem("aniwavex_schedule_tz");
      if (stored === "jst" || stored === "local") {
        setTzMode(stored);
      }
    } catch {}

    if (!initialSchedule || initialSchedule.length === 0) {
      fetch("/api/schedule")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (Array.isArray(data?.schedule) && data.schedule.length > 0) {
            setSchedule(data.schedule);
          }
        })
        .catch(() => {});
    }
  }, [initialSchedule]);

  // Compute today's 6-7 airing items
  const displayItems = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];

    const effectiveTz = hasMounted ? tzMode : "local";
    const todayDay = hasMounted ? computeTodayDayId(effectiveTz) : new Date().getDay();

    // Primary: Anime airing today
    const todayList = schedule.filter(
      (item) => computeDayOfWeek(item.airingAt, effectiveTz) === todayDay
    );

    // If fewer than 6, fill with subsequent upcoming anime
    let finalItems = [...todayList];
    if (finalItems.length < 6) {
      const remaining = schedule.filter(
        (it) => !todayList.some((t) => t.id === it.id || t.slug === it.slug)
      );
      finalItems = [...finalItems, ...remaining];
    }

    // Take top 6-7 items
    return finalItems.slice(0, 7).map((item) => ({
      ...item,
      formattedTime: computeAirTimeDisplay(item.airingAt, effectiveTz),
      isTodayMatch: computeDayOfWeek(item.airingAt, effectiveTz) === todayDay,
    }));
  }, [schedule, hasMounted, tzMode]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const amount = direction === "left" ? -500 : 500;
      scrollContainerRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  if (!displayItems || displayItems.length === 0) {
    return null;
  }

  return (
    <section className="w-full mt-8 mb-6 group/row relative">
      {/* Section Header: Title + Live Indicator + More with Arrow */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Airing Today
              </h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Schedule
              </span>
            </div>
          </div>
        </div>

        {/* More with Arrow Button leading to /airing */}
        <Link
          href="/airing"
          prefetch={true}
          className="group/more inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none rounded-lg px-2.5 py-1 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20"
        >
          <span>More</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover/more:translate-x-1" />
        </Link>
      </div>

      <div className="relative">
        {/* Desktop / TV Left Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("left")}
          className="hidden md:flex absolute -left-3 lg:-left-5 tv:-left-7 top-1/2 -translate-y-1/2 z-30 w-11 h-11 tv:w-14 tv:h-14 items-center justify-center rounded-full bg-slate-950/90 hover:bg-cyan-600 border border-white/20 text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none hover:scale-110 active:scale-95"
          aria-label="Scroll Airing Today left"
        >
          <ChevronLeft className="w-6 h-6 tv:w-8 tv:h-8" />
        </button>

        {/* Horizontal Rail of 6-7 Airing Cards */}
        <div
          ref={scrollContainerRef}
          data-tv-rail="true"
          className="tv-horizontal-rail flex overflow-x-auto gap-3.5 sm:gap-5 tv:gap-6 pb-4 px-2 snap-x snap-mandatory hide-scrollbar scroll-smooth"
        >
          {displayItems.map((anime) => {
            const isLive = anime.airingAt <= nowSeconds;

            return (
              <div
                key={anime.id || anime.slug}
                className="snap-start shrink-0 w-[145px] sm:w-[175px] md:w-[200px] lg:w-[225px] xl:w-[245px] 2xl:w-[260px] tv:w-[280px]"
              >
                <Link
                  href={`/anime/${anime.slug}`}
                  prefetch={true}
                  className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-cyan-500/60 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(6,182,212,0.25)] hover:scale-[1.02] flex flex-col focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                    <AnimeImage
                      src={anime.posterImage}
                      alt={anime.title}
                      sizes="(max-width: 640px) 145px, (max-width: 768px) 175px, (max-width: 1024px) 200px, (max-width: 1280px) 225px, 260px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent pointer-events-none" />

                    {/* Live Glowing Border */}
                    {isLive && (
                      <div className="absolute inset-0 rounded-2xl border-2 border-red-500/70 animate-pulse pointer-events-none z-20" />
                    )}

                    {/* Top Badges: Episode & Rating */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm ${
                          isLive
                            ? "bg-red-600/90 text-white"
                            : "bg-cyan-600/90 text-white"
                        }`}
                      >
                        EP {anime.nextEpisodeNumber}
                      </span>

                      {anime.rating && anime.rating !== "N/A" && (
                        <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 shadow-sm">
                          <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
                          <span className="text-[11px] font-bold text-white">
                            {anime.rating}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Play Button on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                      <div className="w-11 h-11 bg-cyan-500/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Bottom Metadata Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-10">
                      {/* Air Time & Countdown Badge */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-cyan-300 font-mono">
                          <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                          {anime.formattedTime}
                        </span>

                        <AiringCountdownBadge airingAt={anime.airingAt} />
                      </div>

                      {/* Anime Title */}
                      <h3
                        className="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-cyan-400 transition-colors drop-shadow-md"
                        title={anime.title}
                      >
                        {anime.title}
                      </h3>

                      {/* Studio / Today Tag */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span className="truncate max-w-[100px] text-slate-300 font-medium">
                          {anime.studio || (anime.genres?.length ? anime.genres[0] : "Anime")}
                        </span>
                        {anime.isTodayMatch && (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Today
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}

          {/* End Card: View Full Schedule */}
          <div className="snap-start shrink-0 w-[145px] sm:w-[175px] md:w-[200px] flex items-stretch">
            <Link
              href="/airing"
              prefetch={true}
              className="w-full aspect-[2/3] rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950 border border-white/10 hover:border-cyan-500/50 flex flex-col items-center justify-center p-4 text-center group transition-all hover:scale-[1.02] shadow-xl focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-cyan-500/20 transition-all">
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </div>
              <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                Full Schedule
              </span>
              <span className="text-xs text-slate-400 mt-1">
                View all releases
              </span>
            </Link>
          </div>
        </div>

        {/* Desktop / TV Right Scroll Button */}
        <button
          type="button"
          onClick={() => scroll("right")}
          className="hidden md:flex absolute -right-3 lg:-right-5 tv:-right-7 top-1/2 -translate-y-1/2 z-30 w-11 h-11 tv:w-14 tv:h-14 items-center justify-center rounded-full bg-slate-950/90 hover:bg-cyan-600 border border-white/20 text-white shadow-2xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none hover:scale-110 active:scale-95"
          aria-label="Scroll Airing Today right"
        >
          <ChevronRight className="w-6 h-6 tv:w-8 tv:h-8" />
        </button>
      </div>
    </section>
  );
}
