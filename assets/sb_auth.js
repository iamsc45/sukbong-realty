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
  async function init(){
    if(!ensure()){ready=true;return;}
    try{
      var s=await client.auth.getSession();
      user=(s.data&&s.data.session)?s.data.session.user:null;
      if(user){await loadFavs();await mergeLocal();await runPending();}
    }catch(e){}
    ready=true;waiters.forEach(function(f){f();});waiters=[];notify();
    client.auth.onAuthStateChange(function(ev,session){
      var u=session?session.user:null;
      if((u&&!user)||(!u&&user)||(u&&user&&u.id!==user.id)){
        user=u;
        (async function(){if(user){await loadFavs();await mergeLocal();await runPending();}else{favs={};}notify();})();
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
  function authEmail(){return (user&&user.email)||'';}
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
      +'<span>'+A+' <a href="privacy.html" target="_blank" style="color:#2554E0">자세히</a></span></label>'
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
  init();
  return {whenReady:whenReady,onChange:onChange,isIn:isIn,nickname:nickname,
    favHas:favHas,favAll:favAll,addFav:addFav,delFav:delFav,setLastN:setLastN,
    authEmail:authEmail,getNotifyEmail:getNotifyEmail,setNotifyEmail:setNotifyEmail,
    login:login,logout:logout,gate:gate};
})();
