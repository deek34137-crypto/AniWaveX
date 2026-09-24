import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "./ProfileClient";
import ProfileAuthClient from "./ProfileAuthClient";
import { Suspense } from "react";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const sParams = searchParams ? await searchParams : {};

  // If not logged in and not requesting settings, render the inline login/signup screen
  if (!user && sParams.tab !== "settings") {
    return (
      <main className="min-h-screen bg-slate-950 pb-32">
        <Navbar />
        <div className="page-top-spacer"></div>
        <ProfileAuthClient />
      </main>
    );
  }

  // Fetch bookmarks and watch history in parallel if logged in (bounded to 50 latest entries)
  const [{ data: bookmarks }, { data: history }] = user
    ? await Promise.all([
        supabase
          .from("bookmarks")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("watch_history")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(50),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer"></div>
      <Suspense fallback={<div className="h-40" />}>
        <ProfileClient user={user} history={history || []} bookmarks={bookmarks || []} />
      </Suspense>
    </main>
  );
}
