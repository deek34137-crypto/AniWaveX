"use client";

import Image from "next/image";
import Link from "next/link";
import { getAvatarUrl, getFallbackInitials } from "@/lib/avatars";
import { UserStats, AccountTab } from "@/types/account";
import {
  Edit3,
  Settings,
  Film,
  PlayCircle,
  CheckCircle2,
  Clock,
  BookmarkCheck,
  Heart,
  Calendar,
  Sparkles,
  ExternalLink,
  History,
  Play,
} from "lucide-react";

interface ProfileOverviewSectionProps {
  user: any;
  profile: any;
  stats: UserStats;
  history?: any[];
  onNavigateTab: (tab: AccountTab) => void;
}

export default function ProfileOverviewSection({
  user,
  profile,
  stats,
  history = [],
  onNavigateTab,
}: ProfileOverviewSectionProps) {
  const avatarUrl = getAvatarUrl(profile?.custom_avatar_url || profile?.avatar_id);
  const displayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "User";
  const username = profile?.username || user?.email?.split("@")[0] || "user";
  const bio = profile?.bio || "Anime enthusiast exploring the finest series and movies on AniWaveX.";
  const initials = getFallbackInitials(displayName);

  // Format member since date
  const memberDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  // Format watch time in hours and minutes
  const totalMinutes = Math.floor((stats?.watch_time_seconds || 0) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  const watchTimeStr = hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Profile Header Card ── */}
      <div className="relative overflow-hidden bg-slate-900/70 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-slate-800 border-4 border-white/10 shadow-2xl shrink-0 group">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                sizes="128px"
                unoptimized
                className="object-cover transition-transform group-hover:scale-105 duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-4xl">
                {initials}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{displayName}</h1>
                <span className="px-2.5 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-lg uppercase tracking-wider">
                  Otaku
                </span>
              </div>
              <p className="text-sm font-mono text-slate-400 mt-0.5">@{username}</p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl line-clamp-3">
              &quot;{bio}&quot;
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Member since {memberDate}
              </span>

              <Link
                href={`/user/${encodeURIComponent(username)}`}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold hover:underline"
              >
                <span>View Public Profile</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Quick Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onNavigateTab("edit")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Profile
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("security")}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                Account Settings
              </button>

              <button
                type="button"
                onClick={() => onNavigateTab("connected")}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Connected Accounts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Real Statistics Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Film className="w-4 h-4 text-blue-400" />
            Watch Statistics
          </h2>
          <span className="text-xs text-slate-500">Live Database Metrics</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Anime Watched */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-white">{stats.anime_watched}</p>
              <p className="text-[11px] font-medium text-slate-400">Anime Watched</p>
            </div>
          </div>

          {/* 2. Episodes Watched */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-white">{stats.episodes_watched}</p>
              <p className="text-[11px] font-medium text-slate-400">Episodes Watched</p>
            </div>
          </div>

          {/* 3. Completed */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-white">{stats.completed}</p>
              <p className="text-[11px] font-medium text-slate-400">Completed</p>
            </div>
          </div>

          {/* 4. Currently Watching */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-white">{stats.currently_watching}</p>
              <p className="text-[11px] font-medium text-slate-400">Watching</p>
            </div>
          </div>

          {/* 5. Plan to Watch */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-white">{stats.plan_to_watch}</p>
              <p className="text-[11px] font-medium text-slate-400">Plan to Watch</p>
            </div>
          </div>

          {/* 6. Total Watch Time */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-white">{watchTimeStr}</p>
              <p className="text-[11px] font-medium text-slate-400">Total Watch Time</p>
            </div>
          </div>

          {/* 7. Favorites Showcase */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 shadow-lg flex items-center gap-3.5 col-span-2 sm:col-span-1">
            <div className="w-11 h-11 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg sm:text-xl font-black text-white">{stats.favorites_count} / 5</p>
              <p className="text-[11px] font-medium text-slate-400">Top Favorites</p>
            </div>
          </div>
        </div>

        {/* Graceful empty state when user hasn't watched anything */}
        {stats.anime_watched === 0 && stats.episodes_watched === 0 && (
          <div className="mt-4 p-6 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-300">Your anime journey has just begun! 🚀</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Start watching episodes or sync your library from AniList or MyAnimeList to populate your watch time and progress metrics.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Link
                href="/catalog"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Explore Catalog
              </Link>
              <button
                type="button"
                onClick={() => onNavigateTab("connected")}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Connect AniList / MAL
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Watch History Preview ── */}
      {history && history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Recently Watched
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab("history")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center gap-1"
            >
              <span>View All History ({history.length})</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {history.slice(0, 4).map((item: any) => {
              const progressPct =
                item.total_seconds && item.progress_seconds
                  ? Math.min(100, Math.round((item.progress_seconds / item.total_seconds) * 100))
                  : null;

              return (
                <div
                  key={item.id}
                  className="group relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:scale-[1.02] transition-all shadow-lg flex flex-col"
                >
                  <div className="relative aspect-[2/3] w-full bg-slate-950 overflow-hidden">
                    {item.poster_image ? (
                      <Image
                        src={item.poster_image}
                        alt={item.anime_title || "Anime"}
                        fill
                        sizes="240px"
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Film className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none" />
                    
                    {/* Resume Play Overlay */}
                    <Link
                      href={`/anime/${item.anime_slug}?ep=${item.last_episode_watched || 1}`}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]"
                      aria-label={`Continue watching ${item.anime_title || item.anime_slug}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </Link>

                    {/* Top Episode Badge */}
                    <div className="absolute top-2 left-2 z-10 pointer-events-none">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-md backdrop-blur-md bg-blue-600/20 text-blue-400 border-blue-500/30">
                        Ep {item.last_episode_watched || 1}
                      </span>
                    </div>

                    {/* Bottom Title & Progress Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none">
                      <h3 className="font-bold text-xs text-white truncate drop-shadow-md">
                        {item.anime_title || item.anime_slug}
                      </h3>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>
                          {item.updated_at
                            ? new Date(item.updated_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "Recently"}
                        </span>
                        {progressPct !== null && (
                          <span className="text-blue-400 font-bold">{progressPct}%</span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar Line */}
                    {progressPct !== null && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div
                          className="h-full bg-blue-500 rounded-r-full shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
