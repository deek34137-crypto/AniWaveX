import SearchBar from "./SearchBar";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavbarActions from "./NavbarActions";
import MobileNav from "./MobileNav";

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className="fixed top-0 left-0 w-full z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left Section: Logo & Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          <MobileNav />
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg sm:text-2xl font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              AniWaveX
            </span>
          </Link>
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 ml-6">
            <Link href="/" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link href="/catalog" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Catalog</Link>
            <Link href="/airing" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Schedule</Link>
            <Link href="/tier-list" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Tier List</Link>
            <Link href="/catalog?format=movie" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Movies</Link>
            <Link href="/catalog?sort=newest" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">New Release</Link>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-end ml-2">
          <SearchBar />
          <NavbarActions user={user} />
        </div>
      </div>
    </nav>
  );
}
