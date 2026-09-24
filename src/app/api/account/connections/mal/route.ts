import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("external_accounts")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "MYANIMELIST");

    if (error) throw error;

    return NextResponse.json({ success: true, message: "MyAnimeList disconnected successfully." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to disconnect MyAnimeList" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { sync_settings } = body;

    const { error } = await supabase
      .from("external_accounts")
      .update({
        sync_settings,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("provider", "MYANIMELIST");

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update MAL settings" }, { status: 500 });
  }
}
