const CACHE_NAME = 'tsugiitsu-shell-1.50.0h';
const SHELL_FILES = [
  './',
  './index.html',
  './styles.css?v=1.50.0h',
  './app.js?v=1.50.0h',
  './help.html',
  './manifest.webmanifest',
  './icon.svg',
  './data/schedule.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tsugiitsu-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isSchedule = url.pathname.endsWith('/data/schedule.json');
  if (isSchedule) {
    event.respondWith(fetch(request).then(response => {
      if (!response.ok) return response;
      return caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).then(() => response);
    }).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (!response.ok || response.type !== 'basic') return response;
    return caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone())).then(() => response);
  }).catch(() => request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});

