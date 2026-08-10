/* 지도 생활 POI(지하철역·학교) 오버레이 — 스테이징 스킨 전용 (2026-08-10)
   석봉님 지시: "네이버·호갱노노처럼 지하철·학교가 눈에 잘 띄게".
   배경 타일에도 역·학교가 그려져 있지만 작고 흐려서 눈에 안 들어온다.
   그래서 좌표를 따로 받아(OSM) 우리가 직접, 크고 또렷하게 그린다.

   원칙
   - 우리 가격 마커가 주인공이다. POI는 그 아래 pane에 두고 색·크기를 한 단계 낮춘다.
   - 화면 안에 있는 것만, 개수 상한을 두고 그린다(지도가 무거워지면 안 된다).
   - 학교는 전국 2만 개라 시도별 파일을 화면에 들어온 시도만 지연 로드한다.
   출처: OpenStreetMap 기여자 (ODbL) — 범례에 표기한다. */
(function(){
  if(!window.L)return;
  var Z_SUB=13, Z_SCH=16, Z_LINE=11;   /* 이 줌부터 보인다 */
  var MAX_SUB=45, MAX_SCH=48, MAX_LINE=700;
  var pane, gSub, gSch, gLine, loading={}, loaded={};

  /* 시도 bbox (수집 스크립트와 같은 표) — 남,서,북,동 */
  var SIDO={"11":[37.41,126.76,37.71,127.19],"26":[34.88,128.74,35.40,129.32],
    "27":[35.60,128.35,36.02,128.77],"28":[37.15,126.35,37.92,126.83],
    "29":[35.05,126.64,35.26,127.02],"30":[36.18,127.25,36.50,127.56],
    "31":[35.44,128.95,35.75,129.47],"36":[36.42,127.11,36.75,127.42],
    "41":[36.89,126.36,38.31,127.87],"42":[37.02,127.07,38.62,129.38],
    "43":[36.01,127.28,37.26,128.68],"44":[35.98,125.95,37.06,127.63],
    "45":[35.29,125.95,36.30,127.88],"46":[33.90,125.05,35.50,127.90],
    "47":[35.60,127.79,37.55,129.60],"48":[34.55,127.55,35.92,129.24],
    "50":[33.10,126.10,33.60,126.99]};

  var SCH=[['초','#E8891A'],['중','#12A150'],['고','#2554E0'],['교','#8A8378']];

  function ready(cb){ if(window.map)cb(); else setTimeout(function(){ready(cb);},150); }

  function loadJS(src,cb){
    if(loaded[src])return cb&&cb();
    if(loading[src])return;
    loading[src]=1;
    var s=document.createElement('script'); s.src=src;
    s.onload=function(){loaded[src]=1;loading[src]=0;cb&&cb();};
    s.onerror=function(){loaded[src]=1;loading[src]=0;};   /* 없는 시도는 조용히 넘어간다 */
    document.head.appendChild(s);
  }

  function icon(cls,html,w,h){
    return L.divIcon({className:'',html:'<div class="'+cls+'">'+html+'</div>',
      iconSize:[w,h],iconAnchor:[w/2,h/2]});
  }

  function drawSub(b,z){
    gSub.clearLayers();
    if(z<Z_SUB||!window.POISUB)return;
    var out=[],i;
    for(i=0;i<POISUB.length;i++){
      var r=POISUB[i];
      if(r[0]<b.getSouth()||r[0]>b.getNorth()||r[1]<b.getWest()||r[1]>b.getEast())continue;
      if(z<15&&r[3]===1)continue;              /* 넓게 볼 땐 지하철만 */
      out.push(r); if(out.length>MAX_SUB)break;
    }
    for(i=0;i<out.length;i++){
      var r=out[i], sub=(r[3]===0);
      /* 역 이름은 중간 줌에서만 우리가 쓴다. 크게 확대하면 배경 타일이 같은 이름을
         더 크게 적어 "독립문 / 독립문역"처럼 두 번 나온다(2026-08-10 확인). */
      /* ⚠️ 배경 타일을 CARTO Voyager로 바꾸면서 전제가 뒤집혔다(2026-08-10 2차).
         VWorld는 역·학교 이름을 타일에 그려 줘서 우리가 쓰면 중복이었지만,
         Voyager에는 역 이름이 없다. 그래서 이제는 우리가 항상 쓴다. */
      var html='<i class="d'+(sub?'':' tr')+'"></i>'+(z>=14?'<b>'+r[2]+'</b>':'');
      var w=(z>=14?90:20);
      L.marker([r[0],r[1]],{icon:icon('poi sub'+(sub?'':' train'),html,w,20),
        pane:'sbpoi',interactive:false,keyboard:false}).addTo(gSub);
    }
  }

  function drawSch(b,z){
    gSch.clearLayers();
    if(z<Z_SCH||!window.POISCH)return;
    var out=[],k,arr,i;
    for(k in POISCH){
      arr=POISCH[k];
      for(i=0;i<arr.length;i++){
        var r=arr[i];
        if(r[0]<b.getSouth()||r[0]>b.getNorth()||r[1]<b.getWest()||r[1]>b.getEast())continue;
        out.push(r); if(out.length>MAX_SCH)break;
      }
      if(out.length>MAX_SCH)break;
    }
    for(i=0;i<out.length;i++){
      var r=out[i], g=SCH[r[3]]||SCH[3];
      /* 이름은 배경 타일이 이미 적고 있다. 우리가 또 쓰면 글자가 겹쳐 지저분해져서
         (2026-08-10 첫 렌더에서 확인) 학교는 색 아이콘만 얹어 눈에 띄게만 한다.
         역은 이름이 곧 정보라 그대로 둔다. */
      var nm=r[2].replace(/(초등학교|중학교|고등학교|학교)$/,'');
      var html='<i style="background:'+g[1]+'">'+g[0]+'</i>'+(z>=17?'<b>'+nm+'</b>':'');
      L.marker([r[0],r[1]],{icon:icon('poi sch',html,(z>=17?76:18),18),
        pane:'sbpoi',interactive:false,keyboard:false}).addTo(gSch);
    }
  }

  /* 지하철 노선(선). 2026-08-10 석봉님: "대중교통은 지도에서 절대 빠지면 안 된다".
     역 점만으로는 노선이 어디로 흐르는지 안 보이는데, 집을 볼 때 가장 먼저 보는 게
     역세권이다. 배경 타일(CARTO)에는 노선이 없어서 우리가 직접 그린다.
     선은 가격 마커보다 훨씬 아래(pane sbline)에 깔아 읽는 데 방해가 되지 않게 한다. */
  function drawLine(b,z){
    gLine.clearLayers();
    if(z<Z_LINE||!window.POILINE)return;
    var w=(z>=15?5:(z>=13?4:3)), n=0;
    for(var i=0;i<POILINE.length;i++){
      var r=POILINE[i], g=r[2], hit=false;
      for(var j=0;j<g.length;j++){
        if(g[j][0]>=b.getSouth()&&g[j][0]<=b.getNorth()&&g[j][1]>=b.getWest()&&g[j][1]<=b.getEast()){hit=true;break;}
      }
      if(!hit)continue;
      L.polyline(g,{color:r[0],weight:w,opacity:.85,lineCap:'round',lineJoin:'round',
        pane:'sbline',interactive:false,smoothFactor:1.6}).addTo(gLine);
      if(++n>MAX_LINE)break;
    }
  }

  /* 화면에 걸친 시도의 학교 파일만 받아 온다 */
  function needSchool(b,z){
    if(z<Z_SCH)return;
    var n=0;
    for(var c in SIDO){
      var s=SIDO[c];
      if(s[2]<b.getSouth()||s[0]>b.getNorth()||s[3]<b.getWest()||s[1]>b.getEast())continue;
      loadJS('data/poi_school_'+c+'.js',refresh);
      if(++n>=2)break;      /* 경계에 걸쳐도 두 개까지만 */
    }
  }

  var t=null;
  function refresh(){
    clearTimeout(t);
    t=setTimeout(function(){
      var b=window.map.getBounds(), z=window.map.getZoom();
      needSchool(b,z); drawLine(b,z); drawSub(b,z); drawSch(b,z);
    },90);
  }

  ready(function(){
    window.map.createPane('sbline');
    window.map.getPane('sbline').style.zIndex=420;     /* 타일 위, 역·학교 아이콘 아래 */
    window.map.getPane('sbline').style.pointerEvents='none';
    window.map.createPane('sbpoi');
    window.map.getPane('sbpoi').style.zIndex=450;      /* 타일(200) 위, 가격 마커(600) 아래 */
    window.map.getPane('sbpoi').style.pointerEvents='none';
    gSub=L.layerGroup([],{pane:'sbpoi'}).addTo(window.map);
    gSch=L.layerGroup([],{pane:'sbpoi'}).addTo(window.map);
    gLine=L.layerGroup([],{pane:'sbline'}).addTo(window.map);
    loadJS('data/poi_subline.js',refresh);
    loadJS('data/poi_subway.js',refresh);
    window.map.on('moveend zoomend',refresh);
    refresh();

    /* 출처 한 줄 (ODbL 의무) */
    var lg=document.getElementById('legend');
    if(lg&&lg.innerHTML.indexOf('OpenStreetMap')<0){
      var d=document.createElement('div');
      d.style.cssText='margin-top:4px;font-size:9.5px;color:#9a938a';
      d.textContent='지하철 노선·역·학교 ⓒ OpenStreetMap 기여자';
      lg.appendChild(d);
    }
  });
})();
