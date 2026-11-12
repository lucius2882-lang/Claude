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
      src: '/scheduler/' }
  ];

  var LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.6 10.6V8.1a4.4 4.4 0 0 1 8.8 0v2.5" fill="none" ' +
    'stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><rect x="5.2" y="10.2" width="13.6" height="10.2" rx="2.4" ' +
    'fill="currentColor"/><circle class="keyhole" cx="12" cy="15.2" r="1.45"/></svg>';
  lock.innerHTML = LOCK;

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
          '<div class="ow-emblem">' + LOCK + '</div>' +
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

  function openTool(tool) {
    show('tool');
    var frame = document.createElement('iframe');
    frame.className = 'ow-frame';
    frame.title = tool.name;
    frame.src = tool.src;
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
