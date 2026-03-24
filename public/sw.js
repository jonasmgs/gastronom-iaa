const CACHE_NAME = 'gastronom-ia-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-recipes') {
    event.waitUntil(syncRecipes());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-recipes') {
    event.waitUntil(syncRecipes());
  }
});

async function syncRecipes() {
  console.log('[SW] Background sync: syncing recipes...');
  
  const clients = await self.clients.matchAll({ type: 'window' });
  
  for (const client of clients) {
    client.postMessage({
      type: 'BACKGROUND_SYNC_COMPLETE',
      timestamp: Date.now(),
    });
  }
  
  console.log('[SW] Background sync completed');
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Você tem uma nova atualização!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {
      url: data.url || '/',
      ...data,
    },
    actions: [
      { action: 'open_recipes', title: 'Ver Receitas' },
      { action: 'generate_recipe', title: 'Gerar Nova' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Gastronom.IA', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  let url = event.notification.data?.url || '/';

  if (action === 'open_recipes') {
    url = '/recipes';
  } else if (action === 'generate_recipe') {
    url = '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
