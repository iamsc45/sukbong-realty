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

  window.SBLog = function (q, src) {
    try {
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
