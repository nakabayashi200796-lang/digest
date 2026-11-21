// AIダイジェストのアプリの部品（2026-11-21）。控えの登録と、ホーム画面のアプリのときだけ「通知を受け取る」ボタンを出す。
// 宛先は The Brief と同じ鍵（同じ github.io なので The Brief が覚えた dailynews_key が読める）で暗号化し、
// 鍵から作った ntfy の受け渡し用トピックに {"app":"ai","sub":宛先} で置く。PC は送る前に取り込む（src\webpush.py）
(function(){
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("sw.js").catch(function(){});
  var VAPID = window.AIDIGEST_VAPID || "";
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!standalone || !("PushManager" in window) || !VAPID) return;
  var key = null; try { key = localStorage.getItem("dailynews_key"); } catch (e) {}

  function b64(s){ s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function hex(buf){ return Array.prototype.map.call(new Uint8Array(buf), function(x){ return ("0" + x.toString(16)).slice(-2); }).join(""); }
  function toast(t){
    var d = document.createElement("div"); d.textContent = t;
    d.style.cssText = "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#1B1340;color:#fff;font-size:13px;padding:8px 14px;border-radius:999px;z-index:30;font-family:sans-serif";
    document.body.appendChild(d); setTimeout(function(){ d.remove(); }, 2600);
  }
  function sendSub(s){
    var data = new TextEncoder().encode(JSON.stringify({app: "ai", sub: s.toJSON()})), iv = crypto.getRandomValues(new Uint8Array(12));
    return Promise.all([
      crypto.subtle.digest("SHA-256", new TextEncoder().encode("brief-sub:" + key)),
      crypto.subtle.importKey("raw", b64(key), "AES-GCM", false, ["encrypt"]).then(function(k){ return crypto.subtle.encrypt({name: "AES-GCM", iv: iv}, k, data); })
    ]).then(function(r){
      var ct = new Uint8Array(r[1]), all = new Uint8Array(12 + ct.length); all.set(iv); all.set(ct, 12);
      var s64 = ""; for (var i = 0; i < all.length; i++) s64 += String.fromCharCode(all[i]);
      return fetch("https://ntfy.sh/brief-sub-" + hex(r[0]).slice(0, 20), {method: "POST", body: btoa(s64)});
    }).then(function(res){ if (!res.ok) throw new Error("ntfy " + res.status); try { localStorage.setItem("aidigest_subsent", String(Date.now())); } catch (e) {} });
  }

  window.addEventListener("DOMContentLoaded", function(){
    var wrap = document.createElement("div");
    wrap.style.cssText = "text-align:center;padding:10px 0 calc(18px + env(safe-area-inset-bottom));background:#EEF0F4";
    var nb = document.createElement("button");
    nb.textContent = "通知をこのアプリで受け取る";
    nb.style.cssText = "background:none;border:0;color:#5D6B7A;font-size:12px;text-decoration:underline;padding:6px 0";
    wrap.appendChild(nb); document.body.appendChild(wrap);
    navigator.serviceWorker.ready.then(function(reg){
      return reg.pushManager.getSubscription().then(function(s){
        if (s && Notification.permission === "granted") {
          nb.textContent = "通知：オン";
          var last = 0; try { last = +localStorage.getItem("aidigest_subsent") || 0; } catch (e) {}
          if (key && Date.now() - last > 3 * 3600 * 1000) sendSub(s).catch(function(){});
        }
        nb.onclick = function(){
          if (!key) { toast("先に The Brief のアプリを一度開いてください"); return; }
          Notification.requestPermission().then(function(p){
            if (p !== "granted") { toast("通知が許可されていません（設定→アプリ→AIダイジェスト→通知）"); return; }
            return reg.pushManager.getSubscription()
              .then(function(s){ return s || reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64(VAPID)}); })
              .then(sendSub)
              .then(function(){ nb.textContent = "通知：オン"; toast("登録しました。次の号からこのアプリに届きます"); });
          }).catch(function(){ toast("登録できませんでした"); });
        };
      });
    }).catch(function(){});
  });
})();
