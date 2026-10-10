import SearchBar from "./SearchBar";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavbarLinks from "./NavbarLinks";
import NavbarActions from "./NavbarActions";
import { Search } from "lucide-react";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav id="main-navbar" className="fixed top-0 left-0 w-full z-50 bg-[#0a0a0c]/95 backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top,0px)] transition-all">
      <div className="tv-safe-container h-14 sm:h-16 tv:h-20 flex items-center justify-between">
        {/* Left Section: Logo & Desktop Links */}
        <div className="flex items-center gap-2 sm:gap-4 tv:gap-8">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none rounded-lg px-1 py-1">
            <span className="text-lg sm:text-2xl tv:text-3xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent select-none">
              AniWaveX
            </span>
          </Link>
          {/* Consolidated Grouped Nav */}
          <NavbarLinks />
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 sm:gap-4 tv:gap-6 flex-1 justify-end ml-4">
          {/* Desktop Search Bar */}
          <div className="hidden sm:block flex-1 max-w-sm tv:max-w-md">
            <SearchBar />
          </div>

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
