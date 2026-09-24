"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AccountTab, UserStats } from "@/types/account";
import ProfileOverviewSection from "@/components/account/ProfileOverviewSection";
import EditProfileSection from "@/components/account/EditProfileSection";
import ConnectedAccountsSection from "@/components/account/ConnectedAccountsSection";
import WatchlistSyncSection from "@/components/account/WatchlistSyncSection";
import AccountSecuritySection from "@/components/account/AccountSecuritySection";
import AppearanceSection from "@/components/account/AppearanceSection";
import NotificationsSection from "@/components/account/NotificationsSection";
import PrivacySection from "@/components/account/PrivacySection";
import DataStorageSection from "@/components/account/DataStorageSection";
import DangerZoneSection from "@/components/account/DangerZoneSection";
import WatchlistGrid from "@/components/profile/WatchlistGrid";
import WatchHistoryGrid from "@/components/profile/WatchHistoryGrid";

import {
  User,
  Edit3,
  Link2,
  RefreshCw,
  Shield,
  Palette,
  Bell,
  Lock,
  Database,
  AlertTriangle,
  History,
  Bookmark,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

interface AccountCenterClientProps {
  user: any;
  initialProfile: any;
  initialStats: UserStats;
  initialConnections: any;
  initialSyncHistory: any[];
  initialBookmarks?: any[];
  initialHistory?: any[];
}

export default function AccountCenterClient({
  user,
  initialProfile,
  initialStats,
  initialConnections,
  initialSyncHistory,
  initialBookmarks = [],
  initialHistory = [],
}: AccountCenterClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as AccountTab | "watchlist" | "history" | null;
  const connectedParam = searchParams.get("connected");

  const [activeTab, setActiveTab] = useState<AccountTab>(() => {
    if (tabParam && ["overview", "edit", "history", "connected", "sync", "security", "appearance", "notifications", "privacy", "data", "danger"].includes(tabParam)) {
      return tabParam as AccountTab;
    }
    return "overview";
  });

  const [profile, setProfile] = useState(initialProfile || {});
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [connections, setConnections] = useState(initialConnections || { ANILIST: null, MYANIMELIST: null });
  const [syncHistory, setSyncHistory] = useState(initialSyncHistory || []);
  const [oauthSuccessMsg, setOauthSuccessMsg] = useState<string | null>(null);

  // Sync tab with URL
  useEffect(() => {
    if (tabParam && ["overview", "edit", "connected", "sync", "security", "appearance", "notifications", "privacy", "data", "danger"].includes(tabParam)) {
      setActiveTab(tabParam as AccountTab);
    }
  }, [tabParam]);

  // Handle OAuth callback notification banner
  useEffect(() => {
    if (connectedParam === "myanimelist") {
      setOauthSuccessMsg("MyAnimeList connected successfully via OAuth PKCE!");
      setActiveTab("connected");
      refreshConnections();
    } else if (connectedParam === "anilist") {
      setOauthSuccessMsg("AniList connected successfully via OAuth!");
      setActiveTab("connected");
      refreshConnections();
    }
  }, [connectedParam]);

  const refreshConnections = async () => {
    try {
      const res = await fetch("/api/account/connections");
      const data = await res.json();
      if (res.ok && data.connections) {
        setConnections(data.connections);
      }
    } catch {}
  };

  const refreshSyncHistory = async () => {
    try {
      const res = await fetch("/api/account/sync/history");
      const data = await res.json();
      if (res.ok && data.history) {
        setSyncHistory(data.history);
      }
    } catch {}
  };

  const handleTabChange = (newTab: AccountTab) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    params.delete("connected");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  };

  const navigationItems: {
    id: AccountTab;
    label: string;
    icon: React.ElementType;
    badge?: string;
    category?: string;
  }[] = [
    { id: "overview", label: "Overview", icon: User, category: "Profile" },
    { id: "edit", label: "Edit Profile", icon: Edit3, category: "Profile" },
    {
      id: "history",
      label: "Watch History",
      icon: History,
      badge: initialHistory?.length > 0 ? String(initialHistory.length) : undefined,
      category: "Profile",
    },
    {
      id: "connected",
      label: "Connected Accounts",
      icon: Link2,
      badge:
        (connections?.ANILIST?.status === "CONNECTED" ? 1 : 0) +
        (connections?.MYANIMELIST?.status === "CONNECTED" ? 1 : 0) > 0
          ? `${(connections?.ANILIST?.status === "CONNECTED" ? 1 : 0) + (connections?.MYANIMELIST?.status === "CONNECTED" ? 1 : 0)} Active`
          : undefined,
      category: "Integrations",
    },
    { id: "sync", label: "Watchlist & Sync", icon: RefreshCw, category: "Integrations" },
    { id: "security", label: "Account & Security", icon: Shield, category: "Account" },
    { id: "appearance", label: "Appearance", icon: Palette, category: "Preferences" },
    { id: "notifications", label: "Notifications", icon: Bell, category: "Preferences" },
    { id: "privacy", label: "Privacy", icon: Lock, category: "Preferences" },
    { id: "data", label: "Data & Storage", icon: Database, category: "System" },
    { id: "danger", label: "Danger Zone", icon: AlertTriangle, category: "System" },
  ];

  // If accessed directly with tab=watchlist or tab=history, render those full screens cleanly
  if (tabParam === "watchlist") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-12 animate-in fade-in duration-300">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Account Center
          </button>
        </div>
        <WatchlistGrid initialItems={initialBookmarks} />
      </div>
    );
  }

  if (tabParam === "history") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-12 animate-in fade-in duration-300">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Account Center
          </button>
        </div>
        <WatchHistoryGrid initialItems={initialHistory} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-16">
      {/* ── OAuth Success Notification Banner ── */}
      {oauthSuccessMsg && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{oauthSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setOauthSuccessMsg(null)}
            className="text-xs text-emerald-400 hover:text-white px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Mobile Horizontal Navigation Bar ── */}
      <div className="lg:hidden mb-5 overflow-x-auto pb-2 scrollbar-none flex gap-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleTabChange(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-white/5"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-500/30 text-[10px] text-blue-200">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Desktop 2-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation (Desktop) */}
        <aside className="hidden lg:block lg:col-span-3 space-y-2 sticky top-24">
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-3 shadow-xl backdrop-blur-xl">
            <div className="px-4 py-3 border-b border-white/5 mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Account Center</h2>
              <p className="text-[11px] text-slate-500">Manage your AniWaveX identity</p>
            </div>

            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 translate-x-1"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isActive ? "text-white translate-x-0.5" : "text-slate-600"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Library Links */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-3 space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Quick Shortcuts
            </span>
            <button
              type="button"
              onClick={() => router.push("/watchlist")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium text-left"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Watchlist</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/profile?tab=history")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-medium text-left"
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Watch History</span>
            </button>
          </div>
        </aside>

        {/* Right Content Panel */}
        <main className="lg:col-span-9 min-w-0">
          {activeTab === "overview" && (
            <ProfileOverviewSection
              user={user}
              profile={profile}
              stats={stats}
              history={initialHistory}
              onNavigateTab={(tab) => handleTabChange(tab)}
            />
          )}

          {activeTab === "history" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Watch History
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Your episode progress and watch history across AniWaveX.
                </p>
              </div>
              <WatchHistoryGrid initialItems={initialHistory} isOwner={true} />
            </div>
          )}

          {activeTab === "edit" && (
            <EditProfileSection
              user={user}
              profile={profile}
              onProfileUpdated={(updated) => {
                setProfile((prev: any) => ({ ...prev, ...updated }));
              }}
            />
          )}

          {activeTab === "connected" && (
            <ConnectedAccountsSection
              connections={connections}
              onRefreshConnections={refreshConnections}
              onTriggerSync={() => handleTabChange("sync")}
            />
          )}

          {activeTab === "sync" && (
            <WatchlistSyncSection
              connections={connections}
              syncHistory={syncHistory}
              onRefreshData={() => {
                refreshConnections();
                refreshSyncHistory();
              }}
            />
          )}

          {activeTab === "security" && <AccountSecuritySection user={user} />}

          {activeTab === "appearance" && <AppearanceSection />}

          {activeTab === "notifications" && (
            <NotificationsSection initialSettings={profile?.notification_settings} />
          )}

          {activeTab === "privacy" && <PrivacySection initialSettings={profile?.privacy_settings} />}

          {activeTab === "data" && <DataStorageSection />}

          {activeTab === "danger" && <DangerZoneSection />}
        </main>
      </div>
    </div>
  );
}
