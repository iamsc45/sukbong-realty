/* 세금 피하기 — 2026-08-31 신설 (석봉님 안: "똥 피하기인데 세금이 내려오는")
 * ---------------------------------------------------------------------------
 * 왜 이 게임인가
 *   퀴즈·밸런스는 한두 판이면 끝난다. 붙잡는 것은 장르가 아니라 ①랭킹 ②매일 바뀌는 것
 *   ③남한테 보낼 이유 셋뿐이다. 그 셋은 이미 만들어 뒀으므로 껍데기만 갈아 끼운다.
 *
 * 구조 — 밸런스와 같은 방식이다.
 *   · id 는 전부 `t` 로 시작한다(세 게임이 한 페이지에 있어 충돌을 막아야 한다)
 *   · 화면 전환은 호스트가 넘겨준 show(id) 를 쓴다
 *   · 필요한 id: tIntro tPlay tEnd / tCv tScore tShield / tRes tHit tTip tBest tShare tAgain
 *
 * ⚠️ 프레임 기반이라 조심할 것 둘
 *   ① 탭을 숨기면 rAF 가 멈춘다. 돌아왔을 때 delta 가 몇 초씩 되어 블록이 순간이동한다
 *      → delta 를 50ms 로 자른다(그래야 "안 봤는데 죽어 있는" 일이 없다).
 *   ② 이 세션 브라우저는 document.hidden 이라 rAF 가 안 돈다. 그래서 눈으로 못 본다
 *      → 검증용으로 _sim(초) 를 열어 뒀다. rAF 없이 로직만 돌려 상태를 잴 수 있다.
 */
