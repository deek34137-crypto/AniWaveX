import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
      .from("external_accounts")
      .select("id, provider, provider_user_id, username, avatar_url, status, last_synced_at, sync_settings, created_at")
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    // Return mapped safe connections
    const connectionsMap = {
      ANILIST: accounts?.find((a) => a.provider === "ANILIST") || null,
      MYANIMELIST: accounts?.find((a) => a.provider === "MYANIMELIST") || null,
    };

    return NextResponse.json({
      connections: connectionsMap,
      raw: accounts || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch connections" }, { status: 500 });
  }
}
