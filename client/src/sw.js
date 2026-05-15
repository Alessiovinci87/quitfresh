import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// SKIP_WAITING handler: il client invia questo message quando l'utente
// clicca "Aggiorna" sul banner di nuova versione. Il SW chiama
// skipWaiting() per attivarsi immediatamente, e clients.claim() prende
// controllo di tutte le pagine aperte. controllerchange nel client
// triggera il reload.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Precache: app shell (JS, CSS, fonts, icons con hash univoco).
// NOTA: index.html viene anche precachato ma e' sovrascritto sotto da
// NavigationRoute con NetworkFirst per garantire sempre l'ultima versione.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation requests (HTML) → NetworkFirst con timeout 3s, fallback cache.
// Cosi' ogni refresh prova prima il network: se il deploy ha nuovi bundle,
// il client li scarica immediatamente. Solo se offline cade su cache.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'qf-html',
      networkTimeoutSeconds: 3,
    }).handle
  )
);

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
