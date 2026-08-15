const API = "https://graphql.anilist.co";

async function getMedia(id) {
  const q = `query($id:Int){Media(id:$id,type:ANIME){id idMal title{romaji english native}format status startDate{year month day}seasonYear episodes duration genres averageScore coverImage{large} bannerImage}}`;
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: q, variables: { id } })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.data?.Media ?? null;
}

async function searchAnilist(query) {
  const q = `query($s:String){Page(perPage:20){media(search:$s,type:ANIME){id idMal title{romaji english native}format status startDate{year month day}seasonYear episodes genres averageScore coverImage{large}}}}`;
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: q, variables: { s: query } })
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j.data?.Page?.media ?? [];
}

export { getMedia, searchAnilist };
