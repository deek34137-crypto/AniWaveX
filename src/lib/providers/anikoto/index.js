import { searchAnilist } from './core/anilist.js';
import { resolveIds, findSlug, getJikanEpisodes, resolveStream3, reanimeSearch, rewriteM3U8 } from './core/resolver.js';
import { decryptEmbed } from './core/crypto.js';

var BASE = "https://reanime.to";
var FLIX = "https://flixcloud.cc";
var UA5 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var H = { "User-Agent": UA5, Accept: "application/json, */*" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
}

async function handleSearch(url) {
  const q = url.searchParams.get("q");
  if (!q) return json({ error: "Missing ?q= param" }, 400);
  const [reanime, alResults] = await Promise.all([
    reanimeSearch(q),
    searchAnilist(q)
  ]);
  const alMap = {};
  for (const m of alResults) alMap[m.id] = m;
  function pickTitle(src) {
    if (!src) return "Unknown";
    if (typeof src === "string") return src;
    return src.english ?? src.romaji ?? src["x-jat"] ?? JSON.stringify(src);
  }
  const results = reanime.map((r) => {
    const slug = r.anime_id ?? r.slug ?? r.id;
    const al = alMap[r.anilist_id ?? r.anime_id] ?? {};
    const t = al.title ?? {};
    const rawTitle = r.title ?? r.name ?? null;
    return {
      slug: String(slug),
      anilistId: r.anilist_id ?? null,
      malId: al.idMal ?? null,
      title: pickTitle(rawTitle),
      titles: { en: t.english ?? null, jp: t.native ?? null, romaji: t.romaji ?? null },
      year: al.seasonYear ?? null,
      type: al.format ?? null,
      status: al.status ?? null,
      episodes: al.episodes ?? null,
      score: al.averageScore ?? null,
      image: al.coverImage?.large ?? null,
      url: `${BASE}/anime/${slug}`
    };
  }).filter((r) => r.anilistId || r.title);
  return json({ results });
}

async function handleEpisodes(anilistId, url) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
  const { title, malId, anizip } = await resolveIds(anilistId);
  if (!malId) {
    const anizipEps = anizip?.episodes ? Object.entries(anizip.episodes) : [];
    if (!anizipEps.length) return json({ error: `No MAL ID and no AniZip episodes for AniList ID ${anilistId}` }, 404);
    const episodes = anizipEps.map(([epKey, meta]) => {
      const epNum = parseInt(epKey);
      return {
        id: `${anilistId}/sub/${epNum}`,
        number: epNum,
        title: meta.title?.en ?? meta.title?.["x-jat"] ?? `Episode ${epNum}`,
        image: meta.image ?? null,
        airDate: meta.airdate ?? null,
        duration: meta.runtime ? meta.runtime * 60 : null,
        filler: meta.filler ?? false,
        description: meta.overview ?? null
      };
    }).sort((a, b) => a.number - b.number);
    return json({ anime: title, anilistId: Number(anilistId), malId: null, episodes, pagination: { currentPage: 1, lastPage: 1, hasNextPage: false } });
  }
  const jikan = await getJikanEpisodes(malId, page);
  if (!jikan.data?.length) return json({ error: `No episodes found on Jikan for MAL ID ${malId}` }, 404);
  const episodes = jikan.data.map((ep) => {
    const epNum = ep.mal_id;
    const meta = anizip?.episodes?.[String(epNum)] ?? {};
    return {
      id: `${anilistId}/sub/${epNum}`,
      number: epNum,
      title: ep.title ?? meta.title?.en ?? `Episode ${epNum}`,
      image: meta.image ?? null,
      airDate: ep.aired ?? meta.airDate ?? null,
      duration: meta.runtime ? meta.runtime * 60 : null,
      score: ep.score ?? null,
      filler: ep.filler,
      recap: ep.recap,
      description: meta.overview ?? null
    };
  });
  return json({ anime: title, anilistId: Number(anilistId), malId, episodes, pagination: { currentPage: page, lastPage: jikan.pagination.last_visible_page, hasNextPage: jikan.pagination.has_next_page } });
}

