/* 데스크톱 상단 메뉴 정리 (2026-08-11 석봉님 지시)
   ────────────────────────────────────────────────────────────────
   무엇이 문제였나
     상단 캡슐이 남은 폭(1440에서 1,076px)을 전부 차지하고, 담긴 항목이 그보다 넓어
     여러 줄로 접혔다. 실측 실거래 6줄·재개발 8줄. 줄마다 끝나는 지점이 달라
     그 뒤가 빈 자리로 남았다(석봉님이 지적한 "오른쪽 여백"). 폭만 줄여서는 안 되고
     담긴 것을 줄여야 한다.

   무엇을 바꾸나 — 넷
     ① 상품 8칸·거래 4칸을 값이 보이는 버튼 하나씩으로 접는다.
        ⚠️새로 만들지 않는다. 모바일용으로 이미 있던 `#mcats`(상품 아파트 ▾ / 거래 매매 ▾)를
        데스크톱에서도 쓴다. 클릭·선택 로직이 그대로라 새 버그가 끼어들 자리가 없다.
        선택 창은 모바일에선 하단 시트인데, 데스크톱에선 누른 버튼 아래 뜨는 작은 창으로 바꾼다.
     ② 지도 도구(위성·지적도·단지명·노후)를 오른쪽 세로로 옮긴다.
        모바일이 이미 그 자리라 두 화면의 조작이 같아진다. 요소를 옮기기만 하므로 동작은 그대로.
     ③ '지점 N · N건'을 뺀다. 왼쪽 목록 맨 위에 같은 내용이 이미 있다.
     ④ 캡슐 폭을 내용에 맞춘다(width:max-content). 이제 내용이 한 줄에 들어와 여백이 사라진다.

   건드리지 않는 것
     · 재개발 유형 칩 4개 + 실거래 겹쳐보기 — 석봉님 지시로 지금 그대로 둔다(둘째 줄).
     · 모바일(720px 이하) — map_m.js가 따로 담당한다. 이 파일은 손대지 않는다.
     · 검색·필터·시도·시군구 — 자리만 정리하고 기능은 그대로.

   되돌리기
     map.html에서 이 파일 <script> 한 줄을 지우면 원래대로 돌아온다. */
