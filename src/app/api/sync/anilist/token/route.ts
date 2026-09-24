import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { code, redirect_uri } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_ANILIST_CLIENT_ID || "51864";
    const clientSecret = process.env.ANILIST_CLIENT_SECRET || "0fB9Kjd81WkQxX73y13NBmOJ5Bq4JIBvhl1fouTe";
    const redirectUri = redirect_uri || "https://aniwavex.bond/profile";

    const anilistRes = await fetch("https://anilist.co/api/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const data = await anilistRes.json();

    if (!anilistRes.ok) {
      return NextResponse.json({ error: data.error_description || data.message || "Failed to exchange AniList token" }, { status: anilistRes.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
