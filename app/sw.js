// Moo — service worker: network-first offline + Web Push for vaccination reminders.
const CACHE = 'moo-v29';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './glass.css',
  './app.js',
  './store.js',
  './mock.js',
  './logic.js',
  './camera.js',
  './recognition.js',
  './i18n.js',
  './vet.js',
  './rewards.js',
  './auth-logic.js',
  './supabase.js',
  './supabase-config.js',
  './loader.js',
  './village-map.html',
  './three.min.js',
  './manifest.webmanifest',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isTopLevelNavigate(request) {
  // Only fall back to index.html for top-level document navigations.
  // Iframe / embed requests for village-map.html must NEVER get index.html
  // (that caused the offline "mirror tunnel").
  if (request.mode === 'navigate' && request.destination !== 'iframe') return true;
  return false;
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() =>
        caches.match(e.request).then((cached) => {
          if (cached) return cached;
          if (isTopLevelNavigate(e.request)) return caches.match('./index.html');
          return new Response('', { status: 503, statusText: 'Offline' });
        })
      )
  );
});

// Vaccination reminders (payload from app or future push server).
self.addEventListener('push', (e) => {
  let data = { title: 'Moo', body: 'Напоминание о прививке' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {
    try { data.body = e.data.text(); } catch {}
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Moo', {
      body: data.body || '',
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      data: data.url || './',
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data) || './';
  e.waitUntil(clients.openWindow(typeof url === 'string' ? url : './'));
});
