/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  let data = { title: 'Bruno Melito Hair', body: 'Hai un promemoria!' };
  try {
    data = event.data.json();
  } catch (e) {
    data.body = event.data ? event.data.text() : 'Promemoria appuntamento';
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'dismiss', title: 'Chiudi' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
