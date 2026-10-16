// Service worker — офлайн-оболочка Табло Андрея и Ани.
// v5: новая вёрстка табло (выравнивание пар по номеру слота, блок встречи, ключи *-andrey-anya).
const CACHE_VERSION = 'v5';
const CACHE_NAME = `tablo-andrey-anya-shell-${CACHE_VERSION}`;

// Без них оболочка не работает — если не загрузились, установка прерывается.
const SHELL_ASSETS = [
  './',
  './index.html',
  './data.json',
];

// Необязательные файлы: их отсутствие (404) не должно ломать установку воркера.
const OPTIONAL_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(SHELL_ASSETS.map((url) => new Request(url, { cache: 'reload' })));
      await Promise.allSettled(
        OPTIONAL_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      );
    })
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

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((c) => c.postMessage(message));
}

function dataJsonStrategy(event, req) {
  const url = new URL(req.url);
  const cacheKey = new Request(url.origin + url.pathname);
  const forced = url.searchParams.has('t');

  const work = caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(cacheKey);
    const cachedCopy = cached ? cached.clone() : null;

    const refresh = fetch(url.origin + url.pathname + (forced ? url.search : ''), { cache: 'reload' })
      .then(async (res) => {
        if (!res || !res.ok) return null;
        const fresh = res.clone();
        let changed = !cachedCopy;
        if (cachedCopy) {
          try {
            const [oldText, newText] = await Promise.all([
              cachedCopy.text(),
              res.clone().text()
            ]);
            changed = oldText !== newText;
          } catch (e) {
            changed = false;
          }
        }
        await cache.put(cacheKey, fresh);
        if (changed && cachedCopy) await notifyClients({ type: 'DATA_UPDATED' });
        return res;
      })
      .catch(() => null);

    event.waitUntil(refresh);

    if (forced) {
      const res = await refresh;
      return res || cached || Response.error();
    }
    if (cached) return cached;
    const res = await refresh;
    return res || Response.error();
  });
  event.respondWith(work);
}

function navigationStrategy(event, req) {
  const url = new URL(req.url);
  const work = caches.open(CACHE_NAME).then(async (cache) => {
    const cached =
      (await cache.match(req, { ignoreSearch: true })) ||
      (await cache.match('./index.html')) ||
      (await cache.match('./'));

    const refresh = fetch(url.origin + url.pathname, { cache: 'reload' })
      .then(async (res) => {
        if (!res || !res.ok) return null;
        await Promise.all([
          cache.put('./index.html', res.clone()),
          cache.put('./', res.clone()),
        ]);
        return res;
      })
      .catch(() => null);

    event.waitUntil(refresh);

    if (cached) return cached;
    const res = await refresh;
    return res || Response.error();
  });
  event.respondWith(work);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

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

  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/data.json')) {
    dataJsonStrategy(event, req);
    return;
  }

  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    navigationStrategy(event, req);
    return;
  }

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
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        const scope = self.registration.scope;
        const client = list.find((c) => c.url && c.url.startsWith(scope)) || list[0];
        if (client && typeof client.focus === 'function') return client.focus();
        return self.clients.openWindow('./');
      })
  );
});
