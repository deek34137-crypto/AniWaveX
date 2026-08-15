import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function rewriteM3U8Content(text: string, baseUrl: string, proxyOrigin: string, referer: string): string {
  const base = new URL(baseUrl);
  const basePath = base.origin + base.pathname.substring(0, base.pathname.lastIndexOf("/") + 1);
  const lines = text.split("\n");

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
        return `URI="${proxyOrigin}/api/proxy?url=${encodeURIComponent(absUri)}&referer=${encodeURIComponent(referer)}"`;
      });
    }

    // Handle segment / child playlist URLs
    let absUrl = t;
    try {
      new URL(t);
    } catch {
      absUrl = new URL(t, basePath).href;
    }

    return `${proxyOrigin}/api/proxy?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer)}`;
  }).join("\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  const referer = searchParams.get("referer") || "https://flixcloud.cc/";

  if (!target) {
    return NextResponse.json({ error: "Missing required ?url= parameter" }, { status: 400, headers: CORS_HEADERS });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid target URL" }, { status: 400, headers: CORS_HEADERS });
  }

  try {
    const upstreamRes = await fetch(target, {
      headers: {
        "User-Agent": UA,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": referer,
        "Origin": new URL(referer).origin,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      },
    });

    if (!upstreamRes.ok) {
      return new NextResponse(await upstreamRes.text(), {
        status: upstreamRes.status,
        headers: {
          ...CORS_HEADERS,
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
      const rewritten = rewriteM3U8Content(text, target, origin, referer);

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    // For video segments (.ts, .m4s, etc.), stream body directly
    const body = upstreamRes.body;
    return new NextResponse(body, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": contentType || "video/MP2T",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("Stream proxy error:", error);
    return NextResponse.json({ error: error.message || "Proxy request failed" }, { status: 502, headers: CORS_HEADERS });
  }
}
