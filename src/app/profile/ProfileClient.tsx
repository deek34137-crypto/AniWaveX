"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import WatchHistoryGrid from "@/components/profile/WatchHistoryGrid";
import WatchlistGrid from "@/components/profile/WatchlistGrid";
import AvatarPicker from "@/components/profile/AvatarPicker";
import PasswordForm from "@/components/profile/PasswordForm";
import UsernameForm from "@/components/profile/UsernameForm";
import ProfileCustomizer from "@/components/profile/ProfileCustomizer";
import AppearanceSettings from "@/components/profile/AppearanceSettings";
import AniListSyncModal from "@/components/sync/AniListSyncModal";
import TwoWaySyncModal from "@/components/sync/TwoWaySyncModal";
import ProfileAuthClient from "./ProfileAuthClient";
import { getAvatarUrl } from "@/lib/avatars";
import { useAuth } from "@/providers/AuthProvider";
import { isAdminUser } from "@/lib/admin";
import { createClient } from "@/lib/supabase/client";
import {
  History,
  Bookmark,
  Settings,
  Sparkles,
  ExternalLink,
  Layers,
  RefreshCw,
  LogOut,
  ChevronRight,
  Shield,
  Bell,
  Download,
} from "lucide-react";
import {
  STORAGE_KEYS,
  requestNotificationPermission,
  cancelPendingNotifications,
} from "@/lib/notifications";
import { ANILIST_TOKEN_KEY, MAL_TOKEN_KEY, MAL_CODE_VERIFIER_KEY } from "@/lib/sync-engine";

type Tab = "history" | "watchlist" | "customize" | "settings";

