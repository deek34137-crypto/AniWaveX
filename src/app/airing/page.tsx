import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { getUnifiedAiringSchedule } from "@/lib/schedule";
import AiringScheduleClient from "./AiringScheduleClient";

export const metadata: Metadata = {
  title: "Weekly Airing Schedule - AniWaveX",
  description: "Track upcoming anime broadcasts, release schedules, and simulcasts with live countdowns.",
};

export default async function AiringPage() {
  const airingAnime = await getUnifiedAiringSchedule();

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-24" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <AiringScheduleClient animeList={airingAnime} />
      </div>
    </main>
  );
}
