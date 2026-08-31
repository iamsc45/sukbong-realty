/* 카카오톡 공유 공용 모듈 — 2026-08-31 신설 (석봉님 지시: "결과 공유하기 누르면 바로 카카오톡으로")
 * ---------------------------------------------------------------------------
 * 왜 별도 파일인가
 *   놀이터 말고도 청약·리포트 등에서 같은 공유가 필요해질 것이라 한 곳에 둔다.
 *   화면마다 SDK 로드 코드를 복사하면 키를 고칠 때 빠뜨리는 곳이 반드시 생긴다.
 *
 * 🔑 KAKAO_JS_KEY 는 카카오가 **클라이언트에 노출되도록 설계한 공개 키**다(REST 키와 다르다).
 *    보호는 카카오 개발자 콘솔의 「플랫폼 > Web > 사이트 도메인」 등록으로 한다.
 *    🔴 REST API 키·Client Secret·Refresh Token 은 절대 여기 넣지 말 것.
 *
 * 준비 (석봉님, 한 번만)
 *   ① developers.kakao.com → 내 애플리케이션 → 쓰던 앱 → 앱 키 → **JavaScript 키** 복사
 *   ② 플랫폼 > Web > 사이트 도메인에 https://xn--2q1br1nnrasc92a76myvau64b.com 등록
 *      (카카오 로그인용으로 이미 등록돼 있으면 그대로 두면 된다)
 *   ③ 제품 설정 > 카카오톡 공유 활성화
 *   ④ 아래 KEY 값에 붙여넣기
 *
 * 키가 비어 있어도 화면은 정상 동작한다 — share() 가 false 를 돌려주면
 * 호출한 쪽이 시스템 공유·클립보드 복사로 물러선다(아래 SBShare.any 참고).
 */
window.SBShare = (function(){
  "use strict";

  var KEY = "";                                   // ← 카카오 JavaScript 키
  /* SDK 2.8.2 (2026-08-06 배포, 2026-08-31 기준 최신).
     integrity 는 카카오 다운로드 문서에서 옮긴 값이고, **실제 파일을 받아 SHA-384 를
     계산해 일치를 확인했다**(2026-08-31). 값이 틀리면 브라우저가 로드를 통째로 막으므로
     버전을 올릴 때는 반드시 문서의 짝을 다시 확인할 것. 지어내면 조용히 죽는다. */
  var SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.2/kakao.min.js";
  var SDK_HASH = "sha384-zt/G7/KfaRQ9dT/QIkS0ujMtzouJqzuSJcXVQu50x0rl/+mD1dc70AeOejVbMD9E";
  var loading = null;

  function ready(){
    if(!KEY) return Promise.resolve(false);
    if(window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()){
      return Promise.resolve(true);
    }
    if(loading) return loading;
    loading = new Promise(function(res){
      var s = document.createElement("script");
      s.src = SDK;
      s.integrity = SDK_HASH;
      s.crossOrigin = "anonymous";
      s.onload = function(){
        try{ window.Kakao.init(KEY); res(!!window.Kakao.isInitialized()); }
        catch(e){ res(false); }
      };
      s.onerror = function(){ res(false); };
      document.head.appendChild(s);
    });
    return loading;
  }

  /* 카카오톡 공유창을 띄운다. 성공하면 true.
     o = {title, desc, url, image, btn} — image·url 은 https 절대경로여야 한다. */
  function kakao(o){
    return ready().then(function(ok){
      if(!ok) return false;
      try{
        window.Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: o.title,
            description: o.desc || "",
            imageUrl: o.image,
            link: { mobileWebUrl: o.url, webUrl: o.url }
          },
          buttons: [{
            title: o.btn || "나도 해보기",
            link: { mobileWebUrl: o.url, webUrl: o.url }
          }]
        });
        return true;
      }catch(e){ return false; }
    }).catch(function(){ return false; });
  }

  /* 카카오톡 → 시스템 공유 → 클립보드 순서로 물러선다.
     어느 것도 안 되면 false 를 돌려주니 호출한 쪽이 안내를 띄우면 된다. */
  function any(o){
    return kakao(o).then(function(done){
      if(done) return "kakao";
      var text = o.text || ((o.title || "") + "\n" + o.url);
      if(navigator.share){
        return navigator.share({ title: o.title, text: text, url: o.url })
          .then(function(){ return "system"; })
          .catch(function(){ return false; });
      }
      if(navigator.clipboard){
        return navigator.clipboard.writeText(text)
          .then(function(){ return "clipboard"; })
          .catch(function(){ return false; });
      }
      return false;
    });
  }

  return { ready: ready, kakao: kakao, any: any, hasKey: function(){ return !!KEY; } };
})();
