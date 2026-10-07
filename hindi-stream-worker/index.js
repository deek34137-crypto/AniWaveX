/**
 * AniWaveX Universal Hindi Streaming Worker
 * Standalone Cloudflare Worker for Hindi & Indian Regional Anime Dubs
 *
 * Scrapes & streams from ToonStream with multi-host video extractors:
 * - VidMoly: Direct HLS (.m3u8) extraction with built-in proxying
 * - AS-CDN: Multi-Audio HLS (Hindi, Tamil, Telugu, English, Japanese)
 * - Turbovid: Direct HLS (.m3u8)
 * - Kiranime Embeds: VidPlay, StreamRuby, EmbedWish, MyCloud, VidMoly
 * - Streamwish / Ruby, AbyssPlayer, Cloudy, FilesForever, BlakiteApi embed fallbacks
 * - Built-in CORS / HLS stream proxy
 */

let cachedToonstreamBase = "https://toonstream.us";
let lastDomainCheck = 0;

const DOMAINS_SYNC_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
const KNOWN_MIRRORS = ["https://toonstream.us", "https://toonstream.vip", "https://toonstream.org", "https://toonstream.shop"];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function getToonstreamBase() {
  const now = Date.now();
  if (now - lastDomainCheck < 1800000 && cachedToonstreamBase) {
    return cachedToonstreamBase;
  }

  // 1. Check TVVVV remote domain sync
  try {
    const res = await fetch(DOMAINS_SYNC_URL, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.toonstream && data.toonstream.startsWith("http")) {
        const remoteDomain = data.toonstream.replace(/\/+$/, "");
        // Follow redirect if needed
        const probe = await fetch(remoteDomain, {
          headers: { "User-Agent": UA },
          signal: AbortSignal.timeout(3000),
          redirect: "follow",
        });
        if (probe.ok) {
          const finalUrl = new URL(probe.url).origin;
          const text = await probe.text();
          if (text.includes("/search/all") || (text.includes("ToonStream") && !text.includes("/lander"))) {
            cachedToonstreamBase = finalUrl;
            lastDomainCheck = now;
            return cachedToonstreamBase;
          }
        }
      }
    }
  } catch {}

  // 2. Test known active mirrors in priority order
  for (const mirror of KNOWN_MIRRORS) {
    try {
      const probe = await fetch(mirror, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(3000),
        redirect: "follow",
      });
      if (probe.ok) {
        const finalUrl = new URL(probe.url).origin;
        const text = await probe.text();
        if (text.includes("/search/all") || (text.includes("ToonStream") && !text.includes("/lander"))) {
          cachedToonstreamBase = finalUrl;
          lastDomainCheck = now;
          return cachedToonstreamBase;
        }
      }
    } catch {}
  }

  cachedToonstreamBase = "https://toonstream.us";
  lastDomainCheck = now;
  return cachedToonstreamBase;
}

function isDeadOrBlockedDomain(url) {
  if (!url || typeof url !== "string") return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("short.ink") ||
    lower.includes("vidstreaming.xyz") ||
    lower.includes("ww19.") ||
    lower.includes("animeapps.top")
  );
}

function getHeaders(base) {
  return {
    "User-Agent": UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    Referer: `${base}/`,
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Cache-Control": "public, max-age=180",
    },
  });
}

function corsOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

