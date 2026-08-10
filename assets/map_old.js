/* 노후 건물 지도 (2026-08-10 석봉님 지시)

   무엇을 보여주나
     동네마다 "주거 건물 몇 동 중 몇 동이 30년 넘었나"를 색으로 칠한다.
     지금 재개발 구역이 아니어도 노후가 몰린 동네를 눈으로 찾게 하려는 것이다.
     재개발 요건이 개별 건물이 아니라 **구역 단위 노후 비율**로 판정되기 때문에,
     한 채가 40년이어도 주변이 신축이면 의미가 없다.

   자료
     data/old_<시군구코드>.js  ← 건물노후도_수집.py (건축물대장 표제부 사용승인일)
       [동명, 전체동수, 30년이상%, 주거동수, 주거30년이상%]   (표본 부족은 -1)
     경계는 이미 있는 data/dong_<시군구코드>.js(동 경계 폴리곤)를 그대로 쓴다.

   원칙
     · **주거 기준을 기본으로 쓴다.** 재개발 노후도의 분모는 주거용이다.
       주거 표본이 모자라면(수집기가 -1로 표시) 회색으로 두고 "표본 부족"이라 적는다.
       상업지역을 노후 주거지처럼 칠하지 않기 위해서다.
     · 아직 수집이 안 된 지역은 아무것도 안 그린다(0%로 칠하면 "신축 동네"로 읽힌다).
     · 켤 때만 파일을 받는다. 꺼져 있으면 한 바이트도 안 받는다. */
