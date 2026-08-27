"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Star,
  Play,
  Sparkles,
  Search,
  Radio,
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import type { AiringAnimeScheduleItem } from "@/lib/schedule";

const DAYS_OF_WEEK = [
  { id: "all", label: "All", full: "All Airing" },
  { id: "0",  label: "Sun", full: "Sunday" },
  { id: "1",  label: "Mon", full: "Monday" },
  { id: "2",  label: "Tue", full: "Tuesday" },
  { id: "3",  label: "Wed", full: "Wednesday" },
  { id: "4",  label: "Thu", full: "Thursday" },
  { id: "5",  label: "Fri", full: "Friday" },
  { id: "6",  label: "Sat", full: "Saturday" },
];

// ── Countdown helpers ────────────────────────────────────────────────────────

function getCountdown(targetEpochSeconds?: number, nowEpochSeconds = Math.floor(Date.now() / 1000)) {
  if (!targetEpochSeconds) return { text: "", isLive: false, isImminent: false };

  const diff = targetEpochSeconds - nowEpochSeconds;
  if (diff <= 0) return { text: "Airing Now", isLive: true, isImminent: false };

  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;

  const isImminent = diff < 3600; // under 1 hour → show seconds

  let text: string;
  if (d > 0)        text = `${d}d ${h}h`;
  else if (h > 0)   text = `${h}h ${m}m`;
  else               text = `${m}m ${s.toString().padStart(2, "0")}s`;

  return { text, isLive: false, isImminent };
}

// ── Isolated Countdown Badge ──────────────────────────────────────────────────

