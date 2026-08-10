/* 실거래지도 새 스킨 (스테이징 전용, 2026-08-10)
   원본 map.html의 변수·함수(window._PTS, TYPE, priceLabel, PY, showAptCard, map, go)를
   읽기만 하고 고치지 않는다. 겉모습과 '목록' UI만 이 파일이 얹는다.
   skin=a 네이버부동산형(좌측 목록) / skin=b 호갱노노형(하단 시트) */
(function(){
  var P=new URLSearchParams(location.search);
  var skin=(P.get('skin')==='b')?'b':'a';
  var SORT='new';        /* new=최신순 · price=고가순 · many=거래많은순 */
  var LIMIT=60, shown=LIMIT;
  var lastKey='', hlEl=null;

  document.body.classList.add('v2','skin-'+skin);

  /* 헤더 높이는 페이지 폭에 따라 줄바꿈이 생겨 달라진다. 숫자를 박지 않고 실측해서
     CSS 변수로 넘긴다(안 그러면 떠 있는 컨트롤이 헤더를 덮는다 — 첫 시안에서 그랬다). */
  function fitTop(){
    var h=document.querySelector('.site-header');
    var t=h?Math.round(h.getBoundingClientRect().height):52;
    document.documentElement.style.setProperty('--v2-top',t+'px');
    try{if(window.map)setTimeout(function(){window.map.invalidateSize({animate:false});},60);}catch(e){}
  }
  window.addEventListener('resize',fitTop);
  /* 지도 색 비교용(soft=예전 연한 톤 · plain=타일 원본 · vivid=더 진하게) */
  var tone=P.get('tone'); if(tone)document.body.classList.add('tone-'+tone);


  /* ── 배경 타일 (2026-08-10 3차 · 되돌림) ─────────────────────
     CARTO Voyager로 갈아탔다가 석봉님 판단으로 **되돌린다**: "새 배경은 실패,
     지하철 노선 그린 것도 별로다. VWorld 배경 모드를 확인 중이니 정해지면 그쪽으로."
     그래서 기본을 다시 VWorld로 두고, CARTO는 비교용으로만 남긴다.
     VWorld는 여러 모드를 제공하므로 결정되는 대로 바로 보도록 파라미터에 다 걸어 둔다.
       ?base=vworld(기본·일반) | vworld-white | vworld-midnight | vworld-hybrid | vworld-satellite
     ※ 타일 비교 세션이 우리 도메인에서 실측(2026-08-10): Base·white·midnight·Satellite·Hybrid는
       열리고 **gray는 안 열린다.** 그래서 gray는 뺐다. 후보 1순위는 **white**(누런 베이지를
       피하면서 국내 타일의 한글 라벨 밀도를 그대로 유지). 비교판 = `지도타일_비교.html`.
       ?base=voyager | positron  (CARTO, 비교용)
     ⚠️ VWorld 타일에는 지하철 노선·역·학교가 이미 그려져 있다. 우리가 또 그리면
     이름이 겹치고 선이 두 겹으로 보이므로, VWorld일 때는 우리 POI를 기본으로 끈다
     (필요하면 ?poi=on · ?line=on 으로 켠다). */
  var VW='https://api.vworld.kr/req/wmts/1.0.0/EBC23601-6E41-3269-9ECB-821DEECCF3F0/';
  var BASES={
    voyager:['https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
             '&copy; OpenStreetMap &copy; CARTO',{subdomains:'abcd'}],
    positron:['https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
             '&copy; OpenStreetMap &copy; CARTO',{subdomains:'abcd'}],
    'vworld-white':[VW+'white/{z}/{y}/{x}.png','&copy; VWorld(국토교통부)',{maxNativeZoom:18}],
    'vworld-midnight':[VW+'midnight/{z}/{y}/{x}.png','&copy; VWorld(국토교통부)',{maxNativeZoom:18}],
    'vworld-satellite':[VW+'Satellite/{z}/{y}/{x}.jpeg','&copy; VWorld(국토교통부)',{maxNativeZoom:18}],
    'vworld-hybrid':[VW+'Satellite/{z}/{y}/{x}.jpeg','&copy; VWorld(국토교통부)',{maxNativeZoom:18,overlay:VW+'Hybrid/{z}/{y}/{x}.png'}]
  };
  var BASE=P.get('base')||'vworld';
  function swapBase(){
    if(BASE==='vworld'||!BASES[BASE]){document.body.classList.add('base-vworld');return;}  /* 원본 VWorld 일반 유지 */
    if(!window.map||!window.baseV)return setTimeout(swapBase,150);
    try{window.map.removeLayer(window.baseV);}catch(e){}
    var t=BASES[BASE],o=t[2]||{};
    window._v2base=L.tileLayer(t[0],{attribution:t[1],maxZoom:20,minZoom:6,
      subdomains:o.subdomains||'abc',maxNativeZoom:o.maxNativeZoom,detectRetina:!o.maxNativeZoom}).addTo(window.map);
    try{window._v2base.setZIndex(1);}catch(e){}
    if(o.overlay)L.tileLayer(o.overlay,{maxZoom:20,minZoom:6,maxNativeZoom:18}).addTo(window.map);
    document.body.classList.add('base-'+BASE.replace(/[^a-z0-9-]/g,''));
  }
  swapBase();
  /* 우리 POI(노선·역·학교) 표시 여부를 map_v2_poi.js에 알려 준다 */
  window._V2POI={line:(P.get('line')==='on'),
                 poi:(P.get('poi')==='on')||BASE.indexOf('vworld')<0};
  if(P.get('poi')==='off')window._V2POI.poi=false;

  /* ── 스킨 전환 스위치(스테이징에만) ─────────────────────────
     2026-08-10 본편 반영: 라이브 map.html에서는 '배경 기본/화이트 · 현재 지도' 비교
     버튼이 보이면 안 된다. 주소로 판단해서 스테이징에서만 붙인다. */
  var STAGING=(location.pathname.indexOf('map_v2')>=0);
  function mountSwitch(){
    if(!STAGING)return;
    var d=document.createElement('div'); d.id='v2skin';
    /* 2026-08-10 석봉님 확정: **네이버형으로 간다.** 호갱노노형은 비교 이력으로만 남긴다
       (?skin=b로는 여전히 열리지만 스위치에서는 뺐다 — 고른 안을 매번 다시 고르게 하지 않는다). */
    /* 배경 고르기도 여기서(2026-08-10 석봉님: "이 상태에서 화이트로 바꿔 볼 수 있게").
       주소를 손으로 고치지 않고 눌러서 오갈 수 있어야 비교가 된다. */
    d.innerHTML='<span class="lbl">배경</span>'
      +'<button data-b="vworld">기본</button><button data-b="vworld-white">화이트</button>'
      +'<span class="sep"></span><button data-s="old">현재 지도</button>';
    document.getElementById('wrap').appendChild(d);
    d.querySelectorAll('button').forEach(function(b){
      if(b.dataset.b&&b.dataset.b===BASE)b.classList.add('on');
      b.onclick=function(){
        var q=new URLSearchParams(location.search);
        if(b.dataset.s==='old'){location.href='map.html'+(q.get('q')?'?q='+encodeURIComponent(q.get('q')):'');return;}
        if(b.dataset.b==='vworld')q.delete('base'); else q.set('base',b.dataset.b);
        location.href='map_v2.html'+(q.toString()?'?'+q.toString():'');
      };
    });
  }

  /* ── 마커: 인라인 배경색을 CSS 변수로 옮긴다 ─────────────────
     원본 render()가 style="background:색"으로 심으므로, 그 색을 --c로 옮겨야
     흰 말풍선 + 색 띠 디자인이 상품별 색을 그대로 이어받는다. */
  function paint(root){
    var els=(root||document).querySelectorAll?(root||document).querySelectorAll('.pricetag'):[];
    for(var i=0;i<els.length;i++){
      var el=els[i]; if(el._v2)continue; el._v2=1;
      var c=el.style.backgroundColor||el.style.background;
      if(c)el.style.setProperty('--c',c);
    }
  }
  function watchMarkers(){
    var pane=document.querySelector('.leaflet-marker-pane'); if(!pane)return setTimeout(watchMarkers,200);
    paint(pane);
    new MutationObserver(function(ms){
      for(var i=0;i<ms.length;i++)for(var j=0;j<ms[i].addedNodes.length;j++){
        var n=ms[i].addedNodes[j]; if(n.nodeType===1)paint(n.matches&&n.matches('.pricetag')?n.parentNode:n);
      }
    }).observe(pane,{childList:true,subtree:true});
  }

  /* 동 단위 원의 이름표가 서로 겹치면 건수 적은 쪽부터 숨긴다(2026-08-10).
     이름을 원 밖으로 뺐더니 조밀한 동네에서 라벨끼리 부딪혀 읽을 수가 없었다.
     지도를 옮길 때마다 화면 좌표로 사각형 충돌만 보면 되므로 가볍다. */
  function thinLabels(){
    var els=[].slice.call(document.querySelectorAll('.clus.dong'));
    if(!els.length)return;
    els.forEach(function(e){e.classList.remove('nolabel');});
    /* 건수 많은 곳이 이름을 갖는다 */
    els.sort(function(a,b){
      function n(e){var c=e.querySelector('.cc');return c?parseInt(c.textContent.replace(/[^0-9]/g,''),10)||0:0;}
      return n(b)-n(a);
    });
    /* 이름끼리만이 아니라 **이름 vs 옆 원**도 본다. 이름이 원 아래로 나오다 보니
       아래쪽 원을 덮는 경우가 많았다(2026-08-10 첫 렌더에서 확인).
       여백은 6px — 2px로는 글자가 서로 스칠 만큼 붙어 보였다. */
    var kept=[],PAD=6;
    els.forEach(function(e){
      var c=e.parentNode.getBoundingClientRect();
      /* ⚠️ 소유 요소를 같이 담는다. 좌표로 자기 원을 가려내려다 판정이 틀어져
         라벨 69개가 전부 숨는 사고를 냈다(2026-08-10). 참조 비교가 안전하다. */
      kept.push({l:c.left-2,t:c.top-2,r:c.right+2,b:c.bottom+2,own:e});
    });
    els.forEach(function(e){
      var lab=e.querySelector('.cn'); if(!lab)return;
      var r=lab.getBoundingClientRect();
      if(!r.width){e.classList.add('nolabel');return;}
      var box={l:r.left-PAD,t:r.top-2,r:r.right+PAD,b:r.bottom+2},hit=false;
      for(var i=0;i<kept.length;i++){
        var k=kept[i];
        if(k.own===e)continue;              /* 자기 원과는 겹쳐도 된다 */
        if(!(box.r<k.l||box.l>k.r||box.b<k.t||box.t>k.b)){hit=true;break;}
      }
      if(hit)e.classList.add('nolabel'); else kept.push(box);
    });
  }
  function watchClusters(){
    if(!window.map)return setTimeout(watchClusters,150);
    var t2=null;
    function kick(){clearTimeout(t2);t2=setTimeout(thinLabels,140);}
    window.map.on('moveend zoomend',kick);
    var pane=document.querySelector('.leaflet-marker-pane');
    if(pane)new MutationObserver(kick).observe(pane,{childList:true});
    kick();
  }

  /* ── 조건 일치 0건일 때 '전체로 보기' (2026-08-10 석봉님 확정) ──
     첫 화면 필터가 '아파트·매매'라(8/9 부하 대책) 오피스텔·빌라·전월세만 있는 동네는
     화면이 통째로 비어 "정보가 없는 지도"로 보인다. 실제로 논현동을 뒤져 보니
     아츠논현·현대넥서스는 자료도 좌표도 다 있는데 전월세뿐이라 걸러진 것이었다.
     그래서 화면에 하나도 안 잡히면 풀어 볼 수 있는 버튼을 띄운다. */
  function mountEmptyCTA(){
    var w=document.getElementById('wrap'); if(!w)return;
    var d=document.createElement('button'); d.id='v2empty'; d.type='button';
    d.innerHTML='<b>이 화면에 조건에 맞는 거래가 없습니다</b>'
      +'<span>전체 상품 · 전체 거래로 보기</span>';
    w.appendChild(d);
    d.onclick=function(){
      try{
        window.curTset=null; window.curU='all';
        if(window._syncTypeUI)window._syncTypeUI();
        if(window._syncUUI)window._syncUUI();
        if(window.render)window.render();
      }catch(e){}
      d.classList.remove('on');
    };
    return d;
  }
  var emptyCTA=null;
  function checkEmpty(){
    if(!emptyCTA)emptyCTA=mountEmptyCTA(); if(!emptyCTA)return;
    var z=0;try{z=window.map.getZoom();}catch(e){}
    var n=(window._PTS||[]).length;
    /* 필터가 걸려 있을 때만 권한다. 아무 조건이 없는데 0건이면 정말 거래가 없는 곳이다. */
    var filtered=!!(window.curTset)||(window.curU&&window.curU!=='all');
    var redev=document.body.classList.contains('redev');
    emptyCTA.classList.toggle('on', z>=13 && n===0 && filtered && !redev);
  }

  /* 카드 헤더의 인라인 상품색을 --c로 옮긴다(마커와 같은 방식).
     헤더 배경은 CSS가 흰색으로 덮으므로, 색을 잃지 않으려면 미리 변수로 빼 놔야 한다. */
  function watchCard(){
    var rc=document.getElementById('rcard'); if(!rc)return setTimeout(watchCard,200);
    function fix(){
      var h=rc.querySelector('.rc-h'); if(!h)return;
      var c=h.style.backgroundColor||h.style.background;
      if(c&&c.indexOf('255, 255, 255')<0)rc.style.setProperty('--c',c);
    }
    fix();
    new MutationObserver(fix).observe(rc,{childList:true,subtree:false});
  }

  /* ── 목록 ────────────────────────────────────────────────── */
  function typeInfo(t){var T=window.TYPE||{};return T[t]||['기타','#6E6E6A'];}
  function money(tx){try{return window.priceLabel(tx);}catch(e){return '';}}
  function areaTxt(a){if(!a)return '';try{return '전용 '+Math.round(a)+'㎡('+window.PY(a)+')';}catch(e){return '전용 '+Math.round(a)+'㎡';}}

  function key(list){return list.length+'|'+(list[0]?list[0].pt.name+list[0].pt.lat:'')+'|'+SORT;}

  function sorted(list){
    var c=null;try{c=window.map.getCenter();}catch(e){}
    var a=list.slice();
    if(SORT==='price')a.sort(function(x,y){return (y.txs[0].p||0)-(x.txs[0].p||0);});
    else if(SORT==='many')a.sort(function(x,y){return y.txs.length-x.txs.length;});
    else a.sort(function(x,y){return (y.txs[0].cd||'').localeCompare(x.txs[0].cd||'');});
    if(SORT==='new'&&c){  /* 최신순은 날짜가 같은 게 많아 화면 중심에 가까운 순으로 한 번 더 */
      a.sort(function(x,y){
        var d=(y.txs[0].cd||'').localeCompare(x.txs[0].cd||''); if(d)return d;
        function dd(o){var p=o.pt;return (p.lat-c.lat)*(p.lat-c.lat)+(p.lng-c.lng)*(p.lng-c.lng);}
        return dd(x)-dd(y);
      });
    }
    return a;
  }

  function itemHTML(o){
    var pt=o.pt,tx=o.txs[0],ti=typeInfo(pt.t);
    var nm=ti[0].replace('·','·');
    return '<div class="v2i" style="--c:'+ti[1]+'">'
      +'<div class="ic">'+nm.slice(0,2)+'</div>'
      +'<div class="bd">'
        +'<div class="nm">'+pt.name+'</div>'
        +'<div class="ad">'+pt.dong+' '+(pt.jibun||'')+(pt.extra?' · '+pt.extra:'')+'</div>'
        +'<div class="pr"><span class="u">'+tx.u+'</span>'+money(tx)+'</div>'
        +'<div class="mt">'+areaTxt(tx.a)+(tx.f?' · '+tx.f+'층':'')+(tx.cd?' · '+tx.cd.slice(2)+' 계약':'')
          +(o.txs.length>1?' · 거래 '+o.txs.length+'건':'')+'</div>'
      +'</div></div>';
  }

  /* 넓게 볼 때(줌 13 미만)는 단지 마커가 없어 window._PTS가 비어 있다.
     그러면 목록이 "표시할 거래 없음"만 띄워, 지도를 처음 연 사람에게는 **왼쪽 목록이
     아예 안 뜨는 것처럼 보인다**(2026-08-10 석봉님 지적). 이 구간에서는 대신
     화면 안 시군구를 거래 많은 순으로 세워 준다 — 누르면 그 지역으로 들어간다. */
  function regionRows(){
    var out=[];
    try{
      var b=window.map.getBounds(), rs=(window.SB&&SB.summary&&SB.summary.regions)||[];
      for(var i=0;i<rs.length;i++){
        var r=rs[i]; if(!r.lat||!window.regionPass||!regionPass(r))continue;
        if(!b.contains([r.lat,r.lng]))continue;
        var tot=0;
        if(window.curTset&&r.nt){for(var k in curTset)tot+=(r.nt[k]||0);}
        else if(r.n)tot=(r.n['매매']||0)+(r.n['전세']||0)+(r.n['월세']||0);
        if(!tot)continue;
        out.push({nm:(r.sgg||'').replace(/_/g,' '),sido:r.sido||'',n:tot,lat:r.lat,lng:r.lng});
      }
      out.sort(function(x,y){return y.n-x.n;});
    }catch(e){}
    return out;
  }
  function paintRegionList(){
    var a=regionRows(), body=document.querySelectorAll('.v2b');
    var html=a.length?a.slice(0,80).map(function(r,i){
      return '<div class="v2r" data-ri="'+i+'"><span class="rk">'+(i+1)+'</span>'
        +'<span class="rn">'+r.nm+'<em>'+r.sido+'</em></span>'
        +'<span class="rc">'+r.n.toLocaleString()+'<i>건</i></span></div>';
    }).join(''):'<div class="v2empty">이 화면에는 거래가 없습니다<br>지도를 옮기거나 필터를 넓혀 보세요</div>';
    for(var i=0;i<body.length;i++)body[i].innerHTML=html;
    var t=document.getElementById('v2t'),s2=document.getElementById('v2s');
    var tot=0;a.forEach(function(r){tot+=r.n;});
    if(t)t.textContent=a.length?(a.length+'개 지역'):'표시할 거래 없음';
    if(s2)s2.textContent=a.length?('실거래 '+tot.toLocaleString()+'건 · 지역을 누르면 단지별로 보입니다'):'지도를 옮겨 보세요';
    var st=document.getElementById('v2st'),ss=document.getElementById('v2ss');
    if(st)st.textContent=a.length?(a.length+'개 지역'):'표시할 거래 없음';
    if(ss)ss.textContent=a.length?('실거래 '+tot.toLocaleString()+'건'):'';
    document.querySelectorAll('.v2r').forEach(function(el){
      el.onclick=function(){var r=a[+el.dataset.ri]; if(!r)return;
        try{window.go(r.lat,r.lng,14);}catch(e){}};
    });
  }

  function paintList(force){
    var _z=0;try{_z=window.map.getZoom();}catch(e){}
    if(_z<13){lastKey='region'+_z;paintRegionList();checkEmpty();return;}
    var list=window._PTS||[];
    var k=key(list); if(!force&&k===lastKey)return; if(k!==lastKey)shown=LIMIT; lastKey=k;
    var a=sorted(list), body=document.querySelectorAll('.v2b');
    var z=0;try{z=window.map.getZoom();}catch(e){}
    var head, sub;
    if(!a.length){
      head='이 화면에는 표시할 거래가 없어요';
      sub=(z<15?'지도를 더 확대하면 단지별로 보입니다':'필터를 넓히거나 지도를 옮겨 보세요');
    }else{
      head=a.length.toLocaleString()+'곳';
      var n=0;a.forEach(function(o){n+=o.txs.length;});
      sub='화면 안 실거래 '+n.toLocaleString()+'건 · 최근 신고 기준';
    }
    var html;
    if(!a.length){
      html='<div class="v2empty"><b>'+head+'</b><br>'+sub+'</div>';
    }else{
      html=a.slice(0,shown).map(itemHTML).join('');
      if(a.length>shown)html+='<div class="v2more" data-more="1">'+(a.length-shown).toLocaleString()+'곳 더 보기</div>';
    }
    for(var i=0;i<body.length;i++)body[i].innerHTML=html;

    var t=document.getElementById('v2t'),s=document.getElementById('v2s');
    if(t)t.textContent=a.length?head:'표시할 거래 없음';
    if(s)s.textContent=sub;
    var st=document.getElementById('v2st'),ss=document.getElementById('v2ss');
    if(st)st.textContent=a.length?('이 지역 '+head):'표시할 거래 없음';
    if(ss)ss.textContent=sub;

    /* 항목 <-> 마커 연결 */
    document.querySelectorAll('.v2i').forEach(function(el,i){
      var o=a[i]; if(!o)return;
      el.onclick=function(){
        try{window.go(o.pt.lat,o.pt.lng,Math.max(window.map.getZoom(),17));}catch(e){}
        setTimeout(function(){try{window.showAptCard(o.pt,(o.pt.txs||o.txs).slice());}catch(e){}},420);
        document.querySelectorAll('.v2i.on').forEach(function(x){x.classList.remove('on');});
        el.classList.add('on');
        var sh=document.getElementById('v2sheet'); if(sh&&window.innerWidth<=720)sh.classList.add('min');
      };
      el.onmouseenter=function(){ /* 목록에 마우스를 올리면 지도의 그 마커가 커진다 */
        if(hlEl)hlEl.classList.remove('hl');
        var ms=document.querySelectorAll('.pricetag');
        for(var j=0;j<ms.length;j++){
          var nm=ms[j].querySelector('.nm');
          if(nm&&nm.textContent===o.pt.name){hlEl=ms[j];ms[j].classList.add('hl');break;}
        }
      };
      el.onmouseleave=function(){if(hlEl){hlEl.classList.remove('hl');hlEl=null;}};
    });
    document.querySelectorAll('[data-more]').forEach(function(el){
      el.onclick=function(){shown+=LIMIT;paintList(true);};
    });
    checkEmpty();
  }

  /* ── UI 붙이기 ────────────────────────────────────────────── */
  function sortBar(){
    return '<div class="v2sort">'
      +'<button data-s="new" class="on">최신순</button>'
      +'<button data-s="price">높은 가격순</button>'
      +'<button data-s="many">거래 많은순</button></div>';
  }
  function bindSort(root){
    root.querySelectorAll('.v2sort button').forEach(function(b){
      b.onclick=function(){
        root.querySelectorAll('.v2sort button').forEach(function(x){x.classList.remove('on');});
        b.classList.add('on'); SORT=b.dataset.s; shown=LIMIT; paintList(true);
      };
    });
  }
  function mountList(){
    var w=document.getElementById('wrap');

    /* 접기·펴기 손잡이(2026-08-10 석봉님 요청). 접힌 상태는 기억해 둔다 —
       지도를 넓게 쓰려고 닫은 사람은 다음에 들어와도 닫힌 채로 보고 싶어 한다. */
    var grip=document.createElement('button'); grip.id='v2grip'; grip.type='button';
    grip.setAttribute('aria-label','매물 목록 접기/펴기');
    function syncGrip(){
      var off=document.body.classList.contains('listoff');
      grip.textContent=off?'›':'‹';
      grip.title=off?'매물 목록 열기':'매물 목록 접기';
      try{setTimeout(function(){window.map.invalidateSize({animate:false});},260);}catch(e){}
    }
    try{if(localStorage.getItem('sb_v2list')==='off')document.body.classList.add('listoff');}catch(e){}
    grip.onclick=function(){
      var off=document.body.classList.toggle('listoff');
      try{localStorage.setItem('sb_v2list',off?'off':'on');}catch(e){}
      syncGrip();
    };
    w.appendChild(grip); syncGrip();

    /* 지역(군집·동 원)이나 상품 마커를 누르면 접어 둔 목록을 다시 편다(2026-08-10 석봉님 요청).
       무언가를 눌렀다는 건 "여기 뭐가 있나 보자"는 뜻인데, 목록이 접혀 있으면 그 답이 안 보인다.
       다시 접고 싶으면 손잡이가 그대로 있으니, 편 상태를 기억까지 해 둔다. */
    function openList(){
      if(!document.body.classList.contains('listoff'))return;
      document.body.classList.remove('listoff');
      try{localStorage.setItem('sb_v2list','on');}catch(e){}
      syncGrip();
    }
    /* 모바일에는 좌측 목록 대신 하단 시트가 있다. 지역을 누르면 그 시트를 올린다.
       ⚠️상품 마커는 제외한다 — 누르면 단지 카드가 뜨는데 시트까지 올라오면 서로 가린다.
       시트가 접힌 채로 지도가 움직이는 동안 튀지 않도록, 확대가 끝난 뒤에 올린다. */
    function openSheet(){
      var sh=document.getElementById('v2sheet');
      if(!sh||!sh.classList.contains('min'))return;
      setTimeout(function(){
        sh.classList.remove('min');
        /* 모바일 재구성(map_m.js)이 켜져 있으면 '반'까지만 올린다 — 지도를 다 덮지 않게.
           'min'을 먼저 떼고 'half'를 붙여야 한다(둘이 겹치면 half가 이겨 접힘이 풀린다). */
        if(window._SB_SHEET_HALF)sh.classList.add('half');
      },420);
    }
    document.getElementById('map').addEventListener('click',function(e){
      if(!e.target||!e.target.closest)return;
      if(e.target.closest('.clus')){openList();openSheet();return;}
      if(e.target.closest('.pricetag'))openList();
    },true);   /* 캡처 단계 — 지도 마커가 이벤트를 멈춰도 먼저 받는다 */

    var d=document.createElement('div'); d.id='v2list';
    d.innerHTML='<div class="v2h"><div class="t" id="v2t">불러오는 중</div><div class="s" id="v2s">지도를 움직이면 이 목록도 따라 바뀝니다</div></div>'
      +sortBar()+'<div class="v2b"></div>';
    w.appendChild(d); bindSort(d);

    var sh=document.createElement('div'); sh.id='v2sheet';
    sh.innerHTML='<div class="sh-g"><i></i></div>'
      +'<div class="sh-h"><span class="t" id="v2st">불러오는 중</span><span class="s" id="v2ss"></span><span class="x">목록</span></div>'
      +sortBar()+'<div class="v2b"></div>';
    w.appendChild(sh); bindSort(sh);
    var tog=function(){sh.classList.toggle('min');};
    sh.querySelector('.sh-g').onclick=tog; sh.querySelector('.sh-h').onclick=tog;
    /* 접힌 상태로 시작: B안은 지도가 주인공이고, 좁은 화면에서는 두 안 모두 지도가 먼저다 */
    if(skin==='b'||window.innerWidth<=720)sh.classList.add('min');
  }

  /* ── 갱신 시점: 지도 이동 + 데이터 지연 로드 대응 폴링 ────── */
  function hook(){
    if(!window.map)return setTimeout(hook,150);
    var poll=null;
    function kick(){
      clearInterval(poll); var n=0;
      poll=setInterval(function(){ paintList(); if(++n>16)clearInterval(poll); },260);  /* 4초간 따라간다 */
    }
    /* 줌에 따라 마커 안 정보량을 CSS로 조절하려면 body에 표시가 필요하다
       (원본은 #map.names 하나만 준다) */
    function zc(){var z=window.map.getZoom();
      document.body.classList.toggle('z16',z===16);
      document.body.classList.toggle('z17',z>=17);}
    window.map.on('moveend zoomend',function(){zc();kick();});
    zc(); kick();
  }

  mountSwitch(); mountList(); watchMarkers(); watchCard(); watchClusters(); hook(); fitTop();
  setTimeout(fitTop,400); setTimeout(fitTop,1200);   /* 폰트·닉네임 로드로 헤더 높이가 늦게 바뀐다 */
})();
