const CACHE_NAME = "bhagwal-shell-v2";
const BASE_URL = new URL("./", self.registration.scope);
const INSTALL_SCRIPT = new URL("install.js", BASE_URL).href;

const APP_SHELL = [
  new URL("./", BASE_URL).href,
  new URL("index.html", BASE_URL).href,
  new URL("gallery.html", BASE_URL).href,
  new URL("manifest.json", BASE_URL).href,
  new URL("install.js", BASE_URL).href,
  new URL("Bhagwal%20sign%20board%20.png", BASE_URL).href
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith("bhagwal-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(async (response) => {
        const contentType = response.headers.get("content-type") || "";
        if (!response.ok || !contentType.includes("text/html")) return response;

        const html = await response.text();
        if (html.includes(INSTALL_SCRIPT)) return new Response(html, response);

        const scriptTag = `<script src="${INSTALL_SCRIPT}" defer></script>`;
        const updatedHtml = html.includes("</body>")
          ? html.replace("</body>", `${scriptTag}\n</body>`)
          : `${html}${scriptTag}`;
        const headers = new Headers(response.headers);
        headers.delete("content-length");
        headers.delete("content-encoding");
        return new Response(updatedHtml, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      }).catch(async () => {
        const cachedPage = await caches.match(request, { ignoreSearch: true });
        const homePage = await caches.match(new URL("index.html", BASE_URL).href);
        return cachedPage || homePage || Response.error();
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
