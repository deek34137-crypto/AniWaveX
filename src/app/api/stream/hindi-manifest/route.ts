import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const parsedTarget = new URL(targetUrl);
    
    // Security check: only proxy Hindi stream worker URLs or approved CDNs
    if (
      !parsedTarget.hostname.includes("aniwavex-hindi-worker") &&
      !parsedTarget.hostname.endsWith(".workers.dev")
    ) {
      return new NextResponse("Forbidden target host", { status: 403 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        "Accept": "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.statusText}`, { status: res.status });
    }

    const text = await res.text();

    // Determine the actual CDN target origin from worker's ?url= query parameter
    let cdnOrigin = parsedTarget.origin;
    const nestedUrlParam = parsedTarget.searchParams.get("url");
    if (nestedUrlParam) {
      try {
        cdnOrigin = new URL(nestedUrlParam).origin;
      } catch {}
    }

    const workerBase = `${parsedTarget.protocol}//${parsedTarget.host}`;

    // 1. Fix relative audio track URIs and set Hindi as DEFAULT=YES
    let fixedManifest = text.replace(
      /#EXT-X-MEDIA:TYPE=AUDIO,([^\n]+)/g,
      (line, attributes) => {
        let isHindi = /LANGUAGE="hin"/i.test(attributes) || /NAME="[^"]*hindi[^"]*"/i.test(attributes);

        // Rewrite relative URI inside the audio tag
        let updated = attributes.replace(/URI="([^"]+)"/, (match: string, uri: string) => {
          if (uri.startsWith("http://") || uri.startsWith("https://")) {
            return match;
          }
          const absUrl = new URL(uri, cdnOrigin).href;
          const proxied = `${workerBase}/proxy?url=${encodeURIComponent(absUrl)}&ref=${encodeURIComponent(cdnOrigin + "/")}`;
          return `URI="${proxied}"`;
        });

        // Set Hindi as default audio track so player plays Hindi automatically
        if (isHindi) {
          updated = updated.replace(/DEFAULT=(NO|YES)/i, "DEFAULT=YES");
          updated = updated.replace(/AUTOSELECT=(NO|YES)/i, "AUTOSELECT=YES");
        } else {
          updated = updated.replace(/DEFAULT=YES/i, "DEFAULT=NO");
        }

        return `#EXT-X-MEDIA:TYPE=AUDIO,${updated}`;
      }
    );

    // 2. Fix any other relative lines in the m3u8
    fixedManifest = fixedManifest
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return line;

        const absUrl = new URL(trimmed, cdnOrigin).href;
        return `${workerBase}/proxy?url=${encodeURIComponent(absUrl)}&ref=${encodeURIComponent(cdnOrigin + "/")}`;
      })
      .join("\n");

    return new NextResponse(fixedManifest, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    console.error("Hindi manifest proxy error:", error);
    return new NextResponse("Failed to process manifest", { status: 502 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
