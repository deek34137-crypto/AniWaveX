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
  const data = await fetch(`${BASE}/api/search?${new URLSearchParams({ q: title2, limit: 5 })}`, { headers: H }).then((r) => r.json());
  const results = Array.isArray(data) ? data : data.results ?? data.data ?? [];
  if (!results.length) throw new Error(`No reanime results for "${title2}"`);
  const id = results[0].anime_id ?? results[0].slug ?? results[0].id;
  if (!id) throw new Error("Could not extract anime_id from reanime result");
  return id;
}
__name(findSlug, "findSlug");

async function jikanFetch2(url, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA5, Accept: "application/json" } });
    if (res.status === 429) {
      const wait = (parseInt(res.headers.get("Retry-After") ?? "1") || 1) * 1e3 + attempt * 500;
      if (attempt < retries) { await new Promise((r) => setTimeout(r, wait)); continue; }
      return null;
    }
    if (!res.ok) return null;
    return res.json();
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
  let slug = null;
  try {
    slug = await findSlug(title2);
  } catch (err) {
    // Silently ignore as we fallback to Flix anyway
  }
  const order = { "HD-2": 0, "HD-1": 1 };
  const byPrio = (arr) => arr.slice().sort((a, b) => (order[a.serverName] ?? 9) - (order[b.serverName] ?? 9));
  
  const promises = [];
  if (slug) {
    promises.push(fetch(`${BASE}/api/watch/${slug}/${ep}`, { headers: H }).then((r) => { if (!r.ok) throw new Error(`watch ${r.status}`); return r.json(); }));
  } else {
    promises.push(Promise.reject(new Error("No slug")));
  }
  promises.push(fetch(`${BASE}/api/flix/${anilistId}/${ep}`, { headers: H }).then((r) => { if (!r.ok) throw new Error(`flix ${r.status}`); return r.json(); }));

  const [watchRes, flixRes] = await Promise.allSettled(promises);
  const watchData = watchRes.status === "fulfilled" ? watchRes.value : null;
  const flixData = flixRes.status === "fulfilled" ? flixRes.value : null;
  const links = [...watchData?.episode_links ?? []];
  if (flixData?.success && flixData?.servers) {
    const seen = new Set(links.map((s) => s["$id"]));
    for (const s of flixData.servers) { if (!seen.has(s["$id"])) links.push(s); }
  }
  const audioTypes = audio === "sub" ? ["sub", "s-sub"] : ["dub", "s-dub"];
  const servers = byPrio(links.filter((s) => audioTypes.includes(s.dataType)));
  if (!servers.length) throw Object.assign(new Error(`No ${audio} servers for "${title2}" ep ${ep}`), { status: 404 });
  let stream = { url: null, subtitles: [], thumbnails_vtt: null, video_title: null, intro_chapter: null, outro_chapter: null };
  try {
    const embedRes = await fetch(servers[0].dataLink, { headers: { ...H, Referer: `${BASE}/` } });
    if (embedRes.ok) {
      stream = await decryptEmbed(await embedRes.text());
    }
  } catch (err) {
    console.warn("Native stream decrypt failed (likely Cloudflare block). Continuing with embeds only.", err.message);
  }
  
  return { title: title2, slug, watchData, stream, server: servers[0].serverName, servers };
}
__name(resolveStream3, "resolveStream3");

export async function reanimeSearch(query) {
  const data = await fetch(`${BASE}/api/search?${new URLSearchParams({ q: query, limit: 20 })}`, { headers: H }).then((r) => r.json()).catch(() => ({}));
  return Array.isArray(data) ? data : data.results ?? data.data ?? [];
}
__name(reanimeSearch, "reanimeSearch");

export async function fetchAnizip(anilistId) {
  return fetch(`${ANIZIP2}?anilist_id=${anilistId}`).then((r) => r.json()).catch(() => null);
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
