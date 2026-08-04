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

  // Notifica la pagina aperta di ricaricare gli appuntamenti
  const notifyClients = self.clients.matchAll({ type: 'window' }).then((windowClients) => {
    windowClients.forEach((client) => {
      client.postMessage({ type: 'NEW_BOOKING', url: data.url });
    });
  });

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, options),
      notifyClients,
    ])
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Se c'è già una finestra aperta, la porta in primo piano e naviga
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      // Nessuna finestra aperta: ne apre una nuova
      return self.clients.openWindow(url);
    })
  );
});
