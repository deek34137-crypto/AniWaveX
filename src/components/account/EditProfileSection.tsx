"use client";

import { useState } from "react";
import AvatarManager from "./AvatarManager";
import { PROFILE_BANNER_PRESETS } from "@/lib/tierlist";
import { User, AtSign, FileText, Image as ImageIcon, Save, Check, Loader2, AlertCircle } from "lucide-react";

interface EditProfileSectionProps {
  user: any;
  profile: any;
  onProfileUpdated?: (updated: any) => void;
}

export default function EditProfileSection({ user, profile, onProfileUpdated }: EditProfileSectionProps) {
  const initialDisplayName = profile?.display_name || profile?.username || user?.email?.split("@")[0] || "";
  const initialUsername = profile?.username || user?.email?.split("@")[0] || "";
  const initialBio = profile?.bio || "";
  const initialBannerPreset = profile?.banner_preset || "cyberpunk";
  const initialCustomBannerUrl = profile?.custom_banner_url || "";

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [bannerPreset, setBannerPreset] = useState(initialBannerPreset);
  const [customBannerUrl, setCustomBannerUrl] = useState(initialCustomBannerUrl);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Check if dirty
  const isDirty =
    displayName.trim() !== initialDisplayName ||
    username.trim() !== initialUsername ||
    bio !== initialBio ||
    bannerPreset !== initialBannerPreset ||
    customBannerUrl.trim() !== initialCustomBannerUrl;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSaving(true);

    try {
      const cleanUsername = username.trim();
      const cleanDisplayName = displayName.trim();

      if (!cleanUsername) {
        throw new Error("Username cannot be empty.");
      }
      if (cleanUsername.length < 3 || cleanUsername.length > 25) {
        throw new Error("Username must be between 3 and 25 characters.");
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
        throw new Error("Username can only contain letters, numbers, underscores, and hyphens.");
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: cleanDisplayName,
          username: cleanUsername,
          bio: bio.trim(),
          banner_preset: bannerPreset,
          custom_banner_url: customBannerUrl.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save profile changes.");
      }

      setSuccessMsg("Profile saved successfully!");
      if (onProfileUpdated) {
        onProfileUpdated({
          display_name: cleanDisplayName,
          username: cleanUsername,
          bio: bio.trim(),
          banner_preset: bannerPreset,
          custom_banner_url: customBannerUrl.trim(),
        });
      }
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Avatar Management ── */}
      <AvatarManager
        currentAvatarId={profile?.avatar_id}
        customAvatarUrl={profile?.custom_avatar_url}
        username={username}
        displayName={displayName}
        onAvatarUpdated={(newAvatar) => {
          if (onProfileUpdated) {
            onProfileUpdated(newAvatar);
          }
        }}
      />

      {/* ── Profile Details Form ── */}
      <form onSubmit={handleSave} className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Public Profile Information
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize your identity across the platform, comments, and public profile page.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">Display Name</label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="e.g. Eren Yeager"
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">Your friendly public name shown to others.</p>
          </div>

          {/* Username (@handle) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Unique Username (@handle)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-500 font-mono text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                minLength={3}
                maxLength={25}
                placeholder="eren_yeager"
                className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-8 pr-4 py-3 text-sm text-white font-mono placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">Used for your profile URL: /user/{username || "username"}</p>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Bio / About Me
            </label>
            <span className={`text-[11px] font-mono ${bio.length >= 280 ? "text-amber-400" : "text-slate-500"}`}>
              {bio.length} / 300
            </span>
          </div>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            placeholder="Anime enthusiast, shonen & sci-fi lover, binge watcher..."
            className="w-full bg-slate-950 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Banner Preset Selection */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
            Profile Banner Theme
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {PROFILE_BANNER_PRESETS.map((preset) => {
              const isSelected = bannerPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setBannerPreset(preset.id)}
                  className={`relative h-18 rounded-2xl p-3 overflow-hidden border text-left flex flex-col justify-end bg-gradient-to-r ${preset.gradient} transition-all ${
                    isSelected
                      ? "border-blue-400 ring-2 ring-blue-500 shadow-lg scale-105"
                      : "border-white/10 hover:border-white/30 opacity-80 hover:opacity-100"
                  }`}
                >
                  <span className="text-xs font-bold text-white drop-shadow-md z-10">{preset.label}</span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 p-1 bg-blue-600 rounded-full text-white shadow-md">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={!isDirty || isSaving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-lg flex items-center gap-2 active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
