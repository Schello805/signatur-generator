// Signaturgenerator Service Worker
// Version must be bumped on releases to ensure updates propagate.
const APP_VERSION = "1.1.13";
const CACHE_PREFIX = "sg-cache-";
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./templates.js",
  "./version.js",
  "./pwa.js",
  "./matomo.js",
  "./manifest.webmanifest",
  "./Logo-Signatur-Generator.png",
  "./icon-192.png",
  "./icon-512.png",
  "./impressum.html",
  "./datenschutz.html",
  "./cookies.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isSameOrigin(requestUrl) {
  try {
    const u = new URL(requestUrl);
    return u.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (!isSameOrigin(req.url)) return;

  const isNavigation = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  const url = new URL(req.url);
  const pathname = url.pathname || "";
  const isCodeAsset =
    pathname.endsWith(".js") || pathname.endsWith(".css") || pathname.endsWith(".webmanifest");

  if (isNavigation || isCodeAsset) {
    // Network-first for HTML and code assets so updates propagate even if an older SW is still controlling.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      });
    })
  );
});
