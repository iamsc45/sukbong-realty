/* 동 경계 위에 마우스를 올리면 이름과 범위가 뜬다 — 스테이징 시험용 (2026-08-10)
   석봉님: "네이버처럼 커서를 특정 동에 올리면 그 동 이름이 뜨고 범위도 나오게 할 수 있나?"

   방식
   - VWorld 읍면동 경계(LT_C_ADEMD_INFO)를 화면 범위로 받아 투명 폴리곤으로 깔고,
     마우스가 들어온 폴리곤만 옅게 채우고 이름을 띄운다.
   - 요청은 map.html이 이미 쓰는 JSONP 헬퍼(window._jsonp)를 그대로 쓴다. CORS 걱정이 없고
     VWorld 키도 그 파일 것을 재사용한다(키를 여기 다시 적지 않는다).

   ⚠️ 이건 어디까지나 **시험판**이다. 지도를 옮길 때마다 API를 부르면 호출량이 늘어난다.
   그래서 ①타일 격자(0.02도) 단위로 캐시해 같은 자리는 다시 안 부르고 ②줌 13 미만에서는
   아예 끄고 ③이동이 멈춘 뒤 350ms 지나서 부른다.
   채택되면 경계를 미리 받아 시군구별 정적 파일로 만들어 API 호출을 0으로 만드는 게 맞다. */
(function(){
  if(!window.L)return;
  var Z_MIN=13, cache={}, pending={}, layer=null, cur=null, tip=null;

  function ready(cb){ if(window.map&&window._jsonp)cb(); else setTimeout(function(){ready(cb);},200); }

  function keyOf(b){   /* 0.02도 격자로 잘라 캐시 키를 만든다(같은 동네를 다시 안 부르게) */
    function q(v){return Math.floor(v/0.02);}
    return q(b.getSouth())+'_'+q(b.getWest())+'_'+q(b.getNorth())+'_'+q(b.getEast());
  }

  function draw(feats){
    if(!layer)return;
    layer.clearLayers();
    feats.forEach(function(f){
      var g=f.geometry, p=f.properties||{}, nm=p.emd_kor_nm||p.full_nm||'';
      if(!g||!nm)return;
      var polys=(g.type==='MultiPolygon')?g.coordinates:[g.coordinates];
      polys.forEach(function(rings){
        var ll=rings[0].map(function(c){return [c[1],c[0]];});
        var poly=L.polygon(ll,{pane:'sbdong',color:'#2554E0',weight:1,opacity:.35,
          fillColor:'#2554E0',fillOpacity:0.001,className:'dongzone'});   /* 0이면 히트 영역이 사라진다 */
        poly.on('mouseover',function(){
          if(cur&&cur!==poly)cur.setStyle({fillOpacity:0.001,weight:1,opacity:.35});
          cur=poly; poly.setStyle({fillOpacity:.1,weight:2,opacity:.85});
          if(tip){tip.textContent=nm;tip.style.display='block';}
        });
        poly.on('mousemove',function(e){
          if(!tip)return;
          var pt=window.map.latLngToContainerPoint(e.latlng);
          tip.style.left=(pt.x+14)+'px'; tip.style.top=(pt.y+14)+'px';
        });
        poly.on('mouseout',function(){
          poly.setStyle({fillOpacity:0.001,weight:1,opacity:.35});
          if(tip)tip.style.display='none';
        });
        poly.addTo(layer);
      });
    });
  }

  function fetchZone(){
    var z=window.map.getZoom();
    if(z<Z_MIN){ if(layer)layer.clearLayers(); return; }
    var b=window.map.getBounds(), k=keyOf(b);
    if(cache[k]){draw(cache[k]);return;}
    if(pending[k])return;
    pending[k]=1;
    var box='BOX('+b.getWest().toFixed(5)+','+b.getSouth().toFixed(5)+','
                  +b.getEast().toFixed(5)+','+b.getNorth().toFixed(5)+')';
    var url='https://api.vworld.kr/req/data?service=data&request=GetFeature&format=json'
      +'&data=LT_C_ADEMD_INFO&key='+window.VKEY+'&size=60&geometry=true&crs=EPSG:4326'
      +'&domain='+encodeURIComponent(location.hostname)+'&geomFilter='+encodeURIComponent(box);
    window._jsonp(url,function(j){
      pending[k]=0;
      try{
        var fs=(((j.response||{}).result||{}).featureCollection||{}).features||[];
        cache[k]=fs; draw(fs);
      }catch(e){}
    },function(){pending[k]=0;});
  }

  ready(function(){
    window.map.createPane('sbdong');
    window.map.getPane('sbdong').style.zIndex=415;   /* 타일 위, 우리 마커·POI보다 아래 */
    layer=L.layerGroup([],{pane:'sbdong'}).addTo(window.map);

    tip=document.createElement('div'); tip.id='dongtip'; tip.style.display='none';
    document.getElementById('map').appendChild(tip);

    var t=null;
    window.map.on('moveend zoomend',function(){clearTimeout(t);t=setTimeout(fetchZone,350);});
    setTimeout(fetchZone,600);
  });
})();
