import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getTrendingAnime, getTopRatedAnime } from "@/lib/api";
import TierListClient from "./TierListClient";
import { getAbsoluteUrl, SITE_CONFIG } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "Anime Tier List Maker — Rank Your Favorite Series & Characters",
  description:
    "Create, customize, and share high-resolution anime tier lists with drag-and-drop ranking. Compare your favorites with the AniWaveX community.",
  alternates: {
    canonical: getAbsoluteUrl("/tier-list"),
  },
  openGraph: {
    title: "Anime Tier List Maker — AniWaveX",
    description: "Create and share interactive anime tier lists on AniWaveX.",
    url: getAbsoluteUrl("/tier-list"),
    siteName: SITE_CONFIG.name,
    images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: "Anime Tier List Maker on AniWaveX" }],
    type: "website",
  },
};

export default async function TierListPage() {
  const [trending, topRated] = await Promise.all([
    getTrendingAnime().catch(() => []),
    getTopRatedAnime().catch(() => []),
  ]);

  const presetAnime = [...trending.slice(0, 15), ...topRated.slice(0, 15)];

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        <Breadcrumbs items={[{ name: "Tier List Maker", path: "/tier-list" }]} />
        <Suspense fallback={<div className="text-white py-12 text-center text-sm font-bold">Loading Tier Maker...</div>}>
          <TierListClient initialPresetAnime={presetAnime} />
        </Suspense>
      </div>
    </main>
  );
}
