"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import WatchHistoryGrid from "@/components/profile/WatchHistoryGrid";
import WatchlistGrid from "@/components/profile/WatchlistGrid";
import AvatarPicker from "@/components/profile/AvatarPicker";
import PasswordForm from "@/components/profile/PasswordForm";
import ProfileCustomizer from "@/components/profile/ProfileCustomizer";
import AniListSyncModal from "@/components/sync/AniListSyncModal";
import { getAvatarUrl } from "@/lib/avatars";
import { User, Settings, Sparkles, ExternalLink, Layers, RefreshCw } from "lucide-react";

export default function ProfileClient({
  user,
  history,
  bookmarks,
}: {
  user: any;
  history: any[];
  bookmarks: any[];
}) {
  const [activeTab, setActiveTab] = useState<"stuff" | "customize" | "settings">("stuff");
  const [showSyncModal, setShowSyncModal] = useState(false);

  const meta = user.user_metadata || {};
  const username = meta.username || user.email?.split("@")[0] || "User";
  const avatarUrl = getAvatarUrl(meta.avatar_id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <AniListSyncModal 
        isOpen={showSyncModal} 
        onClose={() => setShowSyncModal(false)} 
        onImportComplete={() => window.location.reload()} 
      />

      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-3xl bg-slate-800 flex items-center justify-center text-3xl font-black text-white shadow-xl overflow-hidden border-4 border-slate-800 relative shrink-0">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill sizes="96px" unoptimized className="object-cover" />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl sm:text-4xl font-black text-white">{username}</h1>
              <span className="px-2.5 py-0.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-lg uppercase">
                Otaku
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{user.email}</p>
          </div>
        </div>

        {/* Public Profile, Tier List & AniList Sync Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <button
            onClick={() => setShowSyncModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-lg hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />
            Sync AniList
          </button>

          <Link
            href="/tier-list"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl font-bold text-xs sm:text-sm transition-all border border-white/10 shadow-lg hover:scale-105"
          >
            <Layers className="w-4 h-4 text-blue-400" />
            Tier List Maker
          </Link>

          <Link
            href={`/user/${encodeURIComponent(username)}`}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl font-bold text-xs sm:text-sm transition-all border border-white/10 shadow-lg hover:scale-105"
          >
            <ExternalLink className="w-4 h-4" />
            Public Profile
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 w-full md:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab("stuff")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex-1 md:flex-none justify-center ${
            activeTab === "stuff"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <User className="w-4 h-4" />
          My History & Watchlist
        </button>

        <button
          onClick={() => setActiveTab("customize")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex-1 md:flex-none justify-center ${
            activeTab === "customize"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Customize Public Profile
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex-1 md:flex-none justify-center ${
            activeTab === "settings"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Settings className="w-4 h-4" />
          Account & Avatar
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "stuff" && (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <WatchHistoryGrid initialItems={history} />
          <WatchlistGrid initialItems={bookmarks} />
        </div>
      )}

      {activeTab === "customize" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ProfileCustomizer user={user} />
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AvatarPicker currentAvatarId={user.user_metadata?.avatar_id} />
          <PasswordForm />
        </div>
      )}
    </div>
  );
}
