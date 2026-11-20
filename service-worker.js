
const CACHE_NAME = "foodwise-v2";

const FILES_TO_CACHE = [
    "./",
    "./welcome.html",
    "./index.html",
    "./login.html",
    "./register.html",
    "./manifest.json",
    "./css/style.css",
    "./css/welcome.css",
    "./css/login.css",
    "./css/scanner.css",
    "./js/app.js",
    "./js/firebase-config.js",
    "./js/firebase.js",
    "./js/auth.js",
    "./js/scanner.js",
    "./js/notifications.js",
    "./js/pwa.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

// Install updated service worker
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );

    self.skipWaiting();
});

// Activate updated service worker
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

// Always try the latest local files first
self.addEventListener("fetch", (event) => {

    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);

    if (url.origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {

                if (response && response.ok) {
                    const responseClone = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }

                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );

});
