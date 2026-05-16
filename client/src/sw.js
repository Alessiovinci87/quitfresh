// === Service Worker — Recovery mode ===
//
// Storia: il SW workbox precedente (precache + NavigationRoute) ha causato
// schermate bianche su PWA installata quando la cache si è disallineata dal
// bundle pubblicato (deploy con nuovo hash, vecchio HTML in cache punta a
// chunk che non esistono più → render fallisce, niente recovery).
//
// Questo SW è intenzionalmente minimale:
//  1. Si installa con skipWaiting → sostituisce immediatamente il vecchio.
//  2. All'activate cancella TUTTE le cache (precache workbox, qf-html,
//     qf-api, qf-google-fonts-*) → ripristina stato pulito.
//  3. NON registra fetch handler → ogni richiesta va al network, sempre
//     versione fresca, niente cache stale possibile.
//  4. Mantiene i push handler (notifiche citisina + reminder).
//
// Una volta che tutti gli utenti hanno questa versione, l'app si comporta
// come un sito normale (no offline support) ma è auto-healing: nessun
// utente può più finire con la "schermata bianca PWA".

// vite-plugin-pwa (injectManifest) richiede letteralmente il token
// `self.__WB_MANIFEST` nel sorgente, altrimenti il build fallisce.
// In recovery mode non precachiamo nulla: assegnamo a una proprietà del
// global self (side-effect → non tree-shakable) e lo ignoriamo.
self.__qf_manifest = self.__WB_MANIFEST;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (err) {
      console.error('[sw] cache cleanup error:', err);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// === PUSH NOTIFICATIONS ===
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'QuitFresh', {
      body: data.body || 'Controlla come stai.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
