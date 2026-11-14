// The Brief の控え。毎回まず最新を取りに行き（ブラウザや公開先の10分の控えも使わない）、電波が無いときだけ控えを出す。
// github.io の他の自作アプリと控え置き場を共有しているので、消すのは自分の接頭辞（dailynews-）の古い分だけ
const V = "dailynews-v3";   // 2026-11-14 v2: 控えを使わずに取りに行く形にした / 11-15 v3: 音声を控えに入れない
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("dailynews-") && k !== V).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  if (/\.bin$/.test(u.pathname)) return;   // 読み上げ音声（毎日約7MB）は控えに入れない（2026-11-15）
  // ページ（.html）と version.json は毎回最新を取る。画像などはふつうに取る
  const fresh = e.request.mode === "navigate" || /\.(html|json)$/.test(u.pathname) || u.pathname.endsWith("/");
  const req = fresh ? fetch(u.href, {cache: "no-store", credentials: "same-origin"}) : fetch(e.request);
  e.respondWith(req.then((res) => {
    if (res.ok) { const c = res.clone(); caches.open(V).then((cache) => cache.put(e.request, c)); }
    return res;
  }).catch(() => caches.match(e.request, {ignoreSearch: true})));
});
