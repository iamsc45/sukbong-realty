/* 피드백 받기 (2026-08-21 석봉님 지시)
   ────────────────────────────────────────────────────────────────
   무엇을 하나 — 셋
     ① 사이트에 들어오면 인사 팝업을 한 번 띄운다(문구는 석봉님이 주신 그대로).
     ② 상단에 「피드백 주기」 링크를 끼운다(데스크톱 nav + 모바일 메뉴 패널).
     ③ 누르면 간단한 메시지 창이 열리고, 남기면 운영자에게 접수된다.

   왜 자바스크립트 파일 하나로 만들었나
     페이지가 5,000장이 넘는다. 페이지마다 마크업을 넣으면 한 곳이 빠지고,
     문구를 고칠 때 다시 5,000장을 건드려야 한다. 붙이는 자리는 어느 페이지에나 있는
     `#sbAuthBtn`(로그인 자리) 하나뿐이라 이 방식이 안전하다.

   ⚠️ 팝업은 **방문마다 한 번**이다(sessionStorage). 페이지를 옮길 때마다 뜨면
      쓰는 사람이 지친다. 「들어올 때마다」를 그렇게 읽었다.
      정말 페이지마다 띄우려면 아래 `ONCE_PER_VISIT` 를 false 로 두면 된다.

   ⚠️ 첫 방문 안내 팝업(#guidePop, 홈에만 있음)과 겹치지 않게 한다.
      둘이 동시에 뜨면 무엇을 읽어야 할지 모른다. 그날은 건너뛰고 다음 방문에 뜬다.

   접수처는 대출 문의·광고 문의와 같은 `inquiries` 테이블이다(kind 로 구분).
   메일이 편한 분을 위해 mailto 도 함께 둔다. */
