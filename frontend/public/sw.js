// Phase 1: push display only. Offline fallback and caching rules come in Phase 6; never cache private API answers
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  if (!e.data) return;
  let payload;
  try {
    payload = e.data.json();
  } catch {
    payload = { title: 'Temerelle', body: e.data.text() };
  }
  const { title, body, icon = '/icon.svg', url = '/' } = payload;
  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});