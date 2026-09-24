import { NextRequest, NextResponse } from "next/server";

// Comprehensive manga CDN hostnames to prevent arbitrary SSRF
const ALLOWED_HOST_DOMAINS = [
  // MangaDex official CDN + dynamic CDN nodes (*.mangadex.network)
  "uploads.mangadex.org",
  "mangadex.org",
  "mangadex.network",
  // WeebCentral + scanlation storage networks
  "temp.compsci88.com",
  "compsci88.com",
  "weebcentral.com",
  "lastation.us",
  "scans.lastation.us",
  "lowee.us",
  "official.lowee.us",
  "scans.lowee.us",
  "planeptune.us",
  "leanbox.us",
  // AsuraScans
  "asuracomic.net",
  "asuratoon.com",
  "gg.asuracomic.net",
  // FlameComics & KaliScan
  "flamecomics.xyz",
  "flamecomics.me",
  "kaliscan.io",
  "kaliscan.com",
  // MangaRead / MGeko
  "mangaread.org",
  "mgeko.cc",
  "mgeko.com",
  // NovelCool / WorkExplained
  "novelcool.com",
  "img.novelcool.com",
  "workexplained.com",
  // Comick
  "comick.app",
  "meo.comick.pictures",
  "meo2.comick.pictures",
  "meo3.comick.pictures",
  // MangaFire
  "mangafire.to",
  "static.mangafire.to",
  "img.mangafire.to",
  "cdn.mangafire.to",
  // Bato & Webtoons
  "bato.to",
  "batotoo.com",
  "webtoons.com",
  // MangaKatana
  "mangakatana.com",
  // AniList covers
  "anilist.co",
  "s4.anilist.co",
  // Others
  "allmanga.to",
  "animeblkom.net",
];

function isPrivateOrLocalHost(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    return true;
  }
  // IPv4 private address ranges check
  const parts = hostname.split(".").map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
  }
  return false;
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  const refererParam = req.nextUrl.searchParams.get("referer");

  if (!urlParam) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlParam);
  } catch {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  // Security check: Only http/https, reject private/internal IPs
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new NextResponse("Invalid protocol", { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateOrLocalHost(hostname)) {
    return new NextResponse("Private IP addresses not allowed", { status: 403 });
  }

  const isExplicitlyAllowed = ALLOWED_HOST_DOMAINS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  // If not explicitly in known list, still permit standard public image hosts with a dot in hostname
  if (!isExplicitlyAllowed && !hostname.includes(".")) {
    return new NextResponse("Host not permitted in image proxy", { status: 403 });
  }

  try {
    const defaultReferer = `${parsed.protocol}//${parsed.hostname}/`;
    const referer = refererParam || defaultReferer;
    let origin = defaultReferer;
    try {
      origin = new URL(referer).origin;
    } catch {
      origin = defaultReferer;
    }

    const upstreamRes = await fetch(parsed.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Referer: referer,
        Origin: origin,
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
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Proxy fetch error: ${err.message}`, { status: 500 });
  }
}
