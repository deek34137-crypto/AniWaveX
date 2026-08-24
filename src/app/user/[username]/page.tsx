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

  // Try to find bookmarks and history for the user
  let bookmarks: any[] = [];
  let history: any[] = [];
  let profileUser: any = null;

  if (currentUser) {
    const currentUsername = (
      currentUser.user_metadata?.username ||
      currentUser.email?.split("@")[0] ||
      ""
    ).toLowerCase();

    if (currentUsername === decodedUsername.toLowerCase()) {
      profileUser = currentUser;

      const [{ data: bData }, { data: hData }] = await Promise.all([
        supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("watch_history")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("updated_at", { ascending: false }),
      ]);

      bookmarks = bData || [];
      history = hData || [];
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-20" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <PublicProfileClient
          username={decodedUsername}
          user={profileUser}
          bookmarks={bookmarks}
          history={history}
        />
      </div>
    </main>
  );
}
