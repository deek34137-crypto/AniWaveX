// Optimized Offline Service Worker for AniWaveX PWA
const CACHE_NAME = "aniwavex-offline-v2";

const PRECACHE_ASSETS = [
  "/",
  "/downloads",
  "/watchlist",
  "/manifest.json",
  "/logo.png",
  "/globe.svg"
];

// Helper: Fetch with timeout to prevent browser hanging on network drops
function fetchWithTimeout(request, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Network timeout"));
    }, timeoutMs);

    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Install Event - Precache critical shell routes immediately
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

// Activate Event - Clean up stale caches immediately and take control
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

// Fetch Event - Instant offline response with fast network fallback
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
      (async () => {
        // If navigator is strictly offline, immediately serve cached page without waiting
        const cachedPage = await caches.match(event.request);
        const downloadsFallback = await caches.match("/downloads");

        try {
          // Race network against 2.5s timeout so user never waits 30s when offline
          const networkResponse = await fetchWithTimeout(event.request, 2500);
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        } catch (err) {
          // Network failed or timed out: serve matching cached page or /downloads fallback
          if (cachedPage) return cachedPage;
          if (downloadsFallback) return downloadsFallback;

          // If root "/" was requested and cached, return it
          const rootFallback = await caches.match("/");
          if (rootFallback) return rootFallback;

          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - AniWaveX</title><style>body{background:#020617;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:1rem}a{color:#38bdf8;text-decoration:none;font-weight:600;padding:0.75rem 1.5rem;border-radius:0.75rem;background:#0369a1;display:inline-block;margin-top:1rem}</style></head><body><div><h1>You are currently offline</h1><p>Open your downloaded manga chapters to read without an internet connection.</p><a href="/downloads">Open Downloads</a></div></body></html>`,
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        }
      })()
    );
    return;
  }

  // For static assets: Stale-While-Revalidate or Network first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache silently
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
            (url.pathname.startsWith("/_next/static/") ||
              url.pathname.endsWith(".png") ||
              url.pathname.endsWith(".svg") ||
              url.pathname.endsWith(".webp") ||
              url.pathname.endsWith(".jpg") ||
              url.pathname.endsWith(".woff2"))
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
