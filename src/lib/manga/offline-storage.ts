/**
 * Manga Offline Storage Client
 * Uses browser IndexedDB to store downloaded manga chapters (images as Blobs)
 * for complete offline reading in Web, PWA, or Capacitor APK WebView.
 */

const DB_NAME = "aniwavex_manga_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "downloaded_chapters";

export interface OfflineChapter {
  id: string; // `${mangaId}_${chapterId}`
  mangaId: string;
  mangaTitle: string;
  posterImage?: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle?: string;
  downloadedAt: number;
  totalPages: number;
  pages: {
    pageNumber: number;
    blob: Blob;
    mimeType: string;
  }[];
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("mangaId", "mangaId", { unique: false });
        store.createIndex("downloadedAt", "downloadedAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveChapterOffline(chapter: OfflineChapter): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(chapter);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineChapter(mangaId: string, chapterId: string): Promise<OfflineChapter | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const id = `${mangaId}_${chapterId}`;
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function isChapterDownloaded(mangaId: string, chapterId: string): Promise<boolean> {
  try {
    const item = await getOfflineChapter(mangaId, chapterId);
    return item !== null && item.pages && item.pages.length > 0;
  } catch {
    return false;
  }
}

export async function getDownloadedChaptersForManga(mangaId: string): Promise<OfflineChapter[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("mangaId");
    const req = index.getAll(mangaId);

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineChapter(mangaId: string, chapterId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const id = `${mangaId}_${chapterId}`;
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
