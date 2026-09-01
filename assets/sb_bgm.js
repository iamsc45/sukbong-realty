/* 놀이터 배경음 — 2026-08-31 신설, 2026-09-01 재생 방식을 통째로 바꿈
 * ===========================================================================
 * 🔴 왜 다시 만들었나 — "모바일은 소리가 안 나온다"(석봉님, 세 번째)
 *   앞 판은 Web Audio 로 **실시간 연주**했다. PC 에서는 났는데 폰에서 안 났다.
 *   iOS 는 **측면 무음 스위치가 켜져 있으면 Web Audio 소리를 아예 막는다.**
 *   무음 오디오를 틀어 두는 우회를 넣어 봤지만 그것도 안 통했다.
 *   ⚠️ 그런데 **`<audio>` 로 재생하는 소리는 「미디어」로 취급**되어 나는 경우가 많다.
 *
 *   그래서 경로를 바꿨다 —
 *     ①곡 한 바퀴를 **OfflineAudioContext 로 미리 렌더**해서
 *     ②WAV 로 만들고(파일이 아니라 메모리의 Blob 이다. 서버에 올리는 것은 없다)
 *     ③**`<audio loop>` 로 재생**한다.
 *   여전히 음원 파일은 0바이트이고, 곡은 코드가 만든다. 재생 통로만 바뀌었다.
 *
 *   덤 — 템포는 `playbackRate` 로 올린다. 음까지 같이 높아지는데
 *   추격 음악에서는 그게 오히려 조여드는 느낌을 준다.
 *
 * 곡은 게임마다 다르다(2026-09-01 석봉님) —
 *   tax     : 만화 추격. 반음으로 기어오르는 베이스, 종종거리는 리드, 마디 끝 옥타브 점프
 *   quiz    : 퀴즈쇼. 째깍이는 저음 위에 맑은 아르페지오. 생각할 자리를 남긴다
 *   balance : 갸우뚱 왈츠. 3박자라 앞의 둘과 확실히 다르게 들린다
 */
