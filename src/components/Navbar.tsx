import SearchBar from "./SearchBar";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavbarActions from "./NavbarActions";
import MobileNav from "./MobileNav";
import ImageSearchTrigger from "./ImageSearchTrigger";
import { Search } from "lucide-react";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top,0px)] transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        {/* Left Section: Logo & Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          <MobileNav />
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-2xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent select-none">
              AniWaveX
            </span>
          </Link>
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 ml-6">
            <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link href="/catalog" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Catalog</Link>
            <Link href="/manga" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-bold">Manga</Link>
            <Link href="/airing" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Schedule</Link>
            <Link href="/tier-list" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Tier List</Link>
            <Link href="/catalog?format=movie" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Movies</Link>
            <Link href="/catalog?sort=newest" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">New Release</Link>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-4 flex-1 justify-end ml-2">
          {/* Desktop Search Bar */}
          <div className="hidden sm:block flex-1 max-w-sm">
            <SearchBar />
          </div>

          {/* Screenshot Search Button (Trace.moe) */}
          <ImageSearchTrigger />

          {/* Mobile Search Icon */}
          <Link 
            href="/search" 
            className="sm:hidden p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Search Anime"
          >
            <Search className="w-5 h-5" />
          </Link>

          <NavbarActions user={user} />
        </div>
      </div>
    </nav>
  );
}
