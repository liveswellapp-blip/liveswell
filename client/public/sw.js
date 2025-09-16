// Service Worker for Push Notifications
const CACHE_NAME = 'liveswell-v1';
const NOTIFICATION_ICON = '/icon-192x192.png';

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  if (!event.data) {
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: 'LiveSwell', body: event.data.text() || 'New surf conditions available' };
  }

  const options = {
    body: data.body || 'New surf conditions are available!',
    icon: data.icon || NOTIFICATION_ICON,
    badge: '/badge-72x72.png',
    tag: 'surf-conditions',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View Conditions',
        icon: '/action-view.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/action-close.png'
      }
    ],
    data: {
      url: data.url || '/',
      locationId: data.locationId,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LiveSwell Surf Report', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If no window/tab is already open, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  // Track notification dismissal if needed
});