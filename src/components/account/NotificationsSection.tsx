"use client";

import { useState } from "react";
import { UserNotificationSettings } from "@/types/account";
import { Bell, Film, PlayCircle, RefreshCw, Shield, Check, Loader2 } from "lucide-react";

interface NotificationsSectionProps {
  initialSettings?: UserNotificationSettings;
}

export default function NotificationsSection({ initialSettings }: NotificationsSectionProps) {
  const [settings, setSettings] = useState<UserNotificationSettings>(
    initialSettings || {
      anime: true,
      episodes: true,
      sync: true,
      security: true,
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleSetting = async (key: keyof UserNotificationSettings) => {
    const updated = {
      ...settings,
      [key]: !settings[key],
    };
    setSettings(updated);

    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notification_settings: updated }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Failed to update notification settings", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            Notification Preferences
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control which automated alerts and reminders you receive.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-in fade-in">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        {/* 1. New Episodes */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
              <PlayCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">New Episode Drops</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Alerts when a new sub or dub episode airs for an anime on your watchlist.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSetting("episodes")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              settings.episodes ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                settings.episodes ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 2. Anime Airing Schedules */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Seasonal Anime Releases</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Notifications for seasonal premieres and trending series.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSetting("anime")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              settings.anime ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                settings.anime ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 3. Sync Alerts */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Watchlist Sync Alerts</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Updates on AniList and MyAnimeList background sync events and conflicts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSetting("sync")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              settings.sync ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                settings.sync ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 4. Security Alerts */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-white/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs sm:text-sm">Account &amp; Security Notices</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Critical alerts on new sign-ins or password modifications.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleSetting("security")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
              settings.security ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                settings.security ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
