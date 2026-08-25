const __name = (fn, _) => fn;

var resolved = new Map();
var inflight = new Map();
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
var ANIZIP = "https://api.ani.zip/mappings";

const AL_STATUS_MAP = {
  RELEASING: "RELEASING",
  FINISHED: "FINISHED",
  NOT_YET_RELEASED: "NOT_YET_RELEASED",
  CANCELLED: "FINISHED",
  HIATUS: "HIATUS",
};

async function fetchFromAniList(id) {
  const fullQuery = `query($id:Int){Media(id:$id,type:ANIME){id idMal title{english romaji native} status format episodes seasonYear startDate{year} synonyms nextAiringEpisode{episode airingAt timeUntilAiring}}}`;
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify({ query: fullQuery, variables: { id } }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.data?.Media ?? null;
}

async function fetchFromAniZip(id) {
  const res = await fetch(`${ANIZIP}?anilist_id=${id}`, {
    headers: { "Accept": "application/json" }
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const json = await res.json().catch(() => null);
  return json ?? null;
}

export function forgetMedia(anilistId) {
  const id = Number(anilistId);
  resolved.delete(id);
  inflight.delete(id);
}

export async function getMedia(anilistId) {
  const id = Number(anilistId);
  if (resolved.has(id)) return resolved.get(id);
  if (inflight.has(id)) return inflight.get(id);

  const promise = (async () => {
    const [al, azData] = await Promise.all([
      fetchFromAniList(id),
      fetchFromAniZip(id)
    ]);

    const azMap = azData?.mappings ?? {};
    const azTitles = azData?.titles ?? {};

    const malId = al?.idMal || azMap.mal_id || azMap.malId || null;
    const englishTitle = al?.title?.english || azTitles.en || azTitles.en_us || azMap.title || null;
    const romajiTitle = al?.title?.romaji || azTitles["x-jat"] || azMap.title || null;
    const nativeTitle = al?.title?.native || azTitles.ja || null;

    const synonyms = [
      ...(Array.isArray(al?.synonyms) ? al.synonyms : []),
      ...(Array.isArray(azMap.synonyms) ? azMap.synonyms : []),
      ...Object.values(azTitles).filter(t => typeof t === "string")
    ];

    const media = {
      id,
      idMal: malId,
      title: {
        english: englishTitle,
        romaji: romajiTitle,
        native: nativeTitle,
      },
      status: AL_STATUS_MAP[al?.status] ?? "RELEASING",
      format: al?.format ?? azMap.format ?? "TV",
      episodes: al?.episodes ?? azMap.episodes ?? null,
      seasonYear: al?.seasonYear ?? (al?.startDate?.year || null),
      startDate: al?.startDate ?? null,
      nextAiringEpisode: al?.nextAiringEpisode ?? null,
      synonyms: [...new Set(synonyms.filter(Boolean))],
    };

    resolved.set(id, media);
    inflight.delete(id);
    return media;
  })();

  inflight.set(id, promise);
  return promise;
}
