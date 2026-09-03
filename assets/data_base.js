/* 이 파일은 자동 생성된다 — 손으로 고치지 말 것.
   원본: 데이터관리/_config/_이전목록.txt · 만드는 이: 스크립트/자료주소_생성.py
   자료가 어느 저장소에 있는지를 **한 곳에서** 정한다. 두 곳에서 관리하면
   화면은 새 주소를 보는데 자료는 옛 저장소에 있는 사고가 난다. */
window.SBDATA = (function () {
  var EXT = "https://iamsc45.github.io/sukbong-data";
  var MOVED = [];
  return function (p) {
    var s = String(p || "");
    var rel = s.replace(/^\.?\/?data\//, "");
    if (rel === s) return s;            /* data/ 로 시작하지 않으면 그대로 */
    for (var i = 0; i < MOVED.length; i++)
      if (rel.indexOf(MOVED[i]) === 0) return EXT + "/" + rel;
    return s;                           /* 아직 안 옮긴 것은 그대로 */
  };
})();
