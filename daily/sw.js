// 毎日のニュースの控え。新しい号を先に取りに行き、電波が無いときだけ控えを出す（毎日中身が変わるため）。
// github.io の他の自作アプリと控え置き場を共有しているので、消すのは自分の接頭辞（dailynews-）の古い分だけ
const V = "dailynews-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("dailynews-") && k !== V).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const c = res.clone(); caches.open(V).then((cache) => cache.put(e.request, c)); }
    return res;
  }).catch(() => caches.match(e.request, {ignoreSearch: true})));
});
