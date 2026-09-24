import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== "DELETE_MY_ACCOUNT") {
      return NextResponse.json(
        { error: "Confirmation mismatch. Please type DELETE_MY_ACCOUNT to confirm." },
        { status: 400 }
      );
    }

    // 1. Delete user bookmarks
    await supabase.from("bookmarks").delete().eq("user_id", user.id);

    // 2. Delete watch history
    await supabase.from("watch_history").delete().eq("user_id", user.id);

    // 3. Delete tier lists & likes
    await supabase.from("tier_list_likes").delete().eq("user_id", user.id);
    await supabase.from("tier_lists").delete().eq("user_id", user.id);

    // 4. Disconnect and delete external accounts (AniList, MyAnimeList)
    await supabase.from("external_accounts").delete().eq("user_id", user.id);

    // 5. Delete sync history
    await supabase.from("sync_history").delete().eq("user_id", user.id);

    // 6. Delete user profile
    await supabase.from("profiles").delete().eq("id", user.id);

    // 7. Sign out session
    await supabase.auth.signOut({ scope: "global" });

    return NextResponse.json({
      success: true,
      message: "AniWaveX account data deleted successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete account" }, { status: 500 });
  }
}
