/* 석봉 부동산 정보방 · 지역 검색 로그 (2026-08-02)
   홈 '인기 지역' 칩을 실제 검색 기록으로 채우기 위한 최소 로거.
   보내는 값은 검색어, 유입 경로, 브라우저별 난수(cid), 시각뿐이다. 계정·IP와 연결하지 않는다.
   cid는 같은 사람이 같은 말을 여러 번 친 것을 한 번으로 세기 위한 것이다.
   기록에 실패해도 화면 동작에는 영향이 없도록 전부 조용히 넘긴다. */
(function () {
  var URL = "https://bwgoufxonqamglbqsife.supabase.co/rest/v1/search_log";
  var KEY = "sb_publishable_kYd1gCyqCR2Qy8Ix6KE6og_FfJUImfR";

  function cid() {
    try {
      var c = localStorage.getItem("sb_cid");
      if (!c) {
        c = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);
        localStorage.setItem("sb_cid", c);
      }
      return c.slice(0, 32);
    } catch (e) { return ""; }
  }

  /* 자동화 브라우저는 기록하지 않는다 (2026-09-11 신설).
     우리가 돌리는 화면점검·동선점검이 남긴 검색이 그대로 홈 '인기 지역' 칩에 올라왔다.
     실측: 8/19 한 시간 안에 아홉 개 브라우저가 '안양 에버포레'를, 8/15 삼십일 분 안에
     아홉 개가 오타 '짬실아파트'를 쳤다. 전부 우리 시험이다. 방문자가 적을수록
     시험 몇 번이 순위를 통째로 뒤집는다.
     navigator.webdriver 는 Playwright·puppeteer·Selenium 에서 true 가 된다. */
  function isBot() {
    try {
      if (navigator.webdriver) return true;
      return /HeadlessChrome|Playwright|puppeteer|bot|crawler|spider/i.test(navigator.userAgent || "");
    } catch (e) { return false; }
  }

  window.SBLog = function (q, src) {
    try {
      if (isBot()) return;
      q = String(q == null ? "" : q).trim();
      if (!q || q.length > 40) return;
      fetch(URL, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": KEY,
          "Authorization": "Bearer " + KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify({ q: q, src: String(src || "").slice(0, 20), cid: cid() })
      }).catch(function () {});
    } catch (e) {}
  };
})();
