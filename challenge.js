/* 게임 허브 도전장: 친구 기록 링크(?vs=기록&m=모드)를 보여 주고, 내 결과와 비교하고, 도전장 링크를 공유합니다. */
(function(){
  "use strict";
  var GAMES = {
    jumpit:   { name: '점프잇', hi: true,  min: 0, max: 100000, fmt: function(v){ return (+v).toFixed(2) + '점'; } },
    lightsout:{ name: '라이트 아웃', hi: false, min: 80, max: 3000, fmt: function(v){ return Math.round(v) + 'ms'; } },
    aim:      { name: '에임 트레이너', hi: false, min: 3, max: 600, fmt: function(v){ return (+v).toFixed(2) + '초'; }, modes: { normal: '일반 모드', precise: '정밀 모드' } },
    snake:    { name: '터닝 스네이크', hi: true,  min: 0, max: 100000, fmt: function(v){ return Math.round(v) + '점'; } },
    cps:      { name: '클릭 속도 테스트', hi: true, min: 0, max: 60, fmt: function(v){ return (+v).toFixed(2) + ' CPS'; }, modes: { '1': '1초 모드', '5': '5초 모드', '10': '10초 모드', '30': '30초 모드' } },
    memory:   { name: '숫자 기억력 테스트', hi: true, min: 1, max: 60, fmt: function(v){ return Math.round(v) + '자리'; }, modes: { fwd: '순서대로 모드', bwd: '거꾸로 모드' } }
  };
  var id = (location.pathname.match(/^\/([a-z]+)\//) || [])[1];
  var g = GAMES[id];
  if(!g) return;

  var css = '.gh-ch{display:flex;gap:10px;align-items:flex-start;background:linear-gradient(90deg,rgba(108,92,231,.22),rgba(0,210,255,.14));border:1px solid rgba(0,210,255,.35);border-radius:14px;padding:12px 14px;margin:0 0 16px;font-size:14px;line-height:1.6;color:#f2f2f7;}'
    + '.gh-ch b{color:#fff;}.gh-ch .gh-ic{font-size:20px;line-height:1.3;}.gh-ch .gh-tx{flex:1;}.gh-ch .gh-sub{display:block;font-size:12px;color:#9a9ac0;}'
    + '.gh-ch .gh-x{background:none;border:none;color:#9a9ac0;font-size:18px;cursor:pointer;padding:0 2px;line-height:1;}'
    + '.gh-ch.win{border-color:rgba(81,207,102,.6);background:linear-gradient(90deg,rgba(81,207,102,.2),rgba(0,210,255,.1));}'
    + '.gh-ch.lose{border-color:rgba(255,107,129,.5);background:linear-gradient(90deg,rgba(255,107,129,.16),rgba(108,92,231,.12));}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var q = new URLSearchParams(location.search);
  var vs = parseFloat(q.get('vs')), vm = q.get('m');
  var ch = null;
  if(!isNaN(vs) && isFinite(vs) && vs >= g.min && vs <= g.max){
    if(g.modes && !g.modes.hasOwnProperty(vm)) vm = null;
    ch = { v: vs, m: g.modes ? vm : null };
  }

  var box = null;
  function banner(cls, icon, html, sub){
    if(!box){
      box = document.createElement('div');
      var head = document.querySelector('header.top') || document.querySelector('header');
      if(head && head.parentNode) head.parentNode.insertBefore(box, head.nextSibling); else document.body.insertBefore(box, document.body.firstChild);
    }
    box.className = 'gh-ch' + (cls ? ' ' + cls : '');
    box.setAttribute('role', 'status');
    box.innerHTML = '<span class="gh-ic">' + icon + '</span><span class="gh-tx">' + html + (sub ? '<span class="gh-sub">' + sub + '</span>' : '') + '</span><button class="gh-x" aria-label="닫기">×</button>';
    box.querySelector('.gh-x').onclick = function(){ box.style.display = 'none'; };
    box.style.display = '';
  }
  function modeTxt(m){ return g.modes && m ? ' (' + g.modes[m] + ')' : ''; }

  if(ch){
    banner('', '🔥', '친구가 도전장을 보냈어요! 친구 기록: <b>' + g.fmt(ch.v) + '</b>' + modeTxt(ch.m),
      (g.hi ? '이 기록보다 높게' : '이 기록보다 빠르게') + ' 나오면 승리입니다.' + (ch.m ? ' 같은 모드로 도전해야 비교돼요.' : ''));
  }

  var last = null;
  function result(v, m){
    v = +v; if(isNaN(v)) return;
    last = { v: v, m: m != null ? String(m) : null };
    if(!ch) return;
    if(g.modes && ch.m && last.m !== ch.m){
      banner('', '🔁', '이번 판은 ' + (g.modes[last.m] || '다른 모드') + '였어요. 친구 기록은 ' + g.modes[ch.m] + ' <b>' + g.fmt(ch.v) + '</b>입니다.', '모드를 바꿔서 다시 도전해 보세요.');
      return;
    }
    var diff = g.hi ? v - ch.v : ch.v - v;
    var gap = g.fmt(Math.abs(v - ch.v));
    if(diff > 0) banner('win', '🎉', '친구를 이겼어요! 내 기록 <b>' + g.fmt(v) + '</b> vs 친구 ' + g.fmt(ch.v), gap + ' 차이로 승리! 도전장을 보내 되갚아 주세요.');
    else if(diff === 0) banner('', '🤝', '무승부! 둘 다 <b>' + g.fmt(v) + '</b>', '한 번만 더 해서 승부를 내 볼까요?');
    else banner('lose', '😅', '아쉬워요! 내 기록 <b>' + g.fmt(v) + '</b> vs 친구 ' + g.fmt(ch.v), gap + ' 차이예요. 다시 도전해 보세요.');
  }

  function link(v, m){
    var u = location.origin + location.pathname + '?vs=' + encodeURIComponent(v);
    if(m != null && m !== '') u += '&m=' + encodeURIComponent(m);
    return u;
  }
  function share(btn, v, m, text){
    if(v == null && last){ v = last.v; m = last.m; }
    if(v == null) return;
    var url = link(v, m), msg = text || (g.name + ' ' + g.fmt(v) + modeTxt(m) + '! 이 기록 이길 수 있어? 🔥');
    var label = btn ? btn.textContent : '';
    function done(t){ if(btn){ btn.textContent = t; setTimeout(function(){ btn.textContent = label; }, 1600); } }
    var coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    if(navigator.share && coarse){
      navigator.share({ title: g.name + ' - 게임 허브', text: msg, url: url }).catch(function(){});
    } else if(navigator.clipboard){
      navigator.clipboard.writeText(msg + '\n' + url).then(function(){ done('링크 복사됨!'); }).catch(function(){ prompt('아래 링크를 복사해 친구에게 보내세요', url); });
    } else {
      prompt('아래 링크를 복사해 친구에게 보내세요', url);
    }
  }
  window.GH = { result: result, share: share, link: link, challenge: ch };
})();
