// Rotam PWA Service Worker - v64 (Carto Dark Cockpit & Resilient Tiles)
const CACHE_NAME = 'rotam-cache-v65';
const TILE_CACHE_NAME = 'rotam-tiles-v1';
const CDN_CACHE_NAME = 'rotam-cdn-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.js',
  './firebase-service.js',
  './styles.css',
  './places_data.js',
  './translations.js',
  './rotam_logo.png',
  './manifest.json'
];

// 1x1 Transparent PNG Fallback for missing offline tiles
const TRANSPARENT_TILE_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
  0, 0, 0, 11, 73, 68, 65, 84, 120, 156, 99, 96, 0, 0, 0, 2,
  0, 1, 244, 113, 100, 166, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => {
          // Do NOT delete tile or cdn cache when code cache updates
          return key !== CACHE_NAME && key !== TILE_CACHE_NAME && key !== CDN_CACHE_NAME;
        }).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1. HARİTA KARO ÖNBELLEĞİ (Yandex, OSM, OpenTopoMap & Carto - Offline Map Engine)
  if (
    url.hostname.includes('maps.yandex.net') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('opentopomap.org') ||
    url.hostname.includes('basemaps.cartocdn.com')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE_NAME).then(async (tileCache) => {
        const cached = await tileCache.match(event.request);
        if (cached) return cached;

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            tileCache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Offline and tile not cached: Return clean transparent tile fallback
          return new Response(TRANSPARENT_TILE_PNG, {
            status: 200,
            headers: { 'Content-Type': 'image/png' }
          });
        }
      })
    );
    return;
  }

  // 2. STATIC CDN ASSETS (Leaflet, Tailwind, Lucide, Yandex Maps API - Cache First)
  if (url.hostname.includes('unpkg.com') || url.hostname.includes('cdn.tailwindcss.com') || url.hostname.includes('api-maps.yandex.ru')) {
    event.respondWith(
      caches.open(CDN_CACHE_NAME).then(async (cdnCache) => {
        const cached = await cdnCache.match(event.request);
        if (cached) return cached;

        try {
          const response = await fetch(event.request);
          if (response && (response.status === 200 || response.type === 'opaque')) {
            cdnCache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          return cached || new Response('Offline CDN asset unavailable', { status: 503 });
        }
      })
    );
    return;
  }

  // 3. EXTERNAL ROUTING & WEATHER APIS (Network only, do not cache ephemeral dynamic queries)
  if (url.origin !== location.origin) {
    return;
  }

  // 4. LOCAL APP ASSETS (Network First, Cache Fallback)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
