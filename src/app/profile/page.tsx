import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import AccountCenterClient from "./AccountCenterClient";
import ProfileAuthClient from "./ProfileAuthClient";
import { Suspense } from "react";
import { UserStats } from "@/types/account";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; connected?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sParams = searchParams ? await searchParams : {};

  // If not logged in, render the inline login/signup screen
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 pb-32">
        <Navbar />
        <div className="page-top-spacer"></div>
        <ProfileAuthClient />
      </main>
    );
  }

  // Fetch all initial data in parallel
  const [profileRes, bookmarksRes, historyRes, accountsRes, syncHistoryRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("bookmarks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("watch_history").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("external_accounts").select("id, provider, provider_user_id, username, avatar_url, status, last_synced_at, sync_settings").eq("user_id", user.id),
    supabase.from("sync_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
  ]);

  const profile = profileRes.data || {};
  const bookmarks = bookmarksRes.data || [];
  const history = historyRes.data || [];
  const accounts = accountsRes.data || [];
  const syncHistory = syncHistoryRes.data || [];

  // Compute live statistics without fabrication
  const distinctWatchedAnime = new Set(history.map((h: any) => h.anime_slug).filter(Boolean));
  const totalEpisodesWatched = history.reduce((sum: number, h: any) => sum + (h.last_episode_watched || 1), 0);
  const totalWatchTimeSeconds = history.reduce((sum: number, h: any) => sum + (h.progress_seconds || 0), 0);

  const completedCount = bookmarks.filter((b: any) => b.status === "completed").length;
  const watchingCount = bookmarks.filter((b: any) => b.status === "watching").length;
  const planToWatchCount = bookmarks.filter((b: any) => b.status === "plan_to_watch").length;

  const initialStats: UserStats = {
    anime_watched: distinctWatchedAnime.size,
    episodes_watched: totalEpisodesWatched,
    completed: completedCount,
    currently_watching: watchingCount,
    plan_to_watch: planToWatchCount,
    watch_time_seconds: totalWatchTimeSeconds,
    favorites_count: Array.isArray(profile.top_five_anime) ? profile.top_five_anime.length : 0,
  };

  const initialConnections = {
    ANILIST: accounts.find((a: any) => a.provider === "ANILIST") || null,
    MYANIMELIST: accounts.find((a: any) => a.provider === "MYANIMELIST") || null,
  };

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer"></div>
      <Suspense fallback={<div className="h-40 flex items-center justify-center text-slate-500 text-sm">Loading Account Center...</div>}>
        <AccountCenterClient
          user={user}
          initialProfile={profile}
          initialStats={initialStats}
          initialConnections={initialConnections}
          initialSyncHistory={syncHistory}
          initialBookmarks={bookmarks}
          initialHistory={history}
        />
      </Suspense>
    </main>
  );
}
