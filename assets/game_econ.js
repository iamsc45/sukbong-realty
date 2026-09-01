/* 부동산 경제상식 퀴즈 — 2026-09-01 석봉님 제안
 * ---------------------------------------------------------------------------
 * 왜 만드나
 *   실거래가 맞히기는 문제가 「가격」 하나뿐이라 소재가 한정된다.
 *   상식 퀴즈는 **정책·제도·용어·금리**로 넓어져 콘텐츠가 계속 나온다.
 *
 * 🔴 답이 틀리면 사이트 전체의 신뢰가 깎인다.
 *    그래서 문제는 `상식퀴즈_빌더.py` 가 두 갈래로만 만든다 —
 *    ①우리 지표에서 자동으로 뽑는 것(금리) ②안 바뀌는 제도·용어.
 *    **세율·공제 한도처럼 자주 바뀌는 수치는 한 문제도 없다.**
 *
 * 구조 — 앞의 두 게임과 같다. id 는 전부 `e` 로 시작한다.
 *   eIntro ePlay eEnd / eSteps eQi eQn eQt eOpts / eScore eCards eShare eAgain
 */
window.EconQuiz = (function(){
  "use strict";

  var ALL = [], PICK = 10, P = [], idx = 0, log = [], show = null, locked = false;
  var $ = function(id){ return document.getElementById(id); };

  function shuffle(a){
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }

  /* 보기 순서를 섞는다 — 빌더는 늘 0번에 정답을 두므로 그대로 쓰면 다 1번이다.
     ⚠️ 섞은 뒤 **정답이 어디로 갔는지**를 같이 들고 다녀야 한다. */
  function prep(q){
    var pairs = q.opts.map(function(t, i){ return { t: t, ok: i === q.ans }; });
    shuffle(pairs);
    return { q: q, opts: pairs, ansAt: pairs.findIndex(function(x){ return x.ok; }) };
  }

  function drawSteps(){
    $("eSteps").innerHTML = P.map(function(_, i){
      /* 지금 풀고 있는 칸을 노랗게 짚어 준다(2026-09-01) */
      return "<i class='" + (i < idx ? "done" : i === idx ? "on" : "") + "'></i>";
    }).join("");
  }

  function render(){
    var it = P[idx];
    locked = false;
    drawSteps();
    $("eQi").textContent = idx + 1;
    $("eQn").textContent = P.length;
    $("eQt").innerHTML = it.q.q;                 // 문제에 <b> 가 들어간다
    $("eOpts").innerHTML = it.opts.map(function(o, i){
      return "<button class='opt' data-i='" + i + "'>" +
               "<span class='k'>" + "ABCD".charAt(i) + "</span>" +
               "<span class='t'>" + esc(o.t) + "</span></button>";
    }).join("");
  }

  /* 고르면 바로 다음 문제. 정답은 다 푼 뒤 한꺼번에(앞의 두 게임과 같은 규칙) */
  function answer(i){
    if(locked) return;
    locked = true;
    var it = P[idx];
    log.push({ q: it.q, picked: i, ok: i === it.ansAt, ansAt: it.ansAt, opts: it.opts });
    idx++;
    if(idx >= P.length){ drawSteps(); result(); }
    else { render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function result(){
    show("eEnd");
    if(window.SBBgm) SBBgm.stop();
    var hit = log.filter(function(x){ return x.ok; }).length;
    $("eScore").innerHTML = hit + " <em>/ " + log.length + "</em>";
    $("eTag").textContent =
      hit === log.length ? "다 맞히셨습니다" :
      hit >= log.length - 2 ? "거의 다 아시는군요" :
      hit >= log.length / 2 ? "절반은 넘기셨습니다" : "오늘 하나라도 건지셨으면 됩니다";
    $("eCards").innerHTML = log.map(function(x, i){
      return "<div class='qres'>" +
        "<div class='cq'>문제 " + (i + 1) + (x.ok ? " · 정답" : " · 오답") + "</div>" +
        "<div class='ct'>" + x.q.q + "</div>" +
        "<div class='eans'>" +
          x.opts.map(function(o, j){
            var cls = o.ok ? "ok" : (j === x.picked ? "no" : "");
            return "<div class='ea " + cls + "'>" +
              "<span class='k'>" + "ABCD".charAt(j) + "</span>" +
              "<span class='t'>" + esc(o.t) + "</span>" +
              (o.ok ? "<span class='m'>정답</span>"
                    : (j === x.picked ? "<span class='m'>내 선택</span>" : "")) +
              "</div>";
          }).join("") +
        "</div>" +
        "<div class='fact'><div class='h'>왜 그런가</div><p>" + x.q.why + "</p></div>" +
        "</div>";
    }).join("");
  }

  function begin(){
    P = shuffle(ALL.slice()).slice(0, PICK).map(prep);
    idx = 0; log = [];
    render(); show("ePlay");
    if(window.SBBgm) SBBgm.play("quiz");        // 퀴즈 곡을 함께 쓴다
  }

  function init(opt){
    show = opt.show;
    var src = window.QUIZ_ECON || {};
    ALL = src.items || [];
    PICK = Math.min(src.pick || 10, ALL.length);
    if(!ALL.length) return null;
    $("eOpts").addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest(".opt");
      if(b) answer(+b.getAttribute("data-i"));
    });
    $("eAgain").addEventListener("click", begin);
    $("eShare").addEventListener("click", function(){
      var hit = log.filter(function(x){ return x.ok; }).length;
      var url = location.origin + "/play.html";
      window.SBShare.any({
        title: "부동산 경제상식 퀴즈 " + hit + " / " + log.length,
        desc: "금리·제도·용어. 부동산 상식 열 문제입니다. 당신은 몇 개나 맞히시겠어요?",
        image: "https://xn--2q1br1nnrasc92a76myvau64b.com/assets/og_quiz.png",
        url: url, btn: "나도 풀어보기",
        text: "부동산 경제상식 퀴즈에서 " + hit + " / " + log.length + "개를 맞혔습니다.\n" + url
      }).then(function(how){ if(how === "clipboard") alert("주소를 복사했습니다."); });
    });
    return { start: begin, count: ALL.length, pick: PICK, updated: src.updated || "" };
  }

  return { init: init };
})();
