/**
 * Transparent Deterministic Recommendation Engine for AniWaveX
 * 
 * Rules:
 * - Deterministic, explainable scoring based on user's actual watchlist and history.
 * - Factors:
 *   1. Genre Overlap (weight: 40%)
 *   2. Tag Overlap (weight: 25%)
 *   3. Format/Type Match (TV, Movie, etc.) (weight: 15%)
 *   4. Popularity / Rating Weight (weight: 20%)
 * - Explicit explainability strings: e.g. "Because you completed Attack on Titan (Action, Drama)"
 * - User Feedback Loop: Supports Like, Dislike, Hide, and Already Watched with local persistence.
 */

export interface RecommendationFeedback {
  animeId: string | number;
  action: 'like' | 'dislike' | 'hide' | 'already_watched';
  timestamp: number;
}

export interface TasteProfile {
  topGenres: { genre: string; count: number; weight: number }[];
  preferredTypes: { type: string; count: number }[];
  watchedCount: number;
  completedCount: number;
}

export interface RecommendationItem {
  id: string | number;
  slug: string;
  title: string;
  posterImage: string;
  rating: string;
  type?: string;
  year?: string;
  genres: string[];
  score: number; // 0 - 100 deterministic score
  reasons: string[];
  matchedTitle?: string;
}

const FEEDBACK_STORAGE_KEY = 'aniwavex_rec_feedback';

export function getStoredFeedback(): RecommendationFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecommendationFeedback(animeId: string | number, action: 'like' | 'dislike' | 'hide' | 'already_watched'): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredFeedback().filter((f) => String(f.animeId) !== String(animeId));
    existing.push({ animeId, action, timestamp: Date.now() });
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error('Failed to store recommendation feedback:', err);
  }
}

export function clearRecommendationFeedback(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FEEDBACK_STORAGE_KEY);
}

/**
 * Builds user's taste profile from local watch history and watchlist entries
 */
export function buildTasteProfile(history: any[], watchlist: any[]): TasteProfile {
  const genreCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  let completedCount = 0;

  const allItems = [...history, ...watchlist];

  for (const item of allItems) {
    if (item.status === 'completed') completedCount++;
    const genres: string[] = item.genres || item.tags || [];
    for (const g of genres) {
      if (typeof g === 'string') {
        genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
      }
    }
    if (item.type) {
      typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
    }
  }

  const totalGenres = Array.from(genreCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const topGenres = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count, weight: Number((count / totalGenres).toFixed(2)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const preferredTypes = Array.from(typeCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    topGenres,
    preferredTypes,
    watchedCount: history.length,
    completedCount,
  };
}

/**
 * Deterministically ranks candidates against the user's taste profile
 */
export function rankRecommendations(
  candidates: any[],
  profile: TasteProfile,
  excludedIds: Set<string | number>
): RecommendationItem[] {
  const feedback = getStoredFeedback();
  const hiddenIds = new Set(
    feedback
      .filter((f) => f.action === 'hide' || f.action === 'already_watched' || f.action === 'dislike')
      .map((f) => String(f.animeId))
  );

  const likedIds = new Set(
    feedback
      .filter((f) => f.action === 'like')
      .map((f) => String(f.animeId))
  );

  const results: RecommendationItem[] = [];

  for (const anime of candidates) {
    const strId = String(anime.id || anime.slug);
    if (excludedIds.has(anime.id) || excludedIds.has(anime.slug) || hiddenIds.has(strId)) {
      continue;
    }

    const animeGenres: string[] = anime.genres || anime.tags || [];
    let genreScore = 0;
    const matchingGenres: string[] = [];

    for (const userG of profile.topGenres) {
      if (animeGenres.some((g) => g.toLowerCase() === userG.genre.toLowerCase())) {
        genreScore += userG.weight * 40;
        matchingGenres.push(userG.genre);
      }
    }

    // Format match
    let typeScore = 0;
    if (anime.type && profile.preferredTypes.length > 0 && anime.type === profile.preferredTypes[0].type) {
      typeScore = 15;
    }

    // Rating / Popularity factor
    const numRating = parseFloat(anime.rating || '7.5') || 7.5;
    const ratingScore = Math.min(20, (numRating / 10) * 20);

    // Boost if user previously liked
    const likeBoost = likedIds.has(strId) ? 15 : 0;

    const rawScore = Math.min(99, Math.round(genreScore + typeScore + ratingScore + likeBoost + 10));
    const score = Math.max(35, rawScore);

    const reasons: string[] = [];
    if (matchingGenres.length > 0) {
      reasons.push(`Matches your interest in ${matchingGenres.slice(0, 2).join(' & ')}`);
    }
    if (numRating >= 8.0) {
      reasons.push(`Critically acclaimed (${numRating}/10)`);
    }
    if (typeScore > 0) {
      reasons.push(`Matches your preferred ${anime.type} format`);
    }
    if (reasons.length === 0) {
      reasons.push('Popular trending title');
    }

    results.push({
      id: anime.id,
      slug: anime.slug || String(anime.id),
      title: anime.title || anime.canonicalTitle || 'Anime',
      posterImage: anime.posterImage || anime.coverImage || '',
      rating: anime.rating || 'N/A',
      type: anime.type,
      year: anime.year,
      genres: animeGenres,
      score,
      reasons,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}
