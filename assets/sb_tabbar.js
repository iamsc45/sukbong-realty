/* 모바일 하단 탭바 + 전체 메뉴 (2026-08-10 석봉님 지시)
   호갱노노·재개발닷컴을 참고했다. 둘 다 화면 아래에 고정 탭을 두고, 지도는 절대 가리지 않는다.

   왜 자바스크립트 한 파일에 몰아넣나
     지금까지 메뉴는 페이지마다 <nav>로 하드코딩돼 있었다. 그래서 '분석→리포트', '리포트→블로그'로
     이름을 바꿨을 때 홈 화면 타일만 옛 링크로 남아, 리포트를 누르면 네이버 블로그가 열렸다.
     메뉴 정의를 여기 MENU 하나로 모아 두면 그런 어긋남이 구조적으로 안 생긴다.
     ⚠️메뉴를 고칠 일이 생기면 이 파일과 각 페이지 <nav>를 같이 고칠 것(상단 nav는 PC용으로 남아 있다).

   적용 범위
     - 좁은 화면(720px 이하)에서만 붙는다. PC는 한 픽셀도 안 바뀐다.
     - 지도(#wrap이 height:100%인 페이지)는 탭바 높이만큼 줄여 준다.
     - 일반 스크롤 페이지는 body 아래 여백으로 밀어 준다.
     - iOS 사파리 하단 툴바에 가리지 않게 safe-area를 더한다. */
