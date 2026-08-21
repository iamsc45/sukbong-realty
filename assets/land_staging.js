/* ═══════════════════════════════════════════════════════════════════
   지도 토지 카드 — 스테이징 시안 (2026-08-21, 토지 지번 매칭 세션)

   무엇을 보여주나 (본편에 아직 없는 것 셋)
     ① 이 필지에 지금 나와 있는 매물(호가) — 2026-08-21 갱신분
     ② 확인 수준 배지 (높음/보통 — 석봉님 확정 표기)
     ③ 이 필지의 과거 건물 거래 이력 (예: 2025-02 3.2억 → 2026-06 5.7억)

   어떻게
     본편 landFill 을 몽키패치한다. 원본을 먼저 실행하고, 원본이 카드에
     써 둔 확정 지번(.loc 의 <b>)을 읽어 그 지번의 매물·거래를 붙인다.
     🔴 판정 로직을 복제하지 않는다 — 원본과 어긋나면 화면마다 말이 갈린다.
   ⚠️ 이 파일은 스테이징 전용이다. 본편(map.html)은 이 파일을 싣지 않는다.
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var PYUNG=3.305785;
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function comma(n){return Number(n||0).toLocaleString('ko-KR');}
  function eok(man){var v=+man||0;
    return v>=10000?comma(Math.round(v/1000)/10)+'억':comma(v)+'만';}
  function py(m2){var m=+m2||0;if(!m)return '';var p=m/PYUNG;
    return comma(Math.round(m*10)/10)+'㎡('+(m<100?Math.round(p*10)/10:Math.round(p))+'평)';}
  function ymT(ym){ym=String(ym||'');
    return ym.length===4?('20'+ym.slice(0,2)+'.'+ym.slice(2)):'';}

  function patch(){
    var orig=window.landFill;
    if(typeof orig!=='function'){ setTimeout(patch,300); return; }
    if(orig._staged) return;
    var f=function(pt,txs){
      orig(pt,txs);
      try{ extra(pt); }catch(e){}
    };
    f._staged=1;
    /* 원본 함수에 매달린 상태(_code10 등)를 그대로 넘긴다 */
    for(var k in orig){ if(Object.prototype.hasOwnProperty.call(orig,k)) f[k]=orig[k]; }
    window.landFill=f;
  }

  function extra(pt){
    if(!pt||pt.t!=='land') return;
    var loc=document.querySelector('#rcard .loc');
    /* 지번을 두 경로로 얻는다.
       ① 원본 landFill 이 좁혀 붙인 추정 지번(.loc 의 <b>)
       ② 원래부터 공개된 지번(pt.jibun 에 별표가 없다) — 이쪽이 오히려 확실하다.
          첫 시험에서 이 경우를 빼먹어 「면목동 727-302」 카드에 아무것도 안 붙었다. */
    var jbEl=loc?loc.querySelector('b'):null;
    var jb=null, open=false;
    if(jbEl){ jb=jbEl.textContent.trim(); }
    else if(pt.jibun && String(pt.jibun).indexOf('*')<0){ jb=String(pt.jibun).trim(); open=true; }
    /* ⚠️ 지번을 못 좁힌 지점에서도 **동네 매물 요약**은 붙인다.
       대부분의 마커가 마스킹 지점이라, 지번이 있어야만 붙이면 시안이 거의 안 보인다.
       「이 필지」와 「이 동네」를 문구로 명확히 가른다. */
    var c10=(window.landFill._code10||{})[pt.dong];
    var LD=c10&&window._LANDD?window._LANDD[c10]:null;
    if(!LD) return;
    if(document.getElementById('stgLand')) return;   /* 같은 카드에 두 번 금지 */

    /* ② 확인 수준 — 자료의 내부 라벨을 화면 말로 바꾼다(석봉님 확정 표기).
       공개 지번(open)은 추정이 아니므로 배지를 달지 않는다. */
    if(jb && !open && loc && !loc.querySelector('.stg-lv')){
      var row=(LD.d||[]).filter(function(r){return r[0]===jb;})[0];
      var g=row?String(row[6]||''):'';
      /* v11 코드(S/SH/SC/A/AH)·옛 한글 양쪽 수용 */
      var hi=/^S/.test(g)||g.indexOf('확실')===0||g.indexOf('연쇄')>=0;
      var sp=document.createElement('span');
      sp.className='stg-lv';
      sp.style.cssText='display:inline-block;margin-left:4px;padding:1px 6px;border-radius:3px;'
        +'font-size:10px;font-weight:800;'
        +(hi?'background:#EEF3FB;color:#1B3F7A':'background:rgba(255,255,255,.22)');
      sp.textContent='확인 수준 '+(hi?'높음':'보통');
      loc.appendChild(sp);
    }

    var h=[];
    /* ① 이 필지 현재 매물 (지번이 잡혔을 때) */
    var lots=jb?(LD.l||[]).filter(function(x){return x[0]===jb;}):[];
    if(lots.length){
      h.push('<div style="font-weight:800;margin:10px 0 4px">이 필지 현재 매물 '
        +'<span style="font-weight:400;opacity:.7">'+lots.length+'건</span></div>');
      lots.slice(0,3).forEach(function(x){
        var a=+x[2]||0, p=a?Math.round((+x[1]||0)/(a/PYUNG)):0;
        h.push('<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0">'
          +'<span>'+esc(py(x[2]))+(x[4]?' · '+esc(x[4]):'')+'</span>'
          +'<span style="text-align:right"><b>'+eok(x[1])+'</b>'
          +(p?' <span style="opacity:.65;font-size:11px">평당 '+comma(p)+'만</span>':'')
          +'</span></div>');
      });
    }
    /* ①-2 이 동네 현재 매물 요약 — 지번과 무관하게 붙는다(마커 대부분이 마스킹 지점이라
       이게 없으면 시안이 거의 안 보이고, 실사용 가치도 이쪽이 크다). 2026-08-21 갱신분. */
    var all=(LD.l||[]);
    if(all.length){
      var pys=all.map(function(x){var a=+x[2]||0;return a?(+x[1]||0)/(a/PYUNG):0;})
                 .filter(function(v){return v>0;}).sort(function(a,b){return a-b;});
      var med=pys.length?Math.round(pys[Math.floor(pys.length/2)]):0;
      h.push('<div style="font-weight:800;margin:10px 0 4px">이 동네 현재 토지 매물 '
        +'<span style="font-weight:400;opacity:.7">'+all.length+'건'
        +(med?' · 평당 중위 '+comma(med)+'만':'')+'</span></div>');
      all.slice(0,lots.length?0:3).forEach(function(x){
        var a=+x[2]||0, p=a?Math.round((+x[1]||0)/(a/PYUNG)):0;
        h.push('<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0">'
          +'<span>'+esc(x[0])+' · '+esc(py(x[2]))+(x[4]?' · '+esc(x[4]):'')+'</span>'
          +'<span style="text-align:right"><b>'+eok(x[1])+'</b>'
          +(p?' <span style="opacity:.65;font-size:11px">평당 '+comma(p)+'만</span>':'')
          +'</span></div>');
      });
    }
    /* ③ 이 필지 건물 거래 이력 (b 배열 — 금액은 땅+건물 합) */
    var blds=jb?(LD.b||[]).filter(function(x){return x[0]===jb;}):[];
    if(blds.length){
      h.push('<div style="font-weight:800;margin:10px 0 4px">이 필지 건물 거래 '
        +'<span style="font-weight:400;opacity:.7">땅+건물 합계액</span></div>');
      blds.slice(0,3).forEach(function(x){
        h.push('<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0">'
          +'<span>'+esc(ymT(x[1]))+' · 대지 '+esc(py(x[3]))
          +(x[5]?' · '+esc(x[5])+'년':'')+'</span>'
          +'<b>'+eok(x[2])+'</b></div>');
      });
    }
    if(!h.length) return;
    var note=document.getElementById('rcLandNote');
    var tx=document.getElementById('rcTx');
    var host=note||tx; if(!host||!host.parentNode) return;
    var d=document.createElement('div');
    d.id='stgLand';
    d.style.cssText='padding:6px 0 0;font-size:12.5px;line-height:1.55';
    d.innerHTML=h.join('');
    host.parentNode.insertBefore(d, note||tx.nextSibling);
  }

  patch();
})();
