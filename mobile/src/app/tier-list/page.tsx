import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { getTrendingAnime, getTopRatedAnime } from "@/lib/api";
import TierListClient from "./TierListClient";

export const metadata: Metadata = {
  title: "Anime Tier List Maker - AniWaveX",
  description: "Create, customize, and share high-resolution anime tier lists with drag-and-drop ranking.",
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
      <div className="h-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Suspense fallback={<div className="text-white py-12 text-center text-sm font-bold">Loading Tier Maker...</div>}>
          <TierListClient initialPresetAnime={presetAnime} />
        </Suspense>
      </div>
    </main>
  );
}
