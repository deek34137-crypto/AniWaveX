"use client";

import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Search, 
  Plus, 
  Trash2, 
  Save, 
  Check, 
  Loader2, 
  Star, 
  Trophy, 
  Image as ImageIcon 
} from "lucide-react";
import AnimeImage from "@/components/AnimeImage";
import { PROFILE_BANNER_PRESETS } from "@/lib/tierlist";
import { useAuth } from "@/providers/AuthProvider";

interface FavoriteAnime {
  id: string | number;
  slug: string;
  title: string;
  posterImage: string;
  rating?: string;
}

export default function ProfileCustomizer({ user }: { user: any }) {
  const meta = user?.user_metadata || {};
  const [bio, setBio] = useState(meta.bio || "");
  const [bannerPreset, setBannerPreset] = useState(meta.banner_preset || "cyberpunk");
  const [customBannerUrl, setCustomBannerUrl] = useState(meta.custom_banner_url || "");
  const [topFive, setTopFive] = useState<FavoriteAnime[]>(meta.top_five_anime || []);
  
  // Search state for adding favorite anime
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { supabase } = useAuth();

  // Saved Tier Lists for management
  const username = meta.username || user?.email?.split("@")[0] || "User";
  const [savedTierLists, setSavedTierLists] = useState<any[]>([]);

  useEffect(() => {
    try {
      const key = `aniwavex_tierlists_${username.toLowerCase()}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedTierLists(parsed);
        }
      }
    } catch {}
  }, [username]);

  const handleDeleteTierList = (id: string) => {
    if (confirm("Are you sure you want to remove this tier list from your profile?")) {
      const updated = savedTierLists.filter((tl) => tl.id !== id);
      setSavedTierLists(updated);
      try {
        const key = `aniwavex_tierlists_${username.toLowerCase()}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
    }
  };

  // Debounced search for anime
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : data.anime || []);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddFavorite = (anime: any) => {
    if (topFive.length >= 5) {
      alert("You can select up to 5 favorite anime.");
      return;
    }
    const slug = anime.slug || anime.id?.toString();
    if (topFive.some((a) => a.slug === slug)) {
      alert("This anime is already in your top 5.");
      return;
    }

    const newFav: FavoriteAnime = {
      id: anime.id || slug,
      slug,
      title: anime.title || "Anime",
      posterImage: anime.posterImage || anime.backgroundImage || "",
      rating: anime.rating,
    };

    setTopFive([...topFive, newFav]);
  };

  const handleRemoveFavorite = (slug: string) => {
    setTopFive(topFive.filter((a) => a.slug !== slug));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          bio: bio.trim(),
          banner_preset: bannerPreset,
          custom_banner_url: customBannerUrl.trim(),
          top_five_anime: topFive,
        },
      });

      if (error) throw error;
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      alert(err.message || "Failed to update profile customizations");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-8 backdrop-blur-xl shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            Public Profile Customization
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Personalize your public profile showcase, top 5 favorite anime, bio, and banner.
          </p>
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg hover:scale-105"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : savedSuccess ? (
            <Check className="w-4 h-4 text-emerald-300" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{savedSuccess ? "Saved!" : "Save Changes"}</span>
        </button>
      </div>

      {/* 1. Bio & Status */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-200">
          About Me / Bio
        </label>
        <textarea
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={250}
          placeholder="Tell the community about your favorite anime, manga, genres, or gaming passions..."
          className="w-full bg-slate-950/80 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all resize-none"
        />
        <div className="text-right text-[11px] text-slate-500">
          {bio.length}/250 characters
        </div>
      </div>

      {/* 2. Profile Banner Theme */}
      <div className="space-y-4">
        <label className="block text-sm font-bold text-slate-200 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-blue-400" />
          Profile Banner Theme
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PROFILE_BANNER_PRESETS.map((preset) => {
            const isSelected = bannerPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setBannerPreset(preset.id)}
                className={`relative h-20 rounded-2xl p-3 overflow-hidden border transition-all text-left flex flex-col justify-end bg-gradient-to-r ${preset.gradient} ${
                  isSelected
                    ? "border-blue-400 ring-2 ring-blue-500 shadow-lg scale-105"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <span className="text-xs font-bold text-white drop-shadow-md z-10">
                  {preset.label}
                </span>
                {isSelected && (
                  <div className="absolute top-2 right-2 p-1 bg-blue-600 rounded-full z-10 shadow-md">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Top 5 Favorite Anime Showcase */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-bold text-slate-200 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Top 5 Favorite Anime Showcase ({topFive.length}/5)
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Rank your all-time favorite masterpieces on your public profile.
            </p>
          </div>

          {topFive.length < 5 && (
            <button
              type="button"
              onClick={() => setShowSearchModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Anime
            </button>
          )}
        </div>

        {/* Selected Top 5 Grid */}
        {topFive.length === 0 ? (
          <div
            onClick={() => setShowSearchModal(true)}
            className="w-full py-8 border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-slate-950/40 text-slate-400 hover:text-white"
          >
            <Plus className="w-6 h-6 text-blue-400" />
            <span className="text-xs font-semibold">Click to select your Top 5 Anime</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {topFive.map((anime, index) => (
              <div
                key={anime.slug}
                className="group relative rounded-2xl overflow-hidden bg-slate-950 border border-white/10 flex flex-col shadow-lg"
              >
                {/* Poster with Rank Badge */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                  <AnimeImage
                    src={anime.posterImage}
                    alt={anime.title}
                    sizes="180px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-yellow-500 text-slate-950 font-black text-[11px] rounded-lg shadow-md">
                    #{index + 1}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleRemoveFavorite(anime.slug)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-600 text-slate-300 hover:text-white rounded-full transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                    title="Remove"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Title */}
                <div className="p-2.5 bg-slate-900">
                  <h4 className="text-xs font-bold text-white line-clamp-1" title={anime.title}>
                    {anime.title}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Manage Saved Tier Lists */}
      <div className="space-y-4 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-bold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Manage Saved Tier Lists ({savedTierLists.length})
            </label>
            <p className="text-xs text-slate-400 mt-0.5">
              Remove unwanted tier lists from your profile or create new ones.
            </p>
          </div>
        </div>

        {savedTierLists.length === 0 ? (
          <div className="py-6 px-4 rounded-2xl bg-slate-950/40 border border-white/5 text-center text-xs text-slate-500">
            No saved tier lists found. Create one using the Tier List Maker!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {savedTierLists.map((tl) => (
              <div
                key={tl.id}
                className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                    {tl.title || "My Anime Tier List"}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {tl.rows ? `${tl.rows.reduce((acc: number, r: any) => acc + (r.items?.length || 0), 0)} ranked items` : "Custom list"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteTierList(tl.id)}
                  className="p-2 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white rounded-xl border border-red-500/20 transition-colors shrink-0"
                  title="Remove this tier list"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anime Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-4 animate-in zoom-in-95 max-h-[80vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" />
                Select Favorite Anime ({topFive.length}/5)
              </h3>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Trash2 className="hidden" />
                <span>✕</span>
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
              <input
                type="text"
                autoFocus
                placeholder="Search anime title (e.g. Steins;Gate, Naruto, Jujutsu Kaisen)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {searchResults.length > 0 ? (
                searchResults.map((anime) => {
                  const slug = anime.slug || anime.id?.toString();
                  const isSelected = topFive.some((a) => a.slug === slug);

                  return (
                    <div
                      key={anime.id || anime.slug}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/50 border border-white/5 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative w-10 h-14 rounded-lg overflow-hidden bg-slate-800 shrink-0">
                          <AnimeImage
                            src={anime.posterImage}
                            alt={anime.title}
                            sizes="60px"
                            quality={90}
                            className="object-cover"
                          />
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                            {anime.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span>{anime.year || "Anime"}</span>
                            {anime.rating && anime.rating !== "N/A" && (
                              <span className="text-yellow-400 flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                {anime.rating}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddFavorite(anime)}
                          disabled={topFive.length >= 5}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all shrink-0 hover:scale-105"
                        >
                          + Select
                        </button>
                      )}
                    </div>
                  );
                })
              ) : searchQuery.length >= 2 && !isSearching ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No anime found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Type at least 2 characters to search…
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