async function handleWatch(anilistId, audio, epNum, origin) {
  if (audio !== "sub" && audio !== "dub") return json({ error: "audio must be sub or dub" }, 400);
  const ep = parseInt(epNum);
  if (isNaN(ep)) return json({ error: `Invalid episode: ${epNum}` }, 400);
  let resolved;
  try { resolved = await resolveStream3(anilistId, audio, ep); } catch (e) { return json({ error: e.message }, e.status ?? 500); }
  const { title, slug, watchData, stream, server, servers } = resolved;
  const redirectUrl = `${origin}/stream/${anilistId}/${audio}/${ep}`;
  return json({
    anime: title, slug, ep, audio, server,
    stream_url: stream.url,
    redirect_url: redirectUrl,
    streams: [
      { url: stream.url, type: "hls" },
      { url: redirectUrl, type: "hls-redirect" },
      ...servers.map((s) => ({ url: s.dataLink, type: "embed", server: s.serverName }))
    ],
    subtitles: stream.subtitles,
    thumbnails_vtt: stream.thumbnails_vtt,
    video_title: stream.video_title,
    intro: stream.intro_chapter,
    outro: stream.outro_chapter,
    intro_start: watchData?.intro_start ?? null,
    intro_end: watchData?.intro_end ?? null,
    outro_start: watchData?.outro_start ?? null,
    outro_end: watchData?.outro_end ?? null,
    allServers: servers.map((s) => ({ name: s.serverName, type: s.dataType, embed: s.dataLink }))
  });
}

async function handleStream(anilistId, audio, epNum) {
  if (audio !== "sub" && audio !== "dub") return json({ error: "audio must be sub or dub" }, 400);
  const ep = parseInt(epNum);
  if (isNaN(ep)) return json({ error: `Invalid episode: ${epNum}` }, 400);
  let resolved;
  try { resolved = await resolveStream3(anilistId, audio, ep); } catch (e) { return json({ error: e.message }, e.status ?? 500); }
  return new Response(null, {
    status: 302,
    headers: { "Location": resolved.stream.url, "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }
  });
}

async function handleProxy(url) {
  const target = url.searchParams.get("url");
  const referer = url.searchParams.get("referer") ?? `${FLIX}/`;
  if (!target) return json({ error: "Missing required ?url= param" }, 400);
  let targetUrl;
  try { targetUrl = new URL(target); } catch { return json({ error: "Invalid url param" }, 400); }
  const upstream = await fetch(target, {
    headers: {
      "User-Agent": UA5, "Accept": "*/*", "Accept-Language": "en-US,en;q=0.9",
      "Referer": referer, "Sec-Fetch-Dest": "empty", "Sec-Fetch-Mode": "cors", "Sec-Fetch-Site": "cross-site"
    }
  });
  const ct = upstream.headers.get("Content-Type") ?? "";
  const isM3U8 = ct.includes("mpegurl") || ct.includes("x-mpegurl") || targetUrl.pathname.endsWith(".m3u8") || targetUrl.pathname.endsWith(".m3u");
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
  if (!upstream.ok) return new Response(await upstream.text(), { status: upstream.status, headers: { "Content-Type": ct || "text/plain", ...corsHeaders } });
  if (isM3U8) {
    const text = await upstream.text();
    const rewritten = rewriteM3U8(text, target, url.origin);
    return new Response(rewritten, { status: 200, headers: { "Content-Type": "application/vnd.apple.mpegurl", ...corsHeaders } });
  }
  return new Response(upstream.body, { status: upstream.status, headers: { "Content-Type": ct || "application/octet-stream", ...corsHeaders } });
}

var index_default = {
  async fetch(request) {
    const reqUrl = typeof request.url === "string" && request.url.startsWith("http") ? request.url : `http://${request.headers?.host || request.headers?.get?.("host") || "localhost"}${request.url}`;
    const url = new URL(reqUrl);
    const path = url.pathname;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "*" } });
    try {
      let m;
      if (path === "/healthz") return json({ status: "ok", provider: "reanime" });
      if (path === "/proxy") return await handleProxy(url);
      if (path === "/search") return await handleSearch(url);
      m = path.match(/^\/anime\/(\d+)\/episodes$/);
      if (m) return await handleEpisodes(m[1], url);
      m = path.match(/^\/anime\/(\d+)\/(\d+)\/(sub|dub)$/);
      if (m) return await handleWatch(m[1], m[3], m[2], url.origin);
      m = path.match(/^\/stream\/(\d+)\/(sub|dub)\/(\d+)$/);
      if (m) return await handleStream(m[1], m[2], m[3]);
      return json({ error: "Not found", routes: ["GET /search?q=", "GET /anime/:anilistId/episodes", "GET /anime/:anilistId/:ep/:audio", "GET /stream/:anilistId/:audio/:ep", "GET /proxy?url=&referer=", "GET /healthz"] }, 404);
    } catch (err) { return json({ error: err.message, ...err.debug ? { debug: err.debug } : {} }, 500); }
  }
};

