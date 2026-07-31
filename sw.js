const CACHE_NAME = 'sukoon-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Noto+Sans+Malayalam:wght@400;500;600;700&display=swap'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.map(url => {
        return new Request(url, { mode: 'no-cors' });
      }));
    }).catch(err => {
      console.log('Cache install error:', err);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip Google Sheets API calls
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => null);

      return cachedResponse || networkFetch;
    })
  );
});

// Background sync for offline form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-registrations') {
    event.waitUntil(syncPendingRegistrations());
  }
});

async function syncPendingRegistrations() {
  const db = await openDB();
  const pending = await getPendingSubmissions(db);
  
  for (const submission of pending) {
    try {
      const response = await fetch(submission.url, {
        method: 'POST',
        body: JSON.stringify(submission.data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        await deleteSubmission(db, submission.id);
      }
    } catch (err) {
      console.log('Sync failed for submission:', submission.id);
    }
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SukoonDB', 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function getPendingSubmissions(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readonly');
    const store = tx.objectStore('pending');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteSubmission(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending', 'readwrite');
    const store = tx.objectStore('pending');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Push notification support
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update from Sukoon',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png',
    vibrate: [100, 50, 100]
  };
  event.waitUntil(
    self.registration.showNotification('Sukoon - Wisdom Youth', options)
  );
});
