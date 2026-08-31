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
    { t: "비과세",   d: 4 },
    { t: "장기보유", d: 4 },
    { t: "1주택",    d: 5 }
  ];

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
    var room = (window.innerHeight || 700) - 210;    // 상단 헤더·하단 안내 자리
    H = Math.max(380, Math.min(600, room));
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
    elapsed = 0; blocks = []; shield = 0; spawnT = 0.6; itemT = 7;
    killedBy = null; vx = 0; aimX = null; px = W / 2;
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
  function speed(){ return Math.min(560, 170 + elapsed * 9); }
  function gap(){ return Math.max(0.34, 1.05 - elapsed * 0.022); }

  function step(dt){
    elapsed += dt;
    if(shield > 0) shield = Math.max(0, shield - dt);

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
          blocks.splice(i, 1);
        } else if(shield > 0){
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

    /* 아래 안내 한 줄 */
    ctx.font = "600 12px Pretendard, -apple-system, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText("손가락을 좌우로 움직이세요", W/2, H - 22);
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
  }

  function loop(t){
    if(!running) return;
    if(!lastT) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000);   // ⚠️ 탭 복귀 시 순간이동 방지
    lastT = t;
    var alive = step(dt);
    draw(); hud();
    if(!alive){ over(); return; }
    raf = requestAnimationFrame(loop);
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
    var sec = elapsed, prev = best(null), rec = sec > prev;
    best(sec);
    $("tRes").textContent = held(sec);
    $("tHit").textContent = killedBy ? "결국 " + killedBy.t + "에 맞았습니다." : "";
    $("tTip").textContent = killedBy ? killedBy.tip : "";
    $("tBest").textContent = rec ? "최고 기록입니다" : "최고 기록 " + held(prev);
    $("tBest").classList.toggle("rec", rec);
    show("tEnd");
  }

  function begin(){
    show("tPlay");
    fit(); reset(); draw(); hud();
    running = true; lastT = 0;
    raf = requestAnimationFrame(loop);
  }

  function stop(){ running = false; cancelAnimationFrame(raf); }

  /* ── 조작 ────────────────────────────────────────────────
     터치·마우스는 "손가락 있는 자리로 집이 온다". 좌우 버튼보다 이 편이 빠르고
     한 손으로 된다. 키보드는 데스크톱용 보조. */
  function bindInput(){
    function at(e){
      var r = cv.getBoundingClientRect();
      var cx = (e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX);
      aimX = Math.max(0, Math.min(W, cx - r.left));
    }
    cv.addEventListener("touchstart", function(e){ at(e); e.preventDefault(); }, { passive: false });
    cv.addEventListener("touchmove",  function(e){ at(e); e.preventDefault(); }, { passive: false });
    cv.addEventListener("mousemove", at);
    cv.addEventListener("mousedown", at);
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
    $("tAgain").addEventListener("click", begin);
    $("tShare").addEventListener("click", function(){
      var url = "https://xn--2q1br1nnrasc92a76myvau64b.com/" +
                encodeURIComponent(location.pathname.split("/").pop());
      window.SBShare.any({
        title: "세금 피하기",
        desc: "취득세·양도세를 피해 집을 지키는 게임. 저는 " + held(elapsed) + " 버텼습니다.",
        image: "https://xn--2q1br1nnrasc92a76myvau64b.com/assets/og_tax.png",
        url: url, btn: "나도 해보기",
        text: "세금 피하기, 저는 " + held(elapsed) + " 버텼습니다.\n" + url
      }).then(function(how){ if(how === "clipboard") alert("주소를 복사했습니다."); });
    });
    return { start: begin, stop: stop,
      /* 검증용 — rAF 없이 로직만 돌린다(숨은 탭에서는 화면으로 확인할 수 없다) */
      _sim: function(sec, dt){
        dt = dt || 0.016; fit(); reset();
        var n = Math.round(sec / dt), alive = true;
        for(var i = 0; i < n && alive; i++){ aimX = px; alive = step(dt); }
        return { alive: alive, elapsed: +elapsed.toFixed(1), held: held(elapsed),
                 blocks: blocks.length, killedBy: killedBy && killedBy.t, speed: Math.round(speed()) };
      },
      _state: function(){ return { running: running, W: W, H: H, px: Math.round(px) }; } };
  }

  return { init: init };
})();
