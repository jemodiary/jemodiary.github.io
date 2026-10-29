// Offline shell: network first, cache as fallback, so a new version is picked up as soon as there's signal.
const CACHE = "jemo-v4";
const SHELL = ["./", "index.html", "core.js", "app.js", "logo.png", "icon-180.png", "manifest.webmanifest"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    // no-cache: revalidate with the server, otherwise the browser's 10-minute cache serves the old version
    fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" })
      .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
