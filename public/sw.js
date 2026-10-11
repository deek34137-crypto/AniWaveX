// Basic Offline Service Worker for AniWaveX PWA
const CACHE_NAME = "aniwavex-offline-v1";

const PRECACHE_ASSETS = [
  "/",
  "/downloads",
  "/watchlist",
  "/manifest.json",
  "/logo.png",
  "/globe.svg"
];

// Install Event - Precache critical shell routes
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache asset fetch warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first for fresh data, falling back to cache when offline
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip chrome-extension, cross-origin video chunk streams, and analytics
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/stream") ||
    url.pathname.startsWith("/_vercel") ||
    url.hostname.includes("analytics")
  ) {
    return;
  }

  // For navigational requests (HTML pages)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, clone into cache
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Try to return matched cached page or the fallback /downloads page
          const cached = await caches.match(event.request);
          if (cached) return cached;
          const downloadsFallback = await caches.match("/downloads");
          if (downloadsFallback) return downloadsFallback;
          return new Response("You are currently offline. Open your saved downloads at /downloads.", {
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // For static assets: Stale-While-Revalidate or Network first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            (url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".png") || url.pathname.endsWith(".svg"))
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return new Response("", { status: 408 });
        });
    })
  );
});
