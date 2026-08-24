"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Trophy, 
  Clock, 
  Tv, 
  CheckCircle2, 
  Bookmark, 
  Share2, 
  Check, 
  Sparkles, 
  Star, 
  Play, 
  Grid, 
  Layers, 
  Calendar,
  ExternalLink
} from "lucide-react";
import AnimeCard from "@/components/AnimeCard";
import AnimeImage from "@/components/AnimeImage";
import { getAvatarUrl } from "@/lib/avatars";
import { PROFILE_BANNER_PRESETS, AnimeTierList } from "@/lib/tierlist";

interface PublicProfileClientProps {
  username: string;
  user: any;
  bookmarks: any[];
  history: any[];
}

export default function PublicProfileClient({
  username,
  user,
  bookmarks: initialBookmarks,
  history: initialHistory,
}: PublicProfileClientProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"showcase" | "watchlist" | "tierlists">("showcase");
  const [watchlistFilter, setWatchlistFilter] = useState("all");
  const [tierLists, setTierLists] = useState<AnimeTierList[]>([]);

  const meta = user?.user_metadata || {};
  const bio = meta.bio || "Passionate anime fan exploring the finest series and movies on AniWaveX.";
  const avatarUrl = getAvatarUrl(meta.avatar_id);
  const topFive = meta.top_five_anime || [];
  const bannerPresetId = meta.banner_preset || "cyberpunk";
  const customBannerUrl = meta.custom_banner_url;

  const bannerPreset =
    PROFILE_BANNER_PRESETS.find((p) => p.id === bannerPresetId) || PROFILE_BANNER_PRESETS[0];

  // Load user's saved tier lists from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`aniwavex_tierlists_${username.toLowerCase()}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setTierLists(parsed);
        }
      }
    } catch {}
  }, [username]);

  // Compute stats
  const totalEpisodesWatched = initialHistory.length;
  const estimatedHours = Math.round((totalEpisodesWatched * 24) / 60);
  const completedCount = initialBookmarks.filter((b) => b.status === "completed").length;
  const watchingCount = initialBookmarks.filter((b) => b.status === "watching").length;

  const filteredBookmarks = useMemo(() => {
    if (watchlistFilter === "all") return initialBookmarks;
    return initialBookmarks.filter((b) => b.status === watchlistFilter);
  }, [initialBookmarks, watchlistFilter]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in duration-500">
      {/* 1. Hero Profile Banner */}
      <div
        className={`relative rounded-3xl overflow-hidden border ${bannerPreset.border} shadow-2xl bg-gradient-to-r ${bannerPreset.gradient} min-h-[260px] sm:min-h-[300px] flex flex-col justify-end p-6 sm:p-10`}
      >
        {/* Custom background image if provided */}
        {customBannerUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={customBannerUrl}
              alt="Banner"
              fill
              unoptimized
              className="object-cover opacity-30"
            />
          </div>
        )}

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent z-0" />

        {/* Top Right Share & Tier List Actions */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
          <Link
            href="/tier-list"
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all border border-white/10 backdrop-blur-md shadow-lg hover:scale-105"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Create Tier List</span>
          </Link>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg hover:scale-105"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? "Link Copied!" : "Share Profile"}</span>
          </button>
        </div>

        {/* Profile Info Row */}
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-end gap-6">
          {/* Avatar */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-slate-800 border-4 border-slate-900 shadow-2xl shrink-0 flex items-center justify-center text-3xl font-black text-white">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={username} fill sizes="112px" unoptimized className="object-cover" />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>

          {/* User Details */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                {username}
              </h1>
              <span className="px-2.5 py-0.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[10px] sm:text-xs font-bold rounded-lg uppercase tracking-wider">
                Otaku
              </span>
            </div>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed mb-3 line-clamp-2">
              {bio}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Member of AniWaveX
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">{estimatedHours} hrs</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Watch Time
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-purple-600/20 text-purple-400 rounded-xl border border-purple-500/30 shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">{totalEpisodesWatched}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Episodes Watched
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">{completedCount}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Completed Shows
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-white">{initialBookmarks.length}</div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Watchlist
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("showcase")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === "showcase"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Top 5 Showcase</span>
        </button>

        <button
          onClick={() => setActiveTab("watchlist")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === "watchlist"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Watchlist ({initialBookmarks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("tierlists")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
            activeTab === "tierlists"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "bg-slate-900 text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Tier Lists ({tierLists.length})</span>
        </button>
      </div>

      {/* 4. Tab Content */}
      {activeTab === "showcase" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              All-Time Favorite Masterpieces
            </h2>
          </div>

          {topFive.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-white/5 rounded-3xl text-slate-400">
              <Trophy className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Favorites Pinned Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Customize your profile from account settings to showcase your top 5 favorite anime!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6">
              {topFive.map((anime: any, index: number) => {
                const rankColor =
                  index === 0
                    ? "bg-yellow-500 text-slate-950 shadow-yellow-500/50"
                    : index === 1
                    ? "bg-slate-300 text-slate-950 shadow-slate-300/50"
                    : index === 2
                    ? "bg-amber-700 text-white shadow-amber-700/50"
                    : "bg-blue-600 text-white shadow-blue-600/50";

                return (
                  <Link
                    key={anime.slug}
                    href={`/anime/${anime.slug}`}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 shadow-xl hover:scale-105 flex flex-col"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                      <AnimeImage
                        src={anime.posterImage}
                        alt={anime.title}
                        sizes="(max-width: 640px) 50vw, 20vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />

                      {/* Rank Crown Badge */}
                      <div
                        className={`absolute top-2.5 left-2.5 px-2.5 py-0.5 font-black text-xs rounded-lg shadow-lg ${rankColor}`}
                      >
                        #{index + 1}
                      </div>

                      {/* Play Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="w-12 h-12 bg-blue-600/90 rounded-full flex items-center justify-center text-white backdrop-blur-sm shadow-xl">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Title Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
                        <h4
                          className="text-white font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-blue-400 transition-colors"
                          title={anime.title}
                        >
                          {anime.title}
                        </h4>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "watchlist" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {[
              { id: "all", label: "All Shows" },
              { id: "watching", label: "Watching" },
              { id: "completed", label: "Completed" },
              { id: "plan_to_watch", label: "Plan to Watch" },
              { id: "dropped", label: "Dropped" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setWatchlistFilter(f.id)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  watchlistFilter === f.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-slate-900/80 text-slate-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredBookmarks.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 border border-white/5 rounded-3xl text-slate-400">
              <Bookmark className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h4 className="text-base font-bold text-white">No Anime in this Category</h4>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {filteredBookmarks.map((b) => (
                <AnimeCard
                  key={b.id || b.anime_slug}
                  anime={{
                    id: b.id || b.anime_slug,
                    slug: b.anime_slug,
                    title: b.anime_title,
                    posterImage: b.poster_image,
                    rating: b.rating,
                    status: b.status,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "tierlists" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Created Anime Tier Lists
            </h2>

            <Link
              href="/tier-list"
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:scale-105"
            >
              <Layers className="w-3.5 h-3.5" />
              New Tier List
            </Link>
          </div>

          {tierLists.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 border border-white/5 rounded-3xl text-slate-400">
              <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Tier Lists Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Rank your favorite seasonal anime or all-time GOATs with our interactive Tier Maker!
              </p>
              <Link
                href="/tier-list"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold shadow-lg"
              >
                Create Your First Tier List
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {tierLists.map((tl) => (
                <div
                  key={tl.id}
                  className="rounded-2xl overflow-hidden bg-slate-900 border border-white/10 p-5 flex flex-col justify-between gap-4 shadow-xl hover:border-blue-500/50 transition-all group"
                >
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                      {tl.title}
                    </h3>
                    {tl.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {tl.description}
                      </p>
                    )}
                  </div>

                  {/* Preview of Tiers */}
                  <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-white/5">
                    {tl.rows.slice(0, 3).map((r) => (
                      <div key={r.id} className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white shrink-0"
                          style={{ backgroundColor: r.color }}
                        >
                          {r.label}
                        </span>
                        <div className="flex items-center gap-1 overflow-hidden">
                          {r.items.slice(0, 5).map((it) => (
                            <div
                              key={it.slug}
                              className="relative w-5 h-7 rounded overflow-hidden bg-slate-800 shrink-0"
                            >
                              <AnimeImage src={it.posterImage} alt={it.title} sizes="20px" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
                    <span>{new Date(tl.createdAt).toLocaleDateString()}</span>
                    <Link
                      href={`/tier-list?id=${tl.id}`}
                      className="text-blue-400 font-bold hover:underline flex items-center gap-1"
                    >
                      View & Clone <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
