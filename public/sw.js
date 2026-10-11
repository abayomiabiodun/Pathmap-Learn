/* Cache only public shell pages; never cache auth responses or API data. */
const SHELL = 'pathmap-shell-v19';
const LESSONS = 'pathmap-lessons-v3';
const PUBLIC_PAGES = [
  '/',
  '/offline',
  '/paths',
  '/quiz',
  '/quiz?skip=true',
  '/quiz/results',
  '/taster',
  '/learn',
  '/library',
  '/dashboard',
  '/icon.svg',
  '/manifest.webmanifest',
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then(async (cache) => {
      await cache.addAll(PUBLIC_PAGES);
      const assets = new Set();
      for (const path of [
        '/',
        '/offline',
        '/paths',
        '/quiz',
        '/quiz?skip=true',
        '/quiz/results',
        '/taster',
        '/learn',
        '/library',
        '/dashboard',
      ]) {
        const response = await cache.match(path);
        const html = await response.text();
        for (const match of html.matchAll(/(?:src|href)="([^" ]+)"/g)) {
          if (match[1].startsWith('/_next/static/')) assets.add(match[1].replaceAll('&amp;', '&'));
        }
      }
      await cache.addAll([...assets]);
      const fonts = new Set();
      for (const asset of assets) {
        if (!asset.endsWith('.css')) continue;
        const response = await cache.match(asset);
        const css = await response.text();
        for (const match of css.matchAll(/url\(["']?([^\)"']+\.woff2)["']?\)/g)) {
          const font = new URL(match[1], new URL(asset, self.location.origin));
          if (font.origin === self.location.origin) fonts.add(font.href);
        }
      }
      await cache.addAll([...fonts]);
    }),
  );
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => ![SHELL, LESSONS].includes(key)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.startsWith('/recruiter') ||
    url.pathname.startsWith('/circles') ||
    url.pathname.startsWith('/showcase') ||
    event.request.headers.has('rsc')
  )
    return;
  if (event.request.mode === 'navigate' && url.pathname === '/dashboard') {
    // The dashboard document is a public shell; progress and account data load at runtime.
    // Serve the installed shell before attempting network revalidation during a reload.
    event.respondWith(
      (async () => {
        const cached = await caches.match(event.request, { ignoreVary: true });
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response.ok) await (await caches.open(SHELL)).put(event.request, response.clone());
          return response;
        } catch {
          return (await caches.match('/offline', { ignoreVary: true })) || Response.error();
        }
      })(),
    );
  } else if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (
            (PUBLIC_PAGES.includes(url.pathname) ||
              /^\/learn\/(data|web|cyber|ai|design|marketing|business|writing|project|teaching)$/.test(
                url.pathname,
              )) &&
            response.ok
          ) {
            const copy = response.clone();
            event.waitUntil(caches.open(SHELL).then((cache) => cache.put(event.request, copy)));
          }
          return response;
        })
        .catch(
          async () =>
            // These entries contain public HTML only, never RSC or account data.
            (await caches.match(event.request, { ignoreVary: true })) ||
            (await caches.match('/offline')) ||
            Response.error(),
        ),
    );
  } else if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/lessons/') ||
    url.pathname.startsWith('/learn/') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches
                  .open(url.pathname.startsWith('/lessons/') ? LESSONS : SHELL)
                  .then((cache) => cache.put(event.request, copy)),
              );
            }
            return response;
          }),
      ),
    );
  }
});
