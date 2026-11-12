// The owner's door. A small black lock beside Lucy's button opens a PIN pad, and the
// right PIN opens Lucius's own tools.
//
// The PIN is not written anywhere on this site. Only a one-way fingerprint of it is,
// and what gets typed is fingerprinted the same way and compared. That keeps visitors
// out of the way, but it is a door, not a vault: the site has no server to guard
// anything, so nothing private belongs behind it.
(function () {
  var lock = document.getElementById('owner-lock');
  if (!lock || !window.crypto || !crypto.subtle || !window.TextEncoder) return;   // no way to check a PIN: the lock stays hidden

  var SALT = 'luciuscampany.com owner door:';
  var FINGERPRINT = 'eb0534fffc410709ee42cf38da610e24049ca467c9b2f1164ecce6e604194d48';
  var OPEN_KEY = 'lc-owner-open';          // stays open until the tab is closed, or Lock is pressed
  var WAIT_KEY = 'lc-owner-wait';          // when a run of wrong PINs can be tried again
  var MAX_MISSES = 5, WAIT_MS = 30000;

  // Everything behind the door. Each tool is a page of its own, shown inside this view.
  var TOOLS = [
    { name: 'Schedule builder',
      note: 'La Prima Uguaglianza è L’equità. Four weeks of shifts, shared fairly.',
      src: '/scheduler/' },
    // COMPUTAAA runs on its own server (code in /COMPUTAAA). Its real locks live there:
    // Cloudflare Access, then a passkey. This PIN only hides the tile.
    { name: 'COMPUTAAA',
      note: 'Your browser, on command. It asks before anything risky.',
      src: 'https://agent.luciuscampany.com/',
      gated: true }
  ];

  // The button's face, drawn once and used at two sizes (the button, and the emblem over the PIN pad).
  // Light comes from the upper left. The outline is a raised ring: bright where it faces the light, dark
  // where it turns away. Inside it the face is sunk: in shadow under the upper-left wall, catching light
  // on the lower-right one. The lock stands up out of that face, with a lit upper-left edge and a shadow
  // thrown to the lower right, and a faint glow around it. `id` keeps the two copies' gradients apart.
  function LOCK(id) {
    var shape = '<path d="M20.4 25V20.9a5.6 5.6 0 0 1 11.2 0V25" fill="none" stroke-width="3.3" stroke-linecap="round"/>' +
      '<rect x="17.2" y="24.2" width="17.6" height="13.6" rx="3.1" stroke="none"/>';
    function grad(name, stops) {
      return '<linearGradient id="' + id + name + '" x1="0" y1="0" x2="1" y2="1">' + stops.map(function (st) {
        return '<stop offset="' + st[0] + '" stop-color="' + st[1] + '"/>';
      }).join('') + '</linearGradient>';
    }
    var u = function (name) { return 'url(#' + id + name + ')'; };
    return '<svg viewBox="0 0 52 52" aria-hidden="true"><defs>' +
      grad('rim', [[0, '#c9c9c9'], [.42, '#474747'], [1, '#040404']]) +
      grad('wall', [[0, '#000'], [.5, '#0c0c0c'], [1, '#8c8c8c']]) +
      grad('face', [[0, '#000'], [.55, '#0d0d0d'], [1, '#232323']]) +
      grad('lock', [[0, '#7a7a7a'], [.45, '#232323'], [1, '#060606']]) +
      '<filter id="' + id + 'soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation=".9"/></filter>' +
      '<filter id="' + id + 'glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>' +
      '</defs>' +
      '<circle cx="26" cy="26" r="26" fill="#000"/>' +
      '<circle cx="26" cy="26" r="22.9" fill="none" stroke="' + u('rim') + '" stroke-width="5"/>' +          // the raised outline
      '<circle cx="26" cy="26" r="19.6" fill="' + u('face') + '"/>' +                                         // the sunken face
      '<circle cx="26" cy="26" r="19.6" fill="none" stroke="' + u('wall') + '" stroke-width="2"/>' +          // the wall down into it
      '<g class="ow-glow" filter="' + u('glow') + '" fill="#fff" stroke="#fff" opacity=".42">' + shape + '</g>' +
      '<g transform="translate(1.7 2)" filter="' + u('soft') + '" fill="#000" stroke="#000" opacity=".95">' + shape + '</g>' +   // shadow, lower right
      '<g transform="translate(-.9 -1)" fill="#e6e6e6" stroke="#e6e6e6" opacity=".6">' + shape + '</g>' +                    // lit edge, upper left
      '<g fill="' + u('lock') + '" stroke="' + u('lock') + '">' + shape + '</g>' +
      '<circle cx="26" cy="30.6" r="1.9" fill="#000"/><path d="M27.5 31.8a1.9 1.9 0 0 0 .4-1.4" fill="none" stroke="#9a9a9a" stroke-width=".7" stroke-linecap="round"/>' +
      '</svg>';
  }
  lock.innerHTML = LOCK('owb-');

  // ---- the lock appears once the opening screen has gone ----
  var splash = document.getElementById('splash');
  function splashGone() {
    return !splash || splash.classList.contains('fade-out') || getComputedStyle(splash).display === 'none';
  }
  function reveal() { lock.hidden = false; }
  if (splashGone()) reveal();
  else new MutationObserver(function (m, o) { if (splashGone()) { o.disconnect(); reveal(); } })
    .observe(splash, { attributes: true, attributeFilter: ['class', 'style'] });

  // ---- the view ----
  var view = null, el = {}, digits = '', misses = 0, checking = false, waitTimer = 0, state = 'pin';

  function stored(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
  function store(key, value) { try { value === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value); } catch (e) {} }

  function fingerprint(pin) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(SALT + pin)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  function build() {
    view = document.createElement('div');
    view.id = 'ownerview';
    view.setAttribute('role', 'dialog');
    view.setAttribute('aria-label', 'Owner’s entrance');
    var keys = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
      return '<button type="button" class="ow-key" data-n="' + n + '">' + n + '</button>';
    }).join('');
    view.innerHTML =
      '<div class="ow-bar">' +
        '<button type="button" class="ow-btn ow-close">✕ Close</button>' +
        '<button type="button" class="ow-btn ow-back" hidden>← Tools</button>' +
        '<span class="ow-title">Owner</span>' +
        '<button type="button" class="ow-btn ow-relock" hidden>Lock</button>' +
      '</div>' +
      '<div class="ow-stage">' +
        '<section class="ow-pin">' +
          '<div class="ow-emblem">' + LOCK('owe-') + '</div>' +
          '<h2 class="ow-heading">Owner’s entrance</h2>' +
          '<p class="ow-hint" aria-live="polite">Enter your PIN</p>' +
          '<div class="ow-dots" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
          '<div class="ow-pad">' + keys + '<span></span>' +
            '<button type="button" class="ow-key" data-n="0">0</button>' +
            '<button type="button" class="ow-key ow-del" data-del aria-label="Delete">⌫</button>' +
          '</div>' +
        '</section>' +
        '<section class="ow-home" hidden>' +
          '<p class="ow-eyebrow">Welcome back, Lucius</p>' +
          '<h2 class="ow-heading">Your tools</h2>' +
          '<div class="ow-grid">' + TOOLS.map(function (t, i) {
            return '<button type="button" class="ow-tool" data-tool="' + i + '">' +
              '<span class="ow-tool-no">' + ('0' + (i + 1)).slice(-2) + '</span>' +
              '<span class="ow-tool-name">' + t.name + '</span>' +
              '<span class="ow-tool-note">' + t.note + '</span>' +
              '<span class="ow-tool-go">Open</span></button>';
          }).join('') + '</div>' +
        '</section>' +
      '</div>';
    document.body.appendChild(view);
    ['close', 'back', 'relock', 'title', 'stage', 'pin', 'hint', 'dots', 'pad', 'home'].forEach(function (k) {
      el[k] = view.querySelector('.ow-' + k);
    });
    el.close.addEventListener('click', function () { history.back(); });
    el.back.addEventListener('click', function () { show('home'); });
    el.relock.addEventListener('click', function () { store(OPEN_KEY, null); digits = ''; show('pin'); });
    el.pad.addEventListener('click', function (e) {
      var key = e.target.closest('.ow-key');
      if (!key) return;
      if (key.hasAttribute('data-del')) erase(); else press(key.getAttribute('data-n'));
    });
    el.home.addEventListener('click', function (e) {
      var card = e.target.closest('.ow-tool');
      if (card) openTool(TOOLS[+card.getAttribute('data-tool')]);
    });
  }

  // Which of the three screens is showing: the PIN pad, the list of tools, or one tool.
  function show(next) {
    state = next;
    el.pin.hidden = next !== 'pin';
    el.home.hidden = next !== 'home';
    el.back.hidden = next !== 'tool';
    el.relock.hidden = next === 'pin';
    el.stage.classList.toggle('ow-in-tool', next === 'tool');
    if (next !== 'tool') { dropFrame(); el.title.textContent = 'Owner'; }
    var gate = view.querySelector('.ow-gate');
    if (gate && next !== 'tool') gate.remove();
    if (next === 'pin') { paint(); waiting(); }
    var focus = next === 'home' ? view.querySelector('.ow-tool') : next === 'tool' ? el.back : el.close;
    if (focus) focus.focus({ preventScroll: true });
  }

  // Each tool gets a frame of its own, made when it opens and thrown away when it closes.
  // (Pointing one long-lived frame at a new page would add a step to the browser's history,
  // and Close would then undo that step instead of closing this view.)
  function dropFrame() {
    var old = view.querySelector('.ow-frame');
    if (old) old.remove();
  }

  // A tool on its own server behind Cloudflare Access can't show Cloudflare's sign-in page
  // inside a frame. So check first: when the Cloudflare sign-in is needed, it opens in a
  // tab, and the frame opens once that's done.
  function openTool(tool) {
    if (!tool.gated) return frameTool(tool);
    show('tool');
    el.title.textContent = tool.name;
    var note = document.createElement('div');
    note.className = 'ow-gate';
    note.innerHTML = '<p>Checking…</p>';
    el.stage.appendChild(note);
    function ask(text, label, action) {
      note.innerHTML = '<p></p><button type="button" class="ow-btn"></button>';
      note.querySelector('p').textContent = text;
      var b = note.querySelector('button');
      b.textContent = label;
      b.addEventListener('click', action);
    }
    function check() {
      fetch(tool.src + 'api/ping', { mode: 'cors', credentials: 'include', redirect: 'manual', cache: 'no-store' })
        .then(function (r) {
          if (r.type === 'opaqueredirect' || r.status === 401 || r.status === 403) {
            ask('Sign in to Cloudflare first. It opens in a new tab; come back here when it says you\u2019re in.', 'Open sign-in', function () {
              window.open(tool.src, '_blank', 'noopener');
              ask('Signed in?', 'Open ' + tool.name, check);
            });
          } else if (!r.ok) {
            throw new Error('not ok');
          } else {
            note.remove();
            frameTool(tool);
          }
        })
        .catch(function () { ask(tool.name + ' isn\u2019t answering right now.', 'Try again', check); });
    }
    check();
  }

  function frameTool(tool) {
    show('tool');
    var frame = document.createElement('iframe');
    frame.className = 'ow-frame';
    frame.title = tool.name;
    frame.src = tool.src;
    if (tool.gated) frame.referrerPolicy = 'no-referrer';
    el.stage.appendChild(frame);
    el.title.textContent = tool.name;
  }

  // ---- the PIN pad ----
  function paint(mood) {
    var dots = el.dots.children;
    for (var i = 0; i < dots.length; i++) dots[i].className = i < digits.length ? 'on' : '';
    el.dots.className = 'ow-dots' + (mood ? ' ' + mood : '');
  }

  function waitLeft() { return Math.max(0, (+stored(WAIT_KEY) || 0) - Date.now()); }

  // After a run of wrong PINs the pad rests for a moment.
  function waiting() {
    clearTimeout(waitTimer);
    var left = waitLeft();
    el.pad.classList.toggle('resting', left > 0);
    if (left > 0) {
      el.hint.textContent = 'Too many tries. Wait ' + Math.ceil(left / 1000) + ' seconds.';
      waitTimer = setTimeout(waiting, 500);
    } else if (/^Too many/.test(el.hint.textContent)) {
      misses = 0;
      el.hint.textContent = 'Enter your PIN';
    }
    return left > 0;
  }

  function press(n) {
    if (checking || state !== 'pin' || waitLeft() > 0 || digits.length >= 4) return;
    digits += n;
    paint();
    if (digits.length < 4) return;
    checking = true;
    fingerprint(digits).then(function (print) {
      if (print === FINGERPRINT) {
        store(OPEN_KEY, '1');
        misses = 0;
        paint('right');
        setTimeout(function () { checking = false; digits = ''; if (view && state === 'pin') show('home'); }, 420);
      } else {
        misses++;
        paint('wrong');
        el.hint.textContent = 'Not it. Try again.';
        if (misses >= MAX_MISSES) store(WAIT_KEY, String(Date.now() + WAIT_MS));
        setTimeout(function () { checking = false; digits = ''; paint(); waiting(); }, 520);
      }
    });
  }

  function erase() {
    if (checking || state !== 'pin') return;
    digits = digits.slice(0, -1);
    paint();
  }

  // ---- opening and closing ----
  function isOpen() { return !!view && view.classList.contains('visible'); }

  function open() {
    if (isOpen()) return;
    if (!view) build();
    digits = '';
    view.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('owner-open');        // Lucy and the lock step aside
    el.hint.textContent = 'Enter your PIN';
    show(stored(OPEN_KEY) ? 'home' : 'pin');
    requestAnimationFrame(function () { view.classList.add('visible'); });
    // a step in the browser's history, so the back button or a back swipe closes it
    history.pushState({ page: 'owner' }, '', window.location.pathname);
  }

  function close() {
    if (!isOpen()) return;
    var v = view;
    clearTimeout(waitTimer);
    v.classList.remove('visible');
    document.body.style.overflow = '';
    document.body.classList.remove('owner-open');
    setTimeout(function () {
      if (v.classList.contains('visible')) return;
      v.style.display = 'none';
      dropFrame();
    }, 300);
    lock.focus({ preventScroll: true });
  }

  lock.addEventListener('click', open);
  window.addEventListener('popstate', close);
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') { history.back(); return; }
    if (state !== 'pin') return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === 'Backspace') erase();
  });
})();
