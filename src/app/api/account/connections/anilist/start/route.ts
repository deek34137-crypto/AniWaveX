import { NextRequest, NextResponse } from "next/server";
import { generateOAuthState } from "@/lib/oauth-pkce";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "51864";
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/account/connections/anilist/callback`;

    const state = generateOAuthState("anilist");

    const authUrl = new URL("https://anilist.co/api/v2/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.json({ url: authUrl.toString() });

    response.cookies.set("anilist_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 900,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to start AniList OAuth" }, { status: 500 });
  }
}
