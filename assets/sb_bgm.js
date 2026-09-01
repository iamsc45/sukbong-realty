/* 놀이터 배경음 — 2026-08-31 신설 (석봉님: "익살스럽고 쫓기는 마음이 들게")
 * ---------------------------------------------------------------------------
 * 왜 음원 파일을 안 쓰나
 *   ①남의 곡을 올리면 저작권이 걸린다 ②우리 사이트는 자료를 매일 올리는 곳이라
 *   몇 MB짜리 mp3 를 얹고 싶지 않다 ③파일이면 "빨라지는" 연출을 못 한다.
 *   그래서 **브라우저가 그 자리에서 소리를 만든다**(Web Audio). 파일 0바이트다.
 *
 * 소리 설계 — 8비트 게임기 흉내
 *   · 리드(사각파)  : 짧게 끊어 치는 상행 프레이즈. 통통 튀어서 익살스럽다
 *   · 베이스(사각파): 한 마디에 네 번. 발밑을 쫓아오는 느낌을 낸다
 *   · 킥·하이햇     : 사인 하강 + 화이트노이즈. 박을 또렷하게
 *   · **템포가 점점 빨라진다**(132 → 190). 이게 "쫓기는" 감정의 8할이다.
 *
 * ⚠️ 브라우저는 사용자가 뭔가 누르기 전에는 소리를 못 낸다.
 *    그래서 AudioContext 는 start() 안에서 처음 만든다(시작 버튼을 누른 뒤다).
 * ⚠️ 스케줄은 setTimeout 이 아니라 AudioContext 의 시계로 한다.
 *    setTimeout 은 몇 십 ms 씩 흔들려서 박자가 취한 것처럼 들린다.
 *    앞으로 0.12초치를 미리 예약해 두고 25ms 마다 다시 채운다.
 */
