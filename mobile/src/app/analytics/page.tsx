import Navbar from "@/components/Navbar";
import AnalyticsPageClient from "./AnalyticsPageClient";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Analytics & Traffic Heartbeat - AniWaveX",
  description: "View real-time concurrent users, daily unique visitors, and site traffic telemetry.",
};

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAdmin = isAdminUser(user);

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-20" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <AnalyticsPageClient initialIsAdmin={isAdmin} userEmail={user?.email || null} />
      </div>
    </main>
  );
}
