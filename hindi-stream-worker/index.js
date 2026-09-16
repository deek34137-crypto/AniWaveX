/**
 * AniWaveX Universal Hindi Streaming Worker
 * Standalone Cloudflare Worker for Hindi & Indian Regional Anime Dubs
 *
 * Scrapes & streams from ToonStream with multi-host video extractors:
 * - AS-CDN: Multi-Audio HLS (Hindi, Tamil, Telugu, English, Japanese)
 * - Turbovid: Direct HLS
 * - Streamwish / Ruby & AbyssPlayer: Embed fallbacks
 * - Built-in CORS / HLS stream proxy
 */

const TOONSTREAM_BASE = "https://toonstream.vip";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Referer: `${TOONSTREAM_BASE}/`,
};

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
  const url = `${TOONSTREAM_BASE}/search/all?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return (data.data || []).map((item) => ({
    title: item.title,
    type: item.type,
    slug: item.url.replace(/^\/(?:series|movies)\//, "").replace(/\/$/, ""),
    url: item.url.startsWith("http") ? item.url : `${TOONSTREAM_BASE}${item.url}`,
  }));
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
  // If it's already a slug formatted with hyphens, test direct access
  if (queryOrId && !/^\d+$/.test(queryOrId)) {
    return queryOrId;
  }

  const candidateQueries = [];
  if (fallbackTitle) candidateQueries.push(fallbackTitle);

  if (/^\d+$/.test(queryOrId)) {
    const anilistTitles = await getAnilistTitles(queryOrId);
    candidateQueries.push(...anilistTitles);
  }

  for (const q of candidateQueries) {
    const cleanQuery = q.replace(/[^a-zA-Z0-9\s]/g, " ").trim();
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

  return null;
}

// 4. Fetch Episode List for Series
async function getEpisodesForSeries(seriesSlug) {
  const seriesUrl = `${TOONSTREAM_BASE}/series/${seriesSlug}/`;
  const res = await fetch(seriesUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to load series page for ${seriesSlug}`);
  const html = await res.text();

  const epMatches = [...html.matchAll(/href="([^"]*\/episode\/([^"\/]+)\/?)"/g)];
  const episodes = [];
  const seen = new Set();

  for (const m of epMatches) {
    const epSlug = m[2];
    if (seen.has(epSlug)) continue;
    seen.add(epSlug);

    const numMatch = epSlug.match(/(\d+)[xX](\d+)/);
    const season = numMatch ? parseInt(numMatch[1], 10) : 1;
    const number = numMatch ? parseInt(numMatch[2], 10) : episodes.length + 1;

    episodes.push({
      id: epSlug,
      number,
      season,
      title: `Episode ${number}`,
      audio: "hindi",
    });
  }

  episodes.sort((a, b) => (a.season === b.season ? a.number - b.number : a.season - b.season));
  return episodes;
}