window.SBBgm = (function(){
  "use strict";

  var ac = null, master = null, noise = null, timer = 0, ana = null, abuf = null;
  var step = 0, nextT = 0, on = false, playing = false, pace = 0, peak = 0;
  var LOOK = 0.12, TICK = 25;

  /* A 마이너. 익살은 **옥타브 점프와 반음 장식**에서 나온다 — 음을 많이 쓰지 않는다.
     null 은 쉼표. 16분음표 기준 두 마디(32칸)다. */
  var LEAD = [
    69, null, 71, 72,  null, 72, 74, null,  76, null, 74, 72,  71, null, 69, null,
    64, null, 67, 69,  null, 69, 71, null,  72, null, 71, 69,  68, null, 69, null
  ];
  var BASS = [
    45, null, 45, null,  52, null, 45, null,  48, null, 48, null,  52, null, 51, null,
    45, null, 45, null,  52, null, 45, null,  50, null, 50, null,  52, null, 56, null
  ];
  var KICK = [0, 6, 8, 14, 16, 22, 24, 30];       // 이 칸에서 쿵
  var HAT  = [2, 6, 10, 14, 18, 22, 26, 30];      // 그 사이를 채운다

  function hz(n){ return 440 * Math.pow(2, (n - 69) / 12); }

  function tone(type, f, t, dur, vol){
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    /* 딱 끊으면 "틱" 소리가 난다. 아주 짧은 붙임과 뗌을 준다 */
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function kick(t){
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.15);
  }

  function hat(t){
    var s = ac.createBufferSource(), g = ac.createGain(), hp = ac.createBiquadFilter();
    s.buffer = noise; hp.type = "highpass"; hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    s.connect(hp); hp.connect(g); g.connect(master);
    s.start(t); s.stop(t + 0.05);
  }

  /* 템포 — pace 는 0(시작)에서 1(끝)까지. 호스트가 게임 진행에 맞춰 올려 준다. */
  function spb(){
    var bpm = 132 + 58 * Math.min(1, Math.max(0, pace));
    return 60 / bpm / 4;                       // 16분음표 한 칸
  }

  function schedule(){
    if(!playing) return;
    while(nextT < ac.currentTime + LOOK){
      var i = step % 32, t = nextT;
      if(LEAD[i] != null) tone("square", hz(LEAD[i]), t, 0.085, 0.34);
      if(BASS[i] != null) tone("square", hz(BASS[i] - 12), t, 0.13, 0.40);
      if(KICK.indexOf(i) >= 0) kick(t);
      if(HAT.indexOf(i) >= 0) hat(t);
      nextT += spb();
      step++;
    }
    meter();
    timer = setTimeout(schedule, TICK);
  }

  /* 지금 스피커로 나가는 신호의 세기. 0 이면 소리가 안 난다는 뜻이다.
     ⚠️ 음과 음 사이에는 원래 0 이므로 **최고값을 쌓아** 본다. */
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

  function ensure(){
    if(ac) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return false;
    ac = new AC();
    master = ac.createGain();
    /* 🔴 2026-09-01 석봉님 "BGM 도 안 나온다".
       처음엔 0.07 이었고 0.18 로 올렸는데도 **계측기로 재 보니 진폭이 5%** 였다.
       원인은 master 와 음 하나하나의 음량이 **곱해진다**는 것 —
       0.18 × 0.13 = 0.023 이라 사실상 무음이다. 배경음이라고 두 곳에서 깎은 셈이다.
       이제 음 쪽은 자기 배합만 정하고, 전체 크기는 여기 한 곳에서 정한다. */
    master.gain.value = 0.5;
    /* 신호가 실제로 나가는지 재기 위한 계측기.
       "스케줄러가 돈다"와 "소리가 난다"는 다른 이야기라 눈금이 필요하다.
       분석기는 소리를 바꾸지 않는다(그냥 지나가며 본다). */
    ana = ac.createAnalyser();
    ana.fftSize = 256;
    abuf = new Uint8Array(ana.fftSize);
    /* 사각파가 여럿 겹치면 쉽게 찌그러진다. 압축기를 물려 큰 소리를 눌러 준다 */
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 6; comp.attack.value = 0.003;
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

  /* 소리를 켤 때 짧게 한 번 울린다.
     "켜짐"이라고 써 있는데 아무 소리도 안 나면 사람은 고장인지 자기 기기 문제인지 모른다.
     이 한 번이 울리면 적어도 스피커까지는 닿았다는 뜻이다. */
  function blip(){
    if(!ensure()) return;
    if(ac.state === "suspended") ac.resume();
    var t = ac.currentTime + 0.02;
    tone("square", 880, t, 0.09, 0.5);
    tone("square", 1320, t + 0.1, 0.12, 0.5);
  }
  function stop(){
    playing = false;
    clearTimeout(timer);
  }

  /* 켜고 끄기 — 선택은 기기에 남긴다. 매번 끄게 만들면 그냥 나간다. */
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
    start: start, stop: stop, blip: blip,
    on: function(){ return on; },
    setOn: setOn,
    /* 게임이 얼마나 왔는지 0~1 로 알려 주면 그만큼 빨라진다 */
    setPace: function(v){ pace = v; },
    playing: function(){ return playing; },
    /* 검증용 — "스케줄러가 돈다"와 "실제로 소리가 난다"는 다른 이야기다.
       브라우저가 재생을 막고 있으면 state 가 running 이 아니고, 그때는
       시계(currentTime)도 안 흐른다. 그 둘을 밖에서 볼 수 있게 열어 둔다. */
    _dbg: function(){
      return { state: ac ? ac.state : "없음",
               now: ac ? +ac.currentTime.toFixed(3) : null,
               step: step, bpmStep: +spb().toFixed(4), playing: playing, on: on,
               /* level=지금 이 순간, peak=시작 이후 최고. peak 이 0 이면 소리가 안 나간 것이다 */
               level: meter(), peak: peak, vol: master ? master.gain.value : null };
    }
  };
})();
