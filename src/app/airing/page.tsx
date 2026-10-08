import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getUnifiedAiringSchedule } from "@/lib/schedule";
import AiringScheduleClient from "./AiringScheduleClient";
import { JsonLd, createItemListSchema } from "@/lib/seo/jsonld";
import { getAbsoluteUrl, SITE_CONFIG } from "@/lib/seo/site-config";

export const metadata: Metadata = {
  title: "Weekly Airing Anime Schedule & Simulcasts — AniWaveX",
  description:
    "Track all weekly anime simulcast broadcasts, release times, and live episode countdowns for currently airing shows in Japan on AniWaveX.",
  alternates: {
    canonical: getAbsoluteUrl("/airing"),
  },
  openGraph: {
    title: "Weekly Airing Anime Schedule — AniWaveX",
    description: "Track all weekly anime simulcast broadcasts with live countdowns on AniWaveX.",
    url: getAbsoluteUrl("/airing"),
    siteName: SITE_CONFIG.name,
    images: [{ url: SITE_CONFIG.ogImage, width: 1200, height: 630, alt: "Weekly Airing Schedule on AniWaveX" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Weekly Airing Anime Schedule — AniWaveX",
    description: "Track all weekly anime simulcast broadcasts with live countdowns on AniWaveX.",
    images: [SITE_CONFIG.ogImage],
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiringPage() {
  const airingAnime = await getUnifiedAiringSchedule();

  const itemList = (airingAnime || []).slice(0, 20).map((a) => ({
    name: a.title,
    path: `/anime/${a.slug}`,
    image: a.posterImage || a.bannerImage,
  }));

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <JsonLd schema={createItemListSchema("Weekly Airing Anime Broadcasts", itemList)} />
      <Navbar />
      <div className="page-top-spacer" />

      <div className="tv-safe-container pt-4 space-y-4">
        <Breadcrumbs items={[{ name: "Airing Schedule", path: "/airing" }]} />
        <AiringScheduleClient animeList={airingAnime} />
      </div>
    </main>
  );
}
