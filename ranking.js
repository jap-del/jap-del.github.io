/* 게임 허브 전체 랭킹: 게임 6개 공용 (Supabase rankings 테이블 + submit_score 함수) */
(function(){
  "use strict";
  var API = 'https://ivrgcohnltdgaufnyzdb.supabase.co/rest/v1';
  var KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cmdjb2hubHRkZ2F1Zm55emRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NzQyMTMsImV4cCI6MjEwNDQ1MDIxM30.8ntxD9FlOmqX50GihdFqK2mHhqzwP9YaFE5MXhJTWSs';
  var H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
  var GAMES = {
    jumpit:   { name: '점프잇', url: '/jumpit/', lower: false, fmt: function(v){ return (+v).toFixed(2) + '점'; } },
    lightsout:{ name: '라이트 아웃', url: '/lightsout/', lower: true, fmt: function(v){ return Math.round(v) + 'ms'; } },
    aim:      { name: '에임 트레이너', url: '/aim/', lower: true, fmt: function(v){ return (+v).toFixed(2) + '초'; }, modes: [['normal', '일반'], ['precise', '정밀']], modeKey: 'aim_mode' },
    snake:    { name: '터닝 스네이크', url: '/snake/', lower: false, fmt: function(v){ return Math.round(v) + '점'; } },
    cps:      { name: '클릭 속도 테스트', url: '/cps/', lower: false, fmt: function(v){ return (+v).toFixed(2) + ' CPS'; }, modes: [['1', '1초'], ['5', '5초'], ['10', '10초'], ['30', '30초']], modeKey: 'cps_mode', def: '5' },
    memory:   { name: '숫자 기억력 테스트', url: '/memory/', lower: false, fmt: function(v){ return Math.round(v) + '자리'; }, modes: [['fwd', '순서대로'], ['bwd', '거꾸로']], modeKey: 'mem_mode' }
  };
  function ls(k, v){ try{ if(v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }catch(e){ return null; } }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  var pid = ls('gh_pid');
  if(!pid || !/^[0-9a-f]{32}$/.test(pid)){
    var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a);
    pid = Array.prototype.map.call(a, function(b){ return ('0' + b.toString(16)).slice(-2); }).join(''); ls('gh_pid', pid);
  }
  function cleanName(n){ return String(n || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); }
  var myName = cleanName(ls('gh_name') || ls('jumpit_nickname') || ls('lightsout_name'));
  if(!myName){ myName = '플레이어' + Math.floor(1000 + Math.random() * 9000); }
  ls('gh_name', myName);
  function optedOut(){ return ls('gh_rank_off') === '1'; }
  var tagP = (window.crypto && crypto.subtle) ? crypto.subtle.digest('SHA-256', new TextEncoder().encode(pid)).then(function(b){
    return Array.prototype.map.call(new Uint8Array(b), function(x){ return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 12);
  }) : Promise.resolve('');

  function q(game, mode){ return 'game=eq.' + game + '&mode=eq.' + encodeURIComponent(mode || ''); }
  function top(game, mode, n){
    var g = GAMES[game];
    return fetch(API + '/rankings?select=name,score,tag&' + q(game, mode) + '&order=score.' + (g.lower ? 'asc' : 'desc') + ',updated_at.asc&limit=' + n, { headers: H })
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); });
  }
  function mine(game, mode){
    var g = GAMES[game];
    return tagP.then(function(tag){
      if(!tag) return null;
      return fetch(API + '/rankings?select=score,mode&game=eq.' + game + '&tag=eq.' + tag + (mode != null ? '&mode=eq.' + encodeURIComponent(mode) : ''), { headers: H })
        .then(function(r){ return r.ok ? r.json() : []; })
        .then(function(rows){
          if(mode == null) return rows;
          if(!rows.length) return null;
          var s = rows[0].score;
          return fetch(API + '/rankings?select=tag&' + q(game, mode) + '&score=' + (g.lower ? 'lt.' : 'gt.') + s, { headers: Object.assign({ Prefer: 'count=exact', Range: '0-0' }, H) })
            .then(function(r){ var cr = r.headers.get('content-range') || ''; var n = parseInt(cr.split('/')[1], 10); return { score: s, rank: isNaN(n) ? null : n + 1 }; });
        });
    }).catch(function(){ return null; });
  }
  function submit(game, mode, score, name){
    if(optedOut() || !GAMES[game]) return Promise.resolve(false);
    score = parseFloat(score); if(isNaN(score)) return Promise.resolve(false);
    return fetch(API + '/rpc/submit_score', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, H),
      body: JSON.stringify({ p_game: game, p_mode: mode == null ? '' : String(mode), p_pid: pid, p_name: name || myName, p_score: score }) })
      .then(function(r){ return r.ok; }).catch(function(){ return false; });
  }

  // ---------- 화면 ----------
  var css = '.ghr{background:#181933;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 18px;margin:14px 0;color:#f2f2f7;font-size:14px;line-height:1.6;text-align:left;}'
    + '.ghr h2{font-size:17px;margin:0;color:#f2f2f7;}.ghr-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;}'
    + '.ghr-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#51cf66;margin-right:6px;vertical-align:1px;box-shadow:0 0 8px #51cf66;}.ghr-dot.off{background:#666;box-shadow:none;}'
    + '.ghr-modes{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px;}.ghr-modes button{border:1px solid rgba(255,255,255,.16);background:transparent;color:#9a9ac0;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;}'
    + '.ghr-modes button[aria-pressed="true"]{background:linear-gradient(90deg,#6c5ce7,#00d2ff);color:#0f1020;border-color:transparent;}'
    + '.ghr-list{list-style:none;margin:0;padding:0;}.ghr-list li{display:flex;align-items:center;gap:10px;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-variant-numeric:tabular-nums;margin:0;color:#c9c9de;font-size:14px;}'
    + '.ghr-list li.me{background:rgba(0,210,255,.1);border-radius:8px;}.ghr-r{width:26px;text-align:center;font-weight:800;color:#9a9ac0;}.ghr-r.g1{color:#ffd43b;}.ghr-r.g2{color:#d0d4dc;}.ghr-r.g3{color:#e8a26b;}'
    + '.ghr-n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f2f2f7;}.ghr-s{font-weight:700;color:#f2f2f7;}'
    + '.ghr-empty{color:#9a9ac0;font-size:13px;margin:6px 0;}.ghr-my{font-size:13px;color:#9a9ac0;margin:8px 0 0;}.ghr-my b{color:#00d2ff;}'
    + '.ghr-set{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 0;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);font-size:12px;color:#9a9ac0;}'
    + '.ghr-set input[type=text]{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#f2f2f7;padding:5px 8px;font-size:13px;width:130px;font-family:inherit;}'
    + '.ghr-set label{display:inline-flex;align-items:center;gap:5px;cursor:pointer;}.ghr a.ghr-all{display:inline-block;margin-top:8px;font-size:13px;color:#00d2ff;}'
    + '.side-panel .ghr{padding:0;margin:4px 0 0;background:transparent;border:none;}.side-panel .ghr h2{font-size:14px;}.side-panel .ghr-list li{gap:6px;font-size:12px;padding:5px 2px;}.side-panel .ghr-r{width:16px;}.side-panel .ghr-set input[type=text]{width:100%;}.side-panel .ghr-my,.side-panel .ghr-empty{font-size:12px;}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var boards = [];
  function Board(el, game, opt){
    this.el = el; this.game = game; this.g = GAMES[game]; this.opt = opt || {};
    var m = '';
    if(this.g.modes){ m = ls(this.g.modeKey) || this.g.def || this.g.modes[0][0]; if(!this.g.modes.some(function(x){ return x[0] === m; })) m = this.g.modes[0][0]; }
    this.mode = m; this.render(); this.load(); boards.push(this);
  }
  Board.prototype.render = function(){
    var self = this, g = this.g, o = this.opt, n = o.limit || 20;
    var h = '<div class="ghr"><div class="ghr-head"><h2><span class="ghr-dot"></span>' + (o.title || '전체 랭킹 TOP ' + n) + '</h2>'
      + (o.compact ? '<a class="ghr-all" style="margin:0" href="' + g.url + '">플레이 →</a>' : '') + '</div>';
    if(g.modes) h += '<div class="ghr-modes">' + g.modes.map(function(x){ return '<button type="button" data-m="' + x[0] + '" aria-pressed="' + (x[0] === self.mode) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    h += '<ol class="ghr-list"><li class="ghr-empty">랭킹을 불러오는 중...</li></ol><p class="ghr-my"></p>';
    if(!o.compact){
      h += '<div class="ghr-set"><span>닉네임</span><input type="text" maxlength="12" aria-label="랭킹 닉네임" value="' + esc(myName) + '">'
        + '<label><input type="checkbox"' + (optedOut() ? '' : ' checked') + '> 랭킹에 내 기록 올리기</label></div>'
        + '<a class="ghr-all" href="/ranking/">모든 게임 랭킹 보기 →</a>';
    }
    h += '</div>';
    this.el.innerHTML = h;
    [].forEach.call(this.el.querySelectorAll('.ghr-modes button'), function(b){
      b.onclick = function(){ self.mode = b.getAttribute('data-m'); [].forEach.call(self.el.querySelectorAll('.ghr-modes button'), function(x){ x.setAttribute('aria-pressed', String(x === b)); }); self.load(); };
    });
    var inp = this.el.querySelector('.ghr-set input[type=text]'), chk = this.el.querySelector('.ghr-set input[type=checkbox]');
    if(inp) inp.onchange = function(){ setName(inp.value); inp.value = myName; };
    if(chk) chk.onchange = function(){ ls('gh_rank_off', chk.checked ? '0' : '1'); };
  };
  Board.prototype.load = function(){
    var self = this, g = this.g, list = this.el.querySelector('.ghr-list'), my = this.el.querySelector('.ghr-my'), dot = this.el.querySelector('.ghr-dot');
    var mode = this.mode;
    Promise.all([top(this.game, mode, this.opt.limit || 20), tagP, mine(this.game, mode)]).then(function(res){
      if(mode !== self.mode) return;
      var rows = res[0], tag = res[1], me = res[2];
      dot.className = 'ghr-dot';
      list.innerHTML = rows.length ? rows.map(function(r, i){
        var isMe = tag && r.tag === tag;
        return '<li class="' + (isMe ? 'me' : '') + '"><span class="ghr-r' + (i < 3 ? ' g' + (i + 1) : '') + '">' + (i + 1) + '</span><span class="ghr-n">' + esc(r.name) + (isMe ? ' (나)' : '') + '</span><span class="ghr-s">' + g.fmt(r.score) + '</span></li>';
      }).join('') : '<li class="ghr-empty">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</li>';
      my.innerHTML = me && me.rank ? '내 순위: <b>' + me.rank + '위</b> · 최고 기록 ' + g.fmt(me.score) : (self.opt.compact ? '' : '기록을 세우면 자동으로 랭킹에 올라가요.');
    }).catch(function(){
      dot.className = 'ghr-dot off';
      list.innerHTML = '<li class="ghr-empty">랭킹을 불러오지 못했어요. 잠시 후 다시 시도해 주세요. 내 기록은 이 기기에 그대로 저장돼요.</li>';
      my.textContent = '';
    });
  };
  function refresh(game, mode){
    boards.forEach(function(b){
      if(b.game !== game) return;
      if(mode != null && b.g.modes && b.mode !== String(mode)){
        b.mode = String(mode);
        [].forEach.call(b.el.querySelectorAll('.ghr-modes button'), function(x){ x.setAttribute('aria-pressed', String(x.getAttribute('data-m') === b.mode)); });
      }
      b.load();
    });
  }
  function setName(n){
    n = cleanName(n); if(!n) return;
    myName = n; ls('gh_name', n);
    // 이미 올라간 내 기록의 닉네임도 바꿉니다
    Object.keys(GAMES).forEach(function(game){
      mine(game, null).then(function(rows){
        (rows || []).forEach(function(r){ submit(game, r.mode, r.score, n).then(function(){ refresh(game); }); });
      });
    });
  }

  // 게임이 끝나면 (challenge.js의 GH.result를 통해) 자동 등록
  var here = (location.pathname.match(/^\/([a-z]+)\//) || [])[1];
  function record(v, m){
    if(!GAMES[here]) return;
    submit(here, m == null ? '' : m, v).then(function(ok){ if(ok) setTimeout(function(){ refresh(here, m); }, 300); });
  }
  if(window.GH && typeof GH.result === 'function'){
    var orig = GH.result;
    GH.result = function(v, m){ orig.apply(this, arguments); record(v, m); };
  }

  window.GHR = { mount: function(el, game, opt){ return new Board(el, game, opt); }, submit: submit, games: GAMES, name: function(){ return myName; }, setName: setName };
  var slot = document.getElementById('ghRank');
  if(slot && GAMES[here]) new Board(slot, here);
  [].forEach.call(document.querySelectorAll('[data-ghr-game]'), function(el){ new Board(el, el.getAttribute('data-ghr-game'), { limit: 10, compact: true, title: GAMES[el.getAttribute('data-ghr-game')].name + ' TOP 10' }); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden) boards.forEach(function(b){ b.load(); }); });
})();
