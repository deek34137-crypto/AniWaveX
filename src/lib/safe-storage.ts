/**
 * Safe Local Storage Utility with In-Memory Fallback and Automatic Quota Pruning.
 * Prevents QuotaExceededError crashes on mobile devices (e.g. iOS Safari in private browsing mode).
 */

class MemoryStorageFallback {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get length(): number {
    return this.store.size;
  }
}

const memoryStorage = new MemoryStorageFallback();

export const safeStorage = {
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage.getItem(key);
    }
  },

  setItem(key: string, value: string): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err: any) {
      // Handle QuotaExceededError by pruning old search history & watch progress caches
      if (
        err?.name === 'QuotaExceededError' ||
        err?.code === 22 ||
        err?.code === 1014 ||
        err?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      ) {
        try {
          this.pruneOldCaches();
          localStorage.setItem(key, value);
          return true;
        } catch {
          // If still failing, write to in-memory fallback
          memoryStorage.setItem(key, value);
          return true;
        }
      }
      memoryStorage.setItem(key, value);
      return false;
    }
  },

  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      memoryStorage.removeItem(key);
    }
  },

  pruneOldCaches(): void {
    if (typeof window === 'undefined') return;
    try {
      const keysToExamine: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('watch_progress_') || k.startsWith('aniwavex_recent_watches') || k.startsWith('aniwavex_search_history'))) {
          keysToExamine.push(k);
        }
      }
      // Delete older watch progress keys (half of them)
      const watchKeys = keysToExamine.filter((k) => k.startsWith('watch_progress_'));
      watchKeys.slice(0, Math.ceil(watchKeys.length / 2)).forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {}
      });
    } catch {}
  },
};
