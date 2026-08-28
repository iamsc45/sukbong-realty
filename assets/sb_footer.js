/* 공용 푸터 (2026-08-28 신설)
   ────────────────────────────────────────────────────────────────
   왜
     화면 5개(자료실 · 단지상세 · 구역상세 · 금리지표_읽는법 · 재개발_기초상식)에만
     푸터가 없었다. 나머지 화면에는 저작권·면책·채널 링크가 있는데 이 다섯만 빠져,
     검색으로 들어온 사람이 그 페이지에서 우리가 누구인지·면책이 무엇인지 못 본다.
     단지상세는 **검색 유입 착지점**이라 특히 컸다.

   왜 페이지마다 붙여넣지 않았나
     문구가 다섯 벌로 갈리면 저작권 연도나 면책 문장을 고칠 때 반드시 하나를 빠뜨린다
     (같은 이유로 상단 메뉴도 `sb_nav.js` 로 모았다 — 2026-08-22 「메뉴가 세 곳에 따로
     적혀 있었다」 사고). **문구는 여기 한 곳에만 둔다.**

   쓰는 법
     `<script src="assets/sb_footer.js?v=1"></script>` 한 줄.
     ⚠️**`sb_tabbar.js` 보다 먼저** 넣어야 한다 — 탭바가 `.site-footer` 를 찾아
       하단 여백을 맞추는데(`fillShort()`), 푸터가 그 뒤에 생기면 못 찾는다.
     ⚠️이미 `<footer class="site-footer">` 가 있는 페이지에서는 아무것도 하지 않는다
       (글.html·map.html 등은 그대로 둔다).
     ⚠️지도(`body.v2`)는 `map_v2.css` 가 푸터를 접으므로 여기서도 넣지 않는다.

   ⚠️스타일을 왜 여기서 주입하나
     `site.css` 를 안 쓰는 페이지가 넷이라(자체 스타일) 클래스만 붙이면 모양이 안 난다.
     `site.css` 와 **같은 값**을 주입하므로 그 파일을 쓰는 페이지에서 중복돼도 무해하다.
     ⚠️`site.css` 의 `.site-footer` 를 고치면 여기도 같이 고칠 것. */
(function () {
  if (document.querySelector('.site-footer')) return;
  if (document.body && document.body.classList.contains('v2')) return;

  var CSS =
    '.site-footer{background:#141414;color:#8A8A85;font-size:12px;padding:18px 22px;line-height:1.7}' +
    '.site-footer a{color:#fff;font-weight:600;text-decoration:none}' +
    '.site-footer .fine{margin-top:6px;font-size:11px;color:#6E6E6A;line-height:1.6}';

  function boot() {
    if (document.querySelector('.site-footer')) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML =
      '<span>📈 <a href="https://telegram.me/seokbongnews">텔레그램 채널</a></span> · ' +
      '<span><a href="https://blog.naver.com/seokbongnews">네이버 블로그</a> · ' +
      '<a href="index.html">석봉 부동산 정보방</a></span>' +
      '<div class="fine">편집·제작: 석봉 부동산 정보방 · ⓒ 2026 석봉 부동산 정보방 · ' +
      '무단 전재·재배포 금지 · 본 자료는 정보 제공 목적이며 투자 권유가 아닙니다 · ' +
      '방문 통계 수집을 위해 Google Analytics(쿠키)를 사용합니다</div>';
    document.body.appendChild(f);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
