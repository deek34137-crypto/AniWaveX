import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { code, code_verifier, redirect_uri } = await req.json();

    if (!code || !code_verifier) {
      return NextResponse.json({ error: "Missing code or code_verifier" }, { status: 400 });
    }

    const clientId = process.env.NEXT_PUBLIC_MAL_CLIENT_ID || "073be04d9cfc6030e37926ae343e37f3";
    const clientSecret = process.env.MAL_CLIENT_SECRET || "73a5e77f417260a54e8132d1de9738835bec85ffd272ebdd87ecefbcf0b5d265";
    const redirectUri = redirect_uri || "https://aniwavex.bond/profile";

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      code_verifier,
      redirect_uri: redirectUri,
    });

    const malRes = await fetch("https://myanimelist.net/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await malRes.json();

    if (!malRes.ok) {
      return NextResponse.json({ error: data.error_description || data.message || "Failed to exchange MAL token" }, { status: malRes.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
