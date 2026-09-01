import { getMedia } from './anilist.js';
import { decryptEmbed, sha256hex } from './crypto.js';

var BASE = "https://reanime.to";
var FLIX = "https://flixcloud.cc";
var JIKAN3 = "https://api.jikan.moe/v4";
var ANIZIP2 = "https://api.ani.zip/mappings";
var UA5 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var H = { "User-Agent": UA5, Accept: "application/json, */*" };

var __name = (fn, _) => fn;

export async function resolveIds(anilistId) {
  const [media, anizip] = await Promise.all([
    getMedia(anilistId),
    fetch(`${ANIZIP2}?anilist_id=${anilistId}`).then((r) => r.json()).catch(() => null)
  ]);
  if (!media) throw new Error(`AniList ID ${anilistId} not found`);
  return {
    title: media.title.english || media.title.romaji,
    malId: media.idMal,
    anizip: anizip ?? null
  };
}
__name(resolveIds, "resolveIds");

export async function findSlug(title2) {
  try {
    const res = await fetch(`${BASE}/api/search?${new URLSearchParams({ q: title2, limit: 5 })}`, {
      headers: H,
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const results = Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
    if (!results.length) return null;
    return results[0].anime_id ?? results[0].slug ?? results[0].id ?? null;
  } catch {
    return null;
  }
}
__name(findSlug, "findSlug");

async function jikanFetch2(url, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA5, Accept: "application/json" }, signal: AbortSignal.timeout(4000) }).catch(() => null);
    if (!res) return null;
    if (res.status === 429) {
      const wait = (parseInt(res.headers.get("Retry-After") ?? "1") || 1) * 1e3 + attempt * 500;
      if (attempt < retries) { await new Promise((r) => setTimeout(r, wait)); continue; }
      return null;
    }
    if (!res.ok) return null;
    return res.json().catch(() => null);
  }
  return null;
}
__name(jikanFetch2, "jikanFetch");

export async function getJikanEpisodes(malId, page) {
  const res = await jikanFetch2(`${JIKAN3}/anime/${malId}/episodes?page=${page}`);
  return res ?? { data: [], pagination: { last_visible_page: 1, has_next_page: false } };
}
__name(getJikanEpisodes, "getJikanEpisodes");

export async function resolveStream3(anilistId, audio, ep) {
  const { title: title2 } = await resolveIds(anilistId);
  const order = { "HD-2": 0, "HD-1": 1 };
  const byPrio = (arr) => arr.slice().sort((a, b) => (order[a.serverName] ?? 9) - (order[b.serverName] ?? 9));

  // Primary Flix API endpoint (stable, direct AniList ID lookup)
  let flixData = null;
  try {
    const flixRes = await fetch(`${BASE}/api/flix/${anilistId}/${ep}`, {
      headers: H,
      signal: AbortSignal.timeout(3500),
    });
    if (flixRes.ok) {
      flixData = await flixRes.json().catch(() => null);
    }
  } catch {}

  const links = [];
  if (flixData?.success && Array.isArray(flixData?.servers)) {
    const seen = new Set();
    for (const s of flixData.servers) {
      const sId = s["$id"] || s.serverName || s.dataLink;
      if (!seen.has(sId)) {
        seen.add(sId);
        links.push(s);
      }
    }
  }

  const audioTypes = audio === "sub" ? ["sub", "s-sub"] : ["dub", "s-dub"];
  const servers = byPrio(links.filter((s) => audioTypes.includes(s.dataType)));
  if (!servers.length) throw Object.assign(new Error(`No ${audio} servers for "${title2}" ep ${ep}`), { status: 404 });
  
  let stream = { url: null, subtitles: [], thumbnails_vtt: null, video_title: null, intro_chapter: null, outro_chapter: null };
  try {
    const embedRes = await fetch(servers[0].dataLink, {
      headers: { ...H, Referer: `${BASE}/` },
      signal: AbortSignal.timeout(3000),
    });
    if (embedRes.ok) {
      stream = await decryptEmbed(await embedRes.text());
    }
  } catch (err) {
    console.warn("Native stream decrypt failed. Continuing with embeds only.", err.message);
  }
  
  return { title: title2, slug: null, watchData: null, stream, server: servers[0].serverName, servers };
}
__name(resolveStream3, "resolveStream3");

export async function reanimeSearch(query) {
  try {
    const res = await fetch(`${BASE}/api/search?${new URLSearchParams({ q: query, limit: 20 })}`, {
      headers: H,
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data) ? data : data?.results ?? data?.data ?? [];
  } catch {
    return [];
  }
}
__name(reanimeSearch, "reanimeSearch");

export async function fetchAnizip(anilistId) {
  return fetch(`${ANIZIP2}?anilist_id=${anilistId}`, { signal: AbortSignal.timeout(3000) }).then((r) => r.json()).catch(() => null);
}
__name(fetchAnizip, "fetchAnizip");

export function rewriteM3U8(text, baseUrl, origin) {
  const base = new URL(baseUrl);
  const lines = text.split("\n");
  return lines.map((line) => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return line;
    try { new URL(t); return line; } catch {
      const abs = new URL(t, base.origin + base.pathname.substring(0, base.pathname.lastIndexOf("/") + 1)).href;
      return `${origin}/proxy?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(base.origin)}`;
    }
  }).join("\n");
}
__name(rewriteM3U8, "rewriteM3U8");
