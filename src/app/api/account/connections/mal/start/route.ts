import { NextRequest, NextResponse } from "next/server";
import { generateCodeVerifier, generateOAuthState } from "@/lib/oauth-pkce";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID || "073be04d9cfc6030e37926ae343e37f3";
    const origin = req.nextUrl.origin;
    const redirectUri = `${origin}/api/account/connections/mal/callback`;

    const codeVerifier = generateCodeVerifier(128);
    const state = generateOAuthState("mal");

    const authUrl = new URL("https://myanimelist.net/v1/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("code_challenge", codeVerifier);
    authUrl.searchParams.set("code_challenge_method", "plain");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    const response = NextResponse.json({ url: authUrl.toString() });

    // Store state and verifier in secure HTTP-only cookies with 15-minute expiration
    response.cookies.set("mal_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 900,
      path: "/",
    });

    response.cookies.set("mal_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 900,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to start MAL OAuth" }, { status: 500 });
  }
}
