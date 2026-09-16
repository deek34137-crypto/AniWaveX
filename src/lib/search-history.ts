/**
 * AniWaveX Search History Utility
 * Manages search history in localStorage with add, remove particular, and clear all functionality.
 */

const SEARCH_HISTORY_KEY = "aniwavex_search_history";
const MAX_HISTORY_ITEMS = 20;

export function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSearchQuery(query: string): string[] {
  if (typeof window === "undefined") return [];
  const trimmed = query.trim();
  if (!trimmed) return getSearchHistory();

  try {
    const current = getSearchHistory();
    const filtered = current.filter(
      (item) => item.toLowerCase() !== trimmed.toLowerCase()
    );
    const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("search-history-updated"));
    return updated;
  } catch {
    return [];
  }
}

export function removeSearchItem(query: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getSearchHistory();
    const updated = current.filter(
      (item) => item.toLowerCase() !== query.trim().toLowerCase()
    );
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("search-history-updated"));
    return updated;
  } catch {
    return [];
  }
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    window.dispatchEvent(new Event("search-history-updated"));
  } catch {}
}
