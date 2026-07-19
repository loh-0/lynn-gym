// Caches ONLY this app's own shell files, for fast repeat loads and an
// offline-launchable app shell. It never intercepts Supabase API calls or
// third-party CDN scripts (Chart.js, supabase-js) — those always hit the
// network live, so data is never stale and writes are never cached.
const CACHE_NAME = 'ice-iron-shell-v1';
const SHELL_FILES = ['index.html', 'styles.css', 'app.js', 'manifest.json', 'icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch CDN/Supabase requests

  const fileName = url.pathname.split('/').pop() || 'index.html';
  if (!SHELL_FILES.includes(fileName)) return; // never touch anything outside the shell

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
