/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NetworkFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Admin API is never cached
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/admin'),
  new NetworkOnly(),
);

// Leaderboards & player data: serve from cache, refresh in background
registerRoute(
  ({ url }) =>
    url.pathname === '/api/rankings' ||
    url.pathname === '/api/players' ||
    /^\/api\/players\/[^/]+$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: 'api-data-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// Matches & histories: network first with a short timeout
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/api/matches') ||
    /^\/api\/players\/[^/]+\/matches$/.test(url.pathname) ||
    /^\/api\/players\/[^/]+\/rating-history$/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'api-matches-cache',
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
);

// SPA navigation fallback
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Take control as soon as the SW activates (prompt flow sends SKIP_WAITING)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Quachess';
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'quaveo-chess',
    data: { url: payload.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target: string = event.notification.data?.url ?? '/';

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        const url = new URL(client.url);
        if (url.pathname === target) {
          return client.focus();
        }
      }
      for (const client of clientList) {
        await client.focus();
        return client.navigate(target);
      }
      return self.clients.openWindow(target);
    })(),
  );
});

clientsClaim();
