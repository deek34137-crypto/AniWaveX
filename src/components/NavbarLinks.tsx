"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Sparkles, Film, Compass, Calendar, Trophy, Flame } from "lucide-react";

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
          <div className="absolute left-0 top-full mt-2 w-52 rounded-2xl bg-slate-900/95 border border-white/15 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95">
            <Link
              href="/catalog"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Compass className="w-4 h-4 text-cyan-400" />
              <div>
                <p>Full Catalog</p>
                <p className="text-[10px] text-slate-400 font-normal">All genres & filters</p>
              </div>
            </Link>

            <Link
              href="/catalog?format=movie"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Film className="w-4 h-4 text-indigo-400" />
              <div>
                <p>Anime Movies</p>
                <p className="text-[10px] text-slate-400 font-normal">Feature films & specials</p>
              </div>
            </Link>

            <Link
              href="/catalog?sort=newest"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <div>
                <p>New Releases</p>
                <p className="text-[10px] text-slate-400 font-normal">Fresh seasonal drops</p>
              </div>
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
          <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-slate-900/95 border border-white/15 p-1.5 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95">
            <Link
              href="/airing"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Calendar className="w-4 h-4 text-emerald-400" />
              <div>
                <p>Release Schedule</p>
                <p className="text-[10px] text-slate-400 font-normal">Airing calendar & countdowns</p>
              </div>
            </Link>

            <Link
              href="/tier-list"
              prefetch={true}
              onClick={() => setOpenDropdown(null)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <div>
                <p>Tier Lists</p>
                <p className="text-[10px] text-slate-400 font-normal">Community rankings</p>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
