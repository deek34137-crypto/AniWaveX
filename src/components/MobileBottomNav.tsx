"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { 
  Home, 
  Compass, 
  BookOpen, 
  User, 
  LayoutGrid, 
  X, 
  Trophy, 
  Film, 
  Sparkles, 
  Bookmark, 
  Calendar,
  ChevronRight
} from "lucide-react";

function BottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const format = searchParams.get("format");
  const sort = searchParams.get("sort");
  
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const lastScrollY = useRef(0);

  // Close explore drawer on navigation change
  useEffect(() => {
    setIsExploreOpen(false);
  }, [pathname, searchParams]);

  // Lock body scroll when explore drawer is open
  useEffect(() => {
    if (isExploreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExploreOpen]);

  // Listen for Escape key to close explore drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExploreOpen) {
        setIsExploreOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExploreOpen]);

  // Listen for video player playback activity on /anime/[slug]
  useEffect(() => {
    const handlePlayerState = (e: any) => {
      setIsPlayerActive(Boolean(e.detail?.active));
    };
    window.addEventListener("aniwavex-player-state", handlePlayerState);
    return () => {
      window.removeEventListener("aniwavex-player-state", handlePlayerState);
    };
  }, []);

  // Reset player state if navigated away from /anime/
  useEffect(() => {
    if (!pathname.startsWith("/anime/")) {
      setIsPlayerActive(false);
    }
  }, [pathname]);

  // Auto-collapse on scroll down, reveal on scroll up
  useEffect(() => {
    const handleScroll = () => {
      if (isExploreOpen) return;
      const currentScrollY = window.scrollY;
      if (currentScrollY > 60 && currentScrollY > lastScrollY.current + 8) {
        setIsScrolledDown(true);
      } else if (currentScrollY < lastScrollY.current - 8 || currentScrollY <= 20) {
        setIsScrolledDown(false);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isExploreOpen]);

  // Hide MobileBottomNav on manga reader routes to prevent blocking chapter controls and page counters
  if (pathname.includes("/read") || (pathname.startsWith("/manga/") && pathname.includes("/read"))) {
    return null;
  }

  // Auto-hide when on /anime/[slug] with an active playing episode, or auto-collapse on scroll down
  const isPlayingOnAnimePage = pathname.startsWith("/anime/") && (isPlayerActive || searchParams.get("play") === "1");
  const isHidden = (isPlayingOnAnimePage || isScrolledDown) && !isExploreOpen;

  const isExploreActive = 
    isExploreOpen ||
    pathname.startsWith("/tier-list") ||
    pathname === "/watchlist" ||
    pathname === "/airing" ||
    (pathname === "/catalog" && (format === "movie" || sort === "newest"));

  const navItems = [
    {
      label: "Home",
      href: "/",
      icon: Home,
      isActive: pathname === "/",
    },
    {
      label: "Catalog",
      href: "/catalog",
      icon: Compass,
      isActive: pathname === "/catalog" && format !== "movie" && sort !== "newest",
    },
    {
      label: "Manga",
      href: "/manga",
      icon: BookOpen,
      isActive: pathname.startsWith("/manga"),
    },
    {
      label: "Explore",
      isDrawer: true,
      icon: LayoutGrid,
      isActive: isExploreActive,
      onClick: () => setIsExploreOpen((prev) => !prev),
    },
    {
      label: "Profile",
      href: "/profile",
      icon: User,
      isActive: pathname === "/profile",
    },
  ];

  const exploreLinks = [
    {
      title: "Anime Discovery Hub",
      subtitle: "Explore anime by genres, seasons & years",
      icon: Film,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      href: "/anime",
      badge: "Hub",
    },
    {
      title: "Anime Tier List Maker",
      subtitle: "Drag-and-drop ranking & community tiers",
      icon: Trophy,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10 border-amber-500/20",
      href: "/tier-list",
      badge: "Community",
    },
    {
      title: "Anime Movies",
      subtitle: "Theatrical features & cinematic anime",
      icon: Film,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/10 border-purple-500/20",
      href: "/catalog?format=movie",
      badge: "Movies",
    },
    {
      title: "New Releases & Seasonal",
      subtitle: "Latest episode premieres & fresh broadcasts",
      icon: Sparkles,
      iconColor: "text-cyan-400",
      iconBg: "bg-cyan-500/10 border-cyan-500/20",
      href: "/catalog?sort=newest",
      badge: "Seasonal",
    },
    {
      title: "Watchlist Quick Access",
      subtitle: "Your saved anime queue & reading library",
      icon: Bookmark,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10 border-blue-500/20",
      href: "/watchlist",
      badge: "Library",
    },
    {
      title: "Airing Schedule",
      subtitle: "Weekly simulcast schedule & countdowns",
      icon: Calendar,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10 border-emerald-500/20",
      href: "/airing",
      badge: "Schedule",
    },
  ];

  return (
    <>
      {/* Backdrop for Explore Drawer */}
      {isExploreOpen && (
        <div
          role="presentation"
          onClick={() => setIsExploreOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 animate-in fade-in duration-200 md:hidden"
        />
      )}

      {/* Explore Drawer / Bottom Sheet */}
      {isExploreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Explore Menu"
          className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/98 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl shadow-[0_-15px_40px_rgba(0,0,0,0.95)] p-5 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+1.25rem))] max-w-lg mx-auto animate-in slide-in-from-bottom duration-300"
        >
          {/* Top Drag Indicator */}
          <button
            type="button"
            onClick={() => setIsExploreOpen(false)}
            aria-label="Close explore menu"
            className="w-12 h-1.5 bg-white/25 hover:bg-white/40 rounded-full mx-auto mb-4 block transition-colors cursor-pointer"
          />

          {/* Drawer Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-white tracking-tight">Explore</h3>
                <p className="text-[11px] text-slate-400 font-medium">Browse tier lists, movies, seasonal & library</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExploreOpen(false)}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Explore Links List */}
          <div className="space-y-2">
            {exploreLinks.map((item) => {
              const Icon = item.icon;
              const isCurrent =
                pathname === item.href ||
                (item.href.includes("format=movie") && format === "movie") ||
                (item.href.includes("sort=newest") && sort === "newest");

              return (
                <Link
                  key={item.title}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsExploreOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-[0.98] ${
                    isCurrent
                      ? "bg-blue-600/15 border-blue-500/40 text-white shadow-lg"
                      : "bg-slate-900/60 hover:bg-slate-800/80 border-white/5 hover:border-white/15 text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl border shrink-0 ${item.iconBg}`}>
                      <Icon className={`w-5 h-5 ${item.iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 px-3 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] transition-all duration-300 ease-in-out ${
          isHidden
            ? "translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100 pointer-events-auto"
        }`}
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isDrawer) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  aria-expanded={isExploreOpen}
                  aria-label="Open Explore Menu"
                  className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                    item.isActive
                      ? "text-blue-400 font-bold"
                      : "text-slate-400 hover:text-slate-200 font-medium"
                  }`}
                >
                  <div
                    className={`p-1 rounded-xl transition-all duration-200 ${
                      item.isActive
                        ? "bg-blue-600/20 text-blue-400 scale-110 shadow-[0_0_15px_rgba(37,99,235,0.4)] ring-1 ring-blue-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                prefetch={true}
                aria-current={item.isActive ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-200 ${
                  item.isActive
                    ? "text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-200 font-medium"
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all duration-200 ${
                    item.isActive
                      ? "bg-blue-600/20 text-blue-400 scale-110 shadow-[0_0_15px_rgba(37,99,235,0.4)] ring-1 ring-blue-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

export default function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  );
}
