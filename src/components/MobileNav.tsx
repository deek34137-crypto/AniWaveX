"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu, X, Home, Compass, Calendar, Layers, Film, Sparkles, User, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { getAvatarUrl } from "@/lib/avatars";
import Image from "next/image";

const subscribe = () => () => {};

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();
  const isMounted = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Handle Escape key to close drawer
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navLinks = [
    { label: "Home", href: "/", icon: Home },
    { label: "Catalog", href: "/catalog", icon: Compass },
    { label: "Schedule", href: "/airing", icon: Calendar },
    { label: "Tier List", href: "/tier-list", icon: Layers },
    { label: "Movies", href: "/catalog?format=movie", icon: Film },
    { label: "New Releases", href: "/catalog?sort=newest", icon: Sparkles },
  ];

  const avatarUrl = getAvatarUrl(user?.user_metadata?.avatar_id);
  const displayUsername = user?.user_metadata?.username || user?.email?.split('@')[0];

  const drawerContent = isOpen && isMounted ? (
    <div className="fixed inset-0 z-[9999] md:hidden">
      {/* Dark Backdrop */}
      <div 
        className="fixed inset-0 transition-opacity duration-300"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)" }}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      
      {/* Drawer Panel - Solid 100% Opaque Background */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        className="fixed top-0 left-0 bottom-0 h-full w-72 max-w-[85vw] border-r border-white/10 shadow-2xl flex flex-col z-[10000] animate-in slide-in-from-left duration-300"
        style={{ backgroundColor: "#0b0f19", opacity: 1 }}
      >
        {/* Header with safe area padding */}
        <div 
          className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))", backgroundColor: "#0b0f19" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              AniWaveX
            </span>
          </div>
          <button 
            type="button"
            aria-label="Close mobile navigation menu"
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Account Section */}
        {user ? (
          <div className="px-4 py-3 border-b border-white/10 shrink-0" style={{ backgroundColor: "#0b0f19" }}>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/20 overflow-hidden relative shrink-0">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" fill sizes="40px" unoptimized className="object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white uppercase bg-gradient-to-br from-indigo-500 to-purple-600 w-full h-full flex items-center justify-center">
                    {user.email?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{displayUsername}</p>
                <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              </div>
            </Link>

            {/* Quick Profile Actions */}
            <div className="mt-2 flex gap-2">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-all"
              >
                <User className="w-3.5 h-3.5" />
                My Profile
              </Link>
              <Link
                href="/profile?tab=settings"
                onClick={() => setIsOpen(false)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-white/10 text-xs font-semibold transition-all"
              >
                ⚙️ Settings
              </Link>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-b border-white/10 shrink-0" style={{ backgroundColor: "#0b0f19" }}>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-300 font-semibold text-sm transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Sign Up
            </Link>
          </div>
        )}
        
        {/* Main Nav Links — flex-1 with smooth scrolling */}
        <nav 
          className="flex-1 min-h-0 overflow-y-auto py-3 px-3 flex flex-col gap-1.5"
          style={{ backgroundColor: "#0b0f19" }}
        >
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.label}
                href={item.href} 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                  isActive 
                    ? "text-blue-400 bg-blue-600/20 border border-blue-500/30 shadow-sm" 
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div 
          className="p-4 border-t border-white/10 text-xs text-slate-500 shrink-0"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))", backgroundColor: "#0b0f19" }}
        >
          AniWaveX &bull; Stream Anywhere
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button 
        type="button"
        aria-label="Open mobile navigation menu"
        onClick={() => setIsOpen(true)}
        className="p-1.5 sm:p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition-colors md:hidden"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Render via Portal onto document.body to avoid stacking context & backdrop-filter trapping */}
      {isMounted && typeof document !== "undefined" && createPortal(drawerContent, document.body)}
    </>
  );
}
