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
  if(P.get('tile')==='plain')document.body.classList.add('tile-plain');

  /* ── 스킨 전환 스위치(스테이징에만) ───────────────────────── */
  function mountSwitch(){
    var d=document.createElement('div'); d.id='v2skin';
    d.innerHTML='<button data-s="a">네이버형</button><button data-s="b">호갱노노형</button>'
      +'<span class="sep"></span><button data-s="old">현재 지도</button>';
    document.getElementById('wrap').appendChild(d);
    d.querySelectorAll('button').forEach(function(b){
      if(b.dataset.s===skin)b.classList.add('on');
      b.onclick=function(){
        var q=new URLSearchParams(location.search);
        if(b.dataset.s==='old'){location.href='map.html'+(q.get('q')?'?q='+encodeURIComponent(q.get('q')):'');return;}
        q.set('skin',b.dataset.s); location.href='map_v2.html?'+q.toString();
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

  function paintList(force){
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
    if(window.innerWidth<=720)sh.classList.add('min');
  }

  /* ── 갱신 시점: 지도 이동 + 데이터 지연 로드 대응 폴링 ────── */
  function hook(){
    if(!window.map)return setTimeout(hook,150);
    var poll=null;
    function kick(){
      clearInterval(poll); var n=0;
      poll=setInterval(function(){ paintList(); if(++n>16)clearInterval(poll); },260);  /* 4초간 따라간다 */
    }
    window.map.on('moveend zoomend',kick);
    kick();
  }

  mountSwitch(); mountList(); watchMarkers(); hook();
})();
