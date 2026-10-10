import { getTrendingMangaList } from "@/lib/manga/service";
import MangaCatalogClient from "@/components/manga/MangaCatalogClient";
import ContinueReadingRow from "@/components/manga/ContinueReadingRow";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Sparkles } from "lucide-react";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { getAbsoluteUrl, SITE_CONFIG } from "@/lib/seo/site-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Read Manga, Manhwa & Comics Online in High Quality — AniWaveX",
  description:
    "Read thousands of manga, manhwa, and comic chapters online in high quality. Browse trending releases, action, isekai, romance, and scanlated updates on AniWaveX.",
  alternates: {
    canonical: getAbsoluteUrl("/manga"),
  },
  openGraph: {
    title: "Manga & Manhwa Discovery — AniWaveX",
    description:
      "Explore official and scanlated manga chapters with our zero-lag continuous reader on AniWaveX.",
    url: getAbsoluteUrl("/manga"),
    siteName: SITE_CONFIG.name,
    images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: "Manga Discovery on AniWaveX" }],
    type: "website",
  },
};

export default async function MangaHomePage() {
  const trending = await getTrendingMangaList(36);

  const itemList = (trending || []).slice(0, 15).map((m) => ({
    name: m.title,
    path: `/manga/${m.id}`,
    image: m.posterImage || m.bannerImage,
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-32">
      <JsonLd schema={createItemListSchema("Popular Manga Titles", itemList)} />
      <Navbar />
      <div className="page-top-spacer"></div>

      <div className="tv-safe-container pt-4 space-y-8">
        <Breadcrumbs items={[{ name: "Manga", path: "/manga" }]} />

        {/* Manga Hero Banner */}
        <div className="relative rounded-3xl tv:rounded-[2rem] overflow-hidden bg-gradient-to-r from-blue-900/60 via-purple-900/40 to-slate-900 border border-white/10 p-6 sm:p-12 tv:p-16 shadow-2xl">
          <div className="max-w-2xl tv:max-w-4xl space-y-4 z-10 relative">
            <span className="px-3.5 py-1 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Manga &amp; Comics Discovery
            </span>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
              Read Manga, Manhwa &amp; Comics in High Quality
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-xl">
              Explore thousands of official and scanlated chapters with our lightning-fast, zero-lag continuous reader designed for desktop and TV.
            </p>
          </div>
        </div>

        {/* Continue Reading Shelf for returning readers */}
        <ContinueReadingRow />

        {/* Seamless Interactive Catalog Client (Search + Category Filter + Grid) */}
        <MangaCatalogClient initialManga={trending} />
      </div>
    </div>
  );
}
