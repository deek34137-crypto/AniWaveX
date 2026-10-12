export interface SearchAnimeItem {
  id: string | number;
  title: string;
  slug: string;
  year?: string;
  posterImage?: string;
  rating?: string;
  type?: string;
  status?: string;
}

export interface SearchMangaItem {
  id: string;
  title: string;
  posterImage?: string;
  year?: string | number;
  type?: string;
  status?: string;
}

/**
 * Shared API search for Anime series
 */
export async function searchAnime(
  query: string,
  limit: number = 5,
  signal?: AbortSignal
): Promise<SearchAnimeItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`, {
    signal,
  });

  if (!res.ok) {
    throw new Error(`Anime search failed with status: ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Shared API search for Manga titles
 */
export async function searchManga(
  query: string,
  limit: number = 6,
  signal?: AbortSignal
): Promise<SearchMangaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetch(`/api/manga/browse?q=${encodeURIComponent(trimmed)}&limit=${limit}`, {
    signal,
  });

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  return data?.success && Array.isArray(data?.data) ? data.data : [];
}
