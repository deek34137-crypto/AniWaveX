import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import ProfileClient from "./ProfileClient";
import ProfileAuthClient from "./ProfileAuthClient";
import { Suspense } from "react";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If not logged in, render the inline login/signup screen directly on /profile
  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 pb-32">
        <Navbar />
        <div className="page-top-spacer"></div>
        <ProfileAuthClient />
      </main>
    );
  }

  // Fetch bookmarks and watch history in parallel (bounded to 50 latest entries)
  const [{ data: bookmarks }, { data: history }] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50)
  ]);

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
