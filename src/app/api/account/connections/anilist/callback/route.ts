import { NextRequest, NextResponse } from "next/server";
import { isValidOAuthState } from "@/lib/oauth-pkce";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/account/connections/anilist/callback`;
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

    const cookieState = req.cookies.get("anilist_oauth_state")?.value || "";

    if (!cookieState || !isValidOAuthState(state, cookieState)) {
      return NextResponse.redirect(`${profileUrl}&error=state_mismatch`);
    }

    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "51864";
    const clientSecret = process.env.ANILIST_CLIENT_SECRET || "";

    // 1. Exchange authorization code for token
    const tokenRes = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: parseInt(clientId, 10), // AniList requires integer, not string
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[AniList OAuth] Token exchange failed:", {
        status: tokenRes.status,
        body: tokenData,
        redirect_uri: redirectUri,
        client_id: parseInt(clientId, 10),
        has_secret: !!clientSecret,
      });
      const errMsg = tokenData.error_description || tokenData.message || tokenData.error || "Failed to exchange AniList token";
      return NextResponse.redirect(`${profileUrl}&error=${encodeURIComponent(errMsg)}`);
    }

    // 2. Fetch Viewer identity from AniList GraphQL API
    const viewerQuery = `
      query {
        Viewer {
          id
          name
          avatar {
            medium
            large
          }
        }
      }
    `;

    const viewerRes = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({ query: viewerQuery }),
    });

    const viewerJson = await viewerRes.json();
    const viewer = viewerJson?.data?.Viewer;

    if (!viewerRes.ok || !viewer?.id) {
      return NextResponse.redirect(`${profileUrl}&error=failed_to_fetch_anilist_viewer`);
    }

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // 3. Upsert into external_accounts table
    const { error: dbError } = await supabase.from("external_accounts").upsert(
      {
        user_id: user.id,
        provider: "ANILIST",
        provider_user_id: String(viewer.id),
        username: viewer.name || "AniList User",
        avatar_url: viewer.avatar?.large || viewer.avatar?.medium || null,
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
      console.error("Failed to store AniList account:", dbError);
      return NextResponse.redirect(`${profileUrl}&error=failed_to_store_account`);
    }

    const res = NextResponse.redirect(`${profileUrl}&connected=anilist`);
    res.cookies.delete("anilist_oauth_state");
    return res;
  } catch (err: any) {
    console.error("AniList OAuth callback error:", err);
    return NextResponse.redirect(`${profileUrl}&error=${encodeURIComponent(err.message || "OAuth callback failure")}`);
  }
}
