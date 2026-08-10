/* 동 경계 위에 마우스를 올리면 이름과 범위가 뜬다 (2026-08-10)
   석봉님: "네이버처럼 커서를 특정 동에 올리면 이름이 뜨고 범위도 나오게" → "부하 안 걸리게 되지?"

   ⚠️ 처음 시험판은 지도를 옮길 때마다 **사용자 브라우저가 VWorld를 직접 불렀다.**
   화면 하나당 한 번씩이라 방문자가 늘면 그대로 호출량이 된다. 그래서 방식을 바꿨다.
   지금은 우리가 미리 받아 둔 **정적 파일만 읽는다 — 사용자 쪽 API 호출 0.**
     data/dong_<시군구코드>.js  (동경계_수집.py가 만든다, 전국 256개·평균 78KB·전송 시 gzip으로 1/3)
   실거래 detail_*.js와 같은 구조라, 보고 있는 시군구 것만 받아 온다.

   부하 관리
   - 줌 13 미만에서는 아예 끈다(넓게 볼 땐 동 경계가 의미도 없고 폴리곤만 많아진다)
   - 화면에 걸친 시군구 최대 3개까지만 로드하고, 받은 것은 브라우저 메모리에 남는다
   - 그리는 것도 화면에 걸친 동만
   - **모바일(터치)에서는 아예 켜지 않는다** — 손가락에는 '올려놓기'가 없어 얻는 게 없는데
     파일 내려받기와 폴리곤 90개 렌더는 그대로 든다(2026-08-10 라이브 반영 전 점검)
   - **재개발 모드에서는 끈다** — 구역 폴리곤과 겹쳐 어느 선이 구역계인지 헷갈린다 */
(function(){
  if(!window.L)return;
  /* 모바일에서도 켠다(2026-08-10 2차). 처음엔 "손가락에는 올려놓기가 없다"고 껐는데,
     **탭하면 이름이 뜨게** 하면 모바일에서도 쓸모가 있다. 대신 파일은 그대로 최대 3개만 받는다.
     ⚠️`(hover:none)`으로 기기를 판정하지 말 것 — 헤드리스·일부 임베드 브라우저가
     마우스가 있어도 hover:none으로 답해 PC에서까지 조용히 꺼진다(8/10 시뮬레이션에서 겪음). */
  var TOUCH=!!(window.matchMedia&&window.matchMedia('(max-width:720px)').matches);
  var Z_MIN=13, MAX_SGG=3, MAX_POLY=90;
  var layer=null, cur=null, tip=null, loading={}, loaded={};

  function ready(cb){ if(window.map&&window.SB&&SB.summary)cb(); else setTimeout(function(){ready(cb);},200); }

  function loadJS(src,cb){
    if(loaded[src])return cb&&cb();
    if(loading[src])return;
    loading[src]=1;
    var s=document.createElement('script'); s.src=src;
    s.onload=function(){loaded[src]=1;loading[src]=0;cb&&cb();};
    s.onerror=function(){loaded[src]=1;loading[src]=0;};   /* 아직 안 만든 시군구는 조용히 넘어간다 */
    document.head.appendChild(s);
  }

  /* 화면에 걸친 시군구를 summary의 bbox로 찾는다(실거래 마커가 쓰는 것과 같은 값) */
  function needFiles(b){
    var rs=(SB.summary&&SB.summary.regions)||[], n=0;
    for(var i=0;i<rs.length;i++){
      var r=rs[i]; if(!r.b||r.b.length!==4)continue;
      if(r.b[2]<b.getSouth()||r.b[0]>b.getNorth()||r.b[3]<b.getWest()||r.b[1]>b.getEast())continue;
      loadJS('data/dong_'+r.code+'.js',draw);
      if(++n>=MAX_SGG)break;
    }
  }

  function styleOff(p){p.setStyle({fillOpacity:0.001,weight:1,opacity:.35});}

  function draw(){
    if(!layer||!window.map)return;
    layer.clearLayers(); cur=null;
    if(tip)tip.style.display='none';
    if(window.curMode==='redev')return;               /* 구역계와 겹치지 않게 */
    var z=window.map.getZoom(); if(z<Z_MIN)return;
    var b=window.map.getBounds(), Z=window.DONGZ||{}, n=0;
    for(var code in Z){
      var rows=Z[code];
      for(var i=0;i<rows.length;i++){
        var nm=rows[i][0];
        for(var k=1;k<rows[i].length;k++){
          var ring=rows[i][k], hit=false;
          for(var j=0;j<ring.length;j+=3){          /* 3점마다만 봐도 화면 판정에는 충분하다 */
            var p=ring[j];
            if(p[0]>=b.getSouth()&&p[0]<=b.getNorth()&&p[1]>=b.getWest()&&p[1]<=b.getEast()){hit=true;break;}
          }
          if(!hit)continue;
          (function(name){
            var poly=L.polygon(ring,{pane:'sbdong',color:'#2554E0',weight:1,opacity:.35,
              fillColor:'#2554E0',fillOpacity:0.001,className:'dongzone'});
            /* ⚠️ fillOpacity가 정확히 0이면 SVG 면이 마우스를 못 받아 호버가 안 걸린다(2026-08-10). */
            function mark(e){
              if(cur&&cur!==poly)styleOff(cur);
              cur=poly; poly.setStyle({fillOpacity:.1,weight:2,opacity:.85});
              if(!tip)return;
              tip.textContent=name; tip.style.display='block';
              if(e&&e.latlng){
                var pt=window.map.latLngToContainerPoint(e.latlng);
                tip.style.left=Math.max(8,Math.min(pt.x+14,window.innerWidth-110))+'px';
                tip.style.top=(pt.y+14)+'px';
              }
              if(TOUCH){clearTimeout(poly._t);poly._t=setTimeout(function(){
                styleOff(poly); if(tip)tip.style.display='none';},2200);}
            }
            poly.on('mouseover mousemove',mark);
            poly.on('click',mark);      /* 모바일은 올려놓기가 없다 — 눌러도 뜨게(2026-08-10) */
            poly.on('mouseout',function(){if(TOUCH)return;styleOff(poly); if(tip)tip.style.display='none';});
            poly.addTo(layer);
          })(nm);
          if(++n>MAX_POLY)return;
        }
      }
    }
  }

  ready(function(){
    window.map.createPane('sbdong');
    window.map.getPane('sbdong').style.zIndex=415;   /* 타일 위, 우리 마커·POI보다 아래 */
    layer=L.layerGroup([],{pane:'sbdong'}).addTo(window.map);

    tip=document.createElement('div'); tip.id='dongtip'; tip.style.display='none';
    document.getElementById('map').appendChild(tip);

    var t=null;
    function kick(){
      clearTimeout(t);
      t=setTimeout(function(){
        var z=window.map.getZoom();
        if(z<Z_MIN||window.curMode==='redev'){layer.clearLayers();if(tip)tip.style.display='none';return;}
        needFiles(window.map.getBounds()); draw();
      },220);
    }
    window.map.on('moveend zoomend',kick);
    /* 모드 전환은 지도 이동 없이도 일어난다(재개발 ↔ 실거래 칩) */
    document.querySelectorAll('#modes button').forEach(function(b){b.addEventListener('click',kick);});
    setTimeout(kick,500);
  });
})();
