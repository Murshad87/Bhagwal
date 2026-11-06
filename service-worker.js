const CACHE_NAME = "bhagwal-shell-v1";
const BASE_URL = new URL("./", self.registration.scope);
const APP_SHELL = [
  new URL("./", BASE_URL).href,
  new URL("index.html", BASE_URL).href,
  new URL("manifest.json", BASE_URL).href,
  new URL("Bhagwal%20sign%20board%20.png", BASE_URL).href
];
const APP_SHELL = [
  new URL("./", BASE_URL).href,
  new URL("index.html", BASE_URL).href,
  new URL("gallery.html", BASE_URL).href,
  new URL("manifest.json", BASE_URL).href,
  new URL("Bhagwal%20sign%20board%20.png", BASE_URL).href
];
if (request.mode === "navigate") {
  event.respondWith(
    fetch(request).catch(async () => {
      const cachedPage = await caches.match(request, { ignoreSearch: true });
      const homePage = await caches.match(new URL("index.html", BASE_URL).href);
      return cachedPage || homePage || Response.error();
    })
  );
  return;
}
const APP_SHELL = [
  new URL("./", BASE_URL).href,
  new URL("index.html", BASE_URL).href,
  new URL("gallery.html", BASE_URL).href,
  new URL("manifest.json", BASE_URL).href,
  new URL("Bhagwal%20sign%20board%20.png", BASE_URL).href
];
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .new URL("gallery.html", BASE_URL).href,
    if (request.mode === "navigate") {
  event.respondWith(
    fetch(request).catch(async () => {
      const cachedPage = await caches.match(request, { ignoreSearch: true });
      const homePage = await caches.match(
        new URL("index.html", BASE_URL).href
      );
      return cachedPage || homePage || Response.error();
    })
  );
  return;
}
          
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Keep cross-origin resources (maps, fonts, social embeds) on their normal network path.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match(new URL("index.html", BASE_URL).href);
        return cachedPage || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