(function(){
  if(!window.L)return;
  var Z_MIN=11, MAX_SGG=4;
  var on=false, layer=null, tip=null, loading={}, loaded={}, wired=false;

  /* 색: 옅은 모래 → 진한 벽돌. 높을수록 노후. 원색을 피해 지도 위에서 튀지 않게. */
  var STOPS=[[35,'#F2EEE4'],[45,'#EFD9BE'],[55,'#E8B98D'],[65,'#DD9160'],[75,'#C8663C'],[999,'#A8402A']];
  function colorOf(p){ for(var i=0;i<STOPS.length;i++) if(p<STOPS[i][0])return STOPS[i][1]; return STOPS[STOPS.length-1][1]; }

  function ready(cb){ if(window.map&&window.SB&&SB.summary)cb(); else setTimeout(function(){ready(cb);},200); }

  function loadJS(src,cb){
    if(loaded[src])return cb&&cb();
    if(loading[src])return;
    loading[src]=1;
    var s=document.createElement('script'); s.src=src;
    s.onload=function(){loaded[src]=1;loading[src]=0;cb&&cb();};
    s.onerror=function(){loaded[src]=1;loading[src]=0;};   /* 아직 수집 안 한 지역은 조용히 넘어간다 */
    document.head.appendChild(s);
  }

  function visibleSgg(){
    var b=window.map.getBounds(), rs=(SB.summary&&SB.summary.regions)||[], out=[];
    for(var i=0;i<rs.length&&out.length<MAX_SGG;i++){
      var r=rs[i]; if(!r.b||r.b.length!==4)continue;
      if(r.b[2]<b.getSouth()||r.b[0]>b.getNorth()||r.b[3]<b.getWest()||r.b[1]>b.getEast())continue;
      out.push(r.code);
    }
    return out;
  }

  function draw(){
    if(!layer)return;
    layer.clearLayers();
    if(!on)return;
    if(window.map.getZoom()<Z_MIN)return;
    var b=window.map.getBounds(), Z=window.DONGZ||{}, O=window.OLDZ||{}, n=0, have=0;
    visibleSgg().forEach(function(code){
      var rows=Z[code], stat=O[code];
      if(!rows||!stat)return;
      have++;
      var by={}; stat.forEach(function(s){by[s[0]]=s;});
      rows.forEach(function(row){
        var nm=row[0], s=by[nm]; if(!s)return;
        var pr=s[4];                       /* 주거 30년 이상 비율. -1 = 표본 부족 */
        var thin=(pr===-1||pr===''||pr===null);
        for(var k=1;k<row.length;k++){
          var ring=row[k], hit=false;
          for(var j=0;j<ring.length;j+=3){
            var p=ring[j];
            if(p[0]>=b.getSouth()&&p[0]<=b.getNorth()&&p[1]>=b.getWest()&&p[1]<=b.getEast()){hit=true;break;}
          }
          if(!hit)continue;
          (function(name,st,isThin){
            var poly=L.polygon(ring,{pane:'sbold',
              color:isThin?'#B9B3A6':'#8A5A44', weight:1, opacity:.5,
              fillColor:isThin?'#DEDACE':colorOf(st[4]), fillOpacity:isThin?.22:.52,
              className:'oldzone'});
            function show(e){
              if(!tip)return;
              tip.innerHTML=isThin
                ? '<b>'+name+'</b><span>주거 '+st[3]+'동 · 표본이 적어 비율 없음</span>'
                : '<b>'+name+'</b><span>주거 '+st[3].toLocaleString()+'동 중 30년 이상 <b class="v">'+st[4]+'%</b></span>'
                  +'<span class="s">건물 전체 '+st[1].toLocaleString()+'동 기준 '+(st[2]===-1?'-':st[2]+'%')+'</span>';
              tip.style.display='block';
              var pt=window.map.latLngToContainerPoint(e.latlng);
              tip.style.left=Math.max(8,Math.min(pt.x+14,window.innerWidth-200))+'px';
              tip.style.top=(pt.y+14)+'px';
            }
            poly.on('mouseover mousemove',show);
            poly.on('click',show);          /* 모바일은 올려놓기가 없다 — 눌러도 뜨게 */
            poly.on('mouseout',function(){if(tip)tip.style.display='none';});
            poly.addTo(layer);
          })(nm,s,thin);
          if(++n>140)return;
        }
      });
    });
    var em=document.getElementById('oldEmpty');
    if(em)em.style.display=(on&&have===0)?'block':'none';
  }

  function kickLoad(){
    if(!on)return;
    visibleSgg().forEach(function(code){
      loadJS('data/dong_'+code+'.js',draw);
      loadJS('data/old_'+code+'.js',draw);
    });
    draw();
  }

  function setOn(v){
    on=!!v;
    document.body.classList.toggle('oldon',on);
    var lg=document.getElementById('oldLegend'); if(lg)lg.style.display=on?'block':'none';
    if(tip)tip.style.display='none';
    if(on)kickLoad(); else draw();
    document.querySelectorAll('[data-l="old"],#oldBtn').forEach(function(b){b.classList.toggle('on',on);});
  }
  window._SBOLD={set:setOn,get:function(){return on;}};

  /* ── 지도 도구: 위성 · 지적도 · 단지명 ──────────────────────
     PC와 모바일이 같은 기능을 쓰도록 여기 한 곳에 두고, 모바일 세로 버튼(map_m.js)은
     이걸 불러 쓴다. 배경 타일 주소에 키가 들어 있어 키를 새로 적지 않는다. */
  var _sat=null,_cad=null;
  function baseTileUrl(){
    var u=null;
    window.map.eachLayer(function(l){if(!u&&l._url&&l._url.indexOf('/Base/')>0)u=l._url;});
    return u;
  }
  function toggleSat(){
    var u=baseTileUrl(); if(!u&&!_sat)return false;
    if(!_sat)_sat=L.tileLayer(u.replace('/Base/','/Satellite/').replace('.png','.jpeg'),
      {attribution:'&copy; VWorld(국토교통부)',maxZoom:19,maxNativeZoom:18,minZoom:6});
    if(window.map.hasLayer(_sat)){window.map.removeLayer(_sat);return false;}
    _sat.addTo(window.map); _sat.bringToBack(); return true;
  }
  function toggleCad(){
    /* 지적도(필지 경계). ⚠️타일(WMTS)에는 지적도가 없다 — WMS로 불러야 한다
       (2026-08-10 실호출 확인: WMS는 image/png 정상, 타일 주소 갈아끼우기는 오류 XML). */
    if(!_cad){
      var u=baseTileUrl(); if(!u)return false;
      var m=u.match(/wmts\/1\.0\.0\/([^\/]+)\//); if(!m)return false;
      _cad=L.tileLayer.wms('https://api.vworld.kr/req/wms?KEY='+m[1]+'&DOMAIN='+location.hostname,
        {layers:'lp_pa_cbnd_bubun',styles:'lp_pa_cbnd_bubun',format:'image/png',
         transparent:true,version:'1.3.0',maxZoom:19,minZoom:15,
         attribution:'지적도 &copy; VWorld(국토교통부)',pane:'sbcad'});
    }
    if(window.map.hasLayer(_cad)){window.map.removeLayer(_cad);return false;}
    _cad.addTo(window.map); return true;
  }
  function toggleNames(){
    var v=!document.body.classList.contains('shownames');
    document.body.classList.toggle('shownames',v);
    var mp=document.getElementById('map'); if(mp)mp.classList.toggle('names',v);
    return v;
  }
  window._SBTOOL={sat:toggleSat,cad:toggleCad,names:toggleNames};

  ready(function(){
    window.map.createPane('sbold');
    window.map.getPane('sbold').style.zIndex=412;      /* 타일 위, 동 경계(415)·마커 아래 */
    window.map.createPane('sbcad');
    window.map.getPane('sbcad').style.zIndex=405;      /* 지적도는 노후도보다 아래 */
    window.map.getPane('sbcad').style.pointerEvents='none';
    layer=L.layerGroup([],{pane:'sbold'}).addTo(window.map);

    tip=document.createElement('div'); tip.id='oldtip'; tip.style.display='none';
    document.getElementById('map').appendChild(tip);

    var lg=document.createElement('div'); lg.id='oldLegend'; lg.style.display='none';
    lg.innerHTML='<b>주거 건물 30년 이상</b>'
      +'<i style="background:#F2EEE4"></i><i style="background:#EFD9BE"></i><i style="background:#E8B98D"></i>'
      +'<i style="background:#DD9160"></i><i style="background:#C8663C"></i><i style="background:#A8402A"></i>'
      +'<span>35%<em>75%+</em></span>'
      +'<u>회색 = 주거 표본 30동 미만 · 출처 건축물대장(사용승인일)</u>';
    document.getElementById('map').appendChild(lg);

    var em=document.createElement('div'); em.id='oldEmpty'; em.style.display='none';
    em.textContent='이 지역은 아직 수집 전입니다 (현재 서울 완료)';
    document.getElementById('map').appendChild(em);

    /* PC 버튼: 실거래·재개발 칩 옆에 붙인다. 모바일은 map_m.js가 좌측 세로 토글에 넣는다. */
    if(!wired){
      wired=true;
      var modes=document.getElementById('modes');
      if(modes&&!document.getElementById('oldBtn')){
        var box=document.createElement('span'); box.id='sbTools';
        [['oldBtn','노후 건물','동네별 주거 건물 노후 비율',function(b){setOn(!on);}],
         ['cadBtn','지적도','필지 경계 (줌 15 이상)',function(b){b.classList.toggle('on',toggleCad());}],
         ['nmBtn','단지명','마커에 단지 이름 표시',function(b){b.classList.toggle('on',toggleNames());}],
         ['satBtn','위성','위성 사진',function(b){b.classList.toggle('on',toggleSat());}]
        ].forEach(function(d){
          var b=document.createElement('button'); b.id=d[0]; b.type='button';
          b.textContent=d[1]; b.title=d[2];
          b.addEventListener('click',function(){d[3](b);});
          box.appendChild(b);
        });
        modes.parentNode.insertBefore(box,modes.nextSibling);
      }
    }
    window.map.on('moveend zoomend',function(){ if(on)kickLoad(); });
  });
})();