(function () {
  'use strict';
  var ONCE_PER_VISIT = true;
  var SKEY = 'sb_fb_intro';
  var URL_ = 'https://bwgoufxonqamglbqsife.supabase.co/rest/v1/inquiries';
  var KEY_ = 'sb_publishable_kYd1gCyqCR2Qy8Ix6KE6og_FfJUImfR';
  var MAIL = 'iamsc45@gmail.com';

  /* 석봉님이 주신 문구 그대로. 고치려면 여기 한 곳만 고친다. */
  var INTRO = '부동산 공공데이터를 다같이 무료로 공유하고 서로 도움이 되고자 만든 사이트 입니다. '
            + '미흡하지만 계속 업데이트 하면서 좋은 정보 공유하기를 바라는 마음입니다. '
            + '사용 피드백 주시면 적극적으로 반영 하겠습니다. 감사합니다.';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ── 스타일 ── */
  var css = document.createElement('style');
  css.textContent = [
    '#sbFbBg,#sbFbIntro{position:fixed;inset:0;z-index:6100;display:none;',
    '  align-items:center;justify-content:center;padding:18px}',
    '#sbFbBg.on,#sbFbIntro.on{display:flex}',
    '#sbFbBg .bg,#sbFbIntro .bg{position:absolute;inset:0;background:rgba(18,18,18,.5)}',
    '.sbfb-box{position:relative;background:#fff;border-radius:18px;max-width:430px;width:100%;',
    '  padding:26px 24px 20px;box-shadow:0 24px 60px rgba(0,0,0,.28);',
    '  max-height:calc(100vh - 40px);overflow:auto;',
    "  font-family:Pretendard,-apple-system,'Malgun Gothic',sans-serif;color:#12264A}",
    '.sbfb-box .x{position:absolute;top:12px;right:14px;border:0;background:transparent;',
    '  font-size:19px;line-height:1;color:#A9B0BC;cursor:pointer;padding:4px}',
    '.sbfb-box h2{font-size:19px;font-weight:800;letter-spacing:-.03em;margin:2px 0 10px;line-height:1.4}',
    '.sbfb-box p{font-size:13.5px;line-height:1.75;color:#5A6478;margin:0 0 18px;word-break:keep-all}',
    '.sbfb-box label{display:block;font-size:12px;font-weight:700;margin:0 0 12px}',
    '.sbfb-box textarea,.sbfb-box input{display:block;width:100%;box-sizing:border-box;margin-top:5px;',
    '  border:1px solid #E3E8F0;background:#F7F9FC;border-radius:9px;padding:10px 11px;',
    '  font-size:13.5px;font-family:inherit;resize:vertical}',
    '.sbfb-box textarea:focus,.sbfb-box input:focus{outline:none;border-color:#12264A;background:#fff}',
    '.sbfb-btn{width:100%;background:#12264A;color:#fff;border:0;border-radius:10px;padding:13px;',
    '  font-size:14.5px;font-weight:800;cursor:pointer;font-family:inherit}',
    '.sbfb-btn:disabled{opacity:.5;cursor:default}',
    '.sbfb-ghost{width:100%;background:#fff;color:#5A6478;border:1px solid #E3E8F0;border-radius:10px;',
    '  padding:12px;font-size:13.5px;font-weight:700;cursor:pointer;margin-top:8px;font-family:inherit}',
    '.sbfb-alt{font-size:11.5px;color:#7A8698;text-align:center;margin:12px 0 0}',
    '.sbfb-alt a{color:#1B3F7A}',
    '.sbfb-err{color:#B23A48;font-size:12px;margin-top:9px;display:none}',
    '.sbfb-ok{text-align:center;padding:14px 0 6px}',
    '.sbfb-ok .ic{width:44px;height:44px;border-radius:50%;background:#1E7A5A;color:#fff;',
    '  font-size:22px;line-height:44px;margin:0 auto 12px}',
    /* 상단 링크 — 광고 문의 옆에 나란히. 눈에 띄되 경쟁하지 않게 테두리만 준다 */
    '.sb-fb-lnk{flex:0 0 auto;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;',
    '  border:1px solid #C6D3E6;border-radius:100px;color:#1B3F7A;text-decoration:none;',
    '  font-weight:700;font-size:13px;padding:0 13px;height:38px;line-height:1;background:#fff}',
    '.sb-fb-lnk:hover{background:#12264A;border-color:#12264A;color:#fff}',
    '@media(max-width:1100px){.sb-fb-lnk{height:36px;font-size:12px;padding:0 11px}}',
    /* 🔴 모바일에서 링크를 통째로 숨기면 안 된다 — 방문자의 70.9%가 모바일이다(2026-08 실측).
       홈만 예외다. 홈은 좁은 화면에서 nav 링크를 전부 감추고 햄버거 패널로 보내므로,
       그 패널에 한 줄을 넣고 상단 링크는 숨긴다(그 경우에만 body 에 표시가 붙는다). */
    '@media(max-width:720px){.sb-fb-lnk{height:30px;font-size:11.5px;padding:0 10px;gap:4px}',
    '  body.sb-fb-panel .sb-fb-lnk{display:none}}'
  ].join('');
  document.head.appendChild(css);

  /* ── 상단 링크 끼우기 ──
     ⚠️ 어느 페이지에나 있는 것은 로그인 자리(#sbAuthBtn) 하나다. 그 앞에 넣는다.
        홈은 nav 가 드롭다운 구조라 마크업이 다르지만 이 자리는 똑같이 있다. */
  function mountLink() {
    if (document.getElementById('sbFbLnk')) return;
    var slot = document.getElementById('sbAuthBtn');
    var a = document.createElement('a');
    a.id = 'sbFbLnk'; a.className = 'sb-fb-lnk'; a.href = '#';
    a.innerHTML = '<span aria-hidden="true">✉</span>피드백 주기';
    a.addEventListener('click', function (e) { e.preventDefault(); openForm(); });
    if (slot && slot.parentNode) slot.parentNode.insertBefore(a, slot);
    else { var nv = document.querySelector('nav'); if (nv) nv.appendChild(a); }

    /* 모바일 햄버거 패널(홈)에도 한 줄 */
    var panel = document.getElementById('mNavPanel');
    if (panel && !document.getElementById('sbFbLnkM')) {
      var ml = panel.querySelector('.ml');
      if (ml) {
        document.body.classList.add('sb-fb-panel');   /* 이 페이지는 좁은 화면에서 패널을 쓴다 */
        var m = document.createElement('a');
        m.id = 'sbFbLnkM'; m.href = '#'; m.textContent = '✉ 피드백 주기';
        m.addEventListener('click', function (e) {
          e.preventDefault();
          var nav = document.querySelector('.nav'); if (nav) nav.classList.remove('m-open');
          openForm();
        });
        ml.appendChild(m);
      }
    }
  }

  /* ── 모바일: 하단 탭바의 「전체」 시트에 한 줄 넣는다 ──
     🔴 좁은 화면에서는 `sb_tabbar.js` 가 상단 nav 링크를 **전부 감춘다**
        (`.site-header nav a{display:none}`). 모바일 길잡이가 하단 탭바이기 때문이다.
        그래서 상단에만 링크를 두면 방문자의 70.9%(모바일)는 볼 수가 없다.
     ⚠️ `sb_tabbar.js` 자체는 고치지 않는다 — 그 파일을 건드리면 HTML 5,000여 장의
        `?v=` 를 함께 올려야 한다. 시트가 생긴 뒤에 한 줄을 얹는 편이 가볍다. */
  function mountSheet(n) {
    var sh = document.getElementById('sbsheet');
    if (!sh) { if (n < 40) setTimeout(function () { mountSheet(n + 1); }, 150); return; }
    if (document.getElementById('sbFbSheet')) return;
    var box = sh.querySelector('.in'); if (!box) return;
    var gp = document.createElement('div'); gp.className = 'gp'; gp.textContent = '의견';
    var gd = document.createElement('div'); gd.className = 'gd';
    gd.innerHTML = '<a href="#" id="sbFbSheet"><i class="ti ti-message-2" aria-hidden="true"></i>피드백 주기</a>';
    /* ⚠️ 맨 뒤에 붙였더니 시트 아래쪽(844px 화면에서 top 980)이라 **스크롤해야 보였다**.
       「당분간 피드백을 받는다」는 뜻에 맞게 맨 앞에 둔다(2026-08-21 실측 후 수정). */
    var hd = box.querySelector('.hd');
    if (hd && hd.nextSibling) { box.insertBefore(gd, hd.nextSibling); box.insertBefore(gp, gd); }
    else { box.appendChild(gp); box.appendChild(gd); }
    gd.querySelector('a').addEventListener('click', function (e) {
      e.preventDefault();
      sh.classList.remove('open');
      openForm();
    });
  }

  /* ── 인사 팝업 ── */
  function shell(id) {
    var d = document.createElement('div');
    d.id = id;
    d.innerHTML = '<div class="bg"></div><div class="sbfb-box"></div>';
    document.body.appendChild(d);
    d.querySelector('.bg').addEventListener('click', function () { d.classList.remove('on'); });
    return d;
  }

  function openIntro() {
    var d = document.getElementById('sbFbIntro') || shell('sbFbIntro');
    d.querySelector('.sbfb-box').innerHTML =
      '<button class="x" type="button" aria-label="닫기">✕</button>'
      + '<h2>찾아와 주셔서 고맙습니다</h2>'
      + '<p>' + esc(INTRO) + '</p>'
      + '<button class="sbfb-btn" type="button" data-go="1">피드백 남기기</button>'
      + '<button class="sbfb-ghost" type="button" data-close="1">둘러볼게요</button>';
    d.classList.add('on');
    d.querySelector('.x').onclick = function () { d.classList.remove('on'); };
    d.querySelector('[data-close]').onclick = function () { d.classList.remove('on'); };
    d.querySelector('[data-go]').onclick = function () { d.classList.remove('on'); openForm(); };
    try { if (window.gtag) gtag('event', 'feedback_intro_show'); } catch (e) {}
  }

  /* ── 메시지 창 ── */
  function openForm() {
    var d = document.getElementById('sbFbBg') || shell('sbFbBg');
    var subj = '[석봉 부동산 정보방] 사용 피드백';
    var mailHref = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subj)
      + '&body=' + encodeURIComponent('피드백 내용:\n\n회신받을 연락처(선택):\n');
    d.querySelector('.sbfb-box').innerHTML =
      '<button class="x" type="button" aria-label="닫기">✕</button>'
      + '<h2>어떤 점이 아쉬우셨나요</h2>'
      + '<p style="margin-bottom:14px">불편했던 점, 있었으면 하는 기능, 잘못된 숫자 무엇이든 좋습니다. '
      + '읽고 반영하겠습니다.</p>'
      + '<label>내용<textarea id="sbFbMsg" rows="5" maxlength="1000" '
      + 'placeholder="예: 지도에서 우리 동네 빌라가 안 보여요"></textarea></label>'
      + '<label>회신받을 연락처 <span style="color:#7A8698;font-weight:600">(선택)</span>'
      + '<input id="sbFbCt" maxlength="100" placeholder="이메일 또는 휴대폰"></label>'
      + '<button class="sbfb-btn" id="sbFbSend" type="button">보내기</button>'
      + '<div class="sbfb-err" id="sbFbErr"></div>'
      + '<p class="sbfb-alt">메일이 편하시면 <a href="' + mailHref + '">' + MAIL + '</a>로 보내주세요</p>';
    d.classList.add('on');
    d.querySelector('.x').onclick = function () { d.classList.remove('on'); };
    try { if (window.gtag) gtag('event', 'feedback_open'); } catch (e) {}

    var msg = d.querySelector('#sbFbMsg');
    if (msg) setTimeout(function () { try { msg.focus(); } catch (e) {} }, 120);

    d.querySelector('#sbFbSend').onclick = function () {
      var btn = this, err = d.querySelector('#sbFbErr');
      var t = (msg.value || '').trim();
      if (t.length < 5) { err.textContent = '내용을 조금만 더 적어 주세요.'; err.style.display = 'block'; return; }
      err.style.display = 'none';
      btn.disabled = true; btn.textContent = '보내는 중…';
      var row = {
        kind: '사용 피드백',
        name: '',
        contact: (d.querySelector('#sbFbCt').value || '').trim().slice(0, 100),
        msg: (t + '\n\n[보낸 화면] ' + location.pathname + (document.title ? ' · ' + document.title : '')).slice(0, 2000)
      };
      try { var uid = window.SBAuth && SBAuth.uid && SBAuth.uid(); if (uid) row.user_id = uid; } catch (e) {}
      function post(body) {
        return fetch(URL_, {
          method: 'POST',
          headers: { apikey: KEY_, Authorization: 'Bearer ' + KEY_,
                     'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(body)
        });
      }
      post(row)
        .then(function (r) {
          /* 비회원 컬럼 제약에 걸리면 user_id 를 빼고 한 번 더 (대출 문의와 같은 방어) */
          if (!r.ok && row.user_id) {
            var p = {}; for (var k in row) if (k !== 'user_id') p[k] = row[k];
            return post(p);
          }
          return r;
        })
        .then(function (r) {
          if (!r.ok) throw 0;
          try { if (window.gtag) gtag('event', 'feedback_sent'); } catch (e) {}
          d.querySelector('.sbfb-box').innerHTML =
            '<button class="x" type="button" aria-label="닫기">✕</button>'
            + '<div class="sbfb-ok"><div class="ic">✓</div>'
            + '<h2 style="margin-bottom:6px">잘 받았습니다</h2>'
            + '<p style="margin:0">보내주신 내용은 그대로 읽습니다. 고맙습니다.</p></div>'
            + '<button class="sbfb-btn" type="button" data-close="1" style="margin-top:16px">닫기</button>';
          d.querySelector('.x').onclick = function () { d.classList.remove('on'); };
          d.querySelector('[data-close]').onclick = function () { d.classList.remove('on'); };
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = '보내기';
          err.innerHTML = '접수가 안 됐습니다. 잠시 뒤 다시 시도하시거나 '
            + '<a href="' + mailHref + '">' + MAIL + '</a>로 보내주세요.';
          err.style.display = 'block';
        });
    };
  }

  window.SBFeedback = { open: openForm, intro: openIntro };

  function boot() {
    mountLink();
    mountSheet(0);
    var seen = false;
    try { seen = ONCE_PER_VISIT && !!sessionStorage.getItem(SKEY); } catch (e) { seen = false; }
    if (seen) return;
    setTimeout(function () {
      /* 첫 방문 안내 팝업이 떠 있으면 오늘은 건너뛴다 */
      var g = document.getElementById('guidePop');
      if (g && getComputedStyle(g).display !== 'none') return;
      try { sessionStorage.setItem(SKEY, '1'); } catch (e) {}
      openIntro();
    }, 1700);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
