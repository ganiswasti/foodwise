
const CACHE_NAME = "foodwise-v1";

const FILES_TO_CACHE = [
    "./",
    "./welcome.html",
    "./index.html",
    "./login.html",
    "./register.html",
    "./scanner.html",
    "./manifest.json",
    "./css/style.css",
    "./css/welcome.css",
    "./css/login.css",
    "./css/scanner.css",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

// Install service worker and cache app files
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

// Activate service worker
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );

    self.clients.claim();
});

// Fetch cached files when offline
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    // Do not cache Firebase or external API requests
    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request);
        })
    );
});
