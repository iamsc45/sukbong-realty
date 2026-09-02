/* 층 올리기 — 2026-09-02 석봉님 확정("층 올리기 괜찮을 것 같아")
 * ===========================================================================
 * 오락실 스태커의 규칙에 건물을 입혔다. 조작은 **탭 하나**뿐이다.
 *   ① 층이 좌우로 왔다 갔다 한다. 누르면 그 자리에 얹힌다.
 *   ② 아래층과 어긋난 만큼 잘려 나가 다음 층이 좁아진다.
 *   ③ 딱 맞추면 「정확」이 뜨고 폭이 조금 돌아온다(연속이면 더).
 *   ④ 완전히 빗나가면 끝. 점수는 올린 층수.
 *
 * 🔑 왜 이 게임인가 — 세금 피하기가 「피하기」라 새 게임은 **동사가 달라야** 새롭다.
 *    쌓기는 건물 그 자체라 부동산을 억지로 갖다 붙일 것이 없고, 조작이 탭 하나뿐이라
 *    누구나 첫 판을 한다. 점수가 「32층」이라 자랑하기도 좋다.
 *
 * ⚠️ 층에 **실제 가격을 붙이지 않는다.** 「32층 = 얼마」로 읽히면 틀린 정보가 된다.
 *    부동산 맛은 층수 마일스톤(빌라·아파트·주상복합)으로만 낸다.
 *
 * 구조는 `game_tax.js` 와 같다 — init({show, onEnd}) 로 시작하고,
 * 결과 화면·랭킹·공유는 호스트(놀이터 페이지)가 맡는다.
 */
