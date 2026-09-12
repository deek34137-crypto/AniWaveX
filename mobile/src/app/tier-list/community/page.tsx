import { Suspense } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import CommunityTierListsClient from "./CommunityTierListsClient";

export const metadata: Metadata = {
  title: "Community Anime Tier Lists - AniWaveX",
  description: "Explore, upvote, and clone anime tier lists created by the AniWaveX community.",
};

export default async function CommunityTierListsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch public tier lists sorted by likes_count and created_at
  const { data: tierLists } = await supabase
    .from("tier_lists")
    .select("*")
    .eq("is_public", true)
    .order("likes_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  // Fetch user upvotes if logged in
  let userUpvotes: string[] = [];
  if (user) {
    const { data: likes } = await supabase
      .from("tier_list_likes")
      .select("tier_list_id")
      .eq("user_id", user.id);
    userUpvotes = (likes || []).map((l: any) => l.tier_list_id);
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="h-20" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <Suspense fallback={<div className="text-white py-12 text-center text-sm font-bold">Loading Community Feed...</div>}>
          <CommunityTierListsClient 
            initialLists={tierLists || []} 
            userUpvotes={userUpvotes} 
            currentUserId={user?.id} 
          />
        </Suspense>
      </div>
    </main>
  );
}