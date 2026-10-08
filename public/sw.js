// Offline support for Fiala.
// - Page loads: network first, falling back to the cached app shell.
// - news.json: left to the network; the app keeps its own offline copy.
// - Other same-origin files (hashed JS/CSS, icons): serve from cache, refresh in the background.
// Bump CACHE when this file's caching strategy changes.

const CACHE = "fiala-v8";
// Paths are relative to this file, so the app works under a subpath (GitHub Pages).
const SHELL = ["./", "manifest.webmanifest", "fiala.svg", "icons/icon-192.png", "icons/apple-touch-icon.png", "privacy.html", "support.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (new URL(request.url).pathname.endsWith("/news.json")) return;

  if (request.mode === "navigate") {
    // The app shell lives at the scope root; other pages (privacy, support) are cached under their own URL
    // so visiting them never replaces the app shell.
    const isShell = new URL(request.url).pathname === new URL("./", self.registration.scope).pathname || request.url.endsWith("/index.html");
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(isShell ? "./" : request, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true })) ?? caches.match("./")),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
