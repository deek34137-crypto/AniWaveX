"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Sparkles, Film, Compass, Calendar, Trophy, Flame, Users } from "lucide-react";

export default function NavbarLinks() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<"browse" | "community" | null>(null);

  const browseRef = useRef<HTMLDivElement>(null);
  const communityRef = useRef<HTMLDivElement>(null);

  // Close dropdown on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        browseRef.current &&
        !browseRef.current.contains(target) &&
        communityRef.current &&
        !communityRef.current.contains(target)
      ) {
        setOpenDropdown(null);
      }
    };

    if (openDropdown) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openDropdown]);

  // Route matches
  const isHome = pathname === "/";
  const isAnime = pathname.startsWith("/anime");
  const isManga = pathname.startsWith("/manga");
  const isBrowse =
    pathname.startsWith("/catalog") ||
    pathname.startsWith("/genre") ||
    pathname.startsWith("/year") ||
    pathname.startsWith("/season");
  const isCommunity =
    pathname === "/airing" ||
    pathname === "/schedule" ||
    pathname.startsWith("/tier-list");

  const activePillClass =
    "bg-white/10 text-white font-bold shadow-sm border border-white/15";
  const inactivePillClass =
    "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent";

  return (
    <div className="hidden md:flex items-center gap-1.5 lg:gap-2 ml-4 lg:ml-6 select-none">
      {/* 1. Primary: Home */}
      <Link
        href="/"
        prefetch={true}
        className={`text-xs sm:text-sm font-semibold rounded-xl px-3 py-1.5 transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
          isHome ? activePillClass : inactivePillClass
        }`}
      >
        Home
      </Link>

      {/* 2. Primary: Anime */}
      <Link
        href="/anime"
        prefetch={true}
        className={`text-xs sm:text-sm font-semibold rounded-xl px-3 py-1.5 transition-all flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
          isAnime ? activePillClass : inactivePillClass
        }`}
      >
        Anime
      </Link>

      {/* 3. Primary: Manga (Enhanced with accent pill) */}
      <Link
        href="/manga"
        prefetch={true}
        className={`text-xs sm:text-sm rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 font-bold focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
          isManga
            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
            : "text-cyan-400/90 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>Manga</span>
      </Link>

      {/* 4. Grouped Dropdown: Browse (Catalog, Movies, New Releases) */}
      <div ref={browseRef} className="relative">
        <button
          type="button"
          onClick={() =>
            setOpenDropdown((prev) => (prev === "browse" ? null : "browse"))
          }
          className={`text-xs sm:text-sm font-semibold rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
            isBrowse || openDropdown === "browse"
              ? activePillClass
              : inactivePillClass
          }`}
          aria-expanded={openDropdown === "browse"}
        >
          <span>Browse</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openDropdown === "browse" ? "rotate-180" : ""
            }`}
          />
        </button>

        {openDropdown === "browse" && (
          <div className="absolute left-0 top-full mt-2.5 w-72 sm:w-80 rounded-2xl bg-slate-900/98 border border-white/15 p-2 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10 space-y-1">
            <Link
              href="/catalog"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:bg-cyan-500/25 group-hover:border-cyan-400/50 shadow-sm">
                <Compass className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Full Catalog</p>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-normal truncate mt-0.5">All genres, filters & formats</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <Link
              href="/catalog?format=movie"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:bg-indigo-500/25 group-hover:border-indigo-400/50 shadow-sm">
                <Film className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">Anime Movies</p>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-normal truncate mt-0.5">Feature films, OVAs & specials</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <Link
              href="/catalog?sort=newest"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:bg-amber-500/25 group-hover:border-amber-400/50 shadow-sm">
                <Flame className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">New Releases</p>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-normal truncate mt-0.5">Fresh seasonal drops & simulcasts</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        )}
      </div>

      {/* 5. Grouped Dropdown: Community (Schedule, Tier Lists) */}
      <div ref={communityRef} className="relative">
        <button
          type="button"
          onClick={() =>
            setOpenDropdown((prev) => (prev === "community" ? null : "community"))
          }
          className={`text-xs sm:text-sm font-semibold rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
            isCommunity || openDropdown === "community"
              ? activePillClass
              : inactivePillClass
          }`}
          aria-expanded={openDropdown === "community"}
        >
          <span>Community</span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openDropdown === "community" ? "rotate-180" : ""
            }`}
          />
        </button>

        {openDropdown === "community" && (
          <div className="absolute left-0 top-full mt-2.5 w-72 sm:w-80 rounded-2xl bg-slate-900/98 border border-white/15 p-2 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/10 space-y-1">
            <Link
              href="/airing"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:bg-emerald-500/25 group-hover:border-emerald-400/50 shadow-sm">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Release Schedule</p>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-normal truncate mt-0.5">Live airing calendar & countdowns</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <Link
              href="/tier-list"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:bg-yellow-500/25 group-hover:border-yellow-400/50 shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors">Tier Lists</p>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-normal truncate mt-0.5">Create & rank anime characters</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <Link
              href="/tier-list/community"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-slate-200 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105 group-hover:bg-purple-500/25 group-hover:border-purple-400/50 shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Community Rankings</p>
                <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors font-normal truncate mt-0.5">Top-voted community tier lists</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
