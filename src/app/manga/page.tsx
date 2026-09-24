import { getTrendingMangaList } from "@/lib/manga/service";
import MangaCatalogClient from "@/components/manga/MangaCatalogClient";
import Navbar from "@/components/Navbar";
import { Sparkles } from "lucide-react";

export default async function MangaHomePage() {
  const trending = await getTrendingMangaList(24);

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

        {/* Seamless Interactive Catalog Client (Search + Category Filter + Grid) */}
        <MangaCatalogClient initialManga={trending} />
      </div>
    </div>
  );
}
