// Service worker — офлайн-оболочка Табло Андрея и Ани.
const CACHE_VERSION = 'v4';
const CACHE_NAME = `tablo-andrey-anya-shell-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  './',
  './z.html',
  './data.json',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    // Не addAll: если хоть один файл из списка отдаст 404, addAll валит всю
    // установку и service worker не ставится вообще.
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(SHELL_ASSETS.map((a) => cache.add(a)))
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Шрифты — stale-while-revalidate
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && res.ok) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  if (url.origin === self.location.origin) {
    const isPage = req.mode === 'navigate';
    const isData = url.pathname.endsWith('/data.json');

    // Страница и data.json — network-first: свежая версия, если есть сеть,
    // иначе кэш. Так исправление расписания доходит без ручной очистки.
    if (isPage || isData) {
      event.respondWith(
        fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => caches.match(req, { ignoreSearch: true }).then((c) => c || caches.match('./')))
      );
      return;
    }

    // Остальная оболочка (иконки, manifest) — cache-first
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
