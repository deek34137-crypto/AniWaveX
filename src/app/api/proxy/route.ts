import { NextRequest, NextResponse } from "next/server";
import { verifyProxySignature, generateProxySignature } from "@/lib/proxy-security";

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

// In-memory cache for converted WebVTT subtitles (bounded to 200 items, 24h TTL)
const vttConversionCache = new Map<string, { vtt: string; expiresAt: number }>();
const MAX_VTT_CACHE_SIZE = 200;
const VTT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Precompiled Regex for high-performance subtitle parsing
const TIMESTAMP_REGEX = /^(\d+):(\d{2}):(\d{2})\.(\d{2,3})$/;
const TAGS_REGEX = /\{[^\}]*\}/g;
const BREAK_REGEX = /\\N/gi;
const HARD_SPACE_REGEX = /\\h/gi;

/**
 * In-flight ASS/SSA to WebVTT subtitle parser and converter with LRU caching.
 * Converts SubStation Alpha subtitles into valid WebVTT for HTML5 track playback.
 */
function convertAssToVtt(assText: string, cacheKey?: string): string {
  if (!assText || typeof assText !== "string") return "WEBVTT\n\n";
  if (assText.trim().startsWith("WEBVTT")) return assText;

  // 1. Check in-memory cache
  const key = cacheKey || (assText.length > 64 ? `${assText.length}_${assText.slice(0, 64)}` : assText);
  const cached = vttConversionCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.vtt;
  }

  const lines = assText.split(/\r?\n/);
  const vttLines: string[] = ["WEBVTT", ""];
  let inEvents = false;
  let formatFields: string[] = ["layer", "start", "end", "style", "name", "marginl", "marginr", "marginv", "effect", "text"];

  const formatTimestamp = (ts: string) => {
    // ASS timestamp: H:MM:SS.cs (e.g. 0:01:23.45)
    const match = ts.trim().match(TIMESTAMP_REGEX);
    if (!match) return ts;
    const hours = match[1].padStart(2, "0");
    const mins = match[2];
    const secs = match[3];
    let ms = match[4];
    if (ms.length === 2) ms = ms + "0";
    else if (ms.length > 3) ms = ms.slice(0, 3);
    return `${hours}:${mins}:${secs}.${ms.padEnd(3, "0")}`;
  };

  const cleanAssText = (raw: string) => {
    return raw
      .replace(BREAK_REGEX, "\n")
      .replace(HARD_SPACE_REGEX, " ")
      .replace(TAGS_REGEX, "") // strip override tags
      .trim();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("[Events]")) {
      inEvents = true;
      continue;
    }

    if (trimmed.startsWith("[") && inEvents && !trimmed.startsWith("[Events]")) {
      inEvents = false;
      continue;
    }

    if (inEvents) {
      if (trimmed.startsWith("Format:")) {
        formatFields = trimmed.slice(7).split(",").map((f) => f.trim().toLowerCase());
        continue;
      }

      if (trimmed.startsWith("Dialogue:")) {
        const payload = trimmed.slice(9).trim();
        const commaCount = Math.max(formatFields.length - 1, 9);
        const parts: string[] = [];
        let cur = "";
        let splitCount = 0;
        for (let j = 0; j < payload.length; j++) {
          if (payload[j] === "," && splitCount < commaCount) {
            parts.push(cur.trim());
            cur = "";
            splitCount++;
          } else {
            cur += payload[j];
          }
        }
        parts.push(cur.trim());

        const startIdx = formatFields.indexOf("start") !== -1 ? formatFields.indexOf("start") : 1;
        const endIdx = formatFields.indexOf("end") !== -1 ? formatFields.indexOf("end") : 2;
        const textIdx = formatFields.indexOf("text") !== -1 ? formatFields.indexOf("text") : parts.length - 1;

        const startTs = parts[startIdx] ? formatTimestamp(parts[startIdx]) : "00:00:00.000";
        const endTs = parts[endIdx] ? formatTimestamp(parts[endIdx]) : "00:00:00.000";
        const text = parts[textIdx] ? cleanAssText(parts[textIdx]) : "";

        if (text) {
          vttLines.push(`${startTs} --> ${endTs}`);
          vttLines.push(text);
          vttLines.push("");
        }
      }
    }
  }

  const resultVtt = vttLines.length > 2 ? vttLines.join("\n") : "WEBVTT\n\n";

  // Store in LRU cache
  if (vttConversionCache.size >= MAX_VTT_CACHE_SIZE) {
    const oldestKey = vttConversionCache.keys().next().value;
    if (oldestKey) vttConversionCache.delete(oldestKey);
  }
  vttConversionCache.set(key, { vtt: resultVtt, expiresAt: Date.now() + VTT_CACHE_TTL_MS });

  return resultVtt;
}

/**
 * Domain allowlist to prevent SSRF and proxy abuse.
 * Rejects private subnets, loopbacks, and unapproved external hosts.
 */
