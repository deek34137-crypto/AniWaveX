import { searchAnilist } from './core/anilist.js';
import { resolveIds, findSlug, getJikanEpisodes, resolveStream3, reanimeSearch, fetchAnizip } from './core/resolver.js';

export class AnikotoProvider {
  async search(query) {
    const [reanime, alResults] = await Promise.all([
      reanimeSearch(query),
      searchAnilist(query)
    ]);
    const alMap = {};
    for (const m of alResults) alMap[m.id] = m;
    return reanime.map((r) => {
      const slug = r.anime_id ?? r.slug ?? r.id;
      const al = alMap[r.anilist_id ?? r.anime_id] ?? {};
      const t = al.title ?? {};
      const rawTitle = r.title ?? r.name ?? null;
      function pickTitle(src) {
        if (!src) return "Unknown";
        if (typeof src === "string") return src;
        return src.english ?? src.romaji ?? src["x-jat"] ?? JSON.stringify(src);
      }
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
        url: `https://reanime.to/anime/${slug}`
      };
    }).filter((r) => r.anilistId || r.title);
  }

  async getEpisodes(anilistId) {
    const { title, malId, anizip } = await resolveIds(anilistId);
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
      return { meta: { anilistId: Number(anilistId), malId: null, title }, episodes: { sub: sub.sort((a, b) => a.number - b.number), dub: dub.sort((a, b) => a.number - b.number) } };
    }
    const first = await getJikanEpisodes(malId, 1);
    const lastPage = first.pagination?.last_visible_page ?? 1;
    let allEps = [...first.data ?? []];
    if (lastPage > 1) {
      const rest = await Promise.all(Array.from({ length: lastPage - 1 }, (_, i) => getJikanEpisodes(malId, i + 2)));
      for (const r of rest) allEps = allEps.concat(r.data ?? []);
    }
    const sub = [], dub = [];
    for (const ep of allEps) {
      const epNum = ep.mal_id;
      const meta = anizip?.episodes?.[String(epNum)] ?? {};
      const base = { number: epNum, title: ep.title ?? meta.title?.en ?? `Episode ${epNum}`, duration: meta.runtime ? meta.runtime * 60 : null, filler: ep.filler, description: meta.overview ?? null, image: meta.image ?? null, airDate: ep.aired ?? meta.airDate ?? null };
      sub.push({ ...base, id: `${anilistId}/sub/${epNum}`, audio: "sub" });
      dub.push({ ...base, id: `${anilistId}/dub/${epNum}`, audio: "dub" });
    }
    return { meta: { anilistId: Number(anilistId), malId, title }, episodes: { sub, dub } };
  }

  async getStreams(anilistId, ep, audio = "sub") {
    const resolved = await resolveStream3(anilistId, audio, ep);
    const { title, slug, watchData, stream, server, servers } = resolved;
    return {
      anime: title,
      slug,
      ep: Number(ep),
      audio,
      server,
      stream_url: stream.url,
      streams: [
        { url: stream.url, type: "hls" },
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
    };
  }
}
