import Navbar from "@/components/Navbar";
import DownloadsClient from "@/components/manga/DownloadsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline Downloads — AniWaveX",
  description: "View and read all manga chapters downloaded for offline reading on AniWaveX.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DownloadsPage() {
  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer" />
      <div className="tv-safe-container pt-4 sm:pt-6">
        <DownloadsClient />
      </div>
    </main>
  );
}
