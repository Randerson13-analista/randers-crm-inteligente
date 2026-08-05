// Service Worker de desativação. Remove versões antigas que mantinham o CRM preso
// em arquivos de cache incompatíveis após novos deploys.
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(key => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(client => client.postMessage({ type: 'RANDERS_SW_REMOVED' }));
  })());
});
