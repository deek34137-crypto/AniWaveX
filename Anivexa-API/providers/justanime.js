/**
 * Provider: JustAnime (MegaPlay)
 * Original repository: xwedx00/ExoTv
 * Underlying source/domain: core.justanime.to / cdn.watching.onl
 * Integration date: 2026-08-25
 *
 * Provides direct AniList-keyed HLS video streams with multiple subtitle tracks
 * and intro/outro timestamps.
 */

import { getMedia } from "../core/anilist.js";
import { episodeMeta, expectedCount, json } from "../core/new-provider-utils.js";

const CORE = "https://core.justanime.to/api";
const ORIGIN = "https://justanime.to";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const REFERER = "https://megaplay.buzz/";

async function fetchJustAnime(anilistId, epNum, provider = "megaplay") {
  const url = `${CORE}/watch/${anilistId}/episode/${epNum}/${provider}`;
  const res = await fetch(url, {
    headers: {
      Origin: ORIGIN,
      Referer: `${ORIGIN}/`,
      "User-Agent": UA,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`JustAnime upstream error: HTTP ${res.status}`);
  }

  return await res.json();
}

function buildEpisodeLists(anilistId, totalEpisodes, ctx) {
  const sub = [];
  const dub = [];

  for (let number = 1; number <= totalEpisodes; number++) {
    const meta = episodeMeta(number, ctx);
    const base = {
      number,
      title: meta.title ?? `Episode ${number}`,
      duration: meta.duration ?? null,
      filler: meta.filler ?? false,
      uncensored: meta.uncensored ?? false,
      description: meta.description ?? null,
      image: meta.image ?? null,
      airDate: meta.airDate ?? null,
      sourceNumber: number,
    };

    sub.push({
      ...base,
      id: `watch/justanime/${anilistId}/sub/justanime-${number}`,
      audio: "sub",
    });

    dub.push({
      ...base,
      id: `watch/justanime/${anilistId}/dub/justanime-${number}`,
      audio: "dub",
    });
  }

  return { sub, dub };
}

export async function getEpisodes(anilistId, ctx = {}) {
  const media = ctx.media ?? (await getMedia(anilistId).catch(() => null));
  const localCtx = { ...ctx, media };
  const expected = expectedCount(media, ctx.anizip, ctx.jikanEps) || 12;

  return {
    meta: {
      id: String(anilistId),
      title: media?.title?.english || media?.title?.romaji || `AniList ${anilistId}`,
      source: "justanime",
      matchScore: 1.0,
      numbering: "standard",
      episodeOffset: 0,
    },
    episodes: buildEpisodeLists(anilistId, expected, localCtx),
  };
}

async function handleWatch(anilistId, audio, epNum) {
  const raw = await fetchJustAnime(anilistId, epNum, "megaplay");
  const block = audio === "dub" ? (raw?.dub || raw?.sub || raw) : (raw?.sub || raw);

  if (!block?.sources || !Array.isArray(block.sources) || block.sources.length === 0) {
    return json({ error: `JustAnime episode ${epNum} stream sources not found` }, 404);
  }

  const streams = block.sources.map((s, idx) => ({
    url: s.url,
    type: s.isM3U8 || s.url?.includes(".m3u8") ? "hls" : "mp4",
    quality: s.quality || "auto",
    audio,
    server: "MegaPlay",
    referer: REFERER,
    headers: { Referer: REFERER },
    priority: idx === 0 ? 10 : 5,
    isActive: idx === 0,
  }));

  const subtitles = (block.subtitles || [])
    .filter((sub) => sub?.file && (sub.kind ?? "").toLowerCase() !== "thumbnails")
    .map((sub) => ({
      url: sub.file,
      lang: sub.label || sub.lang || "English",
      language: sub.label || sub.lang || "English",
    }));

  return json({
    anilistId: Number(anilistId),
    episode: Number(epNum),
    providerEpisode: Number(epNum),
    audio,
    title: `Episode ${epNum}`,
    streams,
    sources: streams,
    subtitles,
    tracks: subtitles,
    intro: block.intro || null,
    outro: block.outro || null,
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    try {
      const m = url.pathname.match(/^\/watch\/justanime\/(\d+)\/(sub|dub)\/justanime-(\d+)\/?$/);
      if (m) {
        return await handleWatch(m[1], m[2], m[3]);
      }
      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: err.message, stack: err.stack }, 500);
    }
  },
};
