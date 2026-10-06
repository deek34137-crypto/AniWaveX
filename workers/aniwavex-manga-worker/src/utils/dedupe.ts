import { MangaSearchResult } from '../types';

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*[\(\[].*?[\)\]]/g, '') // remove parentheses/brackets
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function titleSimilarityScore(query: string, candidate: string): number {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1.0;
  if (c.includes(q)) return q.length / c.length;
  if (q.includes(c)) return c.length / q.length;

  // Levenshtein-based similarity for small typos
  const distance = levenshteinDistance(q, c);
  const maxLength = Math.max(q.length, c.length);
  return Math.max(0, 1 - distance / maxLength);
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function deduplicateSearchResults(
  results: MangaSearchResult[],
  query?: string
): MangaSearchResult[] {
  const seenExact = new Set<string>();
  const scored = results.map((item) => {
    const score = query ? titleSimilarityScore(query, item.title) : 1;
    return { ...item, score: item.score ?? score };
  });

  const unique: MangaSearchResult[] = [];

  for (const item of scored) {
    const key = `${item.providerId}:${item.id}`;
    if (!seenExact.has(key)) {
      seenExact.add(key);
      unique.push(item);
    }
  }

  // Sort by relevance score descending
  return unique.sort((a, b) => (b.score || 0) - (a.score || 0));
}
