const release = self.adigunOfflineRelease;
const scope = new URL(self.registration.scope);
const cachePrefix = `adigunlightdesign:${scope.pathname}:`;
const cacheName = `${cachePrefix}${release.id}`;
const home = new URL("./", scope);
const index = new URL("index.html", scope);
const assets = new Set(release.files
  .filter(file => file !== "index.html")
  .map(file => new URL(file, scope).href));

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([
    new Request(home.href, { cache: "reload" }),
    ...[...assets].map(url => new Request(url, { cache: "reload" })),
  ])));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(cachePrefix) && name !== cacheName)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;

  const entryNavigation = request.mode === "navigate" &&
    (url.pathname === scope.pathname || url.pathname === index.pathname);
  if (!entryNavigation && !assets.has(url.href)) return;

  // Serve HTML and its matching asset set from the same installed release.
  const cachedUrl = entryNavigation ? home.href : url.href;
  event.respondWith(caches.open(cacheName).then(async cache =>
    await cache.match(cachedUrl) ?? fetch(request),
  ));
});
