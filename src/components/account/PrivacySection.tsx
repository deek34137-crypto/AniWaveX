"use client";

import { useState } from "react";
import { UserPrivacySettings } from "@/types/account";
import { Eye, Lock, Globe, Check, Shield } from "lucide-react";

interface PrivacySectionProps {
  initialSettings?: UserPrivacySettings;
}

export default function PrivacySection({ initialSettings }: PrivacySectionProps) {
  const [settings, setSettings] = useState<UserPrivacySettings>(
    initialSettings || {
      profile: "public",
      watchlist: "public",
      activity: "public",
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateSetting = async (key: keyof UserPrivacySettings, value: "public" | "private") => {
    const updated = {
      ...settings,
      [key]: value,
    };
    setSettings(updated);

    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privacy_settings: updated }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to update privacy settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-400" />
            Profile &amp; Library Privacy
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control who can see your public profile, bookmarks, and watch history.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-in fade-in">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        {/* 1. Public Profile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Public Profile Visibility</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Whether your profile at /user/[username] can be viewed by other anime fans.
              </p>
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => updateSetting("profile", "public")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.profile === "public"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => updateSetting("profile", "private")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.profile === "private"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Private
            </button>
          </div>
        </div>

        {/* 2. Watchlist Visibility */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Watchlist Visibility</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Allow others to view your watching, completed, and plan to watch lists.
              </p>
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => updateSetting("watchlist", "public")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.watchlist === "public"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => updateSetting("watchlist", "private")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.watchlist === "private"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Private
            </button>
          </div>
        </div>

        {/* 3. Activity / Watch History */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Watch History Activity</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Show recently streamed episodes on your public profile feed.
              </p>
            </div>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => updateSetting("activity", "public")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.activity === "public"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => updateSetting("activity", "private")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                settings.activity === "private"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Private
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
