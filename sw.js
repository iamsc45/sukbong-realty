/* 석봉 부동산 정보방 — 서비스워커 (2026-08-11)
   홈 화면에 설치했을 때 두 번째 실행부터 빨리 뜨게 하고, 신호가 약해도 화면은 열리게 한다.

   🔴가장 중요한 규칙: 실거래 데이터는 절대 캐시하지 않는다.
     우리 사이트의 값은 "오늘 신고분"에 있다. 어제 받아 둔 시세를 아무 표시 없이 다시
     보여주면 그 순간 신뢰가 무너진다(기준일 표기 원칙과 같은 이유). 그래서 /data/ 는
     통째로 네트워크만 쓴다. 용량도 크다(단지 상세만 수십 MB) — 캐시에 담을 물건이 아니다.

   나머지 규칙
     · /assets/, /icons/, /글이미지/ → 캐시 우선. 이 파일들은 주소에 ?v= 를 붙여 관리하므로
       내용이 바뀌면 주소가 바뀐다. 그래서 캐시를 오래 들고 있어도 옛것이 남지 않는다.
     · 화면(HTML) → 네트워크 우선, 실패하면 캐시. 평소엔 항상 최신을 보고,
       지하철·엘리베이터처럼 신호가 끊기면 마지막으로 본 화면이라도 열린다.
     · 지도 타일 등 바깥 도메인 → 손대지 않고 그대로 통과시킨다.

   되돌리려면
     각 페이지의 navigator.serviceWorker.register 줄을 지우고, 이 파일 자리에
     빈 워커(self.registration.unregister())를 올리면 이미 설치된 것도 스스로 빠진다.
*/
var VER = 'sb-2026-08-11a';
var SHELL = VER + '-shell';     // 화면(HTML)
var STATIC = VER + '-static';   // assets·아이콘·이미지

var NO_CACHE = /^\/data\//;                       // 실거래·단지 데이터: 언제나 새로
var STATIC_PATH = /^\/(assets|icons)\//;
var IMG_PATH = /^\/(글이미지|카드뉴스)\//;

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(STATIC).then(function (c) {
      /* 아이콘만 미리 담는다. css·js는 주소에 붙은 ?v= 가 페이지마다 달라서
         여기서 미리 담아 봐야 어긋나기만 한다. 처음 방문 때 자연스럽게 담긴다. */
      return c.addAll(['/icons/icon-192.png', '/icons/icon-512.png']);
    }).catch(function () { /* 아이콘 하나 못 담았다고 설치를 막지 않는다 */ })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        if (k.indexOf(VER) !== 0) return caches.delete(k);   // 옛 판은 지운다
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function cacheFirst(req, name) {
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(name).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  });
}

function networkFirst(req, name) {
  return fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(name).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      return hit || caches.match('/index.html');
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (x) { return; }
  if (url.origin !== self.location.origin) return;      // 지도 타일·외부 스크립트는 통과
  if (NO_CACHE.test(url.pathname)) return;              // 실거래 데이터는 손대지 않는다

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') > -1) {
    e.respondWith(networkFirst(req, SHELL));
    return;
  }
  if (STATIC_PATH.test(url.pathname) || IMG_PATH.test(url.pathname)) {
    e.respondWith(cacheFirst(req, STATIC));
  }
});
