import { NextRequest, NextResponse } from "next/server";
import { isValidOAuthState } from "@/lib/oauth-pkce";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/account/connections/mal/callback`;
  const profileUrl = `${origin}/profile?tab=connected`;

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(`${origin}/profile?error=unauthorized`);
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(`${profileUrl}&error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${profileUrl}&error=missing_code_or_state`);
    }

    const cookieState = req.cookies.get("mal_oauth_state")?.value || "";
    const codeVerifier = req.cookies.get("mal_code_verifier")?.value || "";

    if (!cookieState || !isValidOAuthState(state, cookieState)) {
      return NextResponse.redirect(`${profileUrl}&error=state_mismatch`);
    }

    if (!codeVerifier) {
      return NextResponse.redirect(`${profileUrl}&error=missing_code_verifier`);
    }

    const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID || "073be04d9cfc6030e37926ae343e37f3";
    const clientSecret = process.env.MAL_CLIENT_SECRET || "";

    const bodyParams = new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    });

    if (clientSecret) {
      bodyParams.set("client_secret", clientSecret);
    }

    // 1. Exchange authorization code for token
    const tokenRes = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyParams.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      const errMsg = tokenData.error_description || tokenData.message || "Failed to exchange MAL token";
      return NextResponse.redirect(`${profileUrl}&error=${encodeURIComponent(errMsg)}`);
    }

    // 2. Fetch authenticated MAL user identity
    const userRes = await fetch("https://api.myanimelist.net/v2/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const malUser = await userRes.json();

    if (!userRes.ok || !malUser.id) {
      return NextResponse.redirect(`${profileUrl}&error=failed_to_fetch_mal_user`);
    }

    // Calculate token expiration
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // 3. Upsert into external_accounts table
    const { error: dbError } = await supabase.from("external_accounts").upsert(
      {
        user_id: user.id,
        provider: "MYANIMELIST",
        provider_user_id: String(malUser.id),
        username: malUser.name || "MAL User",
        avatar_url: malUser.picture || null,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_expires_at: expiresAt,
        status: "CONNECTED",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    if (dbError) {
      console.error("Failed to store MAL external account:", dbError);
      return NextResponse.redirect(`${profileUrl}&error=failed_to_store_account`);
    }

    // Clean cookies and redirect with success
    const res = NextResponse.redirect(`${profileUrl}&connected=myanimelist`);
    res.cookies.delete("mal_oauth_state");
    res.cookies.delete("mal_code_verifier");
    return res;
  } catch (err: any) {
    console.error("MAL OAuth callback error:", err);
    return NextResponse.redirect(`${profileUrl}&error=${encodeURIComponent(err.message || "OAuth callback failure")}`);
  }
}