async function getEpisodes(anilistId, ctx = {}) {
  let title, malId, anizip;
  if (ctx.media && ctx.anizip !== void 0) {
    title = ctx.media.title.english || ctx.media.title.romaji;
    malId = ctx.media.idMal;
    anizip = ctx.anizip;
  } else ({ title, malId, anizip } = await resolveIds(anilistId));
  if (!malId) {
    const anizipEps = anizip?.episodes ? Object.entries(anizip.episodes) : [];
    if (!anizipEps.length) throw new Error(`No MAL ID and no AniZip episodes for AniList ${anilistId}`);
    const sub = [], dub = [];
    for (const [epKey, meta] of anizipEps) {
      const epNum = parseInt(epKey);
      const base = { number: epNum, title: meta.title?.en ?? meta.title?.["x-jat"] ?? `Episode ${epNum}`, duration: meta.runtime ? meta.runtime * 60 : null, filler: meta.filler ?? false, description: meta.overview ?? null, image: meta.image ?? null, airDate: meta.airdate ?? null };
      sub.push({ ...base, id: `${anilistId}/sub/${epNum}`, audio: "sub" });
      dub.push({ ...base, id: `${anilistId}/dub/${epNum}`, audio: "dub" });
    }
    sub.sort((a, b) => a.number - b.number);
    dub.sort((a, b) => a.number - b.number);
    return { meta: { title, malId: null }, episodes: { sub, dub } };
  }
  const allEps = ctx.jikanEps ?? await (async () => {
    const first = await getJikanEpisodes(malId, 1);
    const lastPage = first.pagination?.last_visible_page ?? 1;
    let eps = [...first.data ?? []];
    if (lastPage > 1) {
      const rest = await Promise.all(Array.from({ length: lastPage - 1 }, (_, i) => getJikanEpisodes(malId, i + 2)));
      for (const r of rest) eps = eps.concat(r.data ?? []);
    }
    return eps;
  })();
  const sub = [], dub = [];
  for (const ep of allEps) {
    const epNum = ep.mal_id;
    const meta = anizip?.episodes?.[String(epNum)] ?? {};
    const base = { number: epNum, title: ep.title ?? meta.title?.en ?? `Episode ${epNum}`, duration: meta.runtime ? meta.runtime * 60 : null, filler: ep.filler, description: meta.overview ?? null, image: meta.image ?? null, airDate: ep.aired ?? meta.airDate ?? null };
    sub.push({ ...base, id: `${anilistId}/sub/${epNum}`, audio: "sub" });
    dub.push({ ...base, id: `${anilistId}/dub/${epNum}`, audio: "dub" });
  }
  return { meta: { title, malId }, episodes: { sub, dub } };
}

export default index_default;
export { getEpisodes };
