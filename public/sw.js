/* 日常打卡 Service Worker
 * - 应用外壳（index.html / manifest / 图标）安装时预缓存
 * - 导航请求：网络优先，离线时回退到缓存的外壳
 * - 静态资源：缓存优先 + 后台更新（Vite 产物带 hash，可长期缓存）
 * 注意：发布新版本时只需要改 CACHE_VERSION，激活阶段会清掉旧缓存。
 */
const CACHE_VERSION = 'v3';
const CACHE_NAME = `daily-checkin-${CACHE_VERSION}`;

// registration.scope 形如 https://host/daily-checkin-originos/
const BASE = self.registration.scope;

const PRECACHE_URLS = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon-192.png`,
  `${BASE}icons/icon-512.png`,
  `${BASE}icons/icon-maskable-512.png`,
  `${BASE}icons/apple-touch-icon.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 逐条 add，单个资源失败不阻断整个安装
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
        )
      );
      await self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理同源 GET
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 导航请求：网络优先，失败则回退缓存外壳（离线可用）
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(`${BASE}index.html`, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(request)) ||
            (await cache.match(`${BASE}index.html`)) ||
            (await cache.match(BASE)) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // 其它同源资源：缓存优先 + 后台静默更新
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);

      if (cached) return cached;
      const response = await network;
      return response || Response.error();
    })()
  );
});
