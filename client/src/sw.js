import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache: app shell (HTML, JS, CSS, fonts, icons). Lista iniettata da vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// API → network-first con fallback cache (max 6s timeout, 1h TTL)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'qf-api',
    networkTimeoutSeconds: 6,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 }),
    ],
  })
);

// Google Fonts CSS → stale-while-revalidate
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({ cacheName: 'qf-google-fonts-css' })
);

// Google Fonts file (woff2) → cache-first lungo termine
registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'qf-google-fonts-files',
    plugins: [
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

// Aggiornamento immediato del SW quando arriva una nuova versione
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// === PUSH NOTIFICATIONS — preservata dal SW precedente ===
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'QuitFresh', {
      body: data.body || 'Controlla come stai.',
      icon: '/quitfresh/icon.svg',
      badge: '/quitfresh/icon.svg',
      vibrate: [200, 100, 200],
      data: { url: '/quitfresh/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/quitfresh/') && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow('/quitfresh/');
    })
  );
});