(function () {
  var MQ = '(min-width:721px)';
  if (!window.matchMedia || !window.matchMedia(MQ).matches) return;

  function ready(fn) {
    if (document.getElementById('bar') && document.getElementById('mcats')) return fn();
    setTimeout(function () { ready(fn); }, 60);
  }

  ready(function () {
    var bar = document.getElementById('bar');
    if (!bar || bar.dataset.tidy) return;
    bar.dataset.tidy = '1';

    var css = document.createElement('style');
    css.textContent = [
      /* ── 캡슐: 내용 폭에 맞춘다 ── */
      '@media(min-width:721px){',
      'body.v2 #bar{width:max-content!important;max-width:calc(100vw - 24px)!important;',
      '  align-items:center;gap:7px!important;padding:8px 10px!important}',
      'body.v2.skin-a #bar{max-width:calc(100vw - var(--v2-list,352px) - 24px)!important}',

      /* 펼쳐져 있던 상품·거래 칩 줄과 지점 표시는 감춘다(왼쪽 목록에 같은 내용이 있다) */
      'body.v2 #bar .bargrp,body.v2 #bar #stat{display:none!important}',

      /* ── 모드: 세그먼트 ── */
      'body.v2 #modes{display:inline-flex;background:#f0ece2;border-radius:11px;padding:3px;gap:0}',
      'body.v2 #modes button{border:0!important;background:none!important;height:30px;padding:0 14px;',
      '  border-radius:8px;font-size:12.5px;font-weight:700;color:#8a8071;white-space:nowrap}',
      'body.v2 #modes button.on{background:#12203a!important;color:#fff!important;box-shadow:0 1px 3px rgba(18,32,58,.28)}',

      /* ── 구획선: 성격이 다른 묶음 사이에만 ── */
      'body.v2 #bar .vr{width:1px;height:22px;background:#e6e0d3;flex:0 0 auto;margin:0 2px}',

      /* ── 검색·필터·상품·거래·지역 높이 통일 ── */
      'body.v2 #sform{margin:0}',
      'body.v2 #sform input{height:32px}',
      'body.v2 .sbtn,body.v2 #fbtn{height:32px}',
      'body.v2 #selSido,body.v2 #selSgg{height:32px;border-radius:9px;border:1px solid #e3ded2;',
      '  background:#fff;padding:0 8px;font-size:12.5px;color:#4a453d;max-width:118px}',
      'body.v2 #mcats{display:inline-flex!important;gap:6px;flex-wrap:nowrap}',
      'body.v2 #mcats button{height:32px;border:1px solid #e3ded2;border-radius:9px;background:#fff;',
      '  padding:0 11px;font-size:12.5px;font-weight:700;color:#4a453d;white-space:nowrap}',
      'body.v2 #mcats button b{color:#12203a;font-weight:800;margin:0 3px}',
      'body.v2 #mcats button:hover{border-color:#12203a}',
      'body.v2 #mcats button.set{border-color:#12203a}',

      /* ── 재개발 유형 칩: 그대로 두되 둘째 줄로 내리고 얇은 선으로 구분 ── */
      'body.v2.redev #bar{flex-wrap:wrap!important}',
      'body.v2 #rfbar{width:100%;margin:0;padding-top:8px;border-top:1px solid #efe9dc;gap:6px}',

      /* ── 상품·거래 선택 창: 데스크톱에서는 누른 버튼 아래 작은 창으로 ── */
      'body.v2 #msheet{background:transparent}',
      'body.v2 #msheet .ms-in{position:fixed;left:var(--msx,20px);top:var(--msy,80px);right:auto;bottom:auto;',
      '  width:224px;max-height:min(58vh,420px);border-radius:14px;padding:0 0 6px;',
      '  box-shadow:0 12px 34px rgba(20,20,20,.20),0 2px 6px rgba(20,20,20,.10)}',
      'body.v2 #msheet .ms-h{padding:11px 15px 8px;font-size:12.5px;font-weight:800;color:#8a8071}',
      'body.v2 #msheet .ms-opt{padding:9px 15px;font-size:13.5px}',
      /* 점이 없는 항목('전체')만 글자가 왼쪽으로 튀어 줄이 어긋난다. 점 자리만큼 밀어 준다. */
      'body.v2 #msheet .ms-opt>span:first-child:not(:has(.dot)){padding-left:20px}',

      /* ── 지도 도구: 오른쪽 세로 (모바일과 같은 자리) ── */
      'body.v2 #sbTools{position:absolute;right:14px;top:calc(var(--v2-top,52px) + 12px);z-index:900;',
      '  display:flex!important;flex-direction:column;gap:7px;margin:0}',
      'body.v2 #sbTools button{min-width:66px;width:auto;height:54px;border:0!important;border-radius:13px;',
      '  background:rgba(255,255,255,.97)!important;color:#4a453d!important;',
      '  box-shadow:0 3px 12px rgba(20,20,20,.15);font-size:11px;font-weight:700;padding:0 10px!important;',
      '  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;',
      '  line-height:1.2;white-space:nowrap;transition:background .14s ease,color .14s ease}',
      'body.v2 #sbTools button i{font-size:17px;line-height:1}',
      'body.v2 #sbTools button:hover{color:#12203a!important}',
      'body.v2 #sbTools button.on{background:#12203A!important;color:#fff!important}',
      'body.v2 #sbTools #oldBtn.on{background:#A8402A!important}',
      '}'
    ].join('');
    document.head.appendChild(css);

    /* ── 순서 정리: 모드 | 검색·필터 | 상품·거래·지역 ── */
    function vr() { var d = document.createElement('span'); d.className = 'vr'; return d; }
    /* 필터 버튼은 **지역 선택 옆**에 둔다(2026-08-22 석봉님 지시).
       검색창 바로 뒤에 있던 때는 「검색 → 필터」로 읽혀서, 지역을 고르고 조건을 좁히는
       실제 순서와 어긋났다. 이제 상품·거래·지역을 고른 끝에 필터가 온다. */
    var order = ['modes', '|', 'sform', '|', 'mcats', 'selSido', 'selSgg', 'fbtn'];
    order.forEach(function (id) {
      if (id === '|') { bar.appendChild(vr()); return; }
      var el = document.getElementById(id);
      if (el) bar.appendChild(el);            /* 이동만 — 핸들러는 그대로 살아 있다 */
    });
    var rf = document.getElementById('rfbar');
    if (rf) bar.appendChild(rf);              /* 유형 칩은 항상 맨 뒤(=둘째 줄) */

    /* 지도 도구는 지도 위 오른쪽으로. map_old.js가 늦게 만들 수 있어 잠깐 기다린다.
       글자만 있던 버튼에 아이콘을 얹는다 — 세로로 세우면 글자만으로는 무엇인지 훑기 어렵다.
       ⚠️버튼을 새로 만들지 않고 앞에 아이콘만 끼운다(클릭 로직은 map_old.js 것 그대로). */
    var ICON = { oldBtn: 'home-2', cadBtn: 'vector-triangle', nmBtn: 'tag', satBtn: 'satellite' };
    (function moveTools(n) {
      var t = document.getElementById('sbTools');
      if (!t) { if (n < 50) setTimeout(function () { moveTools(n + 1); }, 120); return; }
      (document.getElementById('wrap') || document.body).appendChild(t);
      if (!document.querySelector('link[href*="tabler-icons"]')) {
        var f = document.createElement('link'); f.rel = 'stylesheet';
        f.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css';
        document.head.appendChild(f);
      }
      [].forEach.call(t.querySelectorAll('button'), function (b) {
        if (b.querySelector('i') || !ICON[b.id]) return;
        var i = document.createElement('i');
        i.className = 'ti ti-' + ICON[b.id]; i.setAttribute('aria-hidden', 'true');
        b.insertBefore(i, b.firstChild);
      });
    })(0);

    /* 선택 창을 누른 버튼 아래로 옮긴다.
       ⚠️openSheet()가 창을 연 뒤에 위치를 잡아야 하므로 클릭 뒤 한 박자 쉰다. */
    var sheet = document.getElementById('msheet');
    bar.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('#mcats button') : null;
      if (!b || !sheet) return;
      setTimeout(function () {
        var r = b.getBoundingClientRect();
        var x = Math.min(r.left, window.innerWidth - 224 - 14);
        sheet.style.setProperty('--msx', Math.max(14, x) + 'px');
        sheet.style.setProperty('--msy', (r.bottom + 7) + 'px');
      }, 0);
    });
  });
})();
