import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { getUnifiedAiringSchedule } from "@/lib/schedule";
import AiringScheduleClient from "./AiringScheduleClient";

export const metadata: Metadata = {
  title: "Weekly Airing Schedule - AniWaveX",
  description: "Track upcoming anime broadcasts, release schedules, and simulcasts with live countdowns.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AiringPage() {
  const airingAnime = await getUnifiedAiringSchedule();

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer" />

      <div className="max-w-[1720px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10 2xl:px-12">
        <AiringScheduleClient animeList={airingAnime} />
      </div>
    </main>
  );
}