export default function ProfileClient({
  user: ssrUser,
  history: ssrHistory,
  bookmarks: ssrBookmarks,
}: {
  user?: any;
  history?: any[];
  bookmarks?: any[];
}) {
  const { user: authUser, supabase: authSupabase, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;

  // Prefer live client-side user — fixes "not logged in" bug on mobile bottom nav
  const user = authUser || ssrUser;

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (tabParam && ["history", "watchlist", "customize", "settings"].includes(tabParam)) {
      return tabParam;
    }
    return "history";
  });

  useEffect(() => {
    if (tabParam && ["history", "watchlist", "customize", "settings"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showTwoWaySyncModal, setShowTwoWaySyncModal] = useState(false);
  const [history, setHistory] = useState<any[]>(ssrHistory || []);
  const [bookmarks, setBookmarks] = useState<any[]>(ssrBookmarks || []);
  const [loadingData, setLoadingData] = useState(false);
  const [notifsEnabled, setNotifsEnabled] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotifsEnabled(localStorage.getItem(STORAGE_KEYS.ENABLED) !== "false");

      // Auto-capture AniList OAuth implicit token redirect (#access_token=...)
      const hash = window.location.hash;
      if (hash && hash.includes("access_token=")) {
        const match = hash.match(/access_token=([^&]+)/);
        if (match && match[1]) {
          localStorage.setItem(ANILIST_TOKEN_KEY, match[1]);
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          setShowTwoWaySyncModal(true);
        }
      }

      const urlParams = new URLSearchParams(window.location.search);

      // Auto-capture AniList OAuth code (?code=...)
      const anilistCode = urlParams.get("code");
      const stateParam = urlParams.get("state");
      if (anilistCode && stateParam !== "aniwavex_mal_auth") {
        fetch("/api/sync/anilist/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: anilistCode,
            redirect_uri: `${window.location.origin}/profile`,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.access_token) {
              localStorage.setItem(ANILIST_TOKEN_KEY, data.access_token);
              setShowTwoWaySyncModal(true);
            }
          })
          .catch((err) => console.error("AniList token exchange failed:", err))
          .finally(() => {
            window.history.replaceState(null, "", window.location.pathname);
          });
      }

      // Auto-capture MyAnimeList OAuth code (?code=...&state=aniwavex_mal_auth)
      const malCode = urlParams.get("code");
      const malState = urlParams.get("state");
      if (malCode && malState === "aniwavex_mal_auth") {
        const verifier = localStorage.getItem(MAL_CODE_VERIFIER_KEY) || "";
        if (verifier) {
          fetch("/api/sync/mal/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: malCode,
              code_verifier: verifier,
              redirect_uri: `${window.location.origin}/profile`,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.access_token) {
                localStorage.setItem(MAL_TOKEN_KEY, data.access_token);
                setShowTwoWaySyncModal(true);
              }
            })
            .catch((err) => console.error("MAL token exchange failed:", err))
            .finally(() => {
              window.history.replaceState(null, "", window.location.pathname);
            });
        }
      }
    }
  }, []);

  const toggleNotifications = async () => {
    if (!notifsEnabled) {
      const granted = await requestNotificationPermission();
      setNotifsEnabled(granted);
    } else {
      localStorage.setItem(STORAGE_KEYS.ENABLED, "false");
      cancelPendingNotifications();
      setNotifsEnabled(false);
    }
  };

  // If SSR gave no data but client session exists, fetch data client-side
  useEffect(() => {
    if (!authUser) return;
    if (ssrUser && ssrHistory !== undefined) return; // already have server data
    const supabase = createClient();
    setLoadingData(true);
    Promise.all([
      supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", authUser.id)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]).then(([{ data: bk }, { data: hs }]) => {
      if (bk) setBookmarks(bk);
      if (hs) setHistory(hs);
      setLoadingData(false);
    });
  }, [authUser?.id]);

  const handleSignOut = async () => {
    await authSupabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  // Still resolving session — show spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading profile…</span>
        </div>
      </div>
    );
  }

  // Not logged in → show login/signup screen
  if (!user) {
    return <ProfileAuthClient />;
  }

  const meta = user.user_metadata || {};
  const username = meta.username || user.email?.split("@")[0] || "User";
  const avatarUrl = getAvatarUrl(meta.avatar_id);
  const isAdmin = isAdminUser(user);

  const tabs: { id: Tab; label: string; shortLabel: string; icon: React.ElementType }[] = [
    { id: "history",   label: "Watch History",  shortLabel: "History",  icon: History },
    { id: "watchlist", label: "Watchlist",       shortLabel: "Watchlist", icon: Bookmark },
    { id: "customize", label: "Public Profile",  shortLabel: "Profile",  icon: Sparkles },
    { id: "settings",  label: "Settings",        shortLabel: "Settings", icon: Settings },
  ];

  // When accessed with tab=watchlist, render ONLY the WatchlistGrid without profile extras
  if (tabParam === "watchlist") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-6 animate-in fade-in duration-300">
        <WatchlistGrid initialItems={bookmarks} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-4">
      <AniListSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        onImportComplete={() => window.location.reload()}
      />

      <TwoWaySyncModal
        isOpen={showTwoWaySyncModal}
        onClose={() => setShowTwoWaySyncModal(false)}
        localWatchlist={bookmarks}
      />

      {/* ── Profile Header Card ── */}
      <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-5 mb-5 flex items-center gap-4 shadow-lg">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center text-2xl font-black text-white shadow-xl overflow-hidden border-2 border-white/10 relative shrink-0">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar" fill sizes="80px" unoptimized className="object-cover" />
          ) : (
            <span className="bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center text-2xl font-black">
              {username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-black text-white truncate">{username}</h1>
            {isAdmin && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-lg uppercase">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold rounded-lg uppercase">
              Otaku
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 truncate">{user.email}</p>

          {/* Mini stats */}
          <div className="flex items-center gap-4 mt-2.5">
            <div>
              <p className="text-white font-bold text-sm leading-none">{history.length}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">Watched</p>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <p className="text-white font-bold text-sm leading-none">{bookmarks.length}</p>
              <p className="text-slate-500 text-[10px] mt-0.5">In Watchlist</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Actions 2×2 Grid ── */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <button
          onClick={() => setShowTwoWaySyncModal(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm transition-all shadow-md active:scale-95"
        >
          <RefreshCw className="w-4 h-4 shrink-0" />
          <span className="truncate">2-Way Sync (AniList/MAL)</span>
        </button>

        <button
          onClick={() => setShowSyncModal(true)}
          className="flex items-center gap-2.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-all border border-white/10 shadow-md active:scale-95"
        >
          <RefreshCw className="w-4 h-4 shrink-0 text-cyan-400" />
          <span className="truncate">Sync Watchlist (AniList &amp; MAL)</span>
        </button>

        <Link
          href={`/user/${encodeURIComponent(username)}`}
          className="flex items-center gap-2.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-all border border-white/10 shadow-md active:scale-95"
        >
          <ExternalLink className="w-4 h-4 shrink-0 text-slate-400" />
          <span className="truncate">Public Profile</span>
        </Link>

        <Link
          href="/tier-list"
          className="flex items-center gap-2.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-sm transition-all border border-white/10 shadow-md active:scale-95"
        >
          <Layers className="w-4 h-4 shrink-0 text-blue-400" />
          <span className="truncate">Tier List Maker</span>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-4 py-3 bg-red-950/60 hover:bg-red-900/60 text-red-400 hover:text-red-300 rounded-xl font-semibold text-sm transition-all border border-red-500/20 shadow-md active:scale-95"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span className="truncate">Sign Out</span>
        </button>
      </div>

      {/* ── Tab Bar (Balanced 4-column grid on mobile so no tabs are cut off) ── */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-5 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-2.5 rounded-xl font-bold text-[11px] sm:text-xs transition-all justify-center w-full ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden truncate">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {loadingData ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading your data…</span>
          </div>
        </div>
      ) : (
        <>
          {activeTab === "history" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <WatchHistoryGrid initialItems={history} />
            </div>
          )}

          {activeTab === "watchlist" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <WatchlistGrid initialItems={bookmarks} />
            </div>
          )}

          {activeTab === "customize" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-400">
              <ProfileCustomizer user={user} />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-400">
              {/* Appearance & Themes (Ultra Lite Mode & 25 Themes) */}
              <AppearanceSettings />

              {/* Change Username Form */}
              <UsernameForm currentUsername={username} />

              {/* Avatar Picker */}
              <AvatarPicker currentAvatarId={user.user_metadata?.avatar_id} />

              {/* Password Management */}
              <PasswordForm />

              {/* Quick Link to Public Profile Bio, Banner & Showcase */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl max-w-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    Public Bio &amp; Banner
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Customize your public profile bio, cyberpunk/neon banner themes, and top 5 anime showcase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("customize")}
                  className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 text-center"
                >
                  Edit Bio &amp; Showcase
                </button>
              </div>

              {/* Notification Preferences */}
              <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Daily Anime Reminders</h3>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        Max 1 gentle reminder a day when new episodes drop. Never while watching.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleNotifications}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      notifsEnabled ? "bg-blue-600" : "bg-slate-700"
                    }`}
                    aria-label="Toggle notifications"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        notifsEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sign Out Danger Zone */}
              <div className="border border-red-500/20 rounded-2xl p-4 bg-red-950/20">
                <h3 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </h3>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-between px-4 py-3 bg-red-950/60 hover:bg-red-900/60 text-red-400 hover:text-red-300 rounded-xl font-semibold text-sm transition-all border border-red-500/20 active:scale-95"
                >
                  <span>Sign out of AniWaveX</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
