'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Film,
  PlayCircle,
  CheckCircle2,
  Clock,
  Bookmark,
  Calendar,
  Sparkles,
  ExternalLink,
  Edit3,
  Layers,
  Share2,
  Check,
  Trophy,
  Tv,
} from 'lucide-react';
import AnimeImage from '@/components/AnimeImage';
import { getAvatarUrl, getFallbackInitials } from '@/lib/avatars';
import { PROFILE_BANNER_PRESETS } from '@/lib/tierlist';

export interface SharedProfileData {
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  avatarId?: string;
  memberDate?: string;
  bannerPresetId?: string;
  customBannerUrl?: string;
  isOwner?: boolean;
  topFive?: any[];
  stats: {
    animeWatched: number;
    episodesWatched: number;
    completed: number;
    currentlyWatching: number;
    planToWatch?: number;
    totalWatchTimeHours: number;
    favoritesCount?: number;
  };
}

interface ProfileHeaderAndStatsProps {
  data: SharedProfileData;
  onEditClick?: () => void;
  onShareClick?: () => void;
  copied?: boolean;
}

export default function ProfileHeaderAndStats({
  data,
  onEditClick,
  onShareClick,
  copied = false,
}: ProfileHeaderAndStatsProps) {
  const {
    username,
    displayName = username,
    bio = 'Anime enthusiast exploring the finest series and movies on AniWaveX.',
    avatarUrl: providedAvatarUrl,
    avatarId,
    memberDate = 'Recently',
    bannerPresetId = 'cyberpunk',
    customBannerUrl,
    isOwner = false,
    topFive = [],
    stats,
  } = data;

  const avatarUrl = providedAvatarUrl || getAvatarUrl(avatarId);
  const initials = getFallbackInitials(displayName);
  const bannerPreset =
    PROFILE_BANNER_PRESETS.find((p) => p.id === bannerPresetId) || PROFILE_BANNER_PRESETS[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Dynamic Hero Profile Banner Card ── */}
      <div
        className={`relative overflow-hidden rounded-3xl border ${bannerPreset.border} shadow-2xl bg-gradient-to-r ${bannerPreset.gradient} min-h-[240px] sm:min-h-[280px] p-6 sm:p-8 flex flex-col justify-end`}
      >
        {customBannerUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={customBannerUrl}
              alt="Profile banner"
              fill
              unoptimized
              className="object-cover opacity-35"
            />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent z-0" />

        {/* Action Controls */}
        <div className="relative z-10 flex sm:absolute sm:top-6 sm:right-6 items-center gap-2 flex-wrap justify-start sm:justify-end mb-4 sm:mb-0 w-full sm:w-auto">
          {isOwner && onEditClick && (
            <button
              type="button"
              onClick={onEditClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all border border-white/10 backdrop-blur-md shadow-lg active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-400" />
              <span>Edit Profile</span>
            </button>
          )}

          <Link
            href="/tier-list"
            className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all border border-white/10 backdrop-blur-md shadow-lg active:scale-95"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Tier Lists</span>
          </Link>

          {onShareClick && (
            <button
              type="button"
              onClick={onShareClick}
              className="flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Link!' : 'Share Profile'}</span>
            </button>
          )}
        </div>

        {/* Profile Info Details */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900/90 shadow-2xl shrink-0 flex items-center justify-center text-3xl font-black text-white">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                sizes="112px"
                unoptimized
                className="object-cover"
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mb-1 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{displayName}</h1>
              <span className="px-2.5 py-0.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] sm:text-xs font-bold rounded-lg uppercase tracking-wider">
                Otaku
              </span>
            </div>
            <p className="text-xs sm:text-sm font-mono text-slate-400 mb-1.5">@{username}</p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl line-clamp-2 mb-2">
              &quot;{bio}&quot;
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Member since {memberDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Unified Statistics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Watch Time */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-white">{stats.totalWatchTimeHours} hrs</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Watch Time
            </div>
          </div>
        </div>

        {/* 2. Episodes Watched */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-white">{stats.episodesWatched}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Episodes Watched
            </div>
          </div>
        </div>

        {/* 3. Completed Shows */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-white">{stats.completed}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Completed Shows
            </div>
          </div>
        </div>

        {/* 4. Active Watchlist */}
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-white">
              {stats.currentlyWatching + (stats.planToWatch || 0)}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Watchlist Items
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
