// Trapizzino tile. Clicking it puts up an UNDER CONSTRUCTION sign in the
// Trapizzino logo's lettering and colours, with the role line underneath
// throbbing harder and harder like it's about to blow. Then the little
// Trapizzino characters start popping up everywhere: slowly at first, faster
// and faster, until they bury the sign. The only way on is to catch the
// glowing wine girl running around. She's almost impossible to catch at first;
// as the screen fills up she slows down and burns brighter.
// Catch her and the crowd clears. She says her piece about the schedule maker
// Lucius built, and a button opens it inside the site (the copy in /scheduler/).
// (Escape closes everything, for keyboard users.)
(function () {
  var tile = document.querySelector('.tile[data-role="trapizzino"]');
  if (!tile) return;

  var GUY = 'assets/trap-guy.png';
  var GLASS = 'assets/trap-glass.png';
  [GUY, GLASS].forEach(function (src) { var i = new Image(); i.src = src; });

  var RED = '#f02a37', YELLOW = '#ffcc03';

  // T, R, I, N and O are traced from the Trapizzino logo; the others are drawn
  // to match (cap height 100). `d` is the letter. `hull` is its silhouette
  // without the cut-outs, used for the backing colour and the blur mask.
  // `tuck` pulls round letters a little closer to their neighbours.
  var ROUND = 'M53.9 -1.5A53.9 52 0 1 1 53.9 102.5A53.9 52 0 1 1 53.9 -1.5Z';
  var GLYPHS = {
    U: { w: 96, d: 'M0 0H38V42A10 10 0 0 0 58 42V0H96V54A48 48 0 0 1 0 54Z',
         hull: 'M0 0H96V54A48 48 0 0 1 0 54Z' },
    N: { w: 90.2, d: 'M0 -3.4L45.8 42.4V0H90.2V100H0Z', hull: 'M0 -3.4L3.4 0H90.2V100H0Z' },
    D: { w: 94, d: 'M0 0H44A50 50 0 0 1 44 100H0V67.5A17.5 17.5 0 0 0 0 32.5Z',
         hull: 'M0 0H44A50 50 0 0 1 44 100H0Z' },
    E: { w: 72, d: 'M0 0H72V22H44V39H72V61H44V78H72V100H0Z', hull: 'M0 0H72V100H0Z' },
    R: { w: 85.9, d: 'M0 0H50.9A33.1 33.1 0 0 1 61.6 64.4L85.9 100H0V50.6A17.5 17.5 0 0 0 0 15.6Z',
         hull: 'M0 0H50.9A33.1 33.1 0 0 1 61.6 64.4L85.9 100H0Z' },
    C: { w: 107.8, tuck: 2, d: 'M104.8 33.1A53.9 52 0 1 0 104.8 67.9H53.9A17.6 17.4 0 0 1 53.9 33.1Z',
         hull: ROUND },
    O: { w: 107.8, tuck: 2, d: ROUND + 'M53.9 33.1A17.6 17.4 0 1 0 53.9 67.9A17.6 17.4 0 1 0 53.9 33.1Z',
         hull: ROUND },
    S: { w: 78, d: 'M39 0H78V19H44A10.75 10.75 0 0 0 44 40.5H78V61A39 39 0 0 1 39 100H0V81H34' +
           'A10.75 10.75 0 0 0 34 59.5H0V39A39 39 0 0 1 39 0Z',
         hull: 'M39 0H78V61A39 39 0 0 1 39 100H0V39A39 39 0 0 1 39 0Z' },
    T: { w: 77.2, d: 'M0 0H77.2V34.5H60.8V100H16.4V34.5H0Z' },
    I: { w: 44, d: 'M0 0H44V100H0Z' }
  };

  // Returns the lettering plus a matching mask that traces a soft outline
  // around it, used to blur the page just behind the writing. Each line has
  // its own colours: `ink` for the letters, `back` for the edge around them.
  function wordmark(lines) {
    var GAP = 19, LINE = 119, EDGE = 10, HALO = 30, VB = 12, MP = 70;
    function advance(g) { return g.w - 2 * (g.tuck || 0); }
    var widths = lines.map(function (line) {
      return line.text.split('').reduce(function (sum, ch, i) {
        return sum + advance(GLYPHS[ch]) + (i ? GAP : 0);
      }, 0);
    });
    var W = Math.max.apply(null, widths);
    var H = (lines.length - 1) * LINE + 100;
    var backs = '', inks = '', halo = '';
    lines.forEach(function (line, li) {
      var x = (W - widths[li]) / 2, back = '', ink = '';
      line.text.split('').forEach(function (ch) {
        var g = GLYPHS[ch];
        var p = '<path transform="translate(' + (x - (g.tuck || 0)).toFixed(1) + ' ' + li * LINE + ')" d="';
        back += p + (g.hull || g.d) + '"/>';
        ink += p + g.d + '"/>';
        x += advance(g) + GAP;
      });
      backs += '<g fill="' + line.back + '" stroke="' + line.back + '" stroke-width="' + 2 * EDGE +
        '" stroke-linejoin="round">' + back + '</g>';
      inks += '<g fill="' + line.ink + '">' + ink + '</g>';
      halo += back;
    });
    return {
      svg: '<svg viewBox="' + -VB + ' ' + -VB + ' ' + (W + 2 * VB) + ' ' + (H + 2 * VB) +
        '" aria-hidden="true">' + backs + inks + '</svg>',
      mask: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + -MP + ' ' + -MP + ' ' +
        (W + 2 * MP) + ' ' + (H + 2 * MP) + '">' +
        '<filter id="f" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>' +
        '<g filter="url(#f)" fill="#000" stroke="#000" stroke-width="' + 2 * HALO +
        '" stroke-linejoin="round">' + halo + '</g></svg>',
      padX: (MP - VB) / (W + 2 * VB) * 100,
      padY: (MP - VB) / (H + 2 * VB) * 100
    };
  }

  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var layer = null, sign = null, sub = null, escapeBtn = null, escapee = null;
  var timers = [], raf = 0, openedAt = 0, phase = 0, lastFrame = 0;
  var count = 0, MAX = reduceMotion ? 120 : 260;
  // 0 while the screen is empty, 1 once it's packed. It trails the real count
  // by a moment so the wine girl slows down and brightens gradually.
  var calm = 0;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function screenScale() { return Math.sqrt(window.innerWidth * window.innerHeight); }

  function spawnOne() {
    if (!layer || count >= MAX) return;
    // Mostly Trapizzino guys, with some ordinary wine girls mixed in.
    var isGlass = Math.random() < 0.18;
    var img = document.createElement('img');
    img.src = isGlass ? GLASS : GUY;
    img.alt = '';
    img.draggable = false;
    img.className = 'trap-bug' + (Math.random() < 0.25 ? ' wiggle' : '');
    var w = screenScale() * (0.1 + Math.random() * 0.1);
    img.style.width = Math.round(isGlass ? w * 0.45 : w) + 'px';

    // Later arrivals pile onto the sign so it gets buried.
    var x, y;
    if (count > MAX * 0.25 && Math.random() < 0.55) {
      var r = sign.getBoundingClientRect();
      x = r.left + Math.random() * r.width;
      y = r.top + Math.random() * r.height;
    } else {
      x = (Math.random() * 1.1 - 0.05) * window.innerWidth;
      y = (Math.random() * 1.1 - 0.05) * window.innerHeight;
    }
    img.style.left = Math.round(x) + 'px';
    img.style.top = Math.round(y) + 'px';
    img.style.setProperty('--r', Math.round(Math.random() * 50 - 25) + 'deg');
    img.style.setProperty('--d', (0.6 + Math.random() * 0.6).toFixed(2) + 's');
    layer.insertBefore(img, escapeBtn);
    count++;
  }

  // Slow at first, then each pop comes sooner, then they come in bunches.
  function outbreak(delay, batch) {
    if (!layer || count >= MAX) return;
    for (var i = 0; i < batch; i++) spawnOne();
    var next = Math.max(16, delay * (reduceMotion ? 0.8 : 0.9));
    var nextBatch = next <= 16 ? Math.min(batch + 1, 6) : batch;
    later(function () { outbreak(next, nextBatch); }, next);
  }

  // How fast the wine girl runs: a blur while the screen is empty,
  // easy to catch once it's packed. Pixels per second.
  function escapeeSpeed() {
    var empty = 1 - calm;
    var s = screenScale() * (0.08 + 0.67 * empty * empty);
    return reduceMotion ? s * 0.35 : s;
  }

  function releaseEscapee() {
    if (!layer) return;
    escapeBtn = document.createElement('button');
    escapeBtn.type = 'button';
    escapeBtn.className = 'trap-escape';
    escapeBtn.setAttribute('aria-label', 'Catch the glowing wine glass to close');
    // She's on fire: an aura and flames behind her, embers flying off, sparkles.
    // How strong each of those is follows --glow, which the frame loop raises
    // as she slows down.
    var flames = '';
    [-14, 0, 14].forEach(function (fx, i) {
      flames += '<span class="trap-flame" style="--fx:' + fx + '%;animation-delay:' + (i * 0.3) + 's"></span>';
    });
    var embers = '';
    for (var i = 0; i < 9; i++) {
      embers += '<span class="trap-ember" style="--ex:' + Math.round(20 + Math.random() * 60) + '%;' +
        '--dx:' + Math.round(Math.random() * 70 - 35) + 'px;' +
        'animation-duration:' + (1 + Math.random() * 0.6).toFixed(2) + 's;' +
        'animation-delay:' + (Math.random() * 1.3).toFixed(2) + 's"></span>';
    }
    escapeBtn.innerHTML =
      '<span class="trap-fire"><span class="trap-aura"></span>' + flames + '</span>' +
      '<span class="trap-glassfx"><img src="' + GLASS + '" alt="" draggable="false"></span>' +
      '<span class="trap-embers">' + embers + '</span>' +
      '<span class="trap-sparkles"><span class="trap-sparkle s1">✦</span><span class="trap-sparkle s2">✦</span>' +
      '<span class="trap-sparkle s3">✧</span><span class="trap-sparkle s4">✦</span></span>';
    escapeBtn.querySelector('img').style.width = Math.round(screenScale() * 0.08) + 'px';
    escapeBtn.addEventListener('click', function (e) { e.stopPropagation(); caught(); });
    layer.appendChild(escapeBtn);
    escapeBtn.focus({ preventScroll: true });

    var bw = escapeBtn.offsetWidth || 100, bh = escapeBtn.offsetHeight || 200;
    escapee = {
      w: bw, h: bh,
      x: Math.random() < 0.5 ? 0 : window.innerWidth - bw,
      y: Math.random() * Math.max(0, window.innerHeight - bh),
      heading: Math.random() * Math.PI * 2,
      turnAt: 0,
      glow: ''
    };
  }

  function runEscapee(now, dt) {
    var e = escapee, W = window.innerWidth, H = window.innerHeight;
    if (now > e.turnAt) {
      e.heading += (Math.random() - 0.5) * 2.1;
      e.turnAt = now + 900 + Math.random() * 1400;
    }
    var speed = escapeeSpeed();
    e.x += Math.cos(e.heading) * speed * dt;
    e.y += Math.sin(e.heading) * speed * dt;
    if (e.x < 0) { e.x = 0; e.heading = Math.PI - e.heading; }
    if (e.x > W - e.w) { e.x = W - e.w; e.heading = Math.PI - e.heading; }
    if (e.y < 0) { e.y = 0; e.heading = -e.heading; }
    if (e.y > H - e.h) { e.y = H - e.h; e.heading = -e.heading; }
    escapeBtn.style.transform = 'translate3d(' + e.x.toFixed(1) + 'px,' + e.y.toFixed(1) + 'px,0)';
    // The slower she gets, the brighter she burns.
    var glow = calm.toFixed(2);
    if (glow !== e.glow) { e.glow = glow; escapeBtn.style.setProperty('--glow', glow); }
  }

  // The role line throbs like it's about to explode: the beat speeds up,
  // swells, shakes and glows hotter over ~9 seconds, until it's buried.
  var HALO = '0 0 2px #fff, 0 0 3px #fff, 0 0 5px #fff, 0 0 8px #fff';
  function throb(now, dt) {
    var heat = Math.min(1, (now - openedAt) / 9000);
    phase += dt * (1.1 + heat * heat * 6);
    var beat = Math.pow(0.5 + 0.5 * Math.sin(phase * Math.PI * 2), 3);
    var scale = 1 + beat * (0.05 + heat * 0.3);
    var jolt = reduceMotion ? 0 : heat * heat;
    var jx = (Math.random() - 0.5) * 8 * jolt;
    var jy = (Math.random() - 0.5) * 6 * jolt;
    var jr = (Math.random() - 0.5) * 5 * jolt;
    if (reduceMotion) scale = 1;
    sub.style.transform = 'translate(' + jx.toFixed(1) + 'px,' + jy.toFixed(1) + 'px) rotate(' +
      jr.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
    sub.style.textShadow = HALO + ', 0 0 ' + (3 + 18 * heat * beat).toFixed(1) +
      'px rgba(240, 42, 55, ' + (0.25 + 0.7 * heat).toFixed(2) + ')';
  }

  function frame(now) {
    if (!layer) return;
    var dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    calm += (count / MAX - calm) * (1 - Math.exp(-dt / 0.9));
    throb(now, dt);
    if (escapee) runEscapee(now, dt);
    raf = requestAnimationFrame(frame);
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  // ---- Caught. She has something to say, and something to show. ----
  var SAYS = [
    'Here\u2019s a lil something Lucius made.',
    'A scheduler that does the math so every shift is shared fairly.',
    'Equity must be obtained before equality!'
  ];

  function caught() {
    if (!layer || layer.classList.contains('caught')) return;
    timers.forEach(clearTimeout);
    timers = [];
    cancelAnimationFrame(raf);
    var btn = escapeBtn, l = layer;
    escapee = null;                                   // she stops running
    l.classList.add('caught');                        // the crowd and the sign fade, the page dims
    l.setAttribute('aria-label', 'A schedule maker Lucius built');
    btn.style.setProperty('--glow', '1');
    btn.style.pointerEvents = 'none';
    btn.tabIndex = -1;
    btn.setAttribute('aria-hidden', 'true');

    var reveal = document.createElement('div');
    reveal.className = 'trap-reveal';
    reveal.innerHTML =
      '<div class="trap-spot"></div>' +
      '<div class="trap-bubble">' +
        SAYS.map(function (line, i) {
          return '<p class="trap-line' + (i === 2 ? ' trap-motto' : '') + '" style="--i:' + i + '">' + line + '</p>';
        }).join('') +
        '<div class="trap-actions" style="--i:3">' +
          '<button type="button" class="trap-go">See the scheduler</button>' +
          '<button type="button" class="trap-done">Close</button>' +
        '</div>' +
      '</div>';
    l.appendChild(reveal);
    reveal.querySelector('.trap-go').addEventListener('click', function () { close(); openScheduler(); });
    reveal.querySelector('.trap-done').addEventListener('click', close);

    // She flies from where she was caught to her spot above the speech bubble,
    // then settles into the layout so a turned phone keeps her in place.
    // (Measured now, not from when she was released: her picture may not have loaded back then.)
    var spot = reveal.querySelector('.trap-spot');
    spot.style.width = btn.offsetWidth + 'px';
    spot.style.height = btn.offsetHeight + 'px';
    var to = spot.getBoundingClientRect();
    btn.style.transition = reduceMotion ? 'none' : 'transform .65s cubic-bezier(.2,.9,.25,1)';
    btn.style.transform = 'translate3d(' + to.left.toFixed(1) + 'px,' + to.top.toFixed(1) + 'px,0)';
    later(function () {
      l.querySelectorAll('.trap-bug, .trap-sign').forEach(function (n) { n.remove(); });
      spot.appendChild(btn);
      btn.classList.add('landed');
      btn.style.transition = btn.style.transform = '';
      reveal.classList.add('speaking');
    }, reduceMotion ? 30 : 680);
    later(function () { reveal.querySelector('.trap-go').focus({ preventScroll: true }); }, reduceMotion ? 80 : 900);
  }

  // ---- The schedule maker, opened inside the site like the other case studies ----
  var view = null;

  function openScheduler() {
    if (!view) {
      view = document.createElement('div');
      view.id = 'schedview';
      view.setAttribute('role', 'dialog');
      view.setAttribute('aria-modal', 'true');
      view.setAttribute('aria-label', 'The schedule maker Lucius built');
      view.innerHTML =
        '<div class="sv-bar">' +
          '<button type="button" class="sv-close">\u2715 Close</button>' +
          '<span class="sv-title">Trapizzino \u00b7 the schedule maker</span>' +
        '</div>' +
        '<iframe class="sv-frame" title="Schedule maker" src="/scheduler/"></iframe>';
      document.body.appendChild(view);
      view.querySelector('.sv-close').addEventListener('click', function () { history.back(); });
    }
    view.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { view.classList.add('visible'); });
    // A step in the browser's history, so the back button or a back swipe closes it.
    history.pushState({ page: 'scheduler' }, '', window.location.pathname);
    view.querySelector('.sv-close').focus({ preventScroll: true });
  }

  function schedulerOpen() { return !!view && view.classList.contains('visible'); }

  function closeScheduler() {
    if (!schedulerOpen()) return;
    var v = view;
    v.classList.remove('visible');
    document.body.style.overflow = '';
    setTimeout(function () { if (!v.classList.contains('visible')) v.style.display = 'none'; }, 300);
    tile.focus({ preventScroll: true });
  }

  window.addEventListener('popstate', closeScheduler);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && schedulerOpen()) history.back();
  });

  function open() {
    if (layer) return;
    count = 0;
    calm = 0;
    layer = document.createElement('div');
    layer.id = 'trap-takeover';
    layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', 'Trapizzino: under construction');
    // Red letters with a yellow edge, like the logo.
    var mark = wordmark([
      { text: 'UNDER', ink: RED, back: YELLOW },
      { text: 'CONSTRUCTION', ink: RED, back: YELLOW }
    ]);
    layer.innerHTML =
      '<div class="trap-sign">' +
        '<div class="trap-word"><div class="trap-haze"></div>' + mark.svg + '</div>' +
        '<div class="trap-sub">Trapizzino · Waitress · Mar 2025 – Present</div>' +
      '</div>';
    sign = layer.firstChild;
    var haze = sign.querySelector('.trap-haze');
    var maskUrl = 'url("data:image/svg+xml,' + encodeURIComponent(mark.mask) + '")';
    haze.style.webkitMaskImage = maskUrl;
    haze.style.maskImage = maskUrl;
    haze.style.left = haze.style.right = -mark.padX.toFixed(3) + '%';
    haze.style.top = haze.style.bottom = -mark.padY.toFixed(3) + '%';
    // Once the fade/pop-in finishes, drop those animations: an element mid-fade
    // stops the blur from seeing the page behind it.
    layer.addEventListener('animationend', function (e) {
      if (e.animationName === 'trap-fade-out') return;
      if (e.target === e.currentTarget || e.target === e.currentTarget.firstChild) {
        e.target.style.animation = 'none';
      }
    });
    sub = sign.querySelector('.trap-sub');
    document.body.appendChild(layer);
    openedAt = lastFrame = performance.now();
    phase = 0;
    raf = requestAnimationFrame(frame);
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    later(releaseEscapee, 800);
    later(function () { outbreak(reduceMotion ? 400 : 700, 1); }, 1200);
  }

  function close() {
    if (!layer) return;
    timers.forEach(clearTimeout);
    timers = [];
    cancelAnimationFrame(raf);
    var l = layer;
    layer = sign = sub = escapeBtn = escapee = null;
    l.style.animation = '';
    l.classList.add('leaving');
    setTimeout(function () { l.remove(); }, 450);
    document.documentElement.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    tile.focus({ preventScroll: true });
  }

  tile.addEventListener('click', open);
  tile.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
})();