const AiringCountdownBadge = memo(function AiringCountdownBadge({
  airingAt,
}: {
  airingAt?: number;
}) {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!airingAt) return;
    const diff = airingAt - Math.floor(Date.now() / 1000);
    if (diff <= 0) return; // already live, no interval needed

    // If less than 1 hour, tick every second; otherwise update once every minute
    const intervalMs = diff < 3600 ? 1000 : 60000;
    const t = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, intervalMs);

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
    <span
      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded font-mono ${
        countdown.isImminent
          ? "bg-amber-600/25 text-amber-300 border border-amber-500/40"
          : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
      }`}
    >
      {countdown.text}
    </span>
  );
});

// ── Isolated Airing Anime Card ────────────────────────────────────────────────

const AiringAnimeCard = memo(function AiringAnimeCard({
  anime,
  todayId,
}: {
  anime: AiringAnimeScheduleItem;
  todayId: string;
}) {
  const isToday = anime.dayOfWeek.toString() === todayId;
  const isLive = Boolean(anime.airingAt && anime.airingAt <= Math.floor(Date.now() / 1000));

  return (
    <Link
      href={`/anime/${anime.slug}`}
      className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-[0_0_25px_rgba(37,99,235,0.25)] hover:scale-[1.02] flex flex-col"
    >
      {/* Vertical Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
        <AnimeImage
          src={anime.posterImage}
          alt={anime.title}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />

        {/* Airing-now glow border */}
        {isLive && (
          <div className="absolute inset-0 rounded-2xl border-2 border-red-500/70 animate-pulse pointer-events-none z-20" />
        )}

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
          {/* EP badge */}
          <span
            className={`px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md backdrop-blur-md shadow-sm ${
              isLive
                ? "bg-red-600/90 text-white"
                : "bg-blue-600/90 text-white"
            }`}
          >
            EP {anime.nextEpisodeNumber}
          </span>

          {/* Rating */}
          {anime.rating && anime.rating !== "N/A" && (
            <div className="flex items-center gap-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-white/10 shadow-sm">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-current" />
              <span className="text-[11px] font-bold text-white">
                {anime.rating}
              </span>
            </div>
          )}
        </div>

        {/* Play hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
          <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Bottom overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-10">
          {/* ── COUNTDOWN ROW ── */}
          <div className="flex items-center justify-between gap-1 mb-1.5">
            {/* Air time */}
            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-300">
              <Clock className="w-3 h-3 shrink-0" />
              {anime.airTimeStr}
            </span>

            {/* Isolated Countdown badge */}
            <AiringCountdownBadge airingAt={anime.airingAt} />
          </div>

          {/* Title */}
          <h3
            className="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-blue-400 transition-colors drop-shadow-md"
            title={anime.title}
          >
            {anime.title}
          </h3>

          {/* Studio / Today tag */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
            <span className="truncate max-w-[100px] text-slate-300 font-medium">
              {anime.studio ||
                (anime.genres?.length ? anime.genres[0] : "Anime")}
            </span>
            {isToday ? (
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Today
              </span>
            ) : (
              <span className="text-slate-500">
                {
                  DAYS_OF_WEEK.find(
                    (d) => d.id === anime.dayOfWeek.toString()
                  )?.label
                }
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
});

// ── Component ────────────────────────────────────────────────────────────────

export default function AiringScheduleClient({
  animeList,
}: {
  animeList: AiringAnimeScheduleItem[];
}) {
  const todayId = new Date().getDay().toString();
  const [selectedDay, setSelectedDay] = useState<string>(todayId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [tabsSticky, setTabsSticky] = useState(false);

  const tabsRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const todayTabRef = useRef<HTMLButtonElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: make tabs sticky when sentinel scrolls out of view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => setTabsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px" }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, []);

  // Auto-scroll the tabs strip so "Today" tab is centred on mount
  useEffect(() => {
    const strip = tabsScrollRef.current;
    const todayBtn = todayTabRef.current;
    if (!strip || !todayBtn) return;
    const stripMid = strip.offsetWidth / 2;
    const btnMid = todayBtn.offsetLeft + todayBtn.offsetWidth / 2;
    strip.scrollLeft = btnMid - stripMid;
  }, []);

  // All unique genres
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    animeList.forEach((a) => a.genres?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [animeList]);

  // Filtered list
  const filteredAnime = useMemo(() => {
    return animeList.filter((anime) => {
      if (selectedDay !== "all" && anime.dayOfWeek.toString() !== selectedDay)
        return false;
      if (selectedGenre !== "all" && !anime.genres?.includes(selectedGenre))
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !anime.title.toLowerCase().includes(q) &&
          !anime.romajiTitle?.toLowerCase().includes(q) &&
          !anime.studio?.toLowerCase().includes(q) &&
          !anime.genres?.some((g) => g.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [animeList, selectedDay, selectedGenre, searchQuery]);

  // Count per day for badge numbers
  const countByDay = useMemo(() => {
    const map: Record<string, number> = { all: animeList.length };
    animeList.forEach((a) => {
      const k = a.dayOfWeek.toString();
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [animeList]);

  // ── Shared Tab Strip ────────────────────────────────────────────────────────
  const renderTabStrip = useCallback(
    (compact = false) => (
      <div
        ref={compact ? undefined : tabsScrollRef}
        className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {DAYS_OF_WEEK.map((day) => {
          const isToday = day.id === todayId;
          const isSelected = selectedDay === day.id;
          const count = countByDay[day.id] ?? 0;

          return (
            <button
              key={day.id}
              ref={isToday && !compact ? todayTabRef : undefined}
              onClick={() => setSelectedDay(day.id)}
              className={`relative flex items-center gap-1.5 shrink-0 rounded-xl font-bold transition-all duration-200
                ${compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-xs sm:text-sm"}
                ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)] scale-105 border border-blue-400"
                    : isToday
                    ? "bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30"
                    : "bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:bg-slate-800"
                }`}
            >
              {/* Today pulse dot */}
              {isToday && !isSelected && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}

              <span>{compact ? day.label : day.full}</span>

              {/* Count badge */}
              <span
                className={`px-1.5 py-0.5 text-[10px] rounded-full font-extrabold ${
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-slate-500"
                }`}
              >
                {count}
              </span>

              {/* TODAY label */}
              {isToday && !compact && (
                <span className="px-1 py-0.5 text-[9px] font-black bg-emerald-500 text-white rounded uppercase tracking-wider">
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>
    ),
    [selectedDay, todayId, countByDay]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="w-full flex flex-col gap-6">

      {/* ── Header Banner ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/50 via-indigo-900/30 to-slate-900 border border-blue-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-3">
            <Sparkles className="w-4 h-4" />
            Japanese Simulcast &amp; Broadcast Schedule
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            Weekly Airing Anime
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Live Japanese TV broadcast schedules, episode countdowns, and
            simulcast releases across{" "}
            <span className="text-blue-400 font-bold">{animeList.length}</span>{" "}
            seasonal anime.
          </p>

          {/* Search + Genre */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, studio, genre…"
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

        {/* Decorative blur */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── Sentinel: when this scrolls out of view, tabs go sticky ── */}
      <div ref={sentinelRef} className="h-px w-full" />

      {/* ── Inline Tab Strip (visible before sticky kicks in) ── */}
      <div ref={tabsRef} className="relative">
        {renderTabStrip(false)}
      </div>

      {/* ── STICKY Tab Bar (portal-style, fixed to top) ── */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
          tabsSticky ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="bg-slate-950/95 backdrop-blur-xl border-b border-white/10 shadow-2xl px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            {/* Mini logo */}
            <span className="text-blue-400 font-black text-sm shrink-0 hidden sm:block">
              Schedule
            </span>
            <div className="flex-1 overflow-hidden">
              {renderTabStrip(true)}
            </div>
            {/* Result count */}
            <span className="text-slate-500 text-xs shrink-0 hidden sm:block">
              {filteredAnime.length} anime
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="flex items-center gap-4 text-xs text-slate-400 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span>
            <b className="text-white">{filteredAnime.length}</b> series
            {selectedDay !== "all" && ` on ${DAYS_OF_WEEK.find(d => d.id === selectedDay)?.full}`}
          </span>
        </span>
      </div>

      {/* ── Anime Grid ── */}
      {filteredAnime.length === 0 ? (
        <div className="w-full text-center py-24 bg-slate-900/30 border border-slate-800 rounded-3xl text-slate-400">
          <Clock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            No Broadcasts Found
          </h3>
          <p className="text-xs text-slate-500">
            {searchQuery
              ? `No anime found matching "${searchQuery}".`
              : "No scheduled releases on this day. Select another day."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
          {filteredAnime.map((anime) => (
            <AiringAnimeCard
              key={anime.id}
              anime={anime}
              todayId={todayId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