// 5. Extract Video Stream Sources for an Episode
async function extractEpisodeStreams(seriesSlug, epIdentifier, requestUrl) {
  const urlObj = new URL(requestUrl);
  const workerOrigin = urlObj.origin;

  // Normalize episode slug (e.g. "solo-leveling-1x1", "1x1", "1", "toonstream-1x1")
  let epSlug = String(epIdentifier).trim();
  if (epSlug.startsWith("toonstream-")) {
    epSlug = epSlug.replace("toonstream-", "");
  }

  let candidates = [];
  if (epSlug.includes(seriesSlug)) {
    candidates.push(epSlug);
  } else if (/^\d+$/.test(epSlug)) {
    // Pure episode number like "1"
    candidates.push(`${seriesSlug}-1x${epSlug}`);
    candidates.push(`${seriesSlug}-S1E${epSlug}`);
    candidates.push(`${seriesSlug}-${epSlug}`);
  } else if (/^\d+[xX]\d+$/.test(epSlug)) {
    // Like "1x1"
    candidates.push(`${seriesSlug}-${epSlug}`);
  } else {
    candidates.push(`${seriesSlug}-${epSlug}`);
  }

  let epHtml = null;
  let matchedSlug = null;

  for (const c of candidates) {
    const epUrl = `${TOONSTREAM_BASE}/episode/${c}/`;
    const epRes = await fetch(epUrl, { headers: HEADERS });
    if (epRes.ok) {
      epHtml = await epRes.text();
      matchedSlug = c;
      break;
    }
  }

  // If direct candidates failed, fetch episode list to find the exact slug
  if (!epHtml) {
    try {
      const allEps = await getEpisodesForSeries(seriesSlug);
      const targetNum = parseInt(epSlug.replace(/[^\d]/g, ""), 10);
      const found = allEps.find((e) => e.number === targetNum) || allEps[0];
      if (found) {
        const epRes = await fetch(`${TOONSTREAM_BASE}/episode/${found.id}/`, { headers: HEADERS });
        if (epRes.ok) {
          epHtml = await epRes.text();
          matchedSlug = found.id;
        }
      }
    } catch {}
  }

  if (!epHtml) {
    throw new Error(`Episode ${epIdentifier} not found for series ${seriesSlug}`);
  }

  // Extract all iframe / data-src URLs
  const rawLinks = [
    ...[...epHtml.matchAll(/<iframe[^>]+src="([^"]+)"/gi)].map((m) => m[1]),
    ...[...epHtml.matchAll(/data-src="([^"]+)"/gi)].map((m) => m[1]),
  ];
  const uniqueServers = [...new Set(rawLinks)].filter(
    (l) => !l.includes("youtube.com") && !l.includes("sharethis.com")
  );

  const streams = [];

  for (const serverUrl of uniqueServers) {
    try {
      // 1. AS-CDN (FirePlayer / PlayerJS Multi-Audio HLS)
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
          body: new URLSearchParams({ hash, r: TOONSTREAM_BASE }).toString(),
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

            // Provide proxied URL for seamless browser playback
            const proxiedUrl = `${workerOrigin}/proxy?url=${encodeURIComponent(masterUrl)}&ref=${encodeURIComponent(`https://${domain}/`)}`;

            streams.unshift({
              server: "AS-CDN (Hindi / Multi-Audio HLS)",
              url: proxiedUrl,
              directUrl: masterUrl,
              type: "hls",
              quality: "Multi-Audio (Hindi)",
              isM3U8: true,
              hasHindi: true,
              audioTracks,
              headers: { Referer: `https://${domain}/`, Origin: `https://${domain}` },
            });
          }
        }
        continue;
      }

      // 2. Turbovid (HLS)
      if (serverUrl.includes("emturbovid.com")) {
        const tvRes = await fetch(serverUrl, { headers: { ...HEADERS, Referer: TOONSTREAM_BASE } });
        if (tvRes.ok) {
          const tvHtml = await tvRes.text();
          const m3u8 = tvHtml.match(/https?:\/\/[^"'\s]+\.m3u8[^"'\s]*/i);
          if (m3u8) {
            const proxiedUrl = `${workerOrigin}/proxy?url=${encodeURIComponent(m3u8[0])}&ref=${encodeURIComponent("https://emturbovid.com/")}`;
            streams.push({
              server: "Turbovid (HLS)",
              url: proxiedUrl,
              directUrl: m3u8[0],
              type: "hls",
              quality: "1080p",
              isM3U8: true,
              headers: { Referer: "https://emturbovid.com/" },
            });
          }
        }
        continue;
      }

      // 3. Fallback embeds (Streamwish, Abyss, etc.)
      const serverLabel = serverUrl.includes("rubystm")
        ? "Ruby (Streamwish)"
        : serverUrl.includes("abyss")
        ? "AbyssPlayer"
        : serverUrl.includes("filesforever")
        ? "FilesForever"
        : "External Embed";

      streams.push({
        server: serverLabel,
        url: serverUrl,
        type: "embed",
        isM3U8: false,
      });
    } catch {
      // Continue to next server on error
    }
  }

  return streams;
}

// 6. Built-in CORS & HLS Proxy for streaming chunks without CORS errors
async function handleProxy(request) {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");
  const referer = url.searchParams.get("ref") || `${TOONSTREAM_BASE}/`;

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

    // If it is an m3u8 playlist, rewrite relative chunk URLs to go through proxy
    if (
      targetUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      let text = await upstreamRes.text();
      const targetBase = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const workerOrigin = url.origin;

      // Rewrite relative URLs in m3u8 to proxied absolute URLs
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

    // Binary segment / video stream passthrough
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
      return json({
        name: "AniWaveX Universal Hindi Streaming Worker",
        status: "ok",
        version: "1.1.0",
        provider: "toonstream",
        features: ["search", "episodes", "stream", "hls-proxy", "multi-audio-hindi"],
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
    const slugQuery = url.searchParams.get("slug") || url.searchParams.get("id");
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
    // Matches: /watch/toonstream/:slug/dub/toonstream-:ep OR /watch/hindi/:slug/dub/hindi-:ep OR /watch/:slug/:ep
    m = path.match(/^\/watch\/(?:toonstream|hindi)?\/?([^\/]+)\/(?:dub\/[^\-]+-)?([^\/]+)\/?$/i);
    let targetSlug = m ? m[1] : null;
    let targetEp = m ? m[2] : null;

    if (!targetSlug) {
      targetSlug = url.searchParams.get("slug") || url.searchParams.get("id");
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