// 1. Search ToonStream for Anime
async function searchToonstream(query) {
  const base = await getToonstreamBase();
  const headers = getHeaders(base);
  const cleanQuery = query.replace(/[^a-zA-Z0-9\s]/g, " ").trim();

  // Try 1: Active ToonStream search/all endpoint (Instant JSON)
  try {
    const searchUrl = `${base}/search/all?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.data) && data.data.length > 0) {
        return data.data.map((item) => ({
          title: item.title,
          type: item.type,
          slug: item.url.replace(/^\/(?:series|movies|anime)\//, "").replace(/\/$/, ""),
          url: item.url.startsWith("http") ? item.url : `${base}${item.url}`,
        }));
      }
    }
  } catch {}

  // Try 2: Kiranime REST API (Older mirrors)
  try {
    const apiUrl = `${base}/wp-json/kiranime/v1/anime/search?query=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(apiUrl, { headers, signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      const html = data?.result || "";
      const matches = [...html.matchAll(/<a[^>]*href=["'](https?:\/\/[^"']+\/anime\/([^"'/]+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi)];
      if (matches.length > 0) {
        return matches.map((m) => {
          const titleMatch = m[3].match(/alt=["']([^"']+)["']/i) || m[3].match(/<span[^>]*>([^<]+)<\/span>/i);
          const title = titleMatch ? titleMatch[1].trim() : m[2].replace(/-/g, " ");
          return {
            title,
            type: "series",
            slug: m[2],
            url: m[1],
          };
        });
      }
    }
  } catch {}

  // Try 3: Standard WordPress search HTML
  try {
    const searchUrl = `${base}/?s=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(searchUrl, { headers, signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/href=["'](https?:\/\/[^"']+\/(?:anime|series)\/([^"'/]+)\/?)["']/gi)];
      const unique = new Map();
      for (const m of matches) {
        if (!unique.has(m[2])) {
          unique.set(m[2], {
            title: m[2].replace(/-/g, " "),
            type: "series",
            slug: m[2],
            url: m[1],
          });
        }
      }
      if (unique.size > 0) {
        return Array.from(unique.values());
      }
    }
  } catch {}

  return [];
}

// 2. Fetch AniList Metadata if only ID or Title is provided
async function getAnilistTitles(anilistId) {
  const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        title {
          english
          romaji
          userPreferred
        }
        synonyms
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { id: parseInt(anilistId, 10) } }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const media = data?.data?.Media;
    const titles = [
      media?.title?.english,
      media?.title?.romaji,
      media?.title?.userPreferred,
      ...(media?.synonyms || []),
    ].filter(Boolean);
    return [...new Set(titles)];
  } catch {
    return [];
  }
}

// 3. Find Best ToonStream Series for Title or AniList ID
async function resolveSeriesSlug(queryOrId, fallbackTitle = "") {
  const candidateQueries = [];

  // If query is already a known slug format, check directly or use as candidate
  if (queryOrId && !/^\d+$/.test(queryOrId)) {
    candidateQueries.push(queryOrId);
  }

  if (fallbackTitle) candidateQueries.push(fallbackTitle);

  if (queryOrId && /^\d+$/.test(queryOrId)) {
    const anilistTitles = await getAnilistTitles(queryOrId);
    candidateQueries.push(...anilistTitles);
  }

  for (const q of candidateQueries) {
    const cleanQuery = q.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
    if (!cleanQuery) continue;
    const results = await searchToonstream(cleanQuery);
    if (results.length > 0) {
      // Prioritize Sony Yay / Hindi dubbed releases if available
      const hindiNamed = results.find(
        (r) => /hindi|sony\s*yay/i.test(r.title) && r.type === "series"
      );
      if (hindiNamed) return hindiNamed.slug;

      const series = results.find((r) => r.type === "series") || results[0];
      if (series) return series.slug;
    }
  }

  // If search didn't return matches but query was formatted like a slug (e.g. "demon-slayer-kimetsu-no-yaiba")
  if (queryOrId && /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(queryOrId)) {
    return queryOrId;
  }

  return null;
}

// 4. Fetch Episode List for Series
async function getEpisodesForSeries(seriesSlug) {
  const base = await getToonstreamBase();
  const headers = getHeaders(base);

  // Try both new /series/ and legacy /anime/ paths
  const seriesUrls = [
    `${base}/series/${seriesSlug}/`,
    `${base}/series/${seriesSlug}`,
    `${base}/anime/${seriesSlug}/`,
  ];

  let html = "";
  for (const sUrl of seriesUrls) {
    try {
      const res = await fetch(sUrl, { headers, signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        html = await res.text();
        break;
      }
    } catch {}
  }

  if (!html) throw new Error(`Failed to load series page for ${seriesSlug}`);

  const episodes = [];
  const seen = new Set();

  // 1. Look for episode URL patterns: /episode/slug-1x12/ or /episode/slug-12/
  const epMatches = [...html.matchAll(/href=["']([^"']*\/episode\/([^"'/]+)\/?)["']/g)];
  for (const m of epMatches) {
    const epSlug = m[2];
    if (seen.has(epSlug)) continue;
    seen.add(epSlug);

    const numMatch = epSlug.match(/(\d+)[xX](\d+)/);
    const season = numMatch ? parseInt(numMatch[1], 10) : 1;
    const number = numMatch ? parseInt(numMatch[2], 10) : (parseInt(epSlug.match(/-(\d+)$/)?.[1] || "0", 10) || episodes.length + 1);

    episodes.push({
      id: epSlug,
      number,
      season,
      title: `Episode ${number}`,
      audio: "hindi",
    });
  }

  // 2. Look for watch URL pattern: /watch/slug-episode-12/
  const watchMatches = [...html.matchAll(/href=["']([^"']*\/watch\/([^"'/]+)\/?)["']/g)];
  for (const m of watchMatches) {
    const epSlug = m[2];
    if (seen.has(epSlug)) continue;
    seen.add(epSlug);

    const numMatch = epSlug.match(/episode-(\d+)/i) || epSlug.match(/-(\d+)$/);
    const number = numMatch ? parseInt(numMatch[1], 10) : episodes.length + 1;

    episodes.push({
      id: epSlug,
      number,
      season: 1,
      title: `Episode ${number}`,
      audio: "hindi",
    });
  }

  episodes.sort((a, b) => (a.season === b.season ? a.number - b.number : a.season - b.season));
  return episodes;
}

// 5. Extract Video Stream Sources for an Episode
async function extractEpisodeStreams(seriesSlug, epIdentifier, requestUrl) {
  const base = await getToonstreamBase();
  const headers = getHeaders(base);
  const urlObj = new URL(requestUrl);
  const workerOrigin = urlObj.origin;

  let epNum = parseInt(String(epIdentifier).replace(/[^\d]/g, ""), 10) || 1;

  // Build episode URL candidates with primary Toonstream /episode/ structure prioritized
  const candidates = [
    `${base}/episode/${seriesSlug}-1x${epNum}/`,
    `${base}/episode/${seriesSlug}-${epNum}/`,
    `${base}/episode/${seriesSlug}-season-1-episode-${epNum}/`,
    `${base}/watch/${seriesSlug}-episode-${epNum}/`,
    `${base}/watch/${seriesSlug}-s1-episode-${epNum}/`,
    `${base}/watch/${seriesSlug}-${epNum}/`,
  ];

  let epHtml = null;

  for (const c of candidates) {
    try {
      const epRes = await fetch(c, { headers, signal: AbortSignal.timeout(4000) });
      if (epRes.ok) {
        epHtml = await epRes.text();
        break;
      }
    } catch {}
  }

  // If direct candidates failed, inspect series page to locate the exact episode link
  if (!epHtml) {
    try {
      const seriesRes = await fetch(`${base}/series/${seriesSlug}/`, { headers, signal: AbortSignal.timeout(4000) });
      if (seriesRes.ok) {
        const seriesHtml = await seriesRes.text();
        const epRegex = new RegExp(`href=["']((?:https?:\\/\\/[^"']*)?\\/(?:episode|watch)\\/[^"']*?-(?:\\d+x)?${epNum}\\/?)["']`, "i");
        const match = seriesHtml.match(epRegex);
        if (match) {
          const targetEpUrl = match[1].startsWith("http") ? match[1] : `${base}${match[1]}`;
          const epRes = await fetch(targetEpUrl, { headers, signal: AbortSignal.timeout(4000) });
          if (epRes.ok) {
            epHtml = await epRes.text();
          }
        }
      }
    } catch {}
  }

  if (!epHtml) {
    throw new Error(`Episode ${epIdentifier} not found for series ${seriesSlug}`);
  }

  const streams = [];

  // A. Extract Kiranime base64 embed-id attributes (VidPlay, StreamRuby, EmbedWish, MyCloud, VidMoly)
  const embedMatches = [...epHtml.matchAll(/embed-id=["']([^"']+)["']/g)].map((m) => m[1]);
  for (const eid of embedMatches) {
    try {
      const parts = eid.split(":");
      const rawServerName = atob(parts[0]).replace(/dub$/i, "").trim();
      let serverUrl = parts[1] ? atob(parts[1]).trim() : "";

      const iframeSrc = serverUrl.match(/src=['"]([^'"]+)['"]/i);
      if (iframeSrc) {
        serverUrl = iframeSrc[1];
      }

      if (serverUrl && serverUrl.startsWith("http") && !isDeadOrBlockedDomain(serverUrl)) {
        const isM3U8 = serverUrl.includes(".m3u8");
        streams.push({
          server: `${rawServerName || "ToonStream"} (Hindi Dub)`,
          url: serverUrl,
          directUrl: serverUrl,
          type: isM3U8 ? "hls" : "embed",
          quality: `${rawServerName || "ToonStream"} [Hindi Dub]`,
          isM3U8,
          isHindi: true,
          headers: { Referer: `${base}/` },
        });
      }
    } catch {}
  }

  // B. Extract standard iframes or video players embedded in the page
  const rawLinks = [
    ...[...epHtml.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]),
    ...[...epHtml.matchAll(/data-src=["']([^"']+)["']/gi)].map((m) => m[1]),
  ];
  const uniqueServers = [...new Set(rawLinks)].filter(
    (l) =>
      !/\.(jpe?g|png|webp|gif|svg|ico)$/i.test(l.split("?")[0]) &&
      !isDeadOrBlockedDomain(l) &&
      !l.includes("youtube.com") &&
      !l.includes("sharethis.com") &&
      !l.includes("a-ads.com") &&
      !l.includes("chaty") &&
      !l.includes("facebook.com") &&
      !l.includes("twitter.com") &&
      !l.includes("google.com")
  );

  for (const serverUrl of uniqueServers) {
    if (streams.some((s) => s.url === serverUrl)) continue;

    try {
      // 1. VidMoly (Direct HLS Extraction)
      if (serverUrl.includes("vidmoly.net") || serverUrl.includes("vidmoly.to") || serverUrl.includes("vidmoly.me")) {
        try {
          const vmRes = await fetch(serverUrl, {
            headers: { "User-Agent": UA, Referer: `${base}/` },
            signal: AbortSignal.timeout(3500),
          });
          if (vmRes.ok) {
            const vmHtml = await vmRes.text();
            const m3u8Match = vmHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
            if (m3u8Match) {
              const proxiedUrl = `${workerOrigin}/proxy?url=${encodeURIComponent(m3u8Match[0])}&ref=${encodeURIComponent("https://vidmoly.net/")}`;
              streams.unshift({
                server: "VidMoly (Hindi HLS)",
                url: proxiedUrl,
                directUrl: m3u8Match[0],
                type: "hls",
                quality: "VidMoly [Hindi Dub]",
                isM3U8: true,
                hasHindi: true,
                isHindi: true,
                headers: { Referer: "https://vidmoly.net/" },
              });
              continue;
            }
          }
        } catch {}
      }

      // 2. AS-CDN (FirePlayer / PlayerJS Multi-Audio HLS)
      const asMatch = serverUrl.match(/https?:\/\/(as-cdn\d*\.top)\/video\/([a-zA-Z0-9_-]+)/i);
      if (asMatch) {
        const [, domain, hash] = asMatch;
        const postRes = await fetch(`https://${domain}/player/index.php?data=${hash}&do=getVideo`, {
          method: "POST",
          headers: {
            "User-Agent": UA,
            Referer: serverUrl,
            Origin: `https://${domain}`,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          body: new URLSearchParams({ hash, r: base }).toString(),
        });

        if (postRes.ok) {
          const videoData = await postRes.json();
          const masterUrl = videoData.securedLink || videoData.videoSource;
          if (masterUrl) {
            let audioTracks = [
              { language: "hin", name: "Hindi" },
              { language: "eng", name: "English" },
              { language: "jpn", name: "Japanese" },
              { language: "tam", name: "Tamil" },
              { language: "tel", name: "Telugu" },
            ];

            try {
              const plRes = await fetch(masterUrl, {
                headers: { "User-Agent": UA, Referer: `https://${domain}/` },
              });
              if (plRes.ok) {
                const plText = await plRes.text();
                const audios = [
                  ...plText.matchAll(/#EXT-X-MEDIA:TYPE=AUDIO.*?LANGUAGE="([^"]+)".*?NAME="([^"]+)"/g),
                ].map((a) => ({ language: a[1], name: a[2] }));
                if (audios.length > 0) audioTracks = audios;
              }
            } catch {}

            const proxiedUrl = `${workerOrigin}/proxy?url=${encodeURIComponent(masterUrl)}&ref=${encodeURIComponent(`https://${domain}/`)}`;

            streams.unshift({
              server: "AS-CDN (Hindi / Multi-Audio HLS)",
              url: proxiedUrl,
              directUrl: masterUrl,
              type: "hls",
              quality: "Multi-Audio (Hindi)",
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              audioTracks,
              headers: { Referer: `https://${domain}/`, Origin: `https://${domain}` },
            });
          }
        }
        continue;
      }

      // 3. Turbovid (HLS)
      if (serverUrl.includes("emturbovid.com")) {
        const tvRes = await fetch(serverUrl, { headers: { ...headers, Referer: base } });
        if (tvRes.ok) {
          const tvHtml = await tvRes.text();
          const m3u8 = tvHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
          if (m3u8) {
            const proxiedUrl = `${workerOrigin}/proxy?url=${encodeURIComponent(m3u8[0])}&ref=${encodeURIComponent("https://emturbovid.com/")}`;
            streams.unshift({
              server: "Turbovid (HLS)",
              url: proxiedUrl,
              directUrl: m3u8[0],
              type: "hls",
              quality: "Turbovid [Hindi Dub]",
              isM3U8: true,
              hasHindi: true,
              isHindi: true,
              headers: { Referer: "https://emturbovid.com/" },
            });
          }
        }
        continue;
      }

      // 4. Fallback embeds (VidMoly embed, AbyssPlayer, Cloudy, FilesForever, BlakiteApi, Streamwish, Ruby)
      const serverLabel = serverUrl.includes("ruby")
        ? "Ruby"
        : serverUrl.includes("wish")
        ? "Streamwish"
        : serverUrl.includes("abyss")
        ? "AbyssPlayer"
        : serverUrl.includes("cloudy")
        ? "Cloudy"
        : serverUrl.includes("vidmoly")
        ? "VidMoly"
        : serverUrl.includes("blakiteapi")
        ? "Blakite"
        : serverUrl.includes("filesforever")
        ? "FilesForever"
        : "External Embed";

      streams.push({
        server: `${serverLabel} (Hindi Dub)`,
        url: serverUrl,
        type: "embed",
        quality: `${serverLabel} [Hindi Dub]`,
        isM3U8: false,
        isHindi: true,
      });
    } catch {}
  }

  return streams;
}

// 6. Built-in CORS & HLS Proxy for streaming chunks without CORS errors
async function handleProxy(request) {
  const base = await getToonstreamBase();
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const referer = url.searchParams.get("ref") || `${base}/`;

  if (!targetUrl) {
    return new Response("Missing target url parameter", { status: 400 });
  }

  try {
    const origin = new URL(targetUrl).origin;
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": UA,
        Referer: referer,
        Origin: origin,
      },
    });

    const contentType = upstreamRes.headers.get("content-type") || "";

    if (
      targetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      let text = await upstreamRes.text();
      const targetBase = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const workerOrigin = url.origin;

      text = text.replace(/^(?![#\s])(.*)$/gm, (line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        let absolute = trimmed;
        if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
          absolute = trimmed.startsWith("/") ? `${origin}${trimmed}` : `${targetBase}${trimmed}`;
        }
        return `${workerOrigin}/proxy?url=${encodeURIComponent(absolute)}&ref=${encodeURIComponent(referer)}`;
      });

      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=60",
        },
      });
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": contentType || "video/MP2T",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return corsOptions();
    }

    // 1. Health check
    if (path === "/health" || path === "/") {
      const activeBase = await getToonstreamBase();
      return json({
        name: "AniWaveX Universal Hindi Streaming Worker",
        status: "ok",
        version: "1.3.0",
        provider: "toonstream",
        activeUpstream: activeBase,
        features: ["search", "episodes", "stream", "hls-proxy", "multi-audio-hindi", "vidmoly-hls"],
        routes: [
          "/health",
          "/search?q=:query",
          "/episodes?slug=:slug",
          "/episodes/:slug",
          "/stream?id=:anilistId&ep=:ep&title=:title",
          "/watch/:slug/:ep",
          "/watch/toonstream/:slug/dub/toonstream-:ep",
          "/watch/hindi/:slug/dub/hindi-:ep",
          "/proxy?url=:url&ref=:ref",
        ],
      });
    }

    // 2. Proxy Route
    if (path === "/proxy") {
      return handleProxy(request);
    }

    // 3. Search Route
    if (path === "/search") {
      const q = url.searchParams.get("q") || url.searchParams.get("keyword") || "";
      if (!q) return json({ error: "Missing query parameter 'q'" }, 400);
      const results = await searchToonstream(q);
      return json({ success: true, count: results.length, data: results });
    }

    // 4. Episodes Route
    let m = path.match(/^\/episodes\/([^\/]+)\/?$/);
    const slugQuery = url.searchParams.get("slug") || url.searchParams.get("id") || url.searchParams.get("title");
    const epSlug = m ? m[1] : slugQuery;

    if (epSlug && (path.startsWith("/episodes") || path === "/episodes")) {
      try {
        const resolvedSlug = await resolveSeriesSlug(epSlug, url.searchParams.get("title") || "");
        if (!resolvedSlug) {
          return json({ error: `Series not found for ${epSlug}` }, 404);
        }
        const episodes = await getEpisodesForSeries(resolvedSlug);
        return json({
          success: true,
          meta: { slug: resolvedSlug, source: "toonstream", audio: "hindi" },
          episodes,
        });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    // 5. Watch & Stream Routes
    m = path.match(/^\/watch\/(?:toonstream|hindi)?\/?([^\/]+)\/(?:dub\/[^\-]+-)?([^\/]+)\/?$/i);
    let targetSlug = m ? m[1] : null;
    let targetEp = m ? m[2] : null;

    if (!targetSlug) {
      targetSlug = url.searchParams.get("slug") || url.searchParams.get("id") || url.searchParams.get("title");
      targetEp = url.searchParams.get("ep") || url.searchParams.get("episode") || "1";
    }

    if (targetSlug && targetEp && (path.startsWith("/watch") || path.startsWith("/stream"))) {
      try {
        const resolvedSlug = await resolveSeriesSlug(targetSlug, url.searchParams.get("title") || "");
        if (!resolvedSlug) {
          return json({ error: `Series slug could not be resolved for '${targetSlug}'` }, 404);
        }

        const streams = await extractEpisodeStreams(resolvedSlug, targetEp, request.url);
        if (!streams.length) {
          return json({ error: "No playable stream sources found for this episode" }, 404);
        }

        const primaryHls = streams.find((s) => s.type === "hls");

        return json({
          success: true,
          stream_url: primaryHls?.url || streams[0].url,
          streams: streams,
          stream: {
            sources: streams,
            defaultAudio: "hin",
          },
          subtitles: [],
        });
      } catch (err) {
        return json({ error: err.message }, 500);
      }
    }

    return json({ error: "Endpoint not found" }, 404);
  },
};
