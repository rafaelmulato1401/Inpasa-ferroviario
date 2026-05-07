// ══════════════════════════════════════════════════════════════
// INPASA – SERVICE WORKER (PWA)
// Estratégia: Network First para Firebase, Cache First para assets
// ══════════════════════════════════════════════════════════════

const CACHE_NAME      = 'inpasa-v8';
const OFFLINE_URL     = '/offline.html';

// Assets que vão para cache na instalação
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/581.jpg',
];

// Domínios que NUNCA devem ser cacheados (Firebase, APIs externas)
const NETWORK_ONLY_PATTERNS = [
  'firestore.googleapis.com',
  'firebase.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseapp.com',
  'googleapis.com',
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignora requests não-HTTP (ex: chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  // Firebase e APIs externas: sempre Network Only (nunca cacheia dados do banco)
  const isNetworkOnly = NETWORK_ONLY_PATTERNS.some(p => url.hostname.includes(p));
  if (isNetworkOnly) {
    event.respondWith(fetch(event.request));
    return;
  }

  // POST, PUT, DELETE: sempre vai para a rede
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Para navegação (HTML pages): Network First — tenta rede, cai no cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Atualiza o cache com a versão mais recente
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(cached => cached || fetch(event.request))
        )
    );
    return;
  }

  // Para assets estáticos (JS, CSS, imagens, fonts): Cache First
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cacheia apenas respostas válidas
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// ── PUSH NOTIFICATIONS (preparado para futuro) ────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Inpasa', {
      body:  data.body  || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-32.png',
      data:  data.url   || '/',
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});