window.StackGame = (function(){
  "use strict";

  /* 색 — 놀이터와 같은 A안 네오브루탈 */
  var PAPER = "#FFFCF2", INK = "#16130F", POP = "#FF5C39",
      SUN = "#FFD84D", WIN = "#2FBF71";

  var FH = 30;              // 층 높이(논리 px)
  var GROUND = 54;          // 바닥 두께
  /* 🔴 화면에 보이는 층 수는 **고정하면 안 된다**(2026-09-02 첫 화면에서 잡았다).
     쌓인 층 위에 **움직이는 층 한 칸**이 더 올라가므로 그 몫까지 빼야 한다.
     12로 박아 뒀더니 맨 위 움직이는 층이 캔버스 밖으로 잘려 안 보였다.
     그래서 `fit()` 에서 화면 높이로 계산한다. */
  var VIS = 11;             // fit() 이 다시 정한다
  var W0 = 300;             // 첫 층 폭
  /* ⚠️ 「정확」 판정이 후하면 폭이 안 줄어 게임이 안 끝난다.
     6px 이면 봇이 30층을 넘게 쌓아도 첫 폭 그대로였다. 4px 로 좁혔다. */
  var PERFECT = 4;
  var MINW = 20;            // 이보다 좁아지면 사실상 끝

  /* 난이도 — 세금 피하기에서 배운 대로 손잡이를 **둘로** 나눈다.
     START = 시작이 얼마나 빠른가(앞) · ACCEL = 층마다 얼마나 빨라지는가(뒤).
     앞이 지루하면 START 만, 뒤가 싱거우면 ACCEL 만 만진다. */
  var START = 165;          // 1층의 좌우 속도(px/s)
  var ACCEL = 7.5;          // 층마다 더해지는 속도
  var SPDMAX = 480;
  var WIND_FROM = 20;       // 이 층부터 바람이 분다(좌우로 미세하게 흔들림)

  /* 층수 마일스톤 — 오래 쌓는 게 전부인 게임이라 중간에 아무 일도 없으면 지겹다.
     🔴 여기 문구는 **연출일 뿐 판정에 관여하지 않는다.** 부동산 수치는 한 줄도 안 쓴다. */
  var MILE = [
    { n: 5,  t: "5층. 빌라 한 채가 됐습니다" },
    { n: 10, t: "10층. 이제 아파트라고 부를 만합니다" },
    { n: 15, t: "15층. 동네에서 눈에 띕니다" },
    { n: 20, t: "20층. 주상복합급입니다 — 바람이 붑니다" },
    { n: 25, t: "25층. 여기서부터는 손이 떨립니다" },
    { n: 30, t: "30층. 랜드마크 소리를 듣습니다" },
    { n: 40, t: "40층. 이 동네 스카이라인이 바뀝니다" },
    { n: 50, t: "50층. 전설입니다" }
  ];
  /* 결과 첫 줄 — 낮게 끝나도 웃으면서 다시 누르게 만드는 자리 */
  var RANKS = [
    { n: 3,   t: "기초 공사만 하고 끝났습니다" },
    { n: 6,   t: "아직 상가도 못 올렸습니다" },
    { n: 10,  t: "빌라 한 채는 세우셨습니다" },
    { n: 15,  t: "아파트 소리를 들을 만합니다" },
    { n: 20,  t: "꽤 높이 올리셨습니다" },
    { n: 30,  t: "주상복합급입니다" },
    { n: 40,  t: "이 동네 랜드마크입니다" },
    { n: 999, t: "전설로 남으실 분입니다" }
  ];

  var cv, ctx, DPR = 1, W = 340, H = 460;
  var show = null, onEnd = null, raf = 0, running = false, lastT = 0;
  var floors = [], moving = null, combo = 0, mileIdx = 0, cut = null;
  var toast = null, lastGap = 0;

  var $ = function(id){ return document.getElementById(id); };

  function say(t, sec){ toast = { t: t, left: sec || 1.8 }; }

  /* ── 화면 크기 ────────────────────────────────────────────────
     ⚠️ 세금 피하기와 같은 규칙 — 폰은 주소창 때문에 실제 보이는 높이가 작다. */
  function fit(){
    if(!cv) return;
    var box = cv.parentNode;
    W = Math.max(280, Math.min(520, box.clientWidth || 340));
    var room = (window.innerHeight || 700) - 250;
    H = Math.max(380, Math.min(560, room));
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = W + "px";
    cv.style.height = H + "px";
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx = cv.getContext("2d");
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    /* 쌓인 층 + 움직이는 층 한 칸이 모두 들어가야 한다. 넉넉히 한 칸 더 뺀다. */
    VIS = Math.max(6, Math.floor((H - GROUND) / FH) - 2);
  }

  /* ── 그리기 ──────────────────────────────────────────────────
     네오브루탈 기본 부품 — 채움 + 먹선 + **블러 없는** 오프셋 그림자 */
  function slab(x, y, w, h, fill, off){
    var d = off === undefined ? 4 : off;
    ctx.fillStyle = INK; ctx.fillRect(x + d, y + d, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeRect(x, y, w, h);
  }

  function draw(){
    if(!ctx) return;
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);

    /* 배경 — 옅은 가로줄. 높이 감각을 준다 */
    ctx.strokeStyle = "rgba(22,19,15,.06)"; ctx.lineWidth = 1.5;
    for(var gy = 40; gy < H; gy += 60){
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }

    var baseY = H - GROUND;
    var n = floors.length;
    var from = Math.max(0, n - VIS);

    /* 바닥(대지) — 맨 아래 층이 아직 화면에 있을 때만 */
    if(from === 0){
      ctx.strokeStyle = INK; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W, baseY); ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.rect(0, baseY, W, H - baseY); ctx.clip();
      ctx.strokeStyle = "rgba(22,19,15,.15)"; ctx.lineWidth = 2.5;
      for(var sx = -60; sx < W + 70; sx += 18){
        ctx.beginPath(); ctx.moveTo(sx, H); ctx.lineTo(sx + 42, baseY); ctx.stroke();
      }
      ctx.restore();
    }

    /* 쌓인 층 — 주황·흰색을 번갈아(놀이터 공통 규칙) */
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for(var i = from; i < n; i++){
      var f = floors[i];
      var y = baseY - (i - from + 1) * FH;
      slab(f.x, y, f.w, FH - 3, f.perfect ? SUN : (i % 2 ? "#FFFFFF" : POP), 4);
      /* 층 번호는 다섯 층마다 하나만. 다 적으면 지저분하다 */
      if((i + 1) % 5 === 0 && f.w > 60){
        ctx.font = "800 13px Pretendard, -apple-system, sans-serif";
        ctx.fillStyle = f.perfect ? INK : (i % 2 ? INK : "#FFFFFF");
        ctx.fillText((i + 1) + "F", f.x + 9, y + (FH - 3) / 2);
      }
    }

    /* 잘려 떨어지는 조각 — 「어긋났다」를 눈으로 알린다 */
    if(cut){
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, cut.life));
      slab(cut.x, cut.y, cut.w, FH - 3, "#C9C3B4", 3);
      ctx.restore();
    }

    /* 아래가 잘렸으면 밑동을 흐린다 — 뚝 자르면 건물이 공중에 뜬 것처럼 보인다 */
    if(from > 0){
      var fade = ctx.createLinearGradient(0, H - 150, 0, H);
      fade.addColorStop(0, "rgba(255,252,242,0)");
      fade.addColorStop(1, PAPER);
      ctx.fillStyle = fade; ctx.fillRect(0, H - 150, W, 150);
      ctx.font = "800 14px Pretendard, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(22,19,15,.42)";
      ctx.textAlign = "center";
      ctx.fillText("▼ 아래로 " + from + "층 더", W / 2, H - 26);
      ctx.textAlign = "left";
    }

    /* 지금 움직이는 층 + 어디에 얹힐지 보여 주는 안내선 */
    if(moving){
      var my = baseY - (n - from + 1) * FH;
      slab(moving.x, my, moving.w, FH - 3, WIN, 5);
      ctx.save();
      ctx.setLineDash([6, 6]); ctx.lineWidth = 2.5;
      ctx.strokeStyle = "rgba(22,19,15,.35)";
      ctx.beginPath();
      ctx.moveTo(moving.x, my + FH); ctx.lineTo(moving.x, baseY);
      ctx.moveTo(moving.x + moving.w, my + FH); ctx.lineTo(moving.x + moving.w, baseY);
      ctx.stroke(); ctx.restore();
    }
  }

  /* ── 상태 ────────────────────────────────────────────────── */
  function reset(){
    floors = [{ x: (W - W0) / 2, w: Math.min(W0, W - 40) }];
    combo = 0; mileIdx = 0; cut = null; toast = null; lastGap = 0;
    nextFloor();
    say("눌러서 얹으세요", 1.6);
  }

  function speed(){
    return Math.min(SPDMAX, START + (floors.length - 1) * ACCEL);
  }

  function nextFloor(){
    var prev = floors[floors.length - 1];
    /* 새 층은 화면 왼쪽 끝에서 출발한다. 방향은 번갈아 — 늘 같은 쪽이면 외워진다 */
    var fromLeft = floors.length % 2 === 1;
    moving = {
      x: fromLeft ? 4 : W - prev.w - 4,
      w: prev.w,
      dir: fromLeft ? 1 : -1,
      t: 0
    };
  }

  /* 지금 층을 얹는다 — 이 게임의 전부다 */
  function place(){
    if(!running || !moving) return;
    var prev = floors[floors.length - 1];
    var off = moving.x - prev.x;
    var overlap = Math.min(prev.x + prev.w, moving.x + moving.w) -
                  Math.max(prev.x, moving.x);
    lastGap = Math.round(Math.abs(off));

    if(overlap <= 0 || overlap < MINW){        // 완전히 빗나갔다
      cut = { x: moving.x, y: (H - GROUND) - (Math.min(floors.length, VIS) + 1) * FH,
              w: moving.w, life: 1 };
      over();
      return;
    }

    if(Math.abs(off) <= PERFECT){
      /* 🔑 정확 — 폭이 조금 **돌아온다**. 이게 없으면 무조건 좁아지기만 해서
         잘하는 사람도 30층에서 막힌다. 연속이면 더 돌려준다. */
      combo++;
      var back = combo >= 3 ? 16 : (combo === 2 ? 12 : 8);
      var nw = Math.min(Math.min(W0, W - 40), prev.w + back);
      var nx = prev.x - (nw - prev.w) / 2;
      nx = Math.max(0, Math.min(W - nw, nx));
      floors.push({ x: nx, w: nw, perfect: true });
      say(combo >= 2 ? ("정확! " + combo + "연속 — 폭 +" + back) : "정확!", 1.3);
    } else {
      combo = 0;
      /* 잘려 나가는 쪽을 조각으로 남겨 떨어뜨린다 */
      var cx = off > 0 ? (prev.x + prev.w) : moving.x;
      cut = { x: cx, y: (H - GROUND) - (Math.min(floors.length, VIS) + 1) * FH,
              w: Math.abs(off), life: 1 };
      floors.push({ x: Math.max(prev.x, moving.x), w: overlap });
    }

    /* 마일스톤 */
    while(mileIdx < MILE.length && floors.length >= MILE[mileIdx].n){
      say(MILE[mileIdx].t, 2.1);
      mileIdx++;
    }
    nextFloor();
  }

  function step(dt){
    if(cut){ cut.life -= dt * 1.6; cut.y += dt * 420; if(cut.life <= 0) cut = null; }
    if(toast){ toast.left -= dt; if(toast.left <= 0) toast = null; }
    if(!moving) return true;

    moving.t += dt;
    var sp = speed();
    /* 20층부터 바람 — 좌우로 미세하게 흔들려 조준이 어려워진다 */
    if(floors.length >= WIND_FROM){
      sp += Math.sin(moving.t * 6.5) * 42;
    }
    moving.x += moving.dir * sp * dt;
    if(moving.x < 0){ moving.x = 0; moving.dir = 1; }
    if(moving.x + moving.w > W){ moving.x = W - moving.w; moving.dir = -1; }
    return true;
  }

  function hud(){
    var s = $("sScore"); if(s) s.textContent = floors.length + "층";
    var y = $("sSay");
    if(y){
      var t = toast ? toast.t : "";
      if(y.textContent !== t){
        y.textContent = t;
        if(t){ y.classList.remove("pop"); void y.offsetWidth; y.classList.add("pop"); }
      }
      y.classList.toggle("on", !!toast);
    }
  }

  function loop(t){
    if(!running) return;
    if(!lastT) lastT = t;
    var dt = Math.min(0.05, (t - lastT) / 1000);   // 탭 복귀 시 순간이동 방지
    lastT = t;
    step(dt); draw(); hud();
    raf = requestAnimationFrame(loop);
  }

  function begin(){
    fit(); reset();
    running = true; lastT = 0;
    show("sPlay");
    draw(); hud();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    if(window.SBBgm) SBBgm.play("tax_market");   // 박자가 분명해 타이밍 게임과 맞는다
  }

  function stop(){
    running = false; cancelAnimationFrame(raf);
    if(window.SBBgm) SBBgm.stop();
  }

  function grade(n){
    for(var i = 0; i < RANKS.length; i++) if(n <= RANKS[i].n) return RANKS[i].t;
    return RANKS[RANKS.length - 1].t;
  }

  function over(){
    running = false; cancelAnimationFrame(raf);
    if(window.SBBgm) SBBgm.stop();
    draw();
    var n = floors.length;
    if(onEnd) onEnd(n, { grade: grade(n), gap: lastGap });
  }

  /* ── 조작 ────────────────────────────────────────────────────
     화면 아무 데나 · 스페이스 · 방향키. 어느 것으로도 얹힌다.
     ⚠️ 버튼 위에서 누른 것은 빼야 한다(소리 버튼을 누르면 층이 얹히면 곤란하다). */
  function bindInput(){
    function tap(e){
      if(!running) return;
      var el = e.target;
      while(el && el !== document.body){
        var tag = (el.tagName || "").toLowerCase();
        if(tag === "button" || tag === "a" || tag === "select" || tag === "input") return;
        el = el.parentNode;
      }
      place();
    }
    document.addEventListener("pointerdown", tap);
    document.addEventListener("keydown", function(e){
      if(!running) return;
      if(e.key === " " || e.key === "Spacebar" || e.key === "ArrowLeft" ||
         e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "Enter"){
        e.preventDefault();
        place();
      }
    });
    window.addEventListener("resize", function(){
      if(!cv || !cv.offsetParent) return;
      fit();
      /* 폭이 바뀌면 층이 화면 밖으로 나갈 수 있다 — 안쪽으로 당겨 둔다 */
      floors.forEach(function(f){ if(f.x + f.w > W) f.x = Math.max(0, W - f.w); });
      if(moving && moving.x + moving.w > W) moving.x = Math.max(0, W - moving.w);
      draw();
    });
  }

  function init(opt){
    show = opt.show;
    onEnd = opt.onEnd || null;
    cv = $("sCv");
    if(!cv) return null;
    fit(); bindInput();
    return {
      start: begin, stop: stop,
      /* 검증용 — rAF 없이 로직만 돌린다(숨은 탭에서는 화면으로 확인할 수 없다).
         bot=true 면 「늘 정확히 맞추는 사람」을 흉내 낸다. 사람은 그만큼 못 하지만
         **위로 갈수록 얼마나 빨라지는지**를 재는 데는 이쪽이 정확하다. */
      _sim: function(taps, dt, bot){
        dt = dt || 0.016; fit(); reset(); running = true;
        for(var k = 0; k < taps && running; k++){
          /* 봇: 아래층과 겹치는 순간을 노린다. err 로 사람의 손 떨림을 흉내 낸다 */
          var guard = 0;
          while(running && guard++ < 4000){
            step(dt);
            if(!moving) break;
            var prev = floors[floors.length - 1];
            var err = bot ? (Math.random() - 0.5) * 10 : 0;
            if(Math.abs(moving.x - prev.x + err) <= 3){ place(); break; }
          }
        }
        return { alive: running, floors: floors.length,
                 speed: Math.round(speed()), gap: lastGap };
      },
      _paint: function(){ draw(); hud(); },
      _state: function(){ return { running: running, W: W, H: H,
        floors: floors.length, w: moving ? Math.round(moving.w) : null }; }
    };
  }

  return { init: init };
})();
