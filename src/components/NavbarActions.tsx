"use client";

import { Bell, User, LogOut, Shield, Bookmark, Link2, Download, Calendar, Radio, Check } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AuthModal from "./AuthModal";
import UsernameModal from "./UsernameModal";
import Link from "next/link";
import { getAvatarUrl } from "@/lib/avatars";
import { useAuth } from "@/providers/AuthProvider";
import { isAdminUser } from "@/lib/admin";
import { getRecentAlerts, getUnreadAlertsCount, markAlertsAsRead, clearUserNotifications } from "@/lib/notifications";
import type { AiringAlertItem } from "@/types/account";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function NavbarActions({ user: initialUser }: { user?: any }) {
  const { user: authUser, supabase } = useAuth();
  const currentUser = authUser || initialUser;
  const isAdmin = isAdminUser(currentUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [alerts, setAlerts] = useState<AiringAlertItem[]>([]);
  const [hasMounted, setHasMounted] = useState(false);
  
  const notificationsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    if (currentUser && !currentUser.user_metadata?.username) {
      setIsUsernameModalOpen(true);
    }
  }, [currentUser]);

  // Click outside to close notifications and user menu dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (isNotificationsOpen && notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }

      if (isMenuOpen && menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    if (isNotificationsOpen || isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen, isMenuOpen]);

  useEffect(() => {
    setHasMounted(true);
    setUnreadCount(getUnreadAlertsCount());
    setAlerts(getRecentAlerts());

    const handleStateChange = (e: any) => {
      if (typeof e.detail?.unread === "number") {
        setUnreadCount(e.detail.unread);
      }
      if (Array.isArray(e.detail?.alerts)) {
        setAlerts(e.detail.alerts);
      } else {
        setAlerts(getRecentAlerts());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "aniwavex_notif_unread" || e.key === "aniwavex_recent_alerts") {
        setUnreadCount(getUnreadAlertsCount());
        setAlerts(getRecentAlerts());
      }
    };

    window.addEventListener("aniwavex_notif_state_change", handleStateChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("aniwavex_notif_state_change", handleStateChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handleToggleNotifications = () => {
    const nextState = !isNotificationsOpen;
    setIsNotificationsOpen(nextState);
    if (nextState) {
      markAlertsAsRead();
      setUnreadCount(0);
      setAlerts(getRecentAlerts());
    }
  };

  const handleSignOut = async () => {
    clearUserNotifications();
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    router.refresh();
    router.push('/');
  };

  const avatarUrl = getAvatarUrl(currentUser?.user_metadata?.custom_avatar_url || currentUser?.user_metadata?.avatar_id);
  const displayUsername = currentUser?.user_metadata?.username || currentUser?.email?.split('@')[0];

  return (
    <>
      {/* 1-Click Direct Library / Watchlist Quick Access */}
      <Link
        href="/watchlist"
        prefetch={true}
        className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors relative"
        title="My Watchlist & Library"
        aria-label="My Watchlist"
      >
        <Bookmark className="w-5 h-5" />
      </Link>

      <div ref={notificationsRef} className="relative">
        <button 
          onClick={handleToggleNotifications}
          className="p-2 hover:bg-white/10 rounded-full transition-colors relative cursor-pointer"
          aria-label="Notifications"
          aria-expanded={isNotificationsOpen}
        >
          <Bell className="w-5 h-5 text-slate-300 hover:text-white transition-colors" />
          {hasMounted && unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-[10px] font-black text-white rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isNotificationsOpen && (
          <div className="absolute right-0 sm:right-0 top-full mt-2 w-[calc(100vw-1.5rem)] max-w-sm sm:w-96 tv:w-[28rem] bg-slate-900/98 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl py-2 flex flex-col z-[100] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-4 py-2.5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Notifications</h3>
                {alerts.length > 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {alerts.length}
                  </span>
                )}
              </div>
              {alerts.some((a) => !a.read) && (
                <button
                  type="button"
                  onClick={() => {
                    markAlertsAsRead();
                    setUnreadCount(0);
                    setAlerts(getRecentAlerts());
                  }}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-white/5 scrollbar-thin scrollbar-thumb-slate-800">
              {alerts.length > 0 ? (
                alerts.slice(0, 30).map((alert) => {
                  const nowSec = Math.floor(Date.now() / 1000);
                  const isLive = alert.airingAt <= nowSec;

                  return (
                    <Link
                      key={alert.id}
                      href={`/anime/${alert.slug}`}
                      onClick={() => setIsNotificationsOpen(false)}
                      className={`group flex items-start gap-3 p-3 transition-colors hover:bg-white/[0.06] ${
                        !alert.read ? "bg-blue-600/[0.08]" : ""
                      }`}
                    >
                      <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-white/10">
                        {alert.posterImage ? (
                          <Image
                            src={alert.posterImage}
                            alt={alert.title}
                            fill
                            sizes="44px"
                            className="object-cover group-hover:scale-105 transition-transform"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-400 text-xs">
                            Anime
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                              isLive
                                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            }`}
                          >
                            EP {alert.episodeNumber} {isLive ? "LIVE" : "SOON"}
                          </span>
                          {!alert.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                          {alert.title}
                        </p>

                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {isLive
                            ? "Now broadcasting in Japan"
                            : "Broadcasting shortly today"}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center mx-auto mb-2 text-slate-400">
                    <Bell className="w-5 h-5 text-slate-500" />
                  </div>
                  <p className="text-sm font-semibold text-white">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto">
                    Add anime to your watchlist to receive live airing alerts when new episodes broadcast.
                  </p>
                </div>
              )}
            </div>

            <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/40 text-center">
              <Link
                href="/airing"
                onClick={() => setIsNotificationsOpen(false)}
                className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors block"
              >
                View Full Airing Schedule →
              </Link>
            </div>
          </div>
        )}
      </div>

      {currentUser ? (
        <div ref={menuRef} className="relative">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="ml-2 w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-white/20 overflow-hidden hover:scale-105 transition-transform relative"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill sizes="36px" unoptimized className="object-cover" />
            ) : (
              <span className="text-sm font-bold text-white uppercase bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center">{currentUser.email?.charAt(0) || 'U'}</span>
            )}
          </button>

          <div 
            className={`absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 flex flex-col z-[100] transition-all duration-200 origin-top-right ${isMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
          >
            <div className="px-4 py-2 border-b border-slate-800 mb-2">
              <p className="text-sm font-bold text-white truncate">{displayUsername}</p>
              <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
            </div>
            <Link 
              href="/profile" 
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-2 text-sm text-white hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
            >
              <User className="w-4 h-4 text-blue-400" /> Account Center
            </Link>
            {displayUsername && (
              <Link 
                href={`/user/${encodeURIComponent(displayUsername)}`}
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
              >
                <User className="w-4 h-4 text-slate-400" /> Public Profile
              </Link>
            )}
            <Link 
              href="/watchlist" 
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
            >
              <Bookmark className="w-4 h-4 text-cyan-400" /> My Library
            </Link>
            <Link 
              href="/downloads" 
              onClick={() => setIsMenuOpen(false)}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Offline Downloads
            </Link>
            <div className="border-t border-white/5 mt-1 pt-1">
              <Link 
                href="/profile?tab=edit" 
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
              >
                <span className="text-xs">⚙️</span> Edit Profile
              </Link>
              <Link 
                href="/profile?tab=connected" 
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
              >
                <Link2 className="w-4 h-4 text-violet-400" /> Connected Accounts
              </Link>
              <Link 
                href="/profile?tab=security" 
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
              >
                <Shield className="w-4 h-4 text-green-400" /> Security
              </Link>
            </div>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-red-400 hover:bg-slate-800 flex items-center gap-2 text-left w-full transition-colors border-t border-white/5 mt-1 pt-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsAuthModalOpen(true)}
          className="ml-2 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center border border-white/20 overflow-hidden transition-colors"
        >
          <User className="w-5 h-5 text-white/80" />
        </button>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <UsernameModal isOpen={isUsernameModalOpen} onClose={() => setIsUsernameModalOpen(false)} />
    </>
  );
}
