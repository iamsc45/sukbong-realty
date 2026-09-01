/* 밸런스 게임 로직 — 2026-08-31, 놀이터 허브로 합치면서 별도 모듈로 분리
 * ---------------------------------------------------------------------------
 * 왜 파일을 나눴나
 *   두 게임을 한 페이지에 넣으면 id·변수가 충돌한다(오늘 `.card` 클래스가 site.css 와
 *   부딪힌 것과 같은 계열). 그래서 **밸런스 쪽 id 는 전부 `b` 로 시작**하고
 *   로직은 이 파일 안에 가둔다. 세 번째 게임이 붙어도 같은 방식으로 늘리면 된다.
 *
 * 쓰는 법 — 페이지에 아래 id 가 있어야 한다.
 *   bIntro bPlay bWait bEnd / bSteps bQi bQn bQt bPickA bPickB
 *   bReveal bCards bEndLead bShare bAgain bExit
 *   그리고 window.POLLS(문제) 와 window.SBShare(공유)가 먼저 실려 있어야 한다.
 *   전환은 호스트가 넘겨준 show(id) 를 쓴다(허브가 모든 화면을 함께 관리한다).
 */
window.BalanceGame = (function(){
  "use strict";
  var SB_URL = "https://bwgoufxonqamglbqsife.supabase.co";
  var SB_KEY = "sb_publishable_kYd1gCyqCR2Qy8Ix6KE6og_FfJUImfR";
  var ALL = [], PICK = 5, P = [], idx = 0, picked = [];
  var show = null;                       // 호스트가 넣어 준다
  /* 2026-09-01 — 문제가 주제별 **다섯 세트**로 갈렸다(석봉님).
     목록에서 고른 세트를 여기 담아 두고, 「다시 하기」는 같은 세트로 돌린다. */
  var SETS = [], CUR = null;
  var $ = function(id){ return document.getElementById(id); };

  function shuffle(a){
    for(var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=a[i];a[i]=a[j];a[j]=t; }
    return a;
  }
  function esc(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c];
    });
  }
  function cid(){
    try{
      var v = localStorage.getItem("sb_cid");
      if(!v){ v = Math.random().toString(36).slice(2) + Date.now().toString(36);
              localStorage.setItem("sb_cid", v); }
      return v.slice(0, 32);
    }catch(e){ return "nocid"; }
  }
  function sbFetch(path, opt){
    opt = opt || {};
    opt.headers = Object.assign({ apikey: SB_KEY, Authorization: "Bearer " + SB_KEY,
      "Content-Type": "application/json" }, opt.headers || {});
    return fetch(SB_URL + "/rest/v1/" + path, opt);
  }

  function drawSteps(){
    $("bSteps").innerHTML = P.map(function(_,i){
      return "<i class='"+(i<idx?"done":"")+"'></i>";
    }).join("");
  }
  function render(){
    var q = P[idx];
    drawSteps();
    $("bQi").textContent = idx+1;
    $("bQn").textContent = P.length;
    $("bQt").textContent = q.q;
    $("bPickA").querySelector(".t").textContent = q.a.t;
    $("bPickA").querySelector(".s").textContent = q.a.s;
    $("bPickB").querySelector(".t").textContent = q.b.t;
    $("bPickB").querySelector(".s").textContent = q.b.s;
  }

  /* 고르면 바로 다음 질문. 결과는 다섯 개를 다 고른 뒤 한꺼번에(2026-08-31 석봉님).
     표는 보내되 응답을 기다리지 않는다 — 서버가 느려도 게임이 멈추면 안 된다 */
  function vote(choice){
    var q = P[idx];
    picked.push({ slug: q.slug, choice: choice, q: q });
    sbFetch("poll_votes", { method: "POST",
      body: JSON.stringify({ slug: q.slug, choice: choice, cid: cid() }) }).catch(function(){});
    idx++;
    if(idx >= P.length){ drawSteps(); show("bWait"); }
    else { render(); window.scrollTo({top:0, behavior:"smooth"}); }
  }

  function bar(label, pct, mine){
    return "<div class='bar" + (mine ? " mine" : "") + "'>" +
      "<div class='lb'><b>" + esc(label) + "</b><span class='pc'>" + pct + "%</span></div>" +
      "<div class='tr'><i style='width:" + pct + "%'></i></div></div>";
  }

  function reveal(){
    show("bEnd");
    if(window.SBBgm) SBBgm.stop();          // 결과를 읽는 화면에서는 조용히
    var slugs = picked.map(function(x){ return x.slug; });
    $("bCards").innerHTML = "";
    sbFetch("poll_result?slug=in.(" + slugs.map(encodeURIComponent).join(",") + ")")
      .then(function(r){ return r.ok ? r.json() : []; })
      .catch(function(){ return []; })
      .then(function(rows){
        var by = {};
        (rows || []).forEach(function(x){ by[x.slug] = x; });
        var html = "", same = 0;
        picked.forEach(function(p, i){
          var q = p.q, r = by[p.slug] || {};
          var a = +r.a_cnt || 0, b = +r.b_cnt || 0;
          if(a + b === 0){ if(p.choice === "a") a = 1; else b = 1; }   // 내 표가 아직 안 잡혔을 때
          var tot = a + b, pa = Math.round(a/tot*100), pb = 100 - pa;
          if((p.choice === "a") ? a >= b : b > a) same++;
          html +=
            "<div class='qres'>" +
              "<div class='cq'>질문 " + (i+1) + "</div>" +
              "<div class='ct'>" + esc(q.q) + "</div>" +
              "<div class='bars'>" + bar(q.a.t, pa, p.choice === "a") +
                                     bar(q.b.t, pb, p.choice === "b") + "</div>" +
              "<div class='tot'>" + tot.toLocaleString() + "명이 골랐습니다</div>" +
              "<div class='fact'><div class='h'>그런데 실제로는</div>" +
                "<p>" + q.fact + "</p><p>" + q.more + "</p>" +
                (q.link ? "<a href='" + q.link.u + "' target='_blank' rel='noopener'>" +
                          esc(q.link.t) + "</a>" : "") +
              "</div></div>";
        });
        $("bCards").innerHTML = html;
        $("bEndLead").textContent =
          P.length + "개 질문 가운데 " + same + "개에서 다수와 같은 쪽을 고르셨습니다.";
      });
  }

  function pickSet(id){
    for(var i = 0; i < SETS.length; i++) if(SETS[i].id === id) return SETS[i];
    return SETS[0] || null;
  }

  function begin(id){
    var st = id ? pickSet(id) : CUR;
    if(!st) return;
    CUR = st;
    ALL = st.items || []; PICK = st.pick || 5;
    P = shuffle(ALL.slice()).slice(0, PICK);   // 세트 안에서 무작위. 다시 하면 다른 문제
    idx = 0; picked = [];
    var h = $("bSetName"); if(h) h.textContent = st.title;
    render(); show("bPlay");
    /* 밸런스는 3박자 왈츠다 — 고민하는 화면이라 몰아치지 않는다 */
    if(window.SBBgm) SBBgm.play("balance");
  }

  function init(opt){
    show = opt.show;
    SETS = (window.POLLS && window.POLLS.sets) || [];
    $("bPickA").addEventListener("click", function(){ vote("a"); });
    $("bPickB").addEventListener("click", function(){ vote("b"); });
    $("bReveal").addEventListener("click", reveal);
    $("bAgain").addEventListener("click", function(){ begin(); });   // 같은 세트로 다시
    $("bShare").addEventListener("click", function(){
/* 🔴 공유 주소는 **ASCII 짧은 주소**를 쓴다(2026-09-01).
         놀이터 파일명이 한글이라 인코딩 단계가 한 번만 어긋나도 404 가 난다.
         실제로 두 번 겪었다. `play.html` 이 진짜 놀이터로 보내 준다. */
      var url = location.origin + "/play.html";
      window.SBShare.any({
        title: "부동산 밸런스 게임",
        desc: "정답이 없는 질문 다섯 개. 고르고 나면 실제 거래가 어땠는지 보여드립니다.",
        image: "https://xn--2q1br1nnrasc92a76myvau64b.com/assets/og_balance.png",
        url: url, btn: "나도 골라보기",
        text: "부동산 밸런스 게임, 당신의 선택은?\n" + url
      }).then(function(how){ if(how === "clipboard") alert("주소를 복사했습니다."); });
    });
    return { start: begin, sets: SETS,
             /* 허브가 목록 카드를 그릴 때 쓴다 */
             count: SETS.reduce(function(n, x){ return n + (x.items || []).length; }, 0) };
  }

  return { init: init };
})();
