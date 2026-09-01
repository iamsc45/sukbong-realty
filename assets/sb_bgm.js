/* 놀이터 배경음 — 2026-08-31 신설, 2026-09-01 전면 손질
 * ---------------------------------------------------------------------------
 * 왜 음원 파일을 안 쓰나
 *   ①남의 곡은 저작권이 걸린다 ②매일 자료를 올리는 사이트에 몇 MB 를 얹기 싫다
 *   ③파일이면 "점점 빨라지는" 연출을 못 한다. 그래서 브라우저가 그 자리에서 만든다.
 *
 * 🔴 2026-09-01 — "소리가 안 나온다"가 두 번 나왔다. 지금까지 밝혀진 것
 *   ①1차 원인은 **음량이 두 곳에서 곱해진 것**이었다(master 0.18 × 음 0.13 = 0.023).
 *     계측기(AnalyserNode)를 달아 진폭 5% 를 확인하고 고쳤다 → 41%.
 *   ②그런데도 안 들린다. 남은 후보는 **기기 쪽**이다 —
 *     · iOS 는 측면 무음 스위치가 켜져 있으면 웹 소리가 아예 안 난다
 *     · 안드로이드는 미디어 음량이 0 일 수 있다
 *     · 브라우저가 아직 재생을 허락하지 않았을 수 있다(state !== running)
 *   그래서 **셋을 화면에서 가려낼 수 있게** `test()` 를 만들었다. 짐작으로 고치지 않는다.
 *   그리고 iOS 무음 스위치는 **무음 오디오를 하나 틀어 두면 풀리는 경우가 있어** 같이 넣었다.
 *
 * ⚠️ 스케줄은 setTimeout 이 아니라 AudioContext 시계로 한다(setTimeout 은 박자가 흔들린다).
 * ⚠️ AudioContext 는 사용자가 버튼을 누른 뒤에 만든다(그 전에는 브라우저가 막는다).
 */
