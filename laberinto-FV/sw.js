const CACHE_NAME = 'mazmorra-asteria-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './src/main.js',
  './src/Game.js',
  './src/config.js',
  './src/core/loop.js',
  './src/core/input.js',
  './src/core/audio.js',
  './src/core/rng.js',
  './src/world/Maze.js',
  './src/world/tiles.js',
  './src/systems/camera.js',
  './src/systems/physics.js',
  './src/systems/terrain.js',
  './src/systems/combat.js',
  './src/systems/effects.js',
  './src/systems/loot.js',
  './src/entities/Monster.js',
  './src/entities/monsterTypes.js',
  './src/entities/Weapon.js',
  './src/ui/render.js',
  './src/ui/screens.js'
];

// Instalar el Service Worker y almacenar archivos en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Almacenando recursos en caché');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar el Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Eliminando caché antigua:', key);
          return caches.delete(key);
        }
      }));
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y servir desde la caché si está disponible
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        // Opcional: Cachear peticiones dinámicas nuevas si es necesario
        return networkResponse;
      });
    }).catch(() => {
      // Fallback offline (por ejemplo, si no hay red y el recurso no está en caché)
    })
  );
});
