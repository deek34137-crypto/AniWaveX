import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import PublicProfileClient from "./PublicProfileClient";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const decoded = decodeURIComponent(username);

  return {
    title: `${decoded}'s Anime Profile - AniWaveX`,
    description: `Explore ${decoded}'s favorite anime masterpieces, watch statistics, and tier lists on AniWaveX.`,
    openGraph: {
      title: `${decoded}'s Anime Profile - AniWaveX`,
      description: `Explore ${decoded}'s favorite anime masterpieces, watch statistics, and tier lists on AniWaveX.`,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  const supabase = await createClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // 1. Fetch public profile record by username (case-insensitive)
  const { data: profileRecord } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", decodedUsername)
    .maybeSingle();

  // 2. Determine target user ID
  let targetUserId = profileRecord?.id;
  
  if (!targetUserId && currentUser) {
    const currentUsername = (
      currentUser.user_metadata?.username ||
      currentUser.email?.split("@")[0] ||
      ""
    ).toLowerCase();

    if (currentUsername === decodedUsername.toLowerCase()) {
      targetUserId = currentUser.id;
    }
  }

  // 3. Fetch bookmarks, watch history, and public tier lists
  let bookmarks: any[] = [];
  let history: any[] = [];
  let tierLists: any[] = [];

  if (targetUserId) {
    const [bRes, hRes, tRes] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false }),
      supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", targetUserId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("tier_lists")
        .select("*")
        .or(`user_id.eq.${targetUserId},username.ilike.${decodedUsername}`)
        .order("created_at", { ascending: false }),
    ]);

    bookmarks = bRes.data || [];
    history = hRes.data || [];
    tierLists = tRes.data || [];
  } else {
    // If user profile has not been created yet in DB, check tier_lists table by username
    const { data: tData } = await supabase
      .from("tier_lists")
      .select("*")
      .ilike("username", decodedUsername)
      .order("created_at", { ascending: false });

    tierLists = tData || [];
  }

  // 4. Construct normalized user profile object
  const profileUser = profileRecord
    ? {
        id: profileRecord.id,
        user_metadata: {
          username: profileRecord.username,
          bio: profileRecord.bio,
          avatar_id: profileRecord.avatar_id,
          banner_preset: profileRecord.banner_preset,
          custom_banner_url: profileRecord.custom_banner_url,
          top_five_anime: profileRecord.top_five_anime || [],
        },
      }
    : currentUser &&
      (currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "").toLowerCase() ===
        decodedUsername.toLowerCase()
    ? currentUser
    : null;

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <PublicProfileClient
          username={profileRecord?.username || decodedUsername}
          user={profileUser}
          bookmarks={bookmarks}
          history={history}
          initialTierLists={tierLists}
        />
      </div>
    </main>
  );
}
