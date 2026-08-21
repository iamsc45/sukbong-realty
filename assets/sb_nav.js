/* 상단 메뉴를 카테고리로 접는다 (2026-08-21 석봉님 지시)
   ────────────────────────────────────────────────────────────────
   왜
     홈을 뺀 모든 페이지의 상단 메뉴가 **12~14개를 그냥 늘어놓고** 있었다.
     석봉님 지시 — 「nav 는 카테고리별로 잘 정리해서 너무 나열하지는 말자」.
     자료실이 더해지면 15개가 된다. 늘어놓기로는 더 못 버틴다.

   무엇을
     최상위를 일곱으로 줄이고 나머지는 두 묶음(데이터·콘텐츠)으로 접는다.
     홈이 2026-08-07부터 쓰던 구조를 나머지 페이지로 옮기는 것이다.

         홈 · 실거래지도 · 자료실 · [데이터 ▾] · [콘텐츠 ▾] · ★관심단지 · 대출 문의
         데이터 ▾   청약 · 경매·공매 · 금리·지표 · LH매입 · 땅값
         콘텐츠 ▾   리포트 · 블로그 · 채널 · 이용안내

   🔴 링크를 지우지 않는다 — **자리만 옮긴다.**
      새로 만들어 붙이면 검색엔진이 보는 내부 링크가 사라진다. 유입의 74%가 검색인 사이트다.
      원래 있던 `<a>` 를 그대로 드롭다운 안으로 넣는다.

   ⚠️ 홈(`.nav` 구조)은 이미 접혀 있으므로 건드리지 않는다. 여기서는 `.site-header nav`
      와 `.sbnav nav` 두 모양만 다룬다(페이지마다 껍데기가 다르다).
   ⚠️ 모바일에서는 `sb_tabbar.js` 가 상단 링크를 통째로 감춘다(길잡이가 하단 탭바라서).
      그래서 좁은 화면에서는 이 스크립트가 아무 일도 하지 않아도 된다 —
      대신 탭바의 「전체」 시트에 자료실 한 줄을 얹는다.
*/
(function () {
  'use strict';

  /* href 조각 → 어느 묶음인가. 인코딩된 한글 주소도 있으니 조각으로 찾는다. */
  var GROUP = [
    ['데이터', [
      ['apply.html', '청약'],
      ['auction.html', '경매·공매'],
      ['%EC%A7%80%ED%91%9C', '금리·지표'],      /* 지표.html */
      ['lh_%EC%A7%84%EB%8B%A8', 'LH매입'],      /* lh_진단.html */
      ['lh_%EC%9A%94%EA%B1%B4', 'LH 요건'],     /* lh_요건.html */
      ['%ED%86%A0%EC%A7%80%EA%B2%80%EC%83%89', '땅값']
    ]],
    ['콘텐츠', [
      ['%EA%B8%80.html', '리포트'],
      ['blog.naver.com', '블로그'],
      ['channels.html', '채널'],
      ['%EC%9D%B4%EC%9A%A9%EC%95%88%EB%82%B4', '이용안내'],
      ['%EC%9E%AC%EA%B0%9C%EB%B0%9C', '재개발 기초상식']
    ]]
  ];
  /* 최상위에 그대로 두는 것 — 자주 쓰거나 사업에 직결되는 것만 남긴다 */
  var TOP = ['index.html', 'map.html', '%EC%9E%90%EB%A3%8C%EC%8B%A4', 'favorites.html',
             '%EB%8C%80%EC%B6%9C%EB%AC%B8%EC%9D%98'];
  var DATA_HREF = '%EC%9E%90%EB%A3%8C%EC%8B%A4.html';

  function has(href, frag) { return String(href || '').indexOf(frag) >= 0; }
  function topIdx(href) {
    for (var i = 0; i < TOP.length; i++) if (has(href, TOP[i])) return i;
    return -1;
  }

  function css() {
    if (document.getElementById('sbNavCss')) return;
    var st = document.createElement('style');
    st.id = 'sbNavCss';
    st.textContent = [
      '.sbg{position:relative;display:inline-block}',
      '.sbg>.sbgt{cursor:pointer;white-space:nowrap}',
      '.sbg>.sbgm{display:none;position:absolute;top:100%;left:-10px;z-index:1800;min-width:132px;',
      '  background:#fff;border:1px solid #E3E8F0;border-radius:10px;padding:6px 0;',
      '  box-shadow:0 10px 26px rgba(20,20,20,.13)}',
      '.sbg:hover>.sbgm,.sbg.open>.sbgm{display:block}',
      '.sbg>.sbgm a{display:block;padding:7px 15px;white-space:nowrap;font-size:13px}',
      '.sbg>.sbgm a:hover{background:#EEF3FB}',
      '.sbg .darr{font-size:10px;margin-left:2px;opacity:.6}',
      /* 좁은 화면에서는 하단 탭바가 길잡이라 상단 메뉴 자체가 감춰진다 */
      '@media(max-width:720px){.sbg{display:none}}'
    ].join('');
    document.head.appendChild(st);
  }

  function build(nav) {
    if (nav.dataset.sbnav) return;
    nav.dataset.sbnav = '1';
    var links = [].slice.call(nav.querySelectorAll('a'));
    if (links.length < 6) return;                 /* 이미 접혀 있거나 메뉴가 아니다 */

    /* 자료실이 없으면 만들어 둔다(옛 페이지에는 링크가 없다) */
    var hasData = links.some(function (a) { return has(a.getAttribute('href'), '%EC%9E%90%EB%A3%8C%EC%8B%A4'); });
    if (!hasData) {
      var a = document.createElement('a');
      a.href = DATA_HREF; a.textContent = '자료실';
      var mapA = links.filter(function (x) { return has(x.getAttribute('href'), 'map.html'); })[0];
      if (mapA && mapA.parentNode === nav) nav.insertBefore(a, mapA.nextSibling);
      else nav.insertBefore(a, links[0].nextSibling);
      links = [].slice.call(nav.querySelectorAll('a'));
    }

    css();
    var slot = nav.querySelector('#sbAuthBtn');   /* 로그인 자리 — 묶음은 그 앞에 둔다 */

    GROUP.forEach(function (g) {
      var name = g[0], want = g[1];
      var found = [];
      want.forEach(function (w) {
        links.forEach(function (a) {
          if (found.indexOf(a) < 0 && has(a.getAttribute('href'), w[0])) found.push(a);
        });
      });
      if (found.length < 2) return;               /* 접을 만큼 없으면 그냥 둔다 */
      var box = document.createElement('span');
      box.className = 'sbg';
      var t = document.createElement('a');
      t.className = 'sbgt'; t.href = found[0].getAttribute('href');
      t.innerHTML = name + '<span class="darr">▾</span>';
      var m = document.createElement('div');
      m.className = 'sbgm';
      box.appendChild(t); box.appendChild(m);
      /* 첫 항목 자리에 묶음을 꽂고, 원래 링크들을 그 안으로 옮긴다(지우지 않는다) */
      nav.insertBefore(box, found[0]);
      found.forEach(function (a) { m.appendChild(a); });
      /* 지금 보고 있는 페이지가 이 묶음 안이면 묶음 이름에 표시 */
      if (found.some(function (a) { return a.classList.contains('on'); })) t.classList.add('on');
      if (slot && slot.parentNode === nav) nav.insertBefore(box, slot);
    });

    /* 최상위 순서 정리 — 홈 · 지도 · 자료실 · 묶음들 · 관심단지 · 대출문의 */
    var tops = [].slice.call(nav.children).filter(function (el) {
      return el.tagName === 'A' && topIdx(el.getAttribute('href')) >= 0;
    });
    tops.sort(function (x, y) { return topIdx(x.getAttribute('href')) - topIdx(y.getAttribute('href')); });
    var groups = [].slice.call(nav.querySelectorAll('.sbg'));
    var head = tops.slice(0, 3), tail = tops.slice(3);
    head.concat(groups).concat(tail).forEach(function (el) {
      if (slot && slot.parentNode === nav) nav.insertBefore(el, slot);
      else nav.appendChild(el);
    });
  }

  /* 모바일 「전체 메뉴」 시트는 sb_tabbar.js 의 MENU 가 정본이다 — 여기서 손대지 않는다
     (같은 줄을 두 곳에서 넣으면 한쪽을 고칠 때 다른 쪽이 남아 두 번 나온다). */
  function boot() {
    /* 홈은 이미 묶여 있다 — `.nav` 를 쓰는 페이지는 건드리지 않는다 */
    if (document.querySelector('nav.nav')) return;
    var nav = document.querySelector('.site-header nav') || document.querySelector('.sbnav nav');
    if (nav) build(nav);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
