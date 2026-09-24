import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parallel fetch all user records
    const [profileRes, bookmarksRes, historyRes, accountsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("bookmarks").select("*").eq("user_id", user.id),
      supabase.from("watch_history").select("*").eq("user_id", user.id),
      supabase.from("external_accounts").select("provider, provider_user_id, username, status, last_synced_at, created_at").eq("user_id", user.id),
    ]);

    const sanitizedExport = {
      export_version: "1.0",
      generated_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      profile: profileRes.data || {},
      watchlist: (bookmarksRes.data || []).map((b) => ({
        anime_slug: b.anime_slug,
        anime_title: b.anime_title,
        status: b.status,
        last_episode_watched: b.last_episode_watched,
        created_at: b.created_at,
        updated_at: b.updated_at,
      })),
      watch_history: (historyRes.data || []).map((h) => ({
        anime_slug: h.anime_slug,
        anime_title: h.anime_title,
        last_episode_watched: h.last_episode_watched,
        progress_seconds: h.progress_seconds,
        updated_at: h.updated_at,
      })),
      connected_accounts: accountsRes.data || [],
    };

    return new NextResponse(JSON.stringify(sanitizedExport, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="aniwavex_export_${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to export data" }, { status: 500 });
  }
}
