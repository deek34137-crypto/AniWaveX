import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  let allowOrigin = "*";
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (host && originHost === host.toLowerCase()) {
        allowOrigin = origin;
      } else if (
        originHost.includes("localhost") ||
        originHost.includes("127.0.0.1") ||
        originHost.endsWith("aniwavex.com") ||
        originHost.endsWith("vercel.app")
      ) {
        allowOrigin = origin;
      }
    } catch {
      // Fallback
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };
}

function isCallerAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // Media requests (e.g. video elements or HLS segment loads) might not include Origin or Referer
  if (!origin && !referer) {
    return true;
  }

  const isApproved = (urlString: string) => {
    try {
      const parsedHost = new URL(urlString).host.toLowerCase();
      if (host && parsedHost === host.toLowerCase()) return true;
      if (
        parsedHost.includes("localhost") ||
        parsedHost.includes("127.0.0.1") ||
        parsedHost.endsWith("aniwavex.com") ||
        parsedHost.endsWith("vercel.app")
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  if (origin && !isApproved(origin)) {
    return false;
  }

  if (referer && !isApproved(referer)) {
    return false;
  }

  return true;
}

export async function OPTIONS(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Domain allowlist to prevent SSRF and proxy abuse.
 * Rejects private subnets, loopbacks, and unapproved external hosts.
 */
function isAllowedHost(hostname: string): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();

  // Reject local/private IPs and loopbacks
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.16.") ||
    host.startsWith("169.254.")
  ) {
    return false;
  }

  const allowedSuffixes = [
    "flixcloud.cc",
    "megacloud.tv",
    "rabbitstream.net",
    "atomic4cdn.top",
    "anime-dunya.com",
    "animeapps.top",
    "reanime.to",
    "akamaized.net",
    "vidcloud.co",
    "vidcloud.fun",
    "mcloud.to",
    "dokicloud.one",
    "deek34137.workers.dev",
    "vibevibe.workers.dev",
    "streamtape.com",
    "streamtape.net",
    "streamtape.site",
    "mp4upload.com",
    "kitsu.io",
    "kitsu.app",
    "anilist.co",
    "watching.onl",
    "megaplay.buzz",
    "vidtube.site",
    "krussdomi.com",
    "akirax.buzz",
    "mikora.top",
    "shiora.top",
    "anizara.store",
    "otakuhg.site",
    "otakuvid.online",
    "playmogo.com",
    "vivibebe.site",
    "bibiemb.xyz",
    "vidstream.pro",
    "backblazeb2.com",
    "streamwish.to",
    "streamwish.com",
    "filemoon.sx",
    "filemoon.to",
    "filemoon.in",
    "doodstream.com",
    "dood.to",
    "dood.so",
    "dood.wf",
    "dood.ws",
  ];

  return allowedSuffixes.some((suffix) => host === suffix || host.endsWith("." + suffix));
}

function rewriteM3U8Content(
  text: string, 
  baseUrl: string, 
  proxyOrigin: string, 
  referer: string,
  externalWorkerProxy?: string | null
): string {
  const base = new URL(baseUrl);
  const basePath = base.origin + base.pathname.substring(0, base.pathname.lastIndexOf("/") + 1);
  const lines = text.split("\n");

  // Route through Cloudflare Worker edge proxy if available to offload segment bandwidth
  const proxyBase = externalWorkerProxy && !externalWorkerProxy.startsWith('/')
    ? `${externalWorkerProxy}/proxy`
    : `${proxyOrigin}/api/proxy`;

  return lines.map((line) => {
    const t = line.trim();
    if (!t) return line;

    // Handle URI attributes inside tags like #EXT-X-KEY:METHOD=AES-128,URI="https://..."
    if (t.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        let absUri = uri;
        try {
          new URL(uri);
        } catch {
          absUri = new URL(uri, basePath).href;
        }
        return `URI="${proxyBase}?url=${encodeURIComponent(absUri)}&referer=${encodeURIComponent(referer)}"`;
      });
    }

    // Handle child playlist / segment URLs
    let absUrl = t;
    try {
      new URL(t);
    } catch {
      absUrl = new URL(t, basePath).href;
    }

    return `${proxyBase}?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer)}`;
  }).join("\n");
}

