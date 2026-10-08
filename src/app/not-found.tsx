import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Film, BookOpen, Compass, Calendar, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found | AniWaveX",
  description: "The anime, manga, or page you are looking for does not exist or may have been moved.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <Navbar />
      <div className="page-top-spacer" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center space-y-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-blue-600/10 border border-blue-500/20 text-cyan-400 mb-2 shadow-inner">
          <span className="text-4xl font-black">404</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Anime Title or Page Not Found
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            The link you followed may be outdated, the anime title may have been renamed, or the page no longer exists.
          </p>
        </div>

        {/* Helpful Crawlable Discovery Links */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <Link
            href="/anime"
            className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-blue-500/50 hover:bg-slate-900 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Film className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors flex items-center justify-between">
              Anime Discovery
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">Browse trending &amp; top-rated anime series.</p>
          </Link>

          <Link
            href="/manga"
            className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/50 hover:bg-slate-900 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors flex items-center justify-between">
              Manga Reader
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">Explore trending manga and light novels.</p>
          </Link>

          <Link
            href="/airing"
            className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-purple-500/50 hover:bg-slate-900 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors flex items-center justify-between">
              Airing Schedule
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">Track this week's broadcast schedule.</p>
          </Link>

          <Link
            href="/catalog"
            className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/50 hover:bg-slate-900 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h2 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center justify-between">
              Full Catalog
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">Filter by genre, year, and season.</p>
          </Link>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 hover:scale-105"
          >
            Return to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
