import { getTrendingMangaList } from "@/lib/manga/service";
import MangaCard from "@/components/manga/MangaCard";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { BookOpen, Sparkles, Flame, Layers } from "lucide-react";

export default async function MangaHomePage() {
  const trending = await getTrendingMangaList(24);

  const categories = [
    { label: "All Manga", href: "/manga" },
    { label: "Manhwa (Korean)", href: "/search?type=manga&q=manhwa" },
    { label: "Manhua (Chinese)", href: "/search?type=manga&q=manhua" },
    { label: "Action", href: "/search?type=manga&q=action" },
    { label: "Romance", href: "/search?type=manga&q=romance" },
    { label: "Fantasy", href: "/search?type=manga&q=fantasy" },
    { label: "Isekai", href: "/search?type=manga&q=isekai" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <Navbar />
      <div className="page-top-spacer"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Manga Hero Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900/60 via-purple-900/40 to-slate-900 border border-white/10 p-6 sm:p-10 shadow-2xl">
          <div className="max-w-xl space-y-3 z-10 relative">
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Manga &amp; Comics Discovery
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              Read Manga, Manhwa &amp; Comics in High Quality
            </h1>
            <p className="text-sm sm:text-base text-slate-300">
              Explore thousands of official and scanlated chapters with our lightning-fast, zero-lag continuous reader.
            </p>
          </div>
        </div>

        {/* Quick Filter Categories Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {categories.map((cat, i) => (
            <Link
              key={cat.label}
              href={cat.href}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all border ${
                i === 0
                  ? "bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/20"
                  : "bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:border-white/20"
              }`}
            >
              {cat.label}
            </Link>
          ))}
        </div>

        {/* Trending Manga Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Popular &amp; Trending Manga
            </h2>
            <span className="text-xs text-slate-400 font-medium">{trending.length} titles</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {trending.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
