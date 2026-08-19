"use client";

import { useState } from "react";
import WatchHistoryGrid from "@/components/profile/WatchHistoryGrid";
import WatchlistGrid from "@/components/profile/WatchlistGrid";
import AvatarPicker from "@/components/profile/AvatarPicker";
import PasswordForm from "@/components/profile/PasswordForm";
import { getAvatarUrl } from "@/lib/avatars";
import { User, Settings } from "lucide-react";

import Image from "next/image";

export default function ProfileClient({ user, history, bookmarks }: { user: any, history: any[], bookmarks: any[] }) {
  const [activeTab, setActiveTab] = useState<"stuff" | "settings">("stuff");

  const avatarUrl = getAvatarUrl(user.user_metadata?.avatar_id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-12">
        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-white shadow-xl overflow-hidden border-4 border-slate-800 relative">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" fill sizes="96px" unoptimized className="object-cover" />
          ) : (
            user.email?.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white">My Profile</h1>
          <p className="text-slate-400 text-lg mt-1">{user.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto">
        <button
          onClick={() => setActiveTab("stuff")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none justify-center ${
            activeTab === "stuff" 
              ? "bg-blue-600 text-white shadow-lg" 
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <User className="w-4 h-4" />
          My Stuff
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap flex-1 md:flex-none justify-center ${
            activeTab === "settings" 
              ? "bg-blue-600 text-white shadow-lg" 
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Settings className="w-4 h-4" />
          Account Settings
        </button>
      </div>

      {/* Content */}
      {activeTab === "stuff" ? (
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <WatchHistoryGrid initialItems={history} />
          <WatchlistGrid initialItems={bookmarks} />
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <AvatarPicker currentAvatarId={user.user_metadata?.avatar_id} />
          <PasswordForm />
        </div>
      )}
    </div>
  );
}
