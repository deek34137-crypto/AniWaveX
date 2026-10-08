"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect, useRef } from "react";
import { Home, Compass, Film, Calendar, User, BookOpen } from "lucide-react";

function BottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const format = searchParams.get("format");
  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const [isScrolledDown, setIsScrolledDown] = useState(false);
  const lastScrollY = useRef(0);

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
  }, []);

  // Hide MobileBottomNav on manga reader routes to prevent blocking chapter controls and page counters
  if (pathname.includes("/read") || (pathname.startsWith("/manga/") && pathname.includes("/read"))) {
    return null;
  }

  // Auto-hide when on /anime/[slug] with an active playing episode, or auto-collapse on scroll down
  const isPlayingOnAnimePage = pathname.startsWith("/anime/") && (isPlayerActive || searchParams.get("play") === "1");
  const isHidden = isPlayingOnAnimePage || isScrolledDown;

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
      isActive: pathname === "/catalog" && format !== "movie",
    },
    {
      label: "Manga",
      href: "/manga",
      icon: BookOpen,
      isActive: pathname.startsWith("/manga"),
    },
    {
      label: "Schedule",
      href: "/airing",
      icon: Calendar,
      isActive: pathname === "/airing",
    },
    {
      label: "Profile",
      href: "/profile",
      icon: User,
      isActive: pathname === "/profile",
    },
  ];

  return (
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
          return (
            <Link
              key={item.label}
              href={item.href}
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
  );
}

export default function MobileBottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  );
}
