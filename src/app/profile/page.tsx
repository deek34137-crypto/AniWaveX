import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If logged out, we redirect to home
  if (!user) {
    redirect('/');
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
      <div className="h-24"></div>
      <ProfileClient user={user} history={history || []} bookmarks={bookmarks || []} />
    </main>
  );
}
