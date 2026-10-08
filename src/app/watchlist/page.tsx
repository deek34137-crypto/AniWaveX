import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import WatchlistGrid from "@/components/profile/WatchlistGrid";

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let bookmarks: any[] = [];
  if (user) {
    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    bookmarks = data || [];
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-32">
      <Navbar />
      <div className="page-top-spacer" />
      <div className="tv-safe-container pt-4 sm:pt-6">
        <WatchlistGrid initialItems={bookmarks} />
      </div>
    </main>
  );
}
