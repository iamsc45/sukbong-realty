/* 실거래지도 모바일 재구성 (2026-08-10 석봉님 지시)

   무엇을 바꾸나
     상단에 5줄까지 쌓이던 컨트롤을 검색+필터 한 줄로 줄이고, 나머지는 세 곳으로 나눈다.
       좌측 세로 토글 = 실거래 / 재개발 / 교통·학교 (재개발닷컴 방식)
       우측 세로 버튼 = 위성 / 현위치
       필터 시트     = 시도·시군구 · 상품 · 거래 · 가격·면적·준공·층 · 재개발 유형
     '실거래 겹쳐보기' 버튼은 없앤다. 실거래와 재개발을 각각 켜고 끄면 그 버튼이 하던 일이
     토글 두 개로 자연스럽게 표현된다(첨부 2·3의 정렬 문제도 여기서 사라진다).

   ⚠️원본 로직은 건드리지 않는다
     모드 전환은 setMode()를, 재개발 겹쳐보기는 원래 있던 .rfc.trade 버튼을 '대신 눌러' 처리한다.
     내부 변수를 직접 만지면 원본이 바뀔 때마다 깨진다. DOM은 옮기기만 하므로 핸들러가 살아 있다.

   PC는 아무 영향도 받지 않는다(720px 이하에서만 동작). */
