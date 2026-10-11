"use client";

import { Search } from "lucide-react";

export default function MobileSearchButton() {
  const handleOpenSearch = () => {
    // Triggers instant full-featured search overlay (Command Palette style) with live autocomplete,
    // match highlights, dual anime + manga search, without requiring a route change to /search
    window.dispatchEvent(new CustomEvent("open-command-palette"));
  };

  return (
    <button
      type="button"
      onClick={handleOpenSearch}
      className="sm:hidden p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      aria-label="Open instant search"
      title="Search Anime & Manga"
    >
      <Search className="w-5 h-5" />
    </button>
  );
}