window.SBBgm = (function(){
  "use strict";

  /* ── 곡 ─────────────────────────────────────────────────────────
     숫자는 MIDI 음높이, null 은 쉼표. `beats` 는 한 칸의 길이 배수다.
     ⚠️ **마지막 두 칸은 비워 둔다** — 루프 이음매에서 음이 잘리면 "딱" 소리가 난다. */
  var SONGS = {
    /* 🎵 세금 피하기 후보 넷 — 2026-09-02 석봉님 "다른 걸로 교체, 샘플을 들려 달라".
       고르시면 `tax` 를 그 곡으로 바꾼다. 성격을 확실히 갈랐다(음만 다른 게 아니다). */
    tax: {   /* ① 종종걸음 — 지금 곡의 정리판. 파형·볼륨을 다시 잡아 탁함을 걷어냈다 */
      bpm: 132, div: 4, steps: 32, gain: 0.62,
      lead: [69, 69, 71, 72,  74, null, 72, 74,   76, 76, 77, 76,  74, null, 72, null,
             69, 69, 71, 72,  74, null, 76, 77,   81, null, 79, 77,  76, 74, null, null],
      bass: [45, null, 45, 46,  47, null, 47, 48,   45, null, 45, 46,  47, 48, 49, 50,
             45, null, 45, 46,  47, null, 47, 48,   52, null, 51, 50,  49, 48, null, null],
      pop:  { 15: 88 },
      kick: [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27],
      hat:  [2, 4, 6, 10, 12, 14, 18, 20, 22, 26, 28],
      leadType: "square", leadDur: 0.075, leadVol: 0.30,
      bassType: "triangle", bassVol: 0.40, kickVol: 0.62, hatVol: 0.20
    },
    /* ② 계단 오르기 — 반음씩 기어오른다. 음이 적어 조용한데 자꾸 조여든다.
       ⚠️ 소리가 적으면 오래 들어도 안 질린다. 오래 버티는 게임에는 이쪽이 맞을 수 있다. */
    tax_stair: {
      bpm: 124, div: 4, steps: 32, gain: 0.60,
      lead: [64, null, 65, null,  66, null, 67, null,   68, null, 69, null,  71, null, null, null,
             64, null, 65, null,  66, null, 68, null,   69, null, 71, null,  72, null, null, null],
      bass: [40, null, null, null,  40, null, 41, null,   41, null, null, null,  43, null, null, null,
             40, null, null, null,  40, null, 41, null,   43, null, null, null,  44, null, null, null],
      pop:  { 30: 76 },
      kick: [0, 4, 8, 12, 16, 20, 24, 28],
      hat:  [2, 6, 10, 14, 18, 22, 26, 30],
      leadType: "triangle", leadDur: 0.16, leadVol: 0.40,
      bassType: "sine", bassVol: 0.46, kickVol: 0.58, hatVol: 0.14
    },
    /* ③ 시장통 — 3+3+2 로 튀는 리듬. 밝고 익살스럽다. 「똥 피하기」의 그 느낌에 가깝다 */
    tax_market: {
      bpm: 140, div: 4, steps: 32, gain: 0.60,
      lead: [72, null, 72, 76,  null, 79, null, 76,   74, null, 74, 77,  null, 81, null, 77,
             72, null, 72, 76,  null, 79, null, 81,   83, null, 81, 79,  77, 76, null, null],
      bass: [48, null, null, 48,  null, null, 48, null,   50, null, null, 50,  null, null, 50, null,
             48, null, null, 48,  null, null, 48, null,   43, null, null, 43,  null, 45, null, null],
      pop:  { 7: 91, 23: 93 },
      kick: [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30],
      hat:  [1, 4, 7, 9, 12, 15, 17, 20, 23, 25, 28, 31],
      leadType: "square", leadDur: 0.09, leadVol: 0.30,
      bassType: "triangle", bassVol: 0.42, kickVol: 0.60, hatVol: 0.18
    },
    /* ④ 초읽기 — 째깍거리는 저음 위로 리드가 드문드문. 시끄럽지 않은데 마음이 급해진다 */
    tax_clock: {
      bpm: 128, div: 4, steps: 32, gain: 0.58,
      lead: [null, null, 76, null,  null, null, 74, null,   null, null, 77, null,  null, null, 76, null,
             null, null, 79, null,  null, null, 77, null,   null, null, 81, 79,  77, null, null, null],
      bass: [40, null, 40, null,  40, null, 40, null,   40, null, 40, null,  40, null, 40, null,
             38, null, 38, null,  38, null, 38, null,   36, null, 36, null,  35, null, null, null],
      pop:  {},
      kick: [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
      hat:  [1, 5, 9, 13, 17, 21, 25, 29],
      leadType: "triangle", leadDur: 0.20, leadVol: 0.44,
      bassType: "sine", bassVol: 0.40, kickVol: 0.50, hatVol: 0.12
    },
    /* 퀴즈 — 답을 고르는 동안 깔린다. 몰아치면 방해가 되므로 **여백을 많이 둔다**.
       저음이 째깍째깍 두 박씩 짚고, 그 위에 맑은 삼각파가 천천히 돈다. */
    quiz: {
      bpm: 104, div: 4, steps: 32, gain: 0.62,
      lead: [76, null, null, null,  79, null, null, null,   83, null, null, 81,  79, null, null, null,
             76, null, null, null,  81, null, null, null,   79, null, null, 76,  74, null, null, null],
      bass: [45, null, null, null,  45, null, null, null,   50, null, null, null,  50, null, null, null,
             43, null, null, null,  43, null, null, null,   45, null, null, null,  45, null, null, null],
      pop:  {},
      kick: [0, 8, 16, 24],
      hat:  [4, 12, 20, 28],
      leadType: "triangle", leadDur: 0.30, leadVol: 0.42,
      bassVol: 0.34, kickVol: 0.5, hatVol: 0.16
    },
    /* 밸런스 — 둘 중 하나를 고민하는 시간. **3박자 왈츠**라 앞의 둘과 확실히 다르다.
       쿵-짝-짝 위에서 음이 갸우뚱거린다. */
    balance: {
      bpm: 116, div: 3, steps: 24, gain: 0.6,
      lead: [72, null, 76,  79, null, 76,   77, null, 74,  72, null, null,
             71, null, 74,  77, null, 74,   72, null, 71,  69, null, null],
      bass: [48, null, null,  55, null, null,   53, null, null,  48, null, null,
             47, null, null,  54, null, null,   52, null, null,  45, null, null],
      pop:  {},
      kick: [0, 6, 12, 18],
      hat:  [3, 9, 15, 21],
      leadType: "triangle", leadDur: 0.22, leadVol: 0.40,
      bassVol: 0.38, kickVol: 0.55, hatVol: 0.18
    }
  };

  var SR = 44100;
  var cache = {};            // 곡 이름 → Blob URL (한 번만 만든다)
  var el = null;             // 지금 재생 중인 <audio>
  var cur = null, on = false, pace = 0;
  var lastErr = "";
  /* 🔴 재생은 비동기다(WAV 를 만들고 <audio> 에 물리는 사이 시간이 흐른다).
     그 사이에 stop() 이 오면 **먼저 멈추고 뒤늦게 재생이 시작**된다 —
     2026-09-01 실측: 게임이 끝났는데 곡이 계속 흘렀다.
     그래서 재생마다 번호를 매기고, 자기 번호가 아니면 시작하지 않는다. */
  var token = 0;

  function hz(n){ return 440 * Math.pow(2, (n - 69) / 12); }

  /* ── 한 바퀴를 소리로 그린다(실제 재생은 안 한다) ───────────────── */
  function render(song){
    var spb = 60 / song.bpm / song.div;
    var dur = spb * song.steps;
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var oc = new OAC(1, Math.ceil(SR * dur), SR);

    var master = oc.createGain();
    master.gain.value = song.gain;
    /* 🔴 2026-09-02 석봉님 "세금 피하기 BGM 이 좀 깨진다" — 원인이 셋이었다.
       ①리드와 베이스가 **둘 다 사각파**라 배음이 쌓였다(이제 `bassType` 으로 고른다)
       ②킥 0.9 + 베이스 + 리드가 동시에 나면 **합이 1을 넘는데**
       ③마지막 `toWav` 가 1 을 넘는 값을 **하드 컷**으로 잘랐다 — 그 잘린 자리가 「깨짐」이다.
       압축기를 세게 걸어 누르면 이번엔 펌핑(숨쉬는 듯한 일렁임)이 생긴다.
       그래서 **압축을 부드럽게 하고, 마지막에 soft clip 으로 둥글게** 받는다. */
    var comp = oc.createDynamicsCompressor();
    comp.threshold.value = -6; comp.ratio.value = 3;
    comp.knee.value = 12; comp.attack.value = 0.006; comp.release.value = 0.18;
    /* 여유를 남겨 두는 마지막 단(headroom). 이 뒤는 soft clip 이 받는다 */
    var out = oc.createGain();
    out.gain.value = 0.86;
    master.connect(comp); comp.connect(out); out.connect(oc.destination);

    var noise = oc.createBuffer(1, SR * 0.2, SR), nd = noise.getChannelData(0);
    for(var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    function tone(type, f, t, d, vol){
      var o = oc.createOscillator(), g = oc.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(Math.min(dur, t + d + 0.02));
    }
    function kick(t, vol){
      var o = oc.createOscillator(), g = oc.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(Math.min(dur, t + 0.14));
    }
    function hat(t, vol){
      var s = oc.createBufferSource(), g = oc.createGain(), hp = oc.createBiquadFilter();
      s.buffer = noise; hp.type = "highpass"; hp.frequency.value = 7000;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      s.connect(hp); hp.connect(g); g.connect(master);
      s.start(t); s.stop(Math.min(dur, t + 0.05));
    }

    for(var k = 0; k < song.steps; k++){
      var t = k * spb;
      if(song.lead[k] != null) tone(song.leadType, hz(song.lead[k]), t, song.leadDur, song.leadVol);
      /* ⚠️ 베이스 파형을 곡이 고른다. 예전에는 무조건 square 라 리드와 겹쳐 탁해졌다 */
      if(song.bass[k] != null) tone(song.bassType || "triangle", hz(song.bass[k] - 12),
                                    t, spb * 1.1, song.bassVol);
      if(song.pop[k]) tone("triangle", hz(song.pop[k]), t, 0.10, 0.30);
      if(song.kick.indexOf(k) >= 0) kick(t, song.kickVol);
      if(song.hat.indexOf(k) >= 0) hat(t, song.hatVol);
    }
    return oc.startRendering();
  }

  /* AudioBuffer → WAV(16bit). `<audio>` 가 먹을 수 있는 모양으로 바꾼다. */
  function toWav(buf){
    var len = buf.length, sr = buf.sampleRate;
    var bytes = 44 + len * 2;
    var ab = new ArrayBuffer(bytes), v = new DataView(ab);
    function w(o, s){ for(var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
    w(0, "RIFF"); v.setUint32(4, bytes - 8, true); w(8, "WAVEfmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, "data"); v.setUint32(40, len * 2, true);
    var d = buf.getChannelData(0), o = 44;        // ⚠️ 루프 밖에서 한 번만 받는다(느려진다)
    /* 🔑 **피크를 재서 맞춘다(normalize)** — 2026-09-02.
       클리핑을 없애려고 눌렀더니 이번엔 소리가 너무 작아졌다(피크 0.35~0.47, 폰에서 안 들린다).
       곡마다 볼륨을 손으로 맞추면 새 곡을 넣을 때마다 다시 맞춰야 한다.
       그래서 **잰 다음 0.9 까지 끌어올린다** — 곡이 몇 개가 되든 소리 크기가 고르다. */
    var peak = 0;
    for(var i = 0; i < len; i++){ var av = d[i] < 0 ? -d[i] : d[i]; if(av > peak) peak = av; }
    var g = peak > 0.0001 ? Math.min(6, 0.9 / peak) : 1;
    /* soft clip 은 안전망으로 남긴다 — 1 을 넘는 값을 잘라내지 않고 둥글게 눕힌다.
       하드 컷은 파형에 각을 만들고 그 각이 귀에 「지직」으로 들린다(깨짐의 정체). */
    for(var i2 = 0; i2 < len; i2++){
      var s = Math.tanh(d[i2] * g);
      if(s < -1) s = -1; else if(s > 1) s = 1;
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      o += 2;
    }
    return URL.createObjectURL(new Blob([ab], { type: "audio/wav" }));
  }

  function build(name){
    if(cache[name]) return Promise.resolve(cache[name]);
    var song = SONGS[name];
    if(!song) return Promise.reject(new Error("모르는 곡: " + name));
    return render(song).then(function(buf){
      cache[name] = toWav(buf);
      return cache[name];
    });
  }

  /* 페이지가 열리면 조용히 미리 만들어 둔다 — 소리를 내지 않으므로 정책에 안 걸린다.
     시작 버튼을 눌렀을 때 바로 재생되어야 첫 소리가 늦지 않는다. */
  function warm(){
    try{
      build("tax").then(function(){ return build("quiz"); })
                  .then(function(){ return build("balance"); })
                  .catch(function(e){ lastErr = String(e && e.message || e); });
    }catch(e){ lastErr = String(e); }
  }

  function ensureEl(){
    if(el) return el;
    el = document.createElement("audio");
    el.loop = true;
    el.setAttribute("playsinline", "");     // iOS 에서 전체화면 플레이어가 뜨지 않게
    el.preload = "auto";
    el.volume = 1;
    document.body.appendChild(el);
    return el;
  }

  /* ── 재생 ──────────────────────────────────────────────────────
     🔴 2026-09-01 세 번째 시도 — "모바일은 여전히 소리가 안 난다"(석봉님).
        원인은 **재생을 시작한 자리**였다. iOS·안드로이드는 `audio.play()` 가
        **사용자가 누른 그 순간의 코드 안에서** 불려야 허락한다.
        우리는 `build(name).then(...)` 안에서 불렀다 — Promise 를 한 번만 거쳐도
        브라우저가 보기에는 "사용자가 안 누른 재생"이라 조용히 막힌다.
        그래서 **곡이 이미 준비돼 있으면 기다리지 않고 그 자리에서 튼다.**
        (곡 셋은 페이지가 열릴 때 warm() 이 미리 만들어 둔다) */
  function startEl(url, my){
    if(my !== token) return false;        // 그 사이 stop() 이나 다른 곡이 왔다
    var a = ensureEl();
    if(a.src !== url) a.src = url;
    a.playbackRate = 1;
    try{
      var p = a.play();
      /* ⚠️ 막히면 **조용히 지나가지 말고 기억해 둔다** — 다음 손짓에 이어서 튼다.
         전에는 lastErr 에만 적고 끝나서, 한 번 막히면 그 판은 내내 무음이었다. */
      if(p && p.catch) p.catch(function(e){
        lastErr = String(e && e.name || e);
        if(String(e && e.name) === "NotAllowedError" && my === token) pending = cur;
      });
    }catch(e){ lastErr = String(e); pending = cur; return false; }
    return true;
  }

  function play(name){
    if(!on) return Promise.resolve(false);
    cur = name;
    var my = ++token;
    /* 준비돼 있으면 **동기**로 — 이래야 브라우저가 "사용자가 누른 재생"으로 본다 */
    if(cache[name]) return Promise.resolve(startEl(cache[name], my));
    /* 아직 만드는 중이면 기다릴 수밖에 없다. 이 경우는 첫 진입 몇 백 ms 뿐이다 */
    return build(name).then(function(url){ return startEl(url, my); })
                      .catch(function(e){ lastErr = String(e && e.message || e); return false; });
  }

  function stop(){
    token++;                               // 아직 도착 안 한 재생을 무효로 만든다
    pending = null;                        // 밀린 곡도 취소한다(끝난 판의 곡이 되살아나면 안 된다)
    if(el){ try{ el.pause(); el.currentTime = 0; }catch(e){} }
  }

  /* 🔑 잠금 해제 — 게임을 고르는 **첫 손짓**에서 오디오를 한 번 깨워 둔다.
     한 번이라도 사용자 동작 안에서 play() 가 성공하면 그 `<audio>` 는
     그 뒤로 코드에서 자유롭게 틀 수 있다. 소리가 나면 안 되니 음소거로 켰다 끈다.
     ⚠️ 이 자체가 사용자 동작 안에서 불려야 뜻이 있다(호출부 참고). */
  var unlocked = false;
  var pending = null;        // 막혀서 못 튼 곡 — 다음 손짓에서 다시 시도한다
  function unlock(){
    if(unlocked || !on) return unlocked;
    var a = ensureEl();
    var url = cache.tax || cache.quiz || cache.balance;
    if(!url) return false;                 // 아직 안 만들어졌으면 다음 손짓에서
    try{
      a.src = url; a.muted = true;
      var p = a.play();
      var done = function(){
        try{ a.pause(); a.currentTime = 0; a.muted = false; }catch(e){}
        unlocked = true;
        if(pending){ var n = pending; pending = null; play(n); }   // 밀린 곡을 튼다
      };
      if(p && p.then) p.then(done).catch(function(){ try{ a.muted = false; }catch(e){} });
      else done();
    }catch(e){ try{ a.muted = false; }catch(e2){} }
    return unlocked;
  }

  /* 🔴 2026-09-02 석봉님 "이집 얼마일까요 할 때 BGM 이 안 나온다".
     원인은 곡이 아니라 **잠금 해제가 한 번만 시도되던 것**이었다.
     `unlock()` 은 곡이 아직 안 만들어졌으면 아무것도 안 하고 돌아가는데,
     호출부가 그 한 번으로 리스너를 지워 버렸다(`once`). 첫 손짓이 곡 준비보다
     빠르면 **잠금이 영영 안 풀리고** 그 뒤 모든 재생이 NotAllowedError 로 막힌다.
     세금 피하기가 되고 가격 퀴즈가 안 되는 것도 그저 **타이밍 차이**였다.
     그래서 잠금 해제를 이 파일이 스스로 챙긴다 — **풀릴 때까지** 손짓마다 다시 시도하고,
     막혀서 못 튼 곡은 기억해 두었다가 풀리는 순간 이어서 튼다. */
  function armUnlock(){
    if(!document || !document.addEventListener) return;
    var handler = function(){
      if(unlock()) {                       // 성공했을 때만 손을 뗀다
        document.removeEventListener("pointerdown", handler, true);
        document.removeEventListener("touchstart", handler, true);
        document.removeEventListener("click", handler, true);
      }
    };
    /* ⚠️ 캡처 단계(true)로 듣는다 — 버튼이 이벤트를 멈춰도 우리는 먼저 받는다 */
    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("touchstart", handler, true);
    document.addEventListener("click", handler, true);
  }

  /* 진행도 0~1 만큼 곡을 조인다. 음높이도 같이 올라가는데 추격곡에서는 그게 낫다.
     ⚠️ 퀴즈·밸런스는 호출하지 않는다(생각하는 화면에서 빨라지면 산만하다). */
  function setPace(v){
    pace = Math.min(1, Math.max(0, v || 0));
    if(el && cur === "tax") el.playbackRate = 1 + 0.48 * pace;
  }

  /* 짧은 확인음 — 켤 때 한 번. 같은 `<audio>` 통로를 쓰므로
     이게 들리면 게임 소리도 들린다는 뜻이다(그 판정이 이 소리의 목적이다). */
  function blipUrl(){
    if(cache.__blip) return Promise.resolve(cache.__blip);
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var oc = new OAC(1, Math.ceil(SR * 0.62), SR);
    var g0 = oc.createGain(); g0.gain.value = 0.9; g0.connect(oc.destination);
    [[660, 0.02], [880, 0.18], [1320, 0.34]].forEach(function(p){
      var o = oc.createOscillator(), g = oc.createGain();
      o.type = "square"; o.frequency.setValueAtTime(p[0], p[1]);
      g.gain.setValueAtTime(0.0001, p[1]);
      g.gain.exponentialRampToValueAtTime(0.5, p[1] + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, p[1] + 0.16);
      o.connect(g); g.connect(g0);
      o.start(p[1]); o.stop(p[1] + 0.18);
    });
    return oc.startRendering().then(function(b){
      cache.__blip = toWav(b);
      return cache.__blip;
    });
  }

  function blip(){
    return blipUrl().then(function(url){
      var a = document.createElement("audio");
      a.setAttribute("playsinline", "");
      a.src = url; a.volume = 1;
      var p = a.play();
      return (p && p.then) ? p.then(function(){ return true; })
                              .catch(function(e){ lastErr = String(e && e.name || e); return false; })
                           : true;
    }).catch(function(){ return false; });
  }

  /* 🔑 소리 시험 — "안 들린다"의 원인을 화면에서 가른다.
     이제 재생 통로가 `<audio>` 하나뿐이라 판정이 단순해졌다:
     재생이 시작됐는가(브라우저가 허락했는가) / 안 됐는가. */
  function test(){
    return blipUrl().then(function(url){
      var a = document.createElement("audio");
      a.setAttribute("playsinline", "");
      a.src = url; a.volume = 1;
      var p = a.play();
      var done = (p && p.then) ? p : Promise.resolve();
      return done.then(function(){
        return new Promise(function(res){
          setTimeout(function(){
            res({ ok: true,
                  why: "소리를 내보냈습니다(삐 소리 세 번). 이게 안 들리면 기기 쪽입니다 — "
                     + "아이폰은 <b>측면 무음 스위치</b>를 내리고, 안드로이드는 "
                     + "<b>미디어 음량</b>을 올린 뒤 다시 눌러 주세요." });
          }, 800);
        });
      }).catch(function(e){
        return { ok: false,
                 why: "브라우저가 소리를 막았습니다(" + (e && e.name || "재생 거부") + "). "
                    + "화면을 한 번 더 누른 뒤 다시 시험해 주세요." };
      });
    }).catch(function(e){
      return { ok: false, why: "이 브라우저에서는 소리를 만들 수 없습니다." };
    });
  }

  /* 켜고 끄기 — 선택은 기기에 남긴다 */
  function isOn(){
    try{ return localStorage.getItem("sb_bgm") !== "off"; }catch(e){ return true; }
  }
  function setOn(v){
    on = !!v;
    try{ localStorage.setItem("sb_bgm", on ? "on" : "off"); }catch(e){}
    if(!on) stop();
  }

  on = isOn();
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", warm);
  else warm();
  /* 🔑 잠금 해제를 **이 파일이 스스로** 챙긴다.
     전에는 화면 쪽에서 `pointerdown` 한 번만 듣고 지웠다 — 그 한 번이 곡 준비보다
     빠르면 영영 안 풀렸다(2026-09-02 가격 퀴즈 무음의 원인). 이제 풀릴 때까지 듣는다. */
  armUnlock();

  return {
    play: play, stop: stop, blip: blip, test: test, unlock: unlock,
    /* 소리를 다시 켰을 때 「아까 그 곡」으로 돌아간다 */
    resume: function(){ return cur ? play(cur) : Promise.resolve(false); },
    on: function(){ return on; },
    setOn: setOn,
    setPace: setPace,
    playing: function(){ return !!(el && !el.paused); },
    _dbg: function(){
      return { 곡: cur, 준비됨: Object.keys(cache),
               재생중: !!(el && !el.paused),
               현재시각: el ? +el.currentTime.toFixed(2) : null,
               길이: el ? +(el.duration || 0).toFixed(2) : null,
               배속: el ? +el.playbackRate.toFixed(3) : null,
               볼륨: el ? el.volume : null,
               켜짐: on, 잠금해제: unlocked, 마지막오류: lastErr };
    }
  };
})();
