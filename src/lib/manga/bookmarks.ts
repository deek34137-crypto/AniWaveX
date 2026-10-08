"use client";

export type MangaBookmarkStatus = 'reading' | 'plan_to_read' | 'completed' | 'on_hold' | 'dropped';

export interface MangaBookmarkItem {
  id?: string;
  manga_id: string;
  manga_title: string;
  poster_image?: string;
  status: MangaBookmarkStatus;
  last_chapter_read?: string;
  last_chapter_id?: string;
  last_page_read?: number;
  user_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MangaStatusCategory {
  id: MangaBookmarkStatus | 'all';
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export const MANGA_BOOKMARK_STATUSES: Record<MangaBookmarkStatus, MangaStatusCategory> = {
  reading: {
    id: 'reading',
    label: 'Reading',
    color: 'cyan',
    badgeBg: 'bg-cyan-600/20',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30'
  },
  plan_to_read: {
    id: 'plan_to_read',
    label: 'Plan to Read',
    color: 'amber',
    badgeBg: 'bg-amber-600/20',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/30'
  },
  completed: {
    id: 'completed',
    label: 'Completed',
    color: 'emerald',
    badgeBg: 'bg-emerald-600/20',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30'
  },
  on_hold: {
    id: 'on_hold',
    label: 'On Hold',
    color: 'purple',
    badgeBg: 'bg-purple-600/20',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/30'
  },
  dropped: {
    id: 'dropped',
    label: 'Dropped',
    color: 'rose',
    badgeBg: 'bg-rose-600/20',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/30'
  }
};

const STORAGE_KEY = 'aniwavex_manga_bookmarks';

/**
 * Get all manga bookmarks stored locally in localStorage
 */
export function getLocalMangaBookmarks(): MangaBookmarkItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save all manga bookmarks to localStorage and dispatch custom event
 */
export function setLocalMangaBookmarks(items: MangaBookmarkItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('aniwavex_manga_bookmarks_updated', { detail: items }));
  } catch {}
}

/**
 * Check if a manga is bookmarked locally
 */
export function getLocalMangaBookmark(mangaId: string): MangaBookmarkItem | null {
  const items = getLocalMangaBookmarks();
  return items.find((item) => item.manga_id === mangaId) || null;
}

/**
 * Add or update a manga bookmark
 */
export async function saveMangaBookmark(
  item: {
    mangaId: string;
    mangaTitle: string;
    posterImage?: string;
    status: MangaBookmarkStatus;
    lastChapterRead?: string;
    lastChapterId?: string;
    lastPageRead?: number;
  },
  userId?: string | null
): Promise<MangaBookmarkItem> {
  const current = getLocalMangaBookmarks();
  const existingIndex = current.findIndex((b) => b.manga_id === item.mangaId);
  const now = new Date().toISOString();

  const bookmarkRecord: MangaBookmarkItem = {
    id: item.mangaId,
    manga_id: item.mangaId,
    manga_title: item.mangaTitle,
    poster_image: item.posterImage || (existingIndex >= 0 ? current[existingIndex].poster_image : undefined),
    status: item.status,
    last_chapter_read: item.lastChapterRead || (existingIndex >= 0 ? current[existingIndex].last_chapter_read : undefined),
    last_chapter_id: item.lastChapterId || (existingIndex >= 0 ? current[existingIndex].last_chapter_id : undefined),
    last_page_read: item.lastPageRead || (existingIndex >= 0 ? current[existingIndex].last_page_read : 1),
    user_id: userId || null,
    updated_at: now,
    created_at: existingIndex >= 0 && current[existingIndex].created_at ? current[existingIndex].created_at : now,
  };

  let updatedList: MangaBookmarkItem[];
  if (existingIndex >= 0) {
    updatedList = [...current];
    updatedList[existingIndex] = { ...updatedList[existingIndex], ...bookmarkRecord };
  } else {
    updatedList = [bookmarkRecord, ...current];
  }

  setLocalMangaBookmarks(updatedList);

  // Cloud sync if authenticated
  if (userId) {
    try {
      await fetch('/api/manga/bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookmarkRecord),
      });
    } catch (err) {
      console.error('Failed to sync manga bookmark to cloud:', err);
    }
  }

  return bookmarkRecord;
}

/**
 * Remove a manga bookmark
 */
export async function deleteMangaBookmark(mangaId: string, userId?: string | null): Promise<void> {
  const current = getLocalMangaBookmarks();
  const filtered = current.filter((item) => item.manga_id !== mangaId);
  setLocalMangaBookmarks(filtered);

  // Cloud sync if authenticated
  if (userId) {
    try {
      await fetch(`/api/manga/bookmarks?mangaId=${encodeURIComponent(mangaId)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to remove manga bookmark from cloud:', err);
    }
  }
}
