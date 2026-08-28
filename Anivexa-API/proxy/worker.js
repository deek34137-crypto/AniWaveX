/**
 * AniWaveX / Anivexa Stream Proxy - Cloudflare Worker
 * 
 * Offloads 100% of video streaming bandwidth, m3u8 playlist rewriting,
 * subtitle conversion (.ass to .vtt), and segment caching to Cloudflare's Edge.
 * Free tier: 100,000 requests/day, unlimited bandwidth, zero origin transfer fees.
 */

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

// SubStation Alpha (.ass / .ssa) to WebVTT converter
function convertAssToVtt(assText) {
  if (!assText || typeof assText !== "string") return "WEBVTT\n\n";
  if (assText.trim().startsWith("WEBVTT")) return assText;

  const lines = assText.split(/\r?\n/);
  const vttLines = ["WEBVTT", ""];
  let inEvents = false;
  let formatFields = ["layer", "start", "end", "style", "name", "marginl", "marginr", "marginv", "effect", "text"];

  const formatTimestamp = (ts) => {
    const match = ts.trim().match(/^(\d+):(\d{2}):(\d{2})\.(\d{2,3})$/);
    if (!match) return ts;
    const hours = match[1].padStart(2, "0");
    const mins = match[2];
    const secs = match[3];
    let ms = match[4];
    if (ms.length === 2) ms = ms + "0";
    else if (ms.length > 3) ms = ms.slice(0, 3);
    return `${hours}:${mins}:${secs}.${ms.padEnd(3, "0")}`;
  };

  const cleanAssText = (raw) => {
    return raw
      .replace(/\\N/gi, "\n")
      .replace(/\\h/gi, " ")
      .replace(/\{[^\}]*\}/g, "")
      .trim();
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
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
        const parts = [];
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

  return vttLines.length > 2 ? vttLines.join("\n") : "WEBVTT\n\n";
}

function rewriteM3U8(text, baseUrl, workerOrigin, referer) {
  const base = new URL(baseUrl);
  const basePath = base.origin + base.pathname.substring(0, base.pathname.lastIndexOf("/") + 1);
  const lines = text.split("\n");

  return lines.map((line) => {
    const t = line.trim();
    if (!t) return line;

    if (t.startsWith("#")) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        let absUri = uri;
        try {
          new URL(uri);
        } catch {
          absUri = new URL(uri, basePath).href;
        }
        return `URI="${workerOrigin}/?url=${encodeURIComponent(absUri)}&referer=${encodeURIComponent(referer)}"`;
      });
    }

    let absUrl = t;
    try {
      new URL(t);
    } catch {
      absUrl = new URL(t, basePath).href;
    }

    return `${workerOrigin}/?url=${encodeURIComponent(absUrl)}&referer=${encodeURIComponent(referer)}`;
  }).join("\n");
}

function resolveReferer(targetUrl, refererParam) {
  const host = targetUrl.hostname.toLowerCase();
  if (host.includes("kryntal") || host.includes("watching.onl") || host.includes("megaplay.buzz") || host.includes("sugevideo") || host.includes("sugevids")) {
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
  return refererParam || "https://flixcloud.cc/";
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      return new Response(JSON.stringify({ status: "ok", message: "AniWaveX Stream Proxy Edge Worker Active" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid target URL" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const referer = resolveReferer(targetUrl, requestUrl.searchParams.get("referer"));
    let refererOrigin = "https://flixcloud.cc";
    try {
      refererOrigin = new URL(referer).origin;
    } catch {}

    const upstreamHeaders = {
      "User-Agent": UA,
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": referer,
      "Origin": refererOrigin,
    };

    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    try {
      const upstreamRes = await fetch(target, {
        headers: upstreamHeaders,
        cf: {
          cacheEverything: true,
          cacheTtl: 86400,
        },
      });

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return new Response(await upstreamRes.text(), {
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
        const rewritten = rewriteM3U8(text, target, requestUrl.origin, referer);
        return new Response(rewritten, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/vnd.apple.mpegurl",
            "Cache-Control": "public, max-age=60, s-maxage=60",
          },
        });
      }

      // ASS/SSA Subtitles
      const isAss =
        contentType.includes("text/x-ssa") ||
        contentType.includes("text/x-ass") ||
        targetUrl.pathname.endsWith(".ass") ||
        targetUrl.pathname.endsWith(".ssa");

      if (isAss) {
        const rawText = await upstreamRes.text();
        const vtt = convertAssToVtt(rawText);
        return new Response(vtt, {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "text/vtt; charset=utf-8",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }

      // Media Segments / Subtitles passthrough
      const responseHeaders = new Headers({
        ...CORS_HEADERS,
        "Content-Type": contentType || "video/MP2T",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "Accept-Ranges": "bytes",
      });

      const contentLength = upstreamRes.headers.get("Content-Length");
      const contentRange = upstreamRes.headers.get("Content-Range");
      if (contentLength) responseHeaders.set("Content-Length", contentLength);
      if (contentRange) responseHeaders.set("Content-Range", contentRange);

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "Proxy fetch failed" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  },
};
