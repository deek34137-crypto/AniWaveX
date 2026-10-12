// Optimized Zero-Failure Offline Service Worker for AniWaveX PWA
const CACHE_NAME = "aniwavex-offline-v3";

const PRECACHE_ASSETS = [
  "/",
  "/downloads",
  "/offline.html",
  "/manifest.json",
  "/logo.png",
  "/globe.svg"
];

// Helper: Fast timeout race for network fetch
function fetchWithTimeout(request, timeoutMs = 2000) {
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

// Install Event - Precache critical shell & offline fallback immediately
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

// Activate Event - Clean up stale caches immediately and claim clients
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

// Fetch Event - Resilient navigation and chunk caching
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip chrome-extension, stream resolvers, Cloudflare challenge, and analytics
  if (
    event.request.method !== "GET" ||
    url.pathname.startsWith("/api/stream") ||
    url.pathname.startsWith("/_vercel") ||
    url.pathname.includes("challenge-platform") ||
    url.hostname.includes("analytics")
  ) {
    return;
  }

  // Navigational requests (HTML Pages)
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        // If strictly offline, serve offline shell immediately with zero delay
        if (!navigator.onLine) {
          const offlineShell = await caches.match("/offline.html");
          if (offlineShell) return offlineShell;
          const cachedRoute = await caches.match(event.request);
          if (cachedRoute) return cachedRoute;
        }

        try {
          // Fast 2s timeout so the user never gets stuck waiting
          const response = await fetchWithTimeout(event.request, 2000);
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        } catch (err) {
          // If network failed/timed out, try requested URL in cache
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // Always fallback to self-contained zero-dependency offline library
          const offlineFallback = await caches.match("/offline.html");
          if (offlineFallback) return offlineFallback;

          const rootFallback = await caches.match("/");
          if (rootFallback) return rootFallback;

          return new Response("You are currently offline. Open your saved downloads.", {
            headers: { "Content-Type": "text/plain" },
          });
        }
      })()
    );
    return;
  }

  // Static Assets: JS chunks, CSS, images, fonts
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Return cached instantly, revalidate in background if online
        if (navigator.onLine) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
        }
        return cached;
      }

      // Not in cache: fetch and cache static chunks for subsequent offline use
      return fetch(event.request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            (url.pathname.startsWith("/_next/") ||
              url.pathname.endsWith(".js") ||
              url.pathname.endsWith(".css") ||
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
          // Fail gracefully without breaking JS runtimes
          return new Response("", { status: 404 });
        });
    })
  );
});

// ── Web Push & In-App Notification Navigation ───────────────────────────────

function getValidatedNotificationUrl(rawUrl) {
  try {
    if (!rawUrl || typeof rawUrl !== "string") {
      return "/airing";
    }
    if (rawUrl.startsWith("/")) {
      return rawUrl;
    }
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin === self.location.origin) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {}
  return "/airing";
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || "/airing";
  const targetPath = getValidatedNotificationUrl(rawUrl);
  const targetFullUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus().then((focusedClient) => {
            const targetClient = focusedClient || client;
            if (targetClient && "navigate" in targetClient) {
              return targetClient.navigate(targetFullUrl);
            }
          });
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetFullUrl);
      }
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "AniWaveX Airing Alert", body: event.data.text() };
    }

    const title = payload.title || "AniWaveX Airing Alert";
    const body = payload.body || "A new episode is now broadcasting. Tap to watch.";
    const targetUrl = getValidatedNotificationUrl(payload.url || payload.data?.url);
    const tag = payload.tag || "aniwavex-airing-alert";
    const icon = payload.icon || "/logo.png";

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge: "/logo.png",
        tag,
        data: { url: targetUrl },
      })
    );
  } catch (err) {
    console.warn("[SW] Push handling warning:", err);
  }
});

