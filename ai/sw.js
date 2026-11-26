// AIダイジェストのアプリの控えと通知（2026-11-21）。The Brief の sw.js と同じ形。
// github.io の他の自作アプリと控え置き場を共有しているので、消すのは自分の接頭辞（aidigest-）の古い分だけ
const V = "aidigest-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("aidigest-") && k !== V).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // ページ（.html）は毎回最新を取り、電波が無いときだけ控えを出す
  const fresh = e.request.mode === "navigate" || /\.(html|json)$/.test(u.pathname) || u.pathname.endsWith("/");
  const req = fresh ? fetch(u.href, {cache: "no-store", credentials: "same-origin"}) : fetch(e.request);
  e.respondWith(req.then((res) => {
    if (res.ok) { const c = res.clone(); caches.open(V).then((cache) => cache.put(e.request, c)); }
    return res;
  }).catch(() => caches.match(e.request, {ignoreSearch: true})));
});
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = {body: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(d.title || "AIダイジェスト", {
    body: d.body || "", icon: "icon-192.png", badge: "badge-96.png", tag: "aidigest", renotify: true,
    data: {url: new URL(d.url || "./latest.html", self.registration.scope).href},
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || new URL("./latest.html", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then((cs) => {
    for (const c of cs) {
      if (c.url.startsWith(self.registration.scope) && "focus" in c) {
        return c.focus().then((w) => (w || c).navigate ? (w || c).navigate(url + "?v=" + Date.now()) : null).catch(() => null);
      }
    }
    return self.clients.openWindow(url);
  }));
});
