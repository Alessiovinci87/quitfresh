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
    clients.matchAll({ type: 'window' }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/quitfresh/') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('/quitfresh/');
    })
  );
});