window.TaxGame = (function(){
  "use strict";

  /* 색은 site.css 토큰과 같은 값을 쓴다. 여기서 새 색을 지어내면 사이트와 어긋난다. */
  var CANVAS = "#F2F2EF", INK = "#141414", RED = "#C24B37",
      GREEN = "#1E7A45", GOLD = "#E8A13A", HAIR = "#D9D9D3", MUTED = "#6E6E6A";

  /* 떨어지는 것들. 라벨이 곧 그림이라 따로 이미지가 필요 없다.
     w 는 글자 폭에 맞춘 상자 너비(측정해서 채운다). */
  var TAXES = [
    { t: "취득세",    tip: "집을 사는 순간 가장 먼저 만나는 세금입니다." },
    { t: "양도세",    tip: "팔 때 오른 만큼 냅니다. 오래 가질수록 공제가 커집니다." },
    { t: "재산세",    tip: "6월 1일에 가지고 있던 사람에게 갑니다. 5월 31일에 팔면 안 옵니다." },
    { t: "종부세",    tip: "재산세와 같은 날을 기준으로 매깁니다." },
    { t: "중개수수료", tip: "세금은 아닌데 체감은 세금입니다." },
    { t: "대출이자",  tip: "매달 조용히 나갑니다. 금리가 오르면 소리도 커집니다." },
    { t: "등기비용",  tip: "잔금 치르는 날 같이 따라옵니다." },
    { t: "관리비",    tip: "작아 보이지만 30년이면 집 한 채 값입니다." }
  ];
  /* 먹으면 잠깐 무적. 진짜 있는 제도의 이름만 빌린다(수치는 안 쓴다). */
  var ITEMS = [
    { t: "비과세",   d: 4, say: "비과세! 지금은 아무도 못 건드립니다" },
    { t: "장기보유", d: 4, say: "버틴 보람이 있습니다" },
    { t: "1주택",    d: 5, say: "딱 한 채라 마음이 편합니다" }
  ];

  /* ── 웃자고 넣은 것들 ─────────────────────────────────────
     오래 버티는 게 전부인 게임이라 중간에 아무 일도 안 일어나면 지겹다.
     🔴 여기 문구는 **연출일 뿐 판정에 관여하지 않는다.** 안 떠도 게임은 똑같이 돈다
        (표시 연출에 사실을 실어 보내다 여러 번 데였다). 세법 수치는 한 줄도 안 쓴다. */
  var MILE = [
    { m: 12,  t: "1년. 이웃들이 인사하기 시작합니다" },
    { m: 24,  t: "2년. 슬슬 팔라는 전화가 옵니다" },
    { m: 36,  t: "3년. 이제 이 동네 사람입니다" },
    { m: 60,  t: "5년. 관리사무소가 이름을 외웁니다" },
    { m: 84,  t: "7년. 엘리베이터에서 다들 아는 척합니다" },
    { m: 120, t: "10년. 부녀회장 자리를 권유받습니다" },
    { m: 180, t: "15년. 재건축 얘기가 돌기 시작합니다" },
    { m: 240, t: "20년. 이제 집이 아니라 가족입니다" },
    { m: 360, t: "30년. 여기 사시는 게 곧 역사입니다" }
  ];
  /* 결과 화면 첫 줄. 짧게 죽어도 웃으면서 다시 누르게 만드는 자리다. */
  var RANKS = [
    { m: 6,    t: "등기도 치기 전에 끝났습니다" },
    { m: 12,   t: "이사 짐도 안 풀었는데요" },
    { m: 24,   t: "이제 좀 살 만했는데 말입니다" },
    { m: 36,   t: "정 붙일 때쯤 일이 났습니다" },
    { m: 60,   t: "그래도 몇 해는 버티셨습니다" },
    { m: 120,  t: "꽤 오래 지키셨습니다" },
    { m: 240,  t: "이 정도면 이 동네 토박이입니다" },
    { m: 9999, t: "전설로 남으실 분입니다" }
  ];
  var toast = null, mileIdx = 0;
  function say(t, sec){ toast = { t: t, left: sec || 1.9, all: sec || 1.9 }; }

  var cv, ctx, DPR = 1, W = 360, H = 520;
  var show = null, raf = 0, running = false, lastT = 0;
  var elapsed = 0, blocks = [], px = 0, aimX = null, vx = 0;
  var shield = 0, spawnT = 0, itemT = 6, killedBy = null;
  var PW = 46, PH = 40, GROUND = 54;      // 플레이어 크기와 바닥 높이

  var $ = function(id){ return document.getElementById(id); };

  /* ── 화면 크기 ──────────────────────────────────────────────
     ⚠️ 캔버스는 CSS 크기와 실제 픽셀이 따로 논다. DPR 을 곱해 두지 않으면
        폰에서 글자가 뭉갠다. 그리기 좌표는 CSS 기준으로 쓰고 scale 로 맞춘다. */
  function fit(){
    if(!cv) return;
    var box = cv.parentNode;
    W = Math.max(280, Math.min(520, box.clientWidth || 360));
    /* ⚠️ 폰은 주소창이 있어 실제로 보이는 높이가 innerHeight 보다 100px 남짓 작다.
       그 몫까지 빼 두지 않으면 게임판 아래가 잘려 스크롤해야 보인다. */
    var room = (window.innerHeight || 700) - 250;
    H = Math.max(360, Math.min(540, room));
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx = cv.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if(px === 0 || px > W) px = W / 2;
    measure();
  }

  /* 라벨 폭을 재서 상자 너비를 정한다. 폰트가 로드된 뒤에 재야 정확하다. */
  function measure(){
    if(!ctx) return;
    ctx.font = "700 15px Pretendard, -apple-system, sans-serif";
    TAXES.concat(ITEMS).forEach(function(o){
      o.w = Math.round(ctx.measureText(o.t).width) + 26;
      o.h = 34;
    });
  }

  /* ── 게임 상태 ───────────────────────────────────────────── */
  function reset(){
    /* 시작하고 1.4초는 아무것도 안 떨어뜨린다. 손가락을 올려놓을 짬을 줘야
       "시작하자마자 죽었다"는 억울함이 없다. */
    elapsed = 0; blocks = []; shield = 0; spawnT = 1.4; itemT = 7;
    killedBy = null; vx = 0; aimX = null; px = W / 2;
    toast = null; mileIdx = 0;
    say("집을 지키세요", 1.6);
  }

  function spawn(){
    var o = TAXES[Math.floor(Math.random() * TAXES.length)];
    blocks.push({ o: o, kind: "tax",
      x: 10 + Math.random() * (W - o.w - 20), y: -o.h,
      w: o.w, h: o.h, vy: speed() * (0.85 + Math.random() * 0.3) });
  }
  function spawnItem(){
    var o = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    blocks.push({ o: o, kind: "item",
      x: 10 + Math.random() * (W - o.w - 20), y: -o.h,
      w: o.w, h: o.h, vy: speed() * 0.72 });
  }
  /* 난이도 — 시간이 지날수록 빨라진다. 상한을 두지 않으면 20초 뒤에 아무도 못 피한다. */
  /* 잘 피하는 봇으로 재 보고 정한 값이다(2026-08-31 실측).
     처음 값(170·1.05)은 봇 중앙값이 25초라 사람은 10초를 못 넘겼다.
     첫 판이 10초면 "어 뭐야" 하고 닫는다.

     🔴 2026-08-31 석봉님이 직접 해보고: "3년까지는 조금 지루하고 4년부터 괜찮다."
        그래서 **시간축을 4/3배로 당겼다** — 예전 4년(48초) 자리의 빡셈이 3년(36초)에 온다.
        곡선 모양은 그대로 두고 눈금만 좁힌 것이라 뒤가 무너지지 않는다.
        고칠 때는 이 값 하나만 만진다. */
  var PACE = 4 / 3;
  function speed(){ return Math.min(520, 150 + elapsed * 7 * PACE); }
  function gap(){ return Math.max(0.38, 1.25 - elapsed * 0.019 * PACE); }

  function step(dt){
    elapsed += dt;
    if(shield > 0) shield = Math.max(0, shield - dt);
    if(toast){ toast.left -= dt; if(toast.left <= 0) toast = null; }
    /* 눈금을 하나 넘을 때마다 한마디. 초반이 심심한 것을 이걸로 메운다 */
    while(mileIdx < MILE.length && elapsed >= MILE[mileIdx].m){
      say(MILE[mileIdx].t, 2.2); mileIdx++;
    }

    /* 플레이어 이동 — 손가락 x 를 부드럽게 따라간다.
       그냥 순간이동시키면 조작감이 뻣뻣하고, 너무 느리면 답답하다. */
    if(aimX != null){
      var d = aimX - px;
      px += d * Math.min(1, dt * 16);
    } else {
      px += vx * dt * 420;                 // 키보드
    }
    px = Math.max(PW/2 + 4, Math.min(W - PW/2 - 4, px));

    spawnT -= dt;
    if(spawnT <= 0){ spawn(); spawnT = gap(); }
    itemT -= dt;
    if(itemT <= 0){ spawnItem(); itemT = 7 + Math.random() * 6; }

    /* 히트박스는 보이는 것보다 작게 잡는다.
       스치기만 해도 죽으면 억울해서 다시 안 한다. */
    var hx = px - PW/2 + 8, hw = PW - 16;
    var hy = H - GROUND - PH + 8, hh = PH - 10;

    for(var i = blocks.length - 1; i >= 0; i--){
      var b = blocks[i];
      b.y += b.vy * dt;
      if(b.y > H){ blocks.splice(i, 1); continue; }
      if(b.x < hx + hw && b.x + b.w > hx && b.y < hy + hh && b.y + b.h > hy){
        if(b.kind === "item"){
          shield = Math.max(shield, b.o.d);
          say(b.o.say, 1.7);
          blocks.splice(i, 1);
        } else if(shield > 0){
          say(b.o.t + " 튕겨냈습니다", 1.1);
          blocks.splice(i, 1);             // 무적이면 튕겨 낸다
        } else {
          killedBy = b.o;
          return false;                    // 끝
        }
      }
    }
    return true;
  }

  /* ── 그리기 ──────────────────────────────────────────────── */
  function roundRect(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawHouse(x, y){
    /* 집 한 채. 무적일 때는 금색 테를 두른다(먹은 걸 알아야 한다). */
    var w = PW, h = PH, bx = x - w/2;
    if(shield > 0){
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(elapsed * 12);
      ctx.fillStyle = GOLD;
      ctx.beginPath(); ctx.arc(x, y - h/2 + 4, w * 0.86, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = INK;
    ctx.beginPath();                          // 지붕
    ctx.moveTo(bx - 5, y - h + 15);
    ctx.lineTo(x, y - h - 3);
    ctx.lineTo(bx + w + 5, y - h + 15);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(bx, y - h + 14, w, h - 14);  // 몸통
    ctx.fillStyle = CANVAS;                   // 창문
    ctx.fillRect(bx + 9, y - h + 22, 11, 10);
    ctx.fillRect(bx + w - 20, y - h + 22, 11, 10);
    ctx.fillStyle = shield > 0 ? GOLD : CANVAS;
    ctx.fillRect(x - 5, y - 13, 10, 13);      // 문
  }

  function draw(){
    ctx.fillStyle = CANVAS;
    ctx.fillRect(0, 0, W, H);

    /* 바닥 */
    ctx.fillStyle = HAIR;
    ctx.fillRect(0, H - GROUND, W, 1.5);

    /* 떨어지는 것들 */
    ctx.font = "700 15px Pretendard, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    blocks.forEach(function(b){
      if(b.kind === "item"){
        ctx.fillStyle = "#FFFFFF";
        roundRect(b.x, b.y, b.w, b.h, 9); ctx.fill();
        ctx.strokeStyle = GREEN; ctx.lineWidth = 2;
        roundRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 8); ctx.stroke();
        ctx.fillStyle = GREEN;
      } else {
        ctx.fillStyle = RED;
        roundRect(b.x, b.y, b.w, b.h, 9); ctx.fill();
        ctx.fillStyle = "#FFFFFF";
      }
      ctx.fillText(b.o.t, b.x + b.w/2, b.y + b.h/2 + 0.5);
    });

    drawHouse(px, H - GROUND);

    /* 🔴 한마디를 판 안에 그리지 않는다(2026-09-01 스크린샷에서 잡음).
       처음에는 화면 가운데에 띄웠는데 **떨어지는 세금을 가려서** 피할 수가 없었다.
       연출이 게임을 방해하면 연출이 아니라 버그다. 판 위 DOM 줄로 뺐다(hud 참조). */

    /* 아래 안내 한 줄 */
    ctx.font = "600 12px Pretendard, -apple-system, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText("화면 아무 데나 손가락을 대고 움직이세요", W/2, H - 22);
  }

  /* ── 점수 표기 ────────────────────────────────────────────
     초를 그대로 쓰면 게임 점수처럼 보인다. 1초를 한 달로 세면
     "4년 3개월 버텼다"가 되어 이야기가 된다. */
  function held(sec){
    var m = Math.floor(sec), y = Math.floor(m / 12), mm = m % 12;
    if(y <= 0) return mm + "개월";
    return y + "년" + (mm ? " " + mm + "개월" : "");
  }

  function hud(){
    $("tScore").textContent = held(elapsed);
    var s = $("tShield");
    if(shield > 0){ s.classList.remove("hide"); s.textContent = "무적 " + shield.toFixed(1) + "초"; }
    else s.classList.add("hide");
    /* 한마디 — 판 바로 위 한 줄. 자리는 늘 잡아 두어 판이 위아래로 튀지 않게 한다 */
    var y = $("tSay");
    if(y){
      var t = toast ? toast.t : "";
      if(y.textContent !== t) y.textContent = t;
      y.classList.toggle("on", !!toast);
    }
  }

  function loop(t){
    if(!running) return;
    if(!lastT) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000);   // ⚠️ 탭 복귀 시 순간이동 방지
    lastT = t;
    var alive = step(dt);
    /* 오래 버틸수록 반주가 빨라진다 — 60초면 최고 속도 */
    if(window.SBBgm) SBBgm.setPace(elapsed / 60);
    draw(); hud();
    if(!alive){ over(); return; }
    raf = requestAnimationFrame(loop);
  }

  /* 회피 봇 — 난이도를 재기 위한 것이지 게임에 쓰이지 않는다.
     화면을 24칸으로 나눠 "1.1초 안에 위험해지지 않는 칸" 중 지금 자리에서 가장 가까운 곳을 고른다.
     사람이 완벽하게 피했을 때 몇 초를 버티는지가 곧 난이도다. */
  function botAim(){
    var N = 24, bestX = px, bestCost = 1e9;
    for(var i = 0; i < N; i++){
      var x = (W - PW) * (i / (N - 1)) + PW/2;
      var lx = x - PW/2, rx = x + PW/2, risk = 0, lure = 0;
      for(var j = 0; j < blocks.length; j++){
        var b = blocks[j];
        var t = (H - GROUND - PH - (b.y + b.h)) / b.vy;      // 내 높이까지 남은 시간
        if(t < -0.3 || t > 1.1) continue;
        if(b.x < rx && b.x + b.w > lx){
          if(b.kind === "tax") risk += (1.2 - Math.max(0, t)) * 100;
          else lure += 30;
        }
      }
      var cost = risk - lure + Math.abs(x - px) * 0.25;
      if(cost < bestCost){ bestCost = cost; bestX = x; }
    }
    return bestX;
  }

  function best(v){
    try{
      var b = +(localStorage.getItem("tax_best") || 0);
      if(v != null && v > b){ localStorage.setItem("tax_best", String(v)); return v; }
      return b;
    }catch(e){ return v || 0; }
  }

  function over(){
    running = false;
    cancelAnimationFrame(raf);
    if(window.SBBgm) SBBgm.stop();
    var sec = elapsed, prev = best(null), rec = sec > prev;
    best(sec);
    var m = Math.floor(sec), grade = RANKS[RANKS.length - 1];
    for(var i = 0; i < RANKS.length; i++){ if(m < RANKS[i].m){ grade = RANKS[i]; break; } }
    $("tRes").textContent = held(sec);
    $("tHit").textContent = (killedBy ? "결국 " + killedBy.t + "에 맞았습니다. " : "") + grade.t;
    $("tTip").textContent = killedBy ? killedBy.tip : "";
    $("tBest").textContent = rec ? "최고 기록입니다" : "최고 기록 " + held(prev);
    $("tBest").classList.toggle("rec", rec);
    show("tEnd");
  }

  function begin(){
    show("tPlay");
    fit(); reset(); draw(); hud();
    running = true; lastT = 0;
    /* 소리는 여기서 시작한다 — 시작 버튼을 누른 직후라 브라우저가 허락한다.
       (사용자 동작 없이 미리 켜 두면 정책에 막혀 조용히 실패한다) */
    if(window.SBBgm){ SBBgm.setPace(0); SBBgm.start(); }
    raf = requestAnimationFrame(loop);
  }

  function stop(){
    running = false; cancelAnimationFrame(raf);
    if(window.SBBgm) SBBgm.stop();
  }

  /* 소리 켜고 끄기 — 버튼 글자도 여기서 맞춘다 */
  function paintSound(){
    var b = $("tSnd");
    if(!b || !window.SBBgm) return;
    var v = SBBgm.on();
    b.textContent = v ? "♪ 소리 켜짐" : "♪ 소리 꺼짐";
    b.classList.toggle("off", !v);
    b.setAttribute("aria-pressed", v ? "true" : "false");
  }

  /* ── 조작 ────────────────────────────────────────────────
     터치·마우스는 "손가락 있는 자리로 집이 온다". 좌우 버튼보다 이 편이 빠르고
     한 손으로 된다. 키보드는 데스크톱용 보조. */
  function bindInput(){
    /* 🔴 2026-08-31 석봉님: "아예 처음부터 다른 곳을 눌러도 집이 움직이게."
       판 안에서만 받으면 손가락을 판 위에 정확히 올려야 시작된다.
       그래서 **문서 전체**에서 받고, 게임 중일 때만 가로 위치를 판 좌표로 바꾼다.
       판 밖의 x 는 양 끝으로 붙는다(왼쪽 여백을 누르면 집이 왼쪽 끝으로). */
    function at(e){
      if(!running) return;
      /* ⚠️ 버튼 위에서 시작된 터치는 건드리지 않는다.
         여기서 preventDefault 를 걸면 그 뒤 click 이 안 나서 **소리 끄기 버튼이 죽는다**. */
      if(e.target && e.target.closest && e.target.closest("button")) return;
      var r = cv.getBoundingClientRect();
      var cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
      if(cx == null) return;
      aimX = Math.max(0, Math.min(W, cx - r.left));
      /* 게임 중에는 페이지가 따라 움직이면 안 된다. 게임이 아닐 때는 손대지 않는다 */
      if(e.cancelable) e.preventDefault();
    }
    document.addEventListener("touchstart", at, { passive: false });
    document.addEventListener("touchmove",  at, { passive: false });
    document.addEventListener("mousemove", at);
    document.addEventListener("mousedown", at);
    document.addEventListener("keydown", function(e){
      if(!running) return;
      if(e.key === "ArrowLeft"){ aimX = null; vx = -1; }
      if(e.key === "ArrowRight"){ aimX = null; vx = 1; }
    });
    document.addEventListener("keyup", function(e){
      if(e.key === "ArrowLeft" || e.key === "ArrowRight") vx = 0;
    });
    window.addEventListener("resize", function(){ if(cv && !cv.offsetParent) return; fit(); });
  }

  function init(opt){
    show = opt.show;
    cv = $("tCv");
    if(!cv) return null;
    fit(); bindInput();
    paintSound();
    var sb = $("tSnd");
    if(sb) sb.addEventListener("click", function(e){
      e.stopPropagation();
      SBBgm.setOn(!SBBgm.on());
      if(SBBgm.on()){
        SBBgm.blip();                    // 켰으면 한 번 울려 준다 — 소리가 닿는지 바로 안다
        if(running) SBBgm.start();
      }
      paintSound();
    });
    $("tAgain").addEventListener("click", begin);
    $("tShare").addEventListener("click", function(){
      /* 🔴 2026-09-01 석봉님 "공유하고 나도 해보기 누르니까 404".
         `location.pathname` 은 **이미 인코딩된 문자열**(`/%EB%86%80...`)이다.
         거기에 encodeURIComponent 를 또 걸어 `%25EB%25...` 가 되어 있던 주소가 나갔다.
         한글 파일명이라 눈으로는 멀쩡해 보인다. 지금 주소를 그대로 쓰는 게 옳고,
         본배포로 파일명이 바뀌어도 알아서 따라간다. */
      var url = location.origin + location.pathname;
      window.SBShare.any({
        title: "세금 피하기",
        desc: "취득세·양도세를 피해 집을 지키는 게임. 저는 " + held(elapsed) + " 버텼습니다.",
        image: "https://xn--2q1br1nnrasc92a76myvau64b.com/assets/og_tax.png",
        url: url, btn: "나도 해보기",
        text: "세금 피하기, 저는 " + held(elapsed) + " 버텼습니다.\n" + url
      }).then(function(how){ if(how === "clipboard") alert("주소를 복사했습니다."); });
    });
    return { start: begin, stop: stop,
      /* 검증용 — rAF 없이 로직만 돌린다(숨은 탭에서는 화면으로 확인할 수 없다).
         bot=true 면 "잘 피하는 사람"을 흉내 내 실제 난이도를 잰다.
         가만히 서 있는 결과만 보면 3초에 죽어서 난이도를 알 수 없다. */
      _sim: function(sec, dt, bot){
        dt = dt || 0.016; fit(); reset();
        var n = Math.round(sec / dt), alive = true;
        for(var i = 0; i < n && alive; i++){ aimX = bot ? botAim() : px; alive = step(dt); }
        /* 죽었으면 진짜 게임과 같은 경로로 끝낸다 — 결과 화면 문구까지 확인해야
           "화면에 뜬 것"을 봤다고 할 수 있다(라이브 확인 규칙). */
        if(!alive) over();
        return { alive: alive, elapsed: +elapsed.toFixed(1), held: held(elapsed),
                 blocks: blocks.length, killedBy: killedBy && killedBy.t, speed: Math.round(speed()) };
      },
      _paint: function(){ draw(); hud(); },      // 시뮬레이션 뒤 그 장면을 그려 눈으로 본다
      /* aim 을 함께 내보낸다 — 판 밖을 눌렀을 때 목표가 잡히는지는
         px 로는 확인이 안 된다(px 는 프레임이 돌아야 따라간다). */
      _state: function(){ return { running: running, W: W, H: H,
        px: Math.round(px), aim: aimX == null ? null : Math.round(aimX) }; } };
  }

  return { init: init };
})();
