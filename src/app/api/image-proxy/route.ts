import { NextRequest, NextResponse } from "next/server";

// Allowed manga CDN hostnames to prevent arbitrary SSRF
const ALLOWED_HOST_DOMAINS = [
  "mangafire.to",
  "static.mangafire.to",
  "img.mangafire.to",
  "cdn.mangafire.to",
  "comick.app",
  "meo.comick.pictures",
  "meo2.comick.pictures",
  "meo3.comick.pictures",
  "asuracomic.net",
  "allmanga.to",
  "animeblkom.net",
  "anilist.co",
  "s4.anilist.co",
];

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Domain security check
  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = ALLOWED_HOST_DOMAINS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (!isAllowed) {
    return new NextResponse("Host not permitted in image proxy", { status: 403 });
  }

  try {
    const upstreamRes = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: `${parsed.protocol}//${parsed.hostname}/`,
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Upstream image error: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "image/jpeg";
    const imageBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=604800, immutable", // 7-day edge cache
      },
    });
  } catch (err: any) {
    return new NextResponse(`Proxy fetch error: ${err.message}`, { status: 500 });
  }
}