window.SBBgm = (function(){
  "use strict";

  var ac = null, master = null, noise = null, timer = 0, ana = null, abuf = null;
  var step = 0, nextT = 0, on = false, playing = false, pace = 0, peak = 0;
  var silent = null;
  var LOOK = 0.12, TICK = 25;

  /* ── 곡 (2026-09-01 새로 씀) ──────────────────────────────────────
     노린 것은 **만화 추격 장면**이다. 익살과 쫓김은 같은 재료에서 나온다 —
     ①반음으로 기어오르는 베이스(뒤에서 따라붙는 발소리)
     ②짧게 끊어 치는 리드(종종거리는 걸음)
     ③마디 끝의 옥타브 점프(놀라서 펄쩍)
     앞 판은 얌전한 상행이라 배경으로 깔릴 뿐 쫓기지 않았다.
     16분음표 32칸 = 두 마디. 숫자는 MIDI 음높이. */
  var LEAD = [
    69, 69, 71, 72,  74, null, 72, 74,   76, 76, 77, 76,  74, null, 72, null,
    69, 69, 71, 72,  74, null, 76, 77,   81, null, 79, 77,  76, 74, 72, 71
  ];
  /* 반음계 워킹 — 45,46,47,48 처럼 한 칸씩 기어오른다. 이게 "따라붙는" 소리다 */
  var BASS = [
    45, null, 45, 46,  47, null, 47, 48,   45, null, 45, 46,  47, 48, 49, 50,
    45, null, 45, 46,  47, null, 47, 48,   52, null, 51, 50,  49, 48, 47, 46
  ];
  /* 마디 끝에서 한 번씩 펄쩍 뛴다(익살) */
  var POP  = { 15: 88, 31: 93 };
  var KICK = [0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30];
  var HAT  = [2, 4, 6, 10, 12, 14, 18, 20, 22, 26, 28, 30];

  function hz(n){ return 440 * Math.pow(2, (n - 69) / 12); }

  function tone(type, f, t, dur, vol){
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function kick(t){
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.08);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.14);
  }

  function hat(t){
    var s = ac.createBufferSource(), g = ac.createGain(), hp = ac.createBiquadFilter();
    s.buffer = noise; hp.type = "highpass"; hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(hp); hp.connect(g); g.connect(master);
    s.start(t); s.stop(t + 0.05);
  }

  /* 템포 — pace 0(시작) → 1(끝). 132에서 196까지 조인다 */
  function spb(){
    var bpm = 132 + 64 * Math.min(1, Math.max(0, pace));
    return 60 / bpm / 4;
  }

  function schedule(){
    if(!playing) return;
    while(nextT < ac.currentTime + LOOK){
      var i = step % 32, t = nextT;
      if(LEAD[i] != null) tone("square", hz(LEAD[i]), t, 0.075, 0.34);
      if(BASS[i] != null) tone("square", hz(BASS[i] - 12), t, 0.12, 0.42);
      if(POP[i]) tone("triangle", hz(POP[i]), t, 0.10, 0.30);
      if(KICK.indexOf(i) >= 0) kick(t);
      if(HAT.indexOf(i) >= 0) hat(t);
      nextT += spb();
      step++;
    }
    meter();
    timer = setTimeout(schedule, TICK);
  }

  /* 지금 스피커로 나가는 신호의 세기(0~128). 0 이면 소리가 안 나간다는 뜻이다.
     ⚠️ 음과 음 사이에는 원래 0 이므로 최고값을 따로 쌓는다. */
  function meter(){
    if(!ana) return 0;
    ana.getByteTimeDomainData(abuf);
    var m = 0;
    for(var i = 0; i < abuf.length; i++){
      var d = Math.abs(abuf[i] - 128);
      if(d > m) m = d;
    }
    if(m > peak) peak = m;
    return m;
  }

  /* iOS 무음 스위치 우회 — 무음 오디오를 하나 틀어 두면 오디오 세션이 열려
     Web Audio 소리가 나는 경우가 있다. 안 되는 기기도 있으므로 **보장은 아니다**.
     실패해도 조용히 넘어간다(여기서 막히면 소리 전체가 죽는다). */
  function unlock(){
    if(silent) return;
    try{
      var sr = 8000, n = Math.floor(sr * 0.1), len = 44 + n;
      var b = new ArrayBuffer(len), v = new DataView(b);
      var put = function(o, t){ for(var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
      put(0, "RIFF"); v.setUint32(4, len - 8, true); put(8, "WAVEfmt ");
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, sr, true); v.setUint32(28, sr, true);
      v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      put(36, "data"); v.setUint32(40, n, true);
      for(var i = 0; i < n; i++) v.setUint8(44 + i, 128);      // 8비트 무음은 128
      silent = document.createElement("audio");
      silent.loop = true;
      silent.setAttribute("playsinline", "");
      silent.volume = 0.01;                                     // 0 이면 iOS 가 무시한다
      silent.src = URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
      var p = silent.play();
      if(p && p.catch) p.catch(function(){});
    }catch(e){ silent = null; }
  }

  function ensure(){
    if(ac) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    unlock();
    ac = new AC();
    master = ac.createGain();
    /* 🔴 전체 크기는 여기 한 곳에서만 정한다.
       음 하나하나의 vol 과 곱해진다는 것을 잊으면 조용히 무음이 된다(2026-09-01 사고). */
    master.gain.value = 0.8;
    ana = ac.createAnalyser();
    ana.fftSize = 256;
    abuf = new Uint8Array(ana.fftSize);
    /* 사각파가 겹치면 쉽게 찌그러진다. 압축기로 큰 소리를 눌러 준다 */
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 8; comp.attack.value = 0.003;
    master.connect(comp);
    comp.connect(ana);
    ana.connect(ac.destination);
    var n = ac.sampleRate * 0.2, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for(var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    noise = buf;
    return true;
  }

  function start(){
    if(!on || playing) return;
    if(!ensure()) return;
    if(ac.state === "suspended") ac.resume();
    step = 0; nextT = ac.currentTime + 0.06; playing = true; peak = 0;
    schedule();
  }
  function stop(){
    playing = false;
    clearTimeout(timer);
  }

  /* 소리를 켤 때 짧게 울리는 확인음 */
  function blip(){
    if(!ensure()) return;
    if(ac.state === "suspended") ac.resume();
    var t = ac.currentTime + 0.02;
    tone("square", 880, t, 0.09, 0.6);
    tone("square", 1320, t + 0.1, 0.12, 0.6);
  }

  /* 🔑 소리 시험 — "안 들린다"의 원인을 화면에서 가려낸다.
     세 갈래로만 답한다. ①브라우저가 막았다 ②소리를 냈는데 신호가 0 이다(우리 잘못)
     ③신호가 정상이다 → 그러면 기기 쪽(무음 스위치·미디어 음량)이다.
     짐작으로 고치지 않기 위한 장치다. */
  function test(){
    return new Promise(function(done){
      if(!ensure()){ done({ ok: false, why: "이 브라우저는 소리를 지원하지 않습니다." }); return; }
      if(ac.state === "suspended") ac.resume();
      peak = 0;
      var t0 = ac.currentTime + 0.03;
      tone("square", 660, t0, 0.12, 0.6);
      tone("square", 880, t0 + 0.14, 0.12, 0.6);
      tone("square", 1320, t0 + 0.28, 0.18, 0.6);
      var n = 0, iv = setInterval(function(){
        meter(); n++;
        if(n < 24) return;
        clearInterval(iv);
        var pct = Math.round(peak / 128 * 100);
        if(ac.state !== "running"){
          done({ ok: false, pct: pct, state: ac.state,
                 why: "브라우저가 아직 소리를 막고 있습니다. 화면을 한 번 더 누른 뒤 다시 시험해 주세요." });
        } else if(pct < 5){
          done({ ok: false, pct: pct, state: ac.state,
                 why: "소리를 만들었지만 신호가 나가지 않았습니다. 이건 저희 쪽 문제입니다." });
        } else {
          done({ ok: true, pct: pct, state: ac.state,
                 why: "소리는 정상으로 나갔습니다(신호 " + pct + "%). 그래도 안 들리면 "
                    + "아이폰은 측면 무음 스위치를, 안드로이드는 미디어 음량을 확인해 주세요." });
        }
      }, 25);
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
  return {
    start: start, stop: stop, blip: blip, test: test,
    on: function(){ return on; },
    setOn: setOn,
    setPace: function(v){ pace = v; },
    playing: function(){ return playing; },
    _dbg: function(){
      return { state: ac ? ac.state : "없음",
               now: ac ? +ac.currentTime.toFixed(3) : null,
               step: step, bpmStep: +spb().toFixed(4), playing: playing, on: on,
               level: meter(), peak: peak, vol: master ? master.gain.value : null,
               unlocked: !!silent };
    }
  };
})();
