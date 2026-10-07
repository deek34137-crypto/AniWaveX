/**
 * Lightweight In-Memory LRU / TTL Cache
 * Compatible with Edge V8 isolates
 */

class SimpleCache {
  constructor(maxSize = 250) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = 180000) {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.store.clear();
  }
}

export const memoryCache = new SimpleCache(300);