(function(){
  var MQ='(max-width:720px)';
  if(!window.matchMedia||!window.matchMedia(MQ).matches)return;
  if(!document.getElementById('map'))return;

  function ready(cb){ if(window.map&&window.setMode&&document.getElementById('fpanel'))cb(); else setTimeout(function(){ready(cb);},150); }

  ready(function(){
    document.body.classList.add('mmap');
    var mapEl=document.getElementById('map'), fp=document.getElementById('fpanel');

    /* ── 필터 시트 재조립 ────────────────────────────────────
       흩어져 있던 시도·시군구·상품·거래·재개발 유형을 필터 시트 하나로 모은다.
       DOM을 옮기는 것뿐이라 원래 걸려 있던 클릭 핸들러는 그대로 산다. */
    var hd=document.createElement('div'); hd.className='mfh';
    hd.innerHTML='<span>지역·조건</span><button type="button" aria-label="닫기">✕</button>';
    fp.insertBefore(hd,fp.firstChild);

    var sel=document.createElement('div'); sel.className='mfsel';
    sel.appendChild(document.getElementById('selSido'));
    sel.appendChild(document.getElementById('selSgg'));
    fp.insertBefore(sel,hd.nextSibling);
    fp.insertBefore(document.getElementById('mcats'),sel.nextSibling);
    fp.insertBefore(document.getElementById('rfbar'),document.getElementById('mcats').nextSibling);

    /* ⚠️#fpanel을 #bar 밖으로 꺼낸다(2026-08-10 시뮬레이션에서 잡음).
       새 스킨의 #bar에는 backdrop-filter가 걸려 있는데, 그러면 그 안의 position:fixed 자식은
       화면이 아니라 #bar를 기준으로 자리를 잡는다. 필터 시트가 화면 위로 튀어 올라가 있었다.
       body로 옮기면 기준이 화면으로 돌아온다. 옮기는 것뿐이라 핸들러는 그대로다. */
    document.body.appendChild(fp);

    var foot=document.createElement('div'); foot.className='mfoot';
    foot.appendChild(document.getElementById('fcount'));
    foot.appendChild(document.getElementById('freset'));
    /* 원래 하단 줄에 있던 '닫기 ✕'는 시트 푸터의 '결과 보기'와 겹친다. 그 줄을 통째로 감춘다.
       ⚠️CSS `.frow:last-of-type`로 감추려 했더니 안 먹었다 — 푸터를 뒤에 붙이면서 마지막
       div가 푸터가 돼 버려 선택자가 아무것도 못 잡았다(2026-08-10 잘린 '닫기' 제보). */
    var fc=document.getElementById('fclose');
    if(fc&&fc.parentElement)fc.parentElement.style.display='none';
    var done=document.createElement('button');
    done.type='button'; done.className='chip'; done.textContent='결과 보기';
    done.style.background='#12203A'; done.style.color='#fff';
    foot.appendChild(done); fp.appendChild(foot);

    function closeFilter(){fp.classList.remove('open');}
    hd.querySelector('button').addEventListener('click',closeFilter);
    done.addEventListener('click',closeFilter);

    /* ── 좌측 레이어 토글 ────────────────────────────────────
       실거래와 재개발 둘뿐이다. 없는 것을 버튼으로 만들지 않았다.
         · 경매 물건 핀은 아직 지도에 올라와 있지 않다(경매 화면에서 넘어올 때 상품 필터만 바뀐다).
         · 지하철·학교는 VWorld 배경이 이미 그려 준다. 우리 POI를 겹치면 500KB를 더 받아
           같은 것을 두 번 그리게 된다(그래서 라이브에서 꺼 둔 상태다).
       둘 중 하나가 생기면 버튼 한 줄과 applyLayers의 분기 한 줄만 추가하면 된다. */
    var LY=document.createElement('div'); LY.id='mlayers';
    LY.innerHTML=
      '<button type="button" data-l="trade" class="on"><i class="ti ti-home-dollar" aria-hidden="true"></i>실거래</button>'
     +'<button type="button" data-l="redev"><i class="ti ti-building-community" aria-hidden="true"></i>재개발</button>'
     +'<button type="button" data-l="old"><i class="ti ti-building-warehouse" aria-hidden="true"></i>노후</button>';
    mapEl.appendChild(LY);

    var st={trade:true,redev:false,old:false};
    function paint(){
      LY.querySelectorAll('button').forEach(function(b){b.classList.toggle('on',!!st[b.dataset.l]);});
    }
    function applyLayers(){
      /* 재개발이 켜져 있으면 재개발 모드로 두고, 실거래는 '겹쳐보기'로 표현한다.
         겹쳐보기 상태는 원래 버튼을 대신 눌러 맞춘다(내부 변수를 직접 만지지 않는다). */
      if(st.redev){
        if(window.curMode!=='redev')window.setMode('redev');
        var tb=document.querySelector('.rfc.trade');
        if(tb&&!!window.redevShowTrade!==!!st.trade)tb.click();
        if(window.layer&&!window.map.hasLayer(window.layer))window.map.addLayer(window.layer);
      }else{
        if(window.curMode!=='trade')window.setMode('trade');
        if(window.layer){
          if(st.trade)window.map.addLayer(window.layer);
          else window.map.removeLayer(window.layer);
        }
      }
      /* ⚠️버튼 표시를 우리 변수만 믿지 말고 **지도의 실제 모드에서 되읽는다**
         (2026-08-10 "노후와 재개발을 같이 켜면 재개발이 안 꺼진다" 제보).
         setMode가 실패하거나 다른 곳에서 모드를 바꾸면 변수와 화면이 어긋난다. */
      setTimeout(function(){
        st.redev=(window.curMode==='redev');
        if(st.redev)st.trade=!!window.redevShowTrade;
        else st.trade=!!(window.layer&&window.map.hasLayer(window.layer));
        if(!st.trade&&!st.redev)st.trade=true;
        paint();
      },80);
      paint();
    }
    LY.addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b)return;
      var k=b.dataset.l;
      /* 노후는 겹쳐 보는 레이어라 실거래·재개발과 상관없이 켜고 끈다 */
      if(k==='old'){
        st.old=!st.old;
        if(window._SBOLD)window._SBOLD.set(st.old);
        paint(); return;
      }
      /* 실거래·재개발 둘 다 꺼지면 빈 지도가 된다. 마지막 하나는 못 끄게 막는다. */
      if(st[k]&&!st[k==='trade'?'redev':'trade'])return;
      st[k]=!st[k]; applyLayers();
    });
    /* 딥링크로 재개발 모드에 들어온 경우(?mode=redev) 토글도 그 상태로 맞춘다 */
    if(window.curMode==='redev'){st.redev=true;st.trade=!!window.redevShowTrade;paint();}

    /* ── 우측 보조 버튼 ─────────────────────────────────────── */
    var TL=document.createElement('div'); TL.id='mtools';
    TL.innerHTML=
      '<button type="button" data-t="sat"><i class="ti ti-satellite" aria-hidden="true"></i>위성</button>'
     +'<button type="button" data-t="cad"><i class="ti ti-vector-triangle" aria-hidden="true"></i>지적도</button>'
     +'<button type="button" data-t="nm"><i class="ti ti-tag" aria-hidden="true"></i>단지명</button>'
     +'<button type="button" data-t="loc"><i class="ti ti-current-location" aria-hidden="true"></i>현위치</button>';
    mapEl.appendChild(TL);

    /* 🔴대출 문의는 **헤더의 로그인 버튼 옆**으로 옮긴다(2026-08-11 석봉님 지적).
       지도 위에 띄우면 어디에 두든 검색창이나 마커를 가린다. 헤더는 항상 비어 있는 자리다. */
    (function(){
      var chip=document.getElementById('loanChip');
      var nav=document.querySelector('.site-header nav');
      if(chip&&nav&&!chip._moved){chip._moved=1;nav.insertBefore(chip,nav.firstChild);
        document.body.classList.add('loanhdr');}
    })();

    /* 새 스킨의 검색 바는 지도 위에 떠 있다. 좌우 세로 버튼을 그 아래에서 시작시킨다. */
    function place(){
      var bb=document.getElementById('bar').getBoundingClientRect();
      var mb=mapEl.getBoundingClientRect();
      var t=Math.max(10,Math.round(bb.bottom-mb.top+10))+'px';
      LY.style.top=t; TL.style.top=t;
      document.documentElement.style.setProperty('--mtop',t);
    }
    /* 새 스킨(body.v2)이 붙기 전에 재면 바가 아직 높아서 버튼이 아래로 밀린다.
       초반 몇 초 동안 몇 번 더 재서 자리를 잡는다(2026-08-10 시뮬레이션에서 버튼이 움직였다). */
    place(); [200,600,1500,3000].forEach(function(ms){setTimeout(place,ms);});
    window.addEventListener('resize',place);
    new MutationObserver(place).observe(document.getElementById('bar'),{attributes:true,attributeFilter:['class','style']});
    new MutationObserver(place).observe(document.body,{attributes:true,attributeFilter:['class']});

    /* 위성·지적도·단지명은 map_old.js가 PC와 공용으로 갖고 있다. 여기서는 부르기만 한다. */
    TL.addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b)return;
      var t=b.dataset.t, T=window._SBTOOL;
      if(t==='sat'||t==='cad'||t==='nm'){
        if(!T)return;
        b.classList.toggle('on', t==='sat'?T.sat():t==='cad'?T.cad():T.names());
        return;
      }
      if(t==='loc'){ if(!T||!T.locate)return; b.classList.add('on');
        T.locate(function(){b.classList.remove('on');}); return; }

    });

    /* ── 목록 시트 3단계(접힘 → 반 → 전체) ──────────────────── */
    var sh=document.getElementById('v2sheet');
    if(sh){
      /* 첫 화면은 접힘으로 시작한다 — 지도가 주인공이다.
         ⚠️'min'과 'half'가 같이 붙으면 half가 이겨서 첫 화면부터 반쯤 열린다. 항상 하나만 남긴다. */
      function syncSheet(){
        /* 시트가 올라와 있으면 좌우 지도 버튼을 숨긴다(제보: 버튼이 목록을 가림) */
        var up=!sh.classList.contains('min');
        document.body.classList.toggle('sheetup',up);
        /* 손잡이에 "지금 누르면 어떻게 되는지"를 적는다(2026-08-11 석봉님 제안).
           '목록 ↕'만 있으면 눌러야 하는 자리라는 걸 알아채기 어렵다. */
        var x=sh.querySelector('.sh-h .x');
        if(x)x.textContent=up?'내리기 ▼':'목록 올리기 ▲';
      }
      /* 🔴3단계(접힘→반→전체)를 **2단계로 줄인다**(2026-08-11 석봉님).
         손잡이에 '내리기'라고 써 놓고 누르면 한 번 더 올라가서 글자가 거짓말을 했다.
         목록은 시트 안에서 스크롤되므로 '반'이면 충분하다. 누르면 올라오고, 누르면 내려간다. */
      var next=function(){
        if(sh.classList.contains('min')){sh.classList.remove('min');sh.classList.add('half');}
        else{sh.classList.remove('half');sh.classList.add('min');}
        syncSheet();
      };
      new MutationObserver(syncSheet).observe(sh,{attributes:true,attributeFilter:['class']});
      syncSheet();
      /* 원래 걸려 있던 토글(접힘↔전체)을 3단계로 바꾼다.
         노드를 복제해 갈아 끼우면 옛 핸들러가 같이 떨어져 나간다. */
      ['.sh-g','.sh-h'].forEach(function(q){
        var el=sh.querySelector(q); if(!el)return;
        var c=el.cloneNode(true); el.parentNode.replaceChild(c,el);
        c.addEventListener('click',next);
      });
      /* 지역을 눌러 시트가 열릴 때 map_v2.js가 여기를 본다 — 전체가 아니라 '반'까지만 올린다.
         시트가 화면을 다 덮으면 어디를 눌렀는지 안 보인다. */
      window._SB_SHEET_HALF=true;
    }

    applyLayers();
  });
})();
