/* 석봉 부동산 정보방 · 회원(카카오)/관심단지 공용 모듈 (2026-07-27)
   - Supabase 카카오 로그인 + 관심단지 서버 저장(RLS로 본인 데이터만)
   - 비로그인 상태에서 관심단지 클릭 → 원클릭 가입 모달(동의 체크 1개 + 카카오 버튼)
   - 기존 브라우저 찜(localStorage sb_fav)은 첫 로그인 때 서버로 병합 */
window.SBAuth=(function(){
  var URL='https://bwgoufxonqamglbqsife.supabase.co';
  var KEY='sb_publishable_kYd1gCyqCR2Qy8Ix6KE6og_FfJUImfR';
  var client=null,user=null,favs={},ready=false,waiters=[],listeners=[];
  function ensure(){if(!client&&window.supabase)client=window.supabase.createClient(URL,KEY);return client;}
  function notify(){listeners.forEach(function(f){try{f(user);}catch(e){}});}
  async function loadFavs(){
    favs={};
    var r=await client.from('favorites').select('id,code,nm,dong,last_n');
    if(!r.error)(r.data||[]).forEach(function(f){favs[f.code+'|'+f.nm]=f;});
  }
  async function mergeLocal(){
    try{
      var l=JSON.parse(localStorage.getItem('sb_fav')||'[]');
      if(!l.length)return;
      for(var i=0;i<l.length;i++){
        var f=l[i],k=(f.code||'')+'|'+f.nm;
        if(favs[k])continue;
        var ins=await client.from('favorites').insert({user_id:user.id,code:f.code||'',nm:f.nm,dong:f.dong||'',last_n:f.lastN||0}).select().single();
        if(!ins.error)favs[k]=ins.data;
      }
      localStorage.removeItem('sb_fav');
    }catch(e){}
  }
  async function runPending(){
    try{
      var p=sessionStorage.getItem('sb_pending');
      if(!p)return;sessionStorage.removeItem('sb_pending');
      var it=JSON.parse(p);
      if(it&&it.nm)await addFav(it);
    }catch(e){}
  }
  /* 로그인하려고 자리를 뜨기 전에 '하려던 일'을 적어 둔다 (2026-08-05).
     돌아와서 이걸 안 이어주면, 가입까지 해 놓고 저장은 안 된 채 화면만 떠 있다.
     관심단지는 sb_pending으로 이미 이어주고 있었는데 LH 저장에는 안 붙어 있었다.
     화면마다 처리 방식이 달라 여기서는 보관만 하고, 실행은 각 화면이 가져가 한다. */
  function setAct(name,data){
    try{localStorage.setItem('sb_act',JSON.stringify({n:name,d:data,t:Date.now()}));}catch(e){}
  }
  function takeAct(name){
    try{
      var v=localStorage.getItem('sb_act');
      if(!v)return null;
      var o=JSON.parse(v);
      if(!o||o.n!==name)return null;
      localStorage.removeItem('sb_act');
      return (Date.now()-(o.t||0)>600000)?null:(o.d||{});   /* 10분 지나면 무시 */
    }catch(e){return null;}
  }
  /* 로그인 후 원래 보던 화면으로 되돌린다 (2026-08-05)
     ─────────────────────────────────────────────────────────
     카카오 로그인은 Supabase가 redirectTo로 돌려보내는데, 그 주소가 대시보드의
     Redirect URL 허용목록에 없으면 조용히 Site URL(홈)로 떨어진다. 실제로 LH 진단에서
     '사업지 저장'을 누르면 가입 후 홈이 떠서 하려던 일이 증발했다(석봉님 제보).
     허용목록 등록이 근본 해결이지만, 대시보드 설정에 기대지 않고도 돌아오게 한다.
     로그인 직전에 돌아올 주소를 localStorage에 적어 두고(세션 저장소는 리다이렉트를
     건너뛰며 날아갈 수 있다), 로그인된 채로 아무 페이지나 열리면 그 주소로 되돌린다. */
  var RET='sb_return';
  function markReturn(){
    try{localStorage.setItem(RET,JSON.stringify({u:location.href,t:Date.now()}));}catch(e){}
  }
  function takeReturn(){
    try{
      var v=localStorage.getItem(RET);
      if(!v)return null;
      localStorage.removeItem(RET);
      var o=JSON.parse(v);
      /* 10분이 지났으면 그 로그인과 무관한 흔적이다. 엉뚱한 이동을 막는다 */
      if(!o||!o.u||Date.now()-(o.t||0)>600000)return null;
      var here=location.href.split('#')[0], there=o.u.split('#')[0];
      return here===there?null:o.u;      /* 이미 그 자리면 굳이 옮기지 않는다 */
    }catch(e){return null;}
  }
  function backIfNeeded(){
    var u=takeReturn();
    if(u)location.replace(u);
  }
  async function init(){
    if(!ensure()){ready=true;return;}
    try{
      var s=await client.auth.getSession();
      user=(s.data&&s.data.session)?s.data.session.user:null;
      if(user){backIfNeeded();await loadFavs();await mergeLocal();await lhMergeLocal();await runPending();}
      else{try{localStorage.removeItem(RET);}catch(e){}}   /* 로그인 안 됐으면 흔적 정리 */
    }catch(e){}
    ready=true;waiters.forEach(function(f){f();});waiters=[];notify();
    client.auth.onAuthStateChange(function(ev,session){
      var u=session?session.user:null;
      if((u&&!user)||(!u&&user)||(u&&user&&u.id!==user.id)){
        user=u;
        (async function(){if(user){await loadFavs();await mergeLocal();await lhMergeLocal();await runPending();}else{favs={};}notify();})();
      }
    });
  }
  function whenReady(f){if(ready)f();else waiters.push(f);}
  function onChange(f){listeners.push(f);}
  function isIn(){return !!user;}
  function nickname(){if(!user)return '';var m=user.user_metadata||{};return m.name||m.full_name||m.preferred_username||'회원';}
  function favHas(id){return !!favs[id];}
  function favAll(){return Object.keys(favs).map(function(k){return favs[k];});}
  async function addFav(it){
    var k=(it.code||'')+'|'+it.nm;
    if(favs[k])return true;
    var r=await client.from('favorites').insert({user_id:user.id,code:it.code||'',nm:it.nm,dong:it.dong||'',last_n:it.lastN||0}).select().single();
    if(!r.error){favs[k]=r.data;return true;}
    return false;
  }
  async function delFav(id){
    var f=favs[id];if(!f)return false;
    var r=await client.from('favorites').delete().eq('id',f.id);
    if(!r.error){delete favs[id];return true;}
    return false;
  }
  async function setLastN(id,n){
    var f=favs[id];if(!f||f.last_n===n)return;
    f.last_n=n;
    await client.from('favorites').update({last_n:n}).eq('id',f.id);
  }
  /* 알림 받을 이메일 — 카카오가 넘겨주는 계정 이메일(@kakao.com)은 카카오메일을 개설하지
     않은 사람에게는 반송되므로(2026-07-28 실측), 회원이 직접 받을 주소를 지정할 수 있게 한다. */
  /* ── LH 사업지 (2026-08-05) ──────────────────────────────────
     셀프진단에서 저장한 사업지. 원래 브라우저(localStorage)에만 담아서 PC에서 저장한 것이
     휴대폰에서 안 보였다(석봉님 지시로 서버 저장 전환). 표는 public.lh_sites, RLS로 본인 것만.
     비로그인은 여전히 브라우저에 담고, 로그인하면 그 분량을 서버로 한 번 옮긴다.
     관심단지(mergeLocal)와 같은 방식이라 사용자는 옮겨진 걸 눈치채지 못한다. */
  var LHKEY='sb_lh_sites';
  function lhLocal(){try{return JSON.parse(localStorage.getItem(LHKEY)||'[]');}catch(e){return [];}}
  function lhLocalSet(a){try{localStorage.setItem(LHKEY,JSON.stringify(a));}catch(e){}}
  function lhNum(v){var n=parseFloat(v);return isFinite(n)?n:null;}
  function lhRow(s){                       /* 화면이 쓰는 모양 → 표 컬럼 */
    return {user_id:user.id, addr:String(s.addr||''), hq:s.hq||null,
            units:lhNum(s.units), area:lhNum(s.area), kind:s.kind||null,
            stype:s.stype||null, score:s.score||null};
  }
  function lhView(r){                      /* 표 → 화면이 쓰는 모양 */
    return {id:r.id, addr:r.addr, hq:r.hq||'', units:r.units, area:r.area,
            kind:r.kind||'', stype:r.stype||'', score:r.score||'',
            at:(r.created_at||'').slice(0,10)};
  }
  async function lhList(){
    if(!user)return lhLocal();
    var r=await client.from('lh_sites').select('*').order('created_at',{ascending:false});
    if(r.error)return lhLocal();           /* 서버가 흔들려도 화면은 뜨게 */
    return (r.data||[]).map(lhView);
  }
  async function lhAdd(s){
    if(!user){
      var l=lhLocal();
      if(l.some(function(x){return x.addr===s.addr&&x.units===s.units&&x.area===s.area;}))return true;
      l.unshift(s);lhLocalSet(l);return true;
    }
    /* 같은 사업지를 두 번 눌러도 유니크 인덱스가 막는다. 그건 실패가 아니다 */
    var r=await client.from('lh_sites').insert(lhRow(s));
    return !r.error || (r.error.code==='23505');
  }
  async function lhDel(it){
    if(!user||!it.id){
      var l=lhLocal().filter(function(x){
        return !(x.addr===it.addr&&x.units===it.units&&x.area===it.area);});
      lhLocalSet(l);return true;
    }
    var r=await client.from('lh_sites').delete().eq('id',it.id);
    return !r.error;
  }
  async function lhMergeLocal(){           /* 첫 로그인 때 브라우저 분량을 서버로 */
    try{
      var l=lhLocal();
      if(!l.length)return;
      for(var i=l.length-1;i>=0;i--)await lhAdd(l[i]);   /* 오래된 것부터 넣어 순서 유지 */
      localStorage.removeItem(LHKEY);
    }catch(e){}
  }

  function authEmail(){return (user&&user.email)||'';}
  function uid(){return (user&&user.id)||'';}
  /* 지역 시장조사 보고서 — 가입 시 2회 무료(기간 제한 없음, 2026-08-05 석봉님 확정).
     쓴 횟수는 inquiries의 본인 '보고서 신청' 건수로 센다(RLS로 본인 것만 보인다).
     '보고서 신청(면제)'로 바꿔 둔 건은 카운트에서 빠진다(석봉님이 추가 제공할 때 쓰는 장치). */
  var REPORT_FREE=2;
  async function reportUsed(){
    if(!user)return null;
    var r=await client.from('inquiries').select('id',{count:'exact',head:true})
      .eq('user_id',user.id).eq('kind','보고서 신청');
    return r.error?null:(r.count||0);
  }
  async function reportLeft(){
    var n=await reportUsed();
    return n===null?null:Math.max(0,REPORT_FREE-n);
  }
  async function reportSubmit(prod,region,email){
    if(!user)return {ok:false,reason:'login'};
    var left=await reportLeft();
    if(left===0)return {ok:false,reason:'used'};
    var row={kind:'보고서 신청',
      name:(nickname()||'회원').slice(0,100), contact:String(email||'').slice(0,100),
      msg:('상품: '+prod+'\n희망 지역: '+region).slice(0,2000)};
    var r=await client.from('inquiries').insert(Object.assign({user_id:user.id},row));
    /* user_id 칸을 아직 만들기 전이면(42703) 그것 없이 한 번 더 넣는다.
       DB 작업 전에 들어온 신청이 통째로 실패하면 안 된다(2026-08-05). */
    if(r.error&&(r.error.code==='42703'||/user_id/.test(r.error.message||'')))
      r=await client.from('inquiries').insert(row);
    if(r.error)return {ok:false,reason:'error'};
    return {ok:true,left:(left===null?null:left-1)};
  }
  async function getNotifyEmail(){
    if(!user)return '';
    var r=await client.from('prefs').select('notify_email').eq('user_id',user.id).maybeSingle();
    return (!r.error&&r.data&&r.data.notify_email)||'';
  }
  async function setNotifyEmail(v){
    if(!user)return false;
    var r=await client.from('prefs').upsert({user_id:user.id,notify_email:v||null,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    return !r.error;
  }
  function login(){
    ensure();
    markReturn();      /* 홈으로 떨어져도 원래 자리로 되돌아오게 (2026-08-05) */
    client.auth.signInWithOAuth({provider:'kakao',options:{redirectTo:location.href.split('#')[0],scopes:'profile_nickname'}});
  }
  async function logout(){try{await client.auth.signOut();}catch(e){}location.reload();}
  /* 가입 유도 모달
     opt로 문구를 갈아끼울 수 있다(2026-08-04). 관심단지 말고 다른 기능에서도 쓰는데
     "관심단지는 회원 기능입니다"가 그대로 뜨면 무슨 말인지 모른다.
     opt를 안 주면 기존 문구 그대로라 다른 화면은 영향이 없다. */
  function gate(pendingItem,onOk,opt){
    if(user){onOk&&onOk();return;}
    opt=opt||{};
    var T=opt.title||'관심단지는 회원 기능입니다';
    var D=opt.desc||'카카오로 3초 만에 시작하세요.<br>관심단지를 어느 기기에서나 보고, 새 실거래 소식을 받아볼 수 있습니다.';
    var A=opt.agree||'(필수) 개인정보 수집·이용 동의 · 카카오 계정 식별자·닉네임을 회원 식별과 관심단지 서비스 제공 목적으로 수집·이용합니다.';
    var old=document.getElementById('sbGate');if(old)old.remove();
    var w=document.createElement('div');w.id='sbGate';
    w.style.cssText='position:fixed;inset:0;z-index:5000;background:rgba(20,20,20,.55);display:flex;align-items:center;justify-content:center;padding:18px';
    w.innerHTML='<div style="background:#fff;border-radius:18px;max-width:360px;width:100%;padding:26px 24px 22px;font-family:inherit;position:relative">'
      +'<button id="sbGateX" style="position:absolute;top:12px;right:14px;border:0;background:transparent;font-size:19px;color:#999;cursor:pointer">✕</button>'
      +'<div style="font-size:19px;font-weight:800;letter-spacing:-0.02em">'+T+'</div>'
      +'<div style="font-size:13px;color:#6b6355;margin-top:6px;line-height:1.6">'+D+'</div>'
      +'<label style="display:flex;gap:8px;align-items:flex-start;margin:16px 0 0;font-size:11.5px;color:#555;line-height:1.55;cursor:pointer">'
      +'<input id="sbGateAgree" type="checkbox" style="margin-top:2px">'
      +'<span>'+A+' <a href="/privacy.html" target="_blank" style="color:#2554E0">자세히</a></span></label>'  /* 글/ 하위 페이지에서도 열리게 절대경로(2026-08-05) */
      +'<button id="sbGateGo" style="display:block;width:100%;margin-top:14px;border:0;border-radius:12px;background:#FEE500;color:#191919;font:inherit;font-size:15px;font-weight:800;padding:14px 0;cursor:pointer">카카오로 시작하기</button>'
      +'<div style="font-size:10.5px;color:#9a938a;margin-top:10px;text-align:center">가입 즉시 이용할 수 있습니다 · 언제든 탈퇴 가능</div></div>';
    document.body.appendChild(w);
    document.getElementById('sbGateX').onclick=function(){w.remove();};
    w.addEventListener('click',function(e){if(e.target===w)w.remove();});
    document.getElementById('sbGateGo').onclick=function(){
      if(!document.getElementById('sbGateAgree').checked){alert('개인정보 수집·이용에 동의해 주세요.');return;}
      try{if(pendingItem)sessionStorage.setItem('sb_pending',JSON.stringify(pendingItem));}catch(e){}
      try{if(typeof gtag==='function')gtag('event','signup_start',{method:'kakao'});}catch(e){}
      login();
    };
  }
  /* ── 헤더 로그인/내정보 버튼 (2026-08-09 석봉님 지시: 모든 페이지에 상시 노출) ──
     지금까지는 관심단지 탭에 들어가야만 로그인 버튼을 만날 수 있었다. 페이지마다 다르게
     붙이면 또 어긋나므로 여기서 한 번에 그린다. 각 페이지는 nav 안에 아래 한 줄만 두면 된다:
       <span id="sbAuthBtn"></span>
     비로그인=카카오 로그인 열기, 로그인=내정보 페이지로. 위치는 페이지 nav 스타일을 따른다. */
  function mountHeader(){
    /* sbAuthBtn=헤더(데스크톱), sbAuthBtnM=모바일 메뉴 패널 등 보조 자리. 있는 것만 그린다. */
    var hosts=[document.getElementById('sbAuthBtn'),document.getElementById('sbAuthBtnM')].filter(Boolean);
    if(!hosts.length)return;
    /* 하위 폴더(글/…)에서도 열리도록 절대경로 */
    var MY='/'+encodeURIComponent('내정보')+'.html';
    function open(e){
      e.preventDefault();
      if(isIn()){location.href=MY;return;}
      gate(null,null,{title:'로그인하고 내 정보를 모아보세요',
        desc:'카카오로 3초 만에 시작합니다.<br>관심단지·저장한 LH 사업지·보고서 신청 이력을 한 화면에서 봅니다.'});
    }
    function draw(){
      var on=isIn(), label=on?'내정보':'로그인';
      hosts.forEach(function(h,i){
        var wide=(h.id==='sbAuthBtnM');   /* 패널 안에서는 한 줄 버튼 */
        /* 색(2026-08-10 석봉님 최종 지시): 비로그인 '로그인'은 카카오 노랑(#FEE500)으로 통일한다.
           우리 로그인 수단이 카카오뿐이라 노란색 자체가 "카카오로 들어간다"는 안내가 된다.
           같은 날 오전에는 톤이 튄다고 잉크색으로 뺐었는데, 크기를 메뉴에 맞추고 나니
           튀는 원인이 색이 아니라 크기였다(그 판단은 취소).
           로그인 후 '내정보'는 카카오와 무관하므로 잉크색 그대로 둔다. */
        /* 크기는 옆 메뉴에 맞춘다(2026-08-10 석봉님 지적: 모바일에서 로그인만 크다).
           ⚠️ font-size:inherit는 부모가 nav가 아니라 span이라 body 크기(14px)를 물려받아
           오히려 더 커졌다(실측). 그래서 같은 nav 안의 실제 링크 크기를 읽어 그대로 쓴다.
           페이지마다 nav 글자 크기가 달라도(단지상세 12px·일반 13.5px) 자동으로 맞는다. */
        var _fs='13px';
        try{
          /* nav 첫 링크를 그냥 집으면 홈처럼 로고가 먼저 오는 구조에서 19px를 물려받는다(실측).
             메뉴는 여럿이고 로고는 하나이므로 '가장 많이 쓰인 크기'를 고른다. */
          var _nav=h.closest?h.closest('nav'):null;
          if(_nav){
            var _c={},_best=0,_as=_nav.querySelectorAll('a');
            for(var _i=0;_i<_as.length;_i++){
              var _a=_as[_i]; if(_a===h||h.contains(_a)||!_a.offsetParent)continue;
              var _k=getComputedStyle(_a).fontSize; if(!_k)continue;
              _c[_k]=(_c[_k]||0)+1;
              if(_c[_k]>_best||(_c[_k]===_best&&parseFloat(_k)<parseFloat(_fs))){_best=_c[_k];_fs=_k;}
            }
          }
        }catch(e){}
        h.innerHTML='<a href="#" class="sbAuthA" '
          +'style="display:'+(wide?'block':'inline-flex')+';align-items:center;gap:5px;white-space:nowrap;'
          +'text-align:'+(wide?'center':'left')+';text-decoration:none;font-weight:700;'
          +'font-size:'+(wide?'14.5px':_fs)+';line-height:1.25;'
          +'border:1px solid '+(on?'#141414':'#FEE500')+';background:'+(on?'#141414':'#FEE500')+';'
          +'color:'+(on?'#fff':'#191600')+';border-radius:'+(wide?'12px':'100px')+';padding:'+(wide?'11px 14px':'3px 10px')+';'
          +'transition:filter 150ms ease,border-color 150ms ease">'
          +(on?(nickname()+'님 · 내정보')
              :('<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" style="flex:0 0 auto;vertical-align:-.12em">'
                +'<path fill="#191600" d="M12 3C6.9 3 2.8 6.2 2.8 10.2c0 2.5 1.7 4.7 4.2 6l-1 3.6c-.1.3.2.6.5.4l4.3-2.8c.4 0 .8.1 1.2.1 5.1 0 9.2-3.2 9.2-7.3S17.1 3 12 3z"/></svg> '+label))+'</a>';
        h.querySelector('.sbAuthA').onclick=open;
      });
    }
    draw(); onChange(draw); whenReady(draw);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountHeader);
  else mountHeader();
  init();
  return {mountHeader:mountHeader,
    whenReady:whenReady,onChange:onChange,isIn:isIn,nickname:nickname,
    favHas:favHas,favAll:favAll,addFav:addFav,delFav:delFav,setLastN:setLastN,
    authEmail:authEmail,uid:uid,getNotifyEmail:getNotifyEmail,setNotifyEmail:setNotifyEmail,
    REPORT_FREE:REPORT_FREE,reportUsed:reportUsed,reportLeft:reportLeft,reportSubmit:reportSubmit,
    setAct:setAct,takeAct:takeAct,
    lhList:lhList,lhAdd:lhAdd,lhDel:lhDel,
    login:login,logout:logout,gate:gate};
})();
