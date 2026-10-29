// Offline shell: network first, cache as fallback, so a new version is picked up as soon as there's signal.
const CACHE = "photocal-v2";
const SHELL = ["./", "index.html", "core.js", "app.js", "icon.svg", "icon-180.png", "manifest.webmanifest"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
