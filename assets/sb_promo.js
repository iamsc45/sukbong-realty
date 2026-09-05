/* 사이트 진입 홍보 배너 — 2026-09-06 석봉님 지시
   "사이트에 들어오면 게임 홍보하는 팝업 띄워주면 좋을 것 같아. 내용은 그냥 컨셉만 —
    부동산 공부도 하면서 실시간 랭킹도 확인하고, 지역 대항전 랭킹도 확인해 봐라, 이런 식으로."

   설계
   - 모달이 아니라 **하단에서 올라오는 배너**다. 지도·청약처럼 바로 쓰러 온 사람을 가로막지 않는다.
   - **닫으면 그날은 다시 안 뜬다**(localStorage 에 날짜). 매 페이지마다 뜨면 짜증이 되고 곧 무시된다.
   - 놀이터 페이지 자신에서는 안 뜬다.
   - 문안·링크는 아래 PROMO 하나에서 바꾼다. 다음 홍보(새 게임·이벤트)가 생기면 여기만 고친다.
   - 720px 이하에서는 하단 탭바(sb_tabbar.js, 높이 약 56px) 위에 올린다.
   ⚠️ 이 파일을 고치면 참조하는 HTML 의 ?v= 를 올릴 것(캐시버전_점검이 게이트에서 막아 준다). */
(function(){
  var PROMO = {
    key:   'sb_promo_playground_v1',                 // 문안이 크게 바뀌면 v2 로 — 그러면 다시 뜬다
    eyebrow: '놀이터가 열렸어요',
    title: '부동산 공부하면서 랭킹도 올려 보실래요?',
    body:  '실거래가 맞히기, 세금 피하기, 층 올리기. 실시간 전국 랭킹에 우리 지역 대항전까지 있어요.',
    cta:   '놀이터 가기',
    href:  '%EB%86%80%EC%9D%B4%ED%84%B0.html?utm_source=site&utm_medium=promo&utm_campaign=playground_open'
  };

  try{
    var path = decodeURIComponent(location.pathname);
    if(path.indexOf('놀이터') >= 0 || path.indexOf('play.html') >= 0) return;   // 자기 자신
    var today = new Date().toISOString().slice(0,10);
    if(localStorage.getItem(PROMO.key) === today) return;                        // 오늘 이미 닫았다
  }catch(e){ /* localStorage 가 막힌 환경 — 그냥 띄운다 */ }

  var css = document.createElement('style');
  css.textContent =
    '#sbPromo{position:fixed;left:12px;right:12px;bottom:14px;z-index:9000;max-width:520px;margin:0 auto;' +
    'background:#FFFCF2;color:#16130F;border:3px solid #16130F;box-shadow:5px 5px 0 #16130F;' +
    'padding:14px 16px 14px 18px;font-family:Pretendard,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;' +
    'transform:translateY(120%);transition:transform .38s cubic-bezier(.2,.9,.3,1.1)}' +
    '#sbPromo.on{transform:none}' +
    '#sbPromo .eb{display:inline-block;background:#16130F;color:#FFD84D;font-size:11.5px;font-weight:800;' +
    'padding:3px 8px;letter-spacing:.02em;margin-bottom:8px}' +
    '#sbPromo h4{margin:0 0 6px;font-size:17px;line-height:1.35;font-weight:800;word-break:keep-all;padding-right:28px}' +
    '#sbPromo p{margin:0 0 12px;font-size:13.5px;line-height:1.6;color:#4A443A;word-break:keep-all}' +
    '#sbPromo a.go{display:inline-block;background:#FF5C39;color:#fff;font-weight:800;font-size:14px;' +
    'padding:10px 18px;border:2.5px solid #16130F;box-shadow:3px 3px 0 #16130F;text-decoration:none}' +
    '#sbPromo a.go:active{transform:translate(3px,3px);box-shadow:none}' +
    '#sbPromo button.x{position:absolute;top:8px;right:8px;width:30px;height:30px;border:0;background:transparent;' +
    'font-size:22px;line-height:1;color:#8A8478;cursor:pointer}' +
    '#sbPromo button.x:hover{color:#16130F}' +
    '@media(max-width:720px){#sbPromo{bottom:70px}}';   // 하단 탭바 위
  document.head.appendChild(css);

  var box = document.createElement('div');
  box.id = 'sbPromo';
  box.setAttribute('role','dialog'); box.setAttribute('aria-label','놀이터 안내');
  box.innerHTML =
    '<button class="x" aria-label="닫기">×</button>' +
    '<span class="eb">' + PROMO.eyebrow + '</span>' +
    '<h4>' + PROMO.title + '</h4>' +
    '<p>' + PROMO.body + '</p>' +
    '<a class="go" href="' + PROMO.href + '">' + PROMO.cta + ' →</a>';

  function dismiss(){
    try{ localStorage.setItem(PROMO.key, new Date().toISOString().slice(0,10)); }catch(e){}
    box.classList.remove('on');
    setTimeout(function(){ box.remove(); }, 400);
  }
  box.querySelector('button.x').addEventListener('click', dismiss);
  box.querySelector('a.go').addEventListener('click', function(){
    try{ localStorage.setItem(PROMO.key, new Date().toISOString().slice(0,10)); }catch(e){}
  });

  /* 페이지가 자리를 잡은 뒤 올라온다 — 첫 화면 렌더와 겹치면 깜빡인다 */
  function show(){
    document.body.appendChild(box);
    requestAnimationFrame(function(){ setTimeout(function(){ box.classList.add('on'); }, 900); });
  }
  if(document.readyState === 'complete') show();
  else window.addEventListener('load', show);
})();
