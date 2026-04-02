var CACHE_NAME = "cc-v2";
var STATIC_ASSETS = [
    "/closed-circle/",
    "/closed-circle/index.html",
    "/closed-circle/news.html",
    "/closed-circle/about.html",
    "/closed-circle/data/descs.json",
    "/closed-circle/static/style.css",
    "/closed-circle/static/books.js",
    "/closed-circle/static/filter.js",
    "/closed-circle/static/favicon.svg"
];

self.addEventListener("install", function (e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function (cache) {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", function (e) {
    e.waitUntil(
        caches.keys().then(function (names) {
            return Promise.all(
                names.filter(function (n) { return n !== CACHE_NAME; })
                     .map(function (n) { return caches.delete(n); })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", function (e) {
    var url = new URL(e.request.url);

    // Aladin CDN images: cache on demand
    if (url.hostname === "image.aladin.co.kr") {
        e.respondWith(
            caches.open(CACHE_NAME).then(function (cache) {
                return cache.match(e.request).then(function (resp) {
                    if (resp) return resp;
                    return fetch(e.request).then(function (netResp) {
                        if (netResp.ok) {
                            cache.put(e.request, netResp.clone());
                        }
                        return netResp;
                    });
                });
            })
        );
        return;
    }

    // Static assets: cache-first
    if (url.pathname.indexOf("/static/") !== -1) {
        e.respondWith(
            caches.match(e.request).then(function (resp) {
                return resp || fetch(e.request);
            })
        );
        return;
    }

    // HTML pages: stale-while-revalidate
    if (e.request.mode === "navigate") {
        e.respondWith(
            caches.open(CACHE_NAME).then(function (cache) {
                return cache.match(e.request).then(function (cached) {
                    var fetchPromise = fetch(e.request).then(function (netResp) {
                        if (netResp.ok) {
                            cache.put(e.request, netResp.clone());
                        }
                        return netResp;
                    }).catch(function () {
                        return cached;
                    });
                    return cached || fetchPromise;
                });
            })
        );
        return;
    }

    // Everything else: network first
    e.respondWith(
        fetch(e.request).catch(function () {
            return caches.match(e.request);
        })
    );
});