function resolveReferer(targetUrl: URL, refererParam?: string | null): string {
  const host = targetUrl.hostname.toLowerCase();
  if (host.includes("watching.onl") || host.includes("megaplay.buzz")) {
    return "https://megaplay.buzz/";
  }
  if (host.includes("krussdomi")) {
    return "https://krussdomi.com/";
  }
  if (host.includes("vidtube.site") || host.includes("akirax.buzz") || host.includes("shiora.top") || host.includes("mikora.top")) {
    return "https://vidtube.site/";
  }
  if (host.includes("animeapps.top")) {
    return "https://playeng.animeapps.top/";
  }
  if (host.includes("bibiemb.xyz") || host.includes("vibevibe.workers.dev")) {
    return "https://bibiemb.xyz/";
  }
  if (host.includes("anime-dunya.com")) {
    return "https://anime-dunya.com/";
  }
  if (host.includes("megacloud.tv") || host.includes("atomic4cdn.top")) {
    return "https://megacloud.tv/";
  }
  if (host.includes("rabbitstream.net")) {
    return "https://rabbitstream.net/";
  }
  if (host.includes("dokicloud.one")) {
    return "https://dokicloud.one/";
  }
  if (host.includes("mcloud.to")) {
    return "https://mcloud.to/";
  }
  if (host.includes("vidcloud.co") || host.includes("vidcloud.fun")) {
    return "https://vidcloud.co/";
  }
  if (host.includes("vidstream.pro")) {
    return "https://vidstream.pro/";
  }
  if (refererParam && refererParam !== "https://flixcloud.cc/") {
    return refererParam;
  }
  return refererParam || "https://flixcloud.cc/";
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  // Validate caller origin to prevent open proxy relay abuse
  if (!isCallerAllowed(request)) {
    return NextResponse.json({ error: "Access denied from this origin" }, { status: 403, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ error: "Missing required ?url= parameter" }, { status: 400, headers: corsHeaders });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid target URL" }, { status: 400, headers: corsHeaders });
  }

  // 1. Protocol Validation
  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid protocol: only http and https allowed" }, { status: 400, headers: corsHeaders });
  }

  // 2. SSRF Host Validation
  if (!isAllowedHost(targetUrl.hostname)) {
    return NextResponse.json({ error: "Host not permitted by proxy policy" }, { status: 403, headers: corsHeaders });
  }

  // 3. Resolve required Referer and Origin for target CDN
  const rawReferer = searchParams.get("referer");
  const referer = resolveReferer(targetUrl, rawReferer);

  let refererOrigin = "https://flixcloud.cc";
  try {
    refererOrigin = new URL(referer).origin;
  } catch {
    refererOrigin = "https://flixcloud.cc";
  }

  const rangeHeader = request.headers.get("range");
  const upstreamHeaders: Record<string, string> = {
    "User-Agent": UA,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": referer,
    "Origin": refererOrigin,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
  };

  if (rangeHeader) {
    upstreamHeaders["Range"] = rangeHeader;
  }

  try {
    const upstreamRes = await fetch(target, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new NextResponse(await upstreamRes.text(), {
        status: upstreamRes.status,
        headers: {
          ...corsHeaders,
          "Content-Type": upstreamRes.headers.get("Content-Type") || "text/plain",
        },
      });
    }

    const contentType = upstreamRes.headers.get("Content-Type") || "";
    const isM3U8 =
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl") ||
      targetUrl.pathname.endsWith(".m3u8") ||
      targetUrl.pathname.endsWith(".m3u");

    if (isM3U8) {
      const text = await upstreamRes.text();
      const origin = new URL(request.url).origin;
      const externalWorker = process.env.STREAM_API_URL || process.env.NEXT_PUBLIC_STREAM_API_URL || null;
      const rewritten = rewriteM3U8Content(text, target, origin, referer, externalWorker);

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      });
    }

    // For media segments (.ts, .m4s, etc.), stream response with immutable edge cache headers
    const body = upstreamRes.body;
    const contentLength = upstreamRes.headers.get("Content-Length");
    const contentRange = upstreamRes.headers.get("Content-Range");

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      "Content-Type": contentType || "video/MP2T",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };

    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }

    return new NextResponse(body, {
      status: upstreamRes.status, // Preserve 206 Partial Content or 200 OK
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("Stream proxy error:", error);
    return NextResponse.json({ error: error.message || "Proxy request failed" }, { status: 502, headers: corsHeaders });
  }
}