function isAllowedHost(hostname: string): boolean {
  if (!hostname) return false;
  const host = hostname.toLowerCase();

  // Reject local/private IPs, IPv6 loopbacks, and link-local metadata
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.16.") ||
    host.startsWith("172.17.") ||
    host.startsWith("172.18.") ||
    host.startsWith("172.19.") ||
    host.startsWith("172.20.") ||
    host.startsWith("172.21.") ||
    host.startsWith("172.22.") ||
    host.startsWith("172.23.") ||
    host.startsWith("172.24.") ||
    host.startsWith("172.25.") ||
    host.startsWith("172.26.") ||
    host.startsWith("172.27.") ||
    host.startsWith("172.28.") ||
    host.startsWith("172.29.") ||
    host.startsWith("172.30.") ||
    host.startsWith("172.31.") ||
    host.startsWith("169.254.")
  ) {
    return false;
  }

  // Exact pinned hosts on multi-tenant platforms
  const allowedExactHosts = new Set([
    "kitsu-production-media.s3.us-west-002.backblazeb2.com",
    "anivexa-stream-api.deek34137.workers.dev",
    "deek34137.workers.dev",
    "vibevibe.workers.dev",
    "anikoto-ksz4.onrender.com",
  ]);

  if (allowedExactHosts.has(host)) return true;

  // Allowed specific streaming/CDN domain suffixes
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
    "streamtape.com",
    "streamtape.net",
    "streamtape.site",
    "mp4upload.com",
    "kitsu.io",
    "kitsu.app",
    "anilist.co",
    "watching.onl",
    "megaplay.buzz",
    "sugevideo.xyz",
    "sugevids.com",
    "swishsrv.com",
    "streamwish.site",
    "bunnycdn.ru",
    "b-cdn.net",
    "gogo-stream.com",
    "aniverse.fun",
    "anivexa.com",
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
  referer: string
): string {
  const base = new URL(baseUrl);
  const basePath = base.origin + base.pathname.substring(0, base.pathname.lastIndexOf("/") + 1);
  const lines = text.split("\n");

  const proxyBase = `${proxyOrigin}/api/proxy`;
  const tokenExpiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour token validity for stream segments

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
        const sig = generateProxySignature(absUri, tokenExpiry);
        return `URI="${proxyBase}?url=${encodeURIComponent(absUri)}&exp=${tokenExpiry}&sig=${sig}&referer=${encodeURIComponent(referer)}"`;
      });
    }

    // Handle child playlist / segment URLs
    let absUrl = t;
    try {
      new URL(t);
    } catch {
      absUrl = new URL(t, basePath).href;
    }

    const sig = generateProxySignature(absUrl, tokenExpiry);
    return `${proxyBase}?url=${encodeURIComponent(absUrl)}&exp=${tokenExpiry}&sig=${sig}&referer=${encodeURIComponent(referer)}`;
  }).join("\n");
}

function resolveReferer(targetUrl: URL, refererParam?: string | null): string {
  const host = targetUrl.hostname.toLowerCase();
  if (host.includes("watching.onl") || host.includes("megaplay.buzz") || host.includes("sugevideo") || host.includes("sugevids")) {
    return refererParam || "https://megaplay.buzz/";
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
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url");
  const exp = searchParams.get("exp");
  const sig = searchParams.get("sig");

  if (!target) {
    return NextResponse.json({ error: "Missing required ?url= parameter" }, { status: 400, headers: corsHeaders });
  }

  // If request contains HMAC signature, verify it
  const isSigned = Boolean(exp && sig);
  if (isSigned) {
    const isValid = verifyProxySignature(target, exp, sig);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid or expired proxy signature token" }, { status: 403, headers: corsHeaders });
    }
  } else {
    // Validate caller origin for unsigned requests to prevent open proxy relay abuse
    if (!isCallerAllowed(request)) {
      return NextResponse.json({ error: "Access denied from this origin" }, { status: 403, headers: corsHeaders });
    }
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
      const rewritten = rewriteM3U8Content(text, target, origin, referer);

      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      });
    }

    // Handle SubStation Alpha (.ass / .ssa) subtitle conversion to WebVTT
    const isAssOrSsa =
      contentType.includes("text/x-ssa") ||
      contentType.includes("text/x-ass") ||
      targetUrl.pathname.endsWith(".ass") ||
      targetUrl.pathname.endsWith(".ssa");

    if (isAssOrSsa) {
      const rawText = await upstreamRes.text();
      const vtt = convertAssToVtt(rawText, target);
      return new NextResponse(vtt, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/vtt; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    // Handle WebVTT subtitle passthrough
    const isVtt =
      contentType.includes("text/vtt") ||
      contentType.includes("application/vtt") ||
      targetUrl.pathname.endsWith(".vtt");

    if (isVtt) {
      const rawText = await upstreamRes.text();
      return new NextResponse(rawText, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/vtt; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
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