(function(){
  var MQ='(max-width:720px)';
  if(!window.matchMedia||!window.matchMedia(MQ).matches)return;

  /* 아이콘 폰트가 없는 페이지(지도 등)에는 여기서 넣어 준다 — 탭바는 아이콘이 없으면 못 읽는다 */
  if(!document.querySelector('link[href*="tabler-icons"]')){
    var f=document.createElement('link'); f.rel='stylesheet';
    f.href='https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.24.0/dist/tabler-icons.min.css';
    document.head.appendChild(f);
  }

  /* ── 메뉴 정의(사이트 전체의 단일 출처) ──────────────────── */
  var G='%EA%B8%80.html', JIPYO='%EC%A7%80%ED%91%9C.html', LH='lh_%EC%A7%84%EB%8B%A8.html',
      USE='%EC%9D%B4%EC%9A%A9%EC%95%88%EB%82%B4.html', LOAN='%EB%8C%80%EC%B6%9C%EB%AC%B8%EC%9D%98.html',
      BLOG='https://blog.naver.com/seokbongnews';
  var MENU=[
    {g:'지도·데이터',items:[
      {n:'실거래지도',i:'map-2',h:'map.html'},
      {n:'재개발·재건축',i:'building-community',h:'map.html?mode=redev'},
      {n:'실시간 인기',i:'flame',h:'hot.html'},
      {n:'금리·지표',i:'chart-histogram',h:JIPYO}]},
    {g:'콘텐츠',items:[
      {n:'청약',i:'ticket',h:'apply.html'},
      {n:'경매·공매',i:'gavel',h:'auction.html'},
      {n:'LH 매입',i:'building-estate',h:LH},
      {n:'리포트',i:'file-text',h:G},
      {n:'블로그',i:'notebook',h:BLOG,blank:1},
      {n:'채널',i:'send',h:'channels.html'}]},
    {g:'내 것',items:[
      {n:'관심단지',i:'star',h:'favorites.html'},
      {n:'내 정보',i:'user',h:'%EB%82%B4%EC%A0%95%EB%B3%B4.html'}]},
    {g:'안내',items:[
      {n:'홈',i:'home',h:'index.html'},
      {n:'이용안내',i:'help-circle',h:USE},
      {n:'대출 문의',i:'building-bank',h:LOAN}]}
  ];
  /* 하단 탭 5칸(석봉님 확정). 지도를 첫 칸에 둔다 — 우리 지표는 지도 체류·재방문이다. */
  var TABS=[
    {k:'map',n:'지도',i:'map-pin',h:'map.html'},
    {k:'search',n:'검색',i:'search'},
    {k:'deal',n:'청약·경매',i:'calendar-event'},
    {k:'fav',n:'관심',i:'star',h:'favorites.html'},
    {k:'all',n:'전체',i:'menu-2'}
  ];

  /* 하위 폴더 페이지(글/2026-08-10_xxx.html 등)에서도 링크가 맞도록 앞에 ../를 붙인다.
     안 그러면 리포트 글에서 '홈'을 누르면 글/index.html로 가 404가 난다. */
  var _seg=location.pathname.split('/').filter(function(x){return x;});
  var UP=new Array(Math.max(0,_seg.length-1)).join('../')+(_seg.length>1?'../':'');
  function href(h){ return (/^https?:/.test(h)||!UP)?h:UP+h; }

  var page=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  function isMap(){return page.indexOf('map')===0;}
  function active(){
    if(isMap())return 'map';
    if(page.indexOf('favorites')===0)return 'fav';
    if(page.indexOf('apply')===0||page.indexOf('auction')===0)return 'deal';
    return '';
  }

  /* ── 스타일 ───────────────────────────────────────────────── */
  var css=document.createElement('style');
  css.textContent=
   '#sbtab{position:fixed;left:0;right:0;bottom:0;z-index:3000;display:flex;background:#fff;'
  +'border-top:1px solid #E9E6DE;padding-bottom:env(safe-area-inset-bottom,0px);'
  +'box-shadow:0 -2px 12px rgba(20,20,20,.06)}'
  +'#sbtab button{flex:1;border:0;background:none;padding:7px 0 6px;font:inherit;font-size:10.5px;'
  +'font-weight:600;color:#9A938A;cursor:pointer;letter-spacing:-.02em;line-height:1.35}'
  +'#sbtab button i{display:block;font-size:20px;line-height:1;margin-bottom:2px}'
  +'#sbtab button.on{color:#12203A;font-weight:800}'
  +'body{padding-bottom:var(--sbtab-h,56px)}'
  +'body.sbmap{padding-bottom:0}'
  +'body.sbmap #wrap{height:calc(100% - var(--sbtab-h,56px))}'
  /* 화면 아래에 고정돼 있던 것들은 탭바 위로 올린다(안 그러면 탭바에 가린다) */
  +'body.sbmap #fpanel,body.sbmap #rcard,body.sbmap #msheet .ms-in{bottom:var(--sbtab-h,56px)!important}'
  +'body.sbmap .site-footer{display:none}'
  /* 상단 가로 스크롤 메뉴는 걷어낸다. 좁은 화면에서 뒤쪽 항목이 잘려 안 보였고,
     이제 같은 메뉴를 하단 '전체'가 다 담는다. 로고와 로그인 버튼은 남긴다. */
  +'.site-header nav a{display:none}'
  +'.site-header nav{margin-left:auto;padding:0}'
  /* 로고와 로그인 버튼이 두 줄로 갈라지면 지도 높이를 40px 더 먹는다 */
  +'.site-header{flex-wrap:nowrap!important;align-items:center}'
  /* 전체 메뉴 시트 */
  +'#sbsheet{position:fixed;inset:0;z-index:3100;background:rgba(20,20,20,.42);display:none}'
  +'#sbsheet.open{display:block}'
  +'#sbsheet .in{position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:18px 18px 0 0;'
  +'max-height:82%;overflow:auto;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))}'
  +'#sbsheet .hd{display:flex;align-items:center;justify-content:space-between;padding:15px 18px 11px;'
  +'position:sticky;top:0;background:#fff;border-bottom:1px solid #F1EEE6;font-size:15px;font-weight:800}'
  +'#sbsheet .hd button{border:0;background:none;font-size:22px;line-height:1;color:#9A938A;cursor:pointer}'
  +'#sbsheet .gp{font-size:11px;font-weight:800;color:#9A938A;letter-spacing:.04em;padding:14px 18px 6px}'
  +'#sbsheet .gd{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px}'
  +'#sbsheet a{display:flex;flex-direction:column;align-items:center;gap:5px;padding:13px 4px;'
  +'border:1px solid #EFEBE2;border-radius:12px;text-decoration:none;color:#2B2B28;'
  +'font-size:12px;font-weight:700;letter-spacing:-.02em;text-align:center;line-height:1.3}'
  +'#sbsheet a i{font-size:21px;color:#12203A}'
  +'#sbsheet a.on{border-color:#12203A;background:#F5F7FB}'
  /* 청약·경매 미니 선택 */
  +'#sbpick{position:fixed;left:10px;right:10px;z-index:3050;display:none;'
  +'bottom:calc(64px + env(safe-area-inset-bottom,0px));gap:8px}'
  +'#sbpick.open{display:flex}'
  +'#sbpick a{flex:1;background:#12203A;color:#fff;text-decoration:none;border-radius:12px;'
  +'padding:14px 10px;text-align:center;font-size:13.5px;font-weight:800;letter-spacing:-.02em}';
  document.head.appendChild(css);

  /* ── 탭바 ─────────────────────────────────────────────────── */
  var bar=document.createElement('nav'); bar.id='sbtab';
  bar.setAttribute('aria-label','주요 메뉴');
  var act=active();
  bar.innerHTML=TABS.map(function(t){
    return '<button type="button" data-k="'+t.k+'"'+(t.k===act?' class="on"':'')+'>'
      +'<i class="ti ti-'+t.i+'" aria-hidden="true"></i>'+t.n+'</button>';
  }).join('');
  document.body.appendChild(bar);
  if(isMap())document.body.classList.add('sbmap');
  /* 높이는 재서 쓴다 — 글자 크기 설정이나 safe-area에 따라 기기마다 다르다 */
  function measure(){
    var h=bar.offsetHeight||56;
    document.documentElement.style.setProperty('--sbtab-h',h+'px');
    if(window.map&&window.map.invalidateSize)setTimeout(function(){try{window.map.invalidateSize({animate:false});}catch(e){}},80);
  }
  measure(); window.addEventListener('resize',measure);
  window.addEventListener('load',measure);

  /* ── 전체 메뉴 시트 ───────────────────────────────────────── */
  var sheet=document.createElement('div'); sheet.id='sbsheet';
  sheet.innerHTML='<div class="in"><div class="hd">전체 메뉴<button type="button" aria-label="닫기">✕</button></div>'
    +MENU.map(function(s){
      return '<div class="gp">'+s.g+'</div><div class="gd">'+s.items.map(function(m){
        var on=(m.h||'').toLowerCase().indexOf(page)===0&&page!=='index.html';
        return '<a href="'+href(m.h)+'"'+(m.blank?' target="_blank" rel="noopener"':'')+(on?' class="on"':'')+'>'
          +'<i class="ti ti-'+m.i+'" aria-hidden="true"></i>'+m.n+'</a>';
      }).join('')+'</div>';
    }).join('')+'</div>';
  document.body.appendChild(sheet);

  var pick=document.createElement('div'); pick.id='sbpick';
  pick.innerHTML='<a href="'+href('apply.html')+'">청약</a><a href="'+href('auction.html')+'">경매·공매</a>';
  document.body.appendChild(pick);

  function closeAll(){sheet.classList.remove('open');pick.classList.remove('open');}
  sheet.addEventListener('click',function(e){if(e.target===sheet||e.target.tagName==='BUTTON')closeAll();});
  document.addEventListener('click',function(e){
    if(pick.classList.contains('open')&&!pick.contains(e.target)&&!bar.contains(e.target))closeAll();
  });

  bar.addEventListener('click',function(e){
    var b=e.target.closest('button'); if(!b)return;
    var k=b.dataset.k, was=pick.classList.contains('open');
    closeAll();
    if(k==='all'){sheet.classList.add('open');return;}
    if(k==='deal'){if(!was)pick.classList.add('open');return;}
    if(k==='search'){
      /* 지도에 있으면 검색창으로 바로 커서를 옮긴다(페이지를 다시 받지 않는다) */
      var q=document.getElementById('sq');
      if(q){document.body.classList.remove('barfold');try{q.focus();q.select();}catch(x){} return;}
      location.href=href('map.html')+'#search'; return;
    }
    var t=TABS.filter(function(x){return x.k===k;})[0];
    if(t&&t.h)location.href=href(t.h);
  });

  /* 지도에 #search로 들어오면 검색창을 열어 준다 */
  if(location.hash==='#search'){
    setTimeout(function(){var q=document.getElementById('sq');if(q){document.body.classList.remove('barfold');try{q.focus();}catch(x){}}},600);
  }
})();
