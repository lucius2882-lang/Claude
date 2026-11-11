// Finishing touches for the main page: the scroll progress line, the stat
// count-up on the splash, and sections easing in as they scroll into view.
// Nothing here is needed for the page to work. With reduced motion turned on,
// or in a browser without IntersectionObserver, the page just stays fully
// visible.
(function () {
  var doc = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var splash = document.getElementById('splash');
  var splashShowing = !!splash && getComputedStyle(splash).display !== 'none';

  // ---- scroll progress line ----
  var bar = document.createElement('div');
  bar.id = 'pl-progress';
  document.body.appendChild(bar);
  var queued = false;
  function progress() {
    queued = false;
    var max = doc.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0).toFixed(4) + ')';
  }
  window.addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(progress); }
  }, { passive: true });

  // ---- keep the page still while Lucy opens ----
  // Lucy's chat opens after the splash and from her button. On iPhone and iPad
  // that can make the browser jump the page. Hold the page where it was until
  // things settle, unless the visitor starts scrolling themselves.
  function holdScroll(y, ms) {
    var until = Date.now() + ms, cancelled = false;
    function cancel() { cancelled = true; }
    window.addEventListener('touchstart', cancel, { passive: true, once: true });
    window.addEventListener('wheel', cancel, { passive: true, once: true });
    (function tick() {
      if (cancelled || Date.now() > until) return;
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
      requestAnimationFrame(tick);
    })();
  }
  // Lucy's button and frame come after this script in the page, so wait for them.
  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  whenReady(function () {
    var launcher = document.getElementById('lucy-launcher');
    if (launcher) launcher.addEventListener('click', function () { holdScroll(window.scrollY, 1200); }, true);
  });
  if (splashShowing) {
    // the page starts at the very top once the splash is gone
    new MutationObserver(function (changes, watcher) {
      if (splash.classList.contains('fade-out') || splash.style.display === 'none') {
        watcher.disconnect();
        window.scrollTo(0, 0);
        holdScroll(0, 1500);
      }
    }).observe(splash, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  // ---- keep the page still while typing to Lucy (phones and tablets) ----
  // Tapping into Lucy's text box brings up the keyboard, and iPhone and iPad
  // browsers then drag the page somewhere else. While her box has the keyboard
  // the page is pinned exactly where the visitor left it, and it is put back
  // when the keyboard goes away. A finger on the page itself always frees it.
  var touchScreen = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  whenReady(function () {
    var lucyFrame = document.getElementById('lucy-frame');
    if (!lucyFrame || !touchScreen) return;
    var vv = window.visualViewport || null;
    var anchorY = window.scrollY;          // where the page should stay
    var dragging = false, dragTimer = 0;   // the visitor is moving the page themselves
    var pinnedAt = null, sawKeyboard = false, pinTimer = 0;

    function keyboardUp() { return !!vv && window.innerHeight - vv.height > 120; }
    function lucyHasFocus() { return document.activeElement === lucyFrame; }
    function dragStart() { dragging = true; clearTimeout(dragTimer); }
    function dragEnd(ms) { clearTimeout(dragTimer); dragTimer = setTimeout(function () { dragging = false; }, ms); }

    function pin() {
      if (pinnedAt !== null) return;
      if (document.body.style.overflow === 'hidden') return;   // a full-screen view is open
      pinnedAt = anchorY;
      sawKeyboard = keyboardUp();
      var b = document.body.style;
      b.position = 'fixed'; b.top = -pinnedAt + 'px'; b.left = '0'; b.right = '0'; b.width = '100%';
      clearTimeout(pinTimer);
      // no keyboard came (hardware keyboard, or a tap on her messages): let go again
      pinTimer = setTimeout(function () { if (!keyboardUp()) unpin(); }, 1000);
    }
    function unpin() {
      if (pinnedAt === null) return;
      var y = pinnedAt;
      pinnedAt = null;
      clearTimeout(pinTimer);
      var b = document.body.style;
      b.position = b.top = b.left = b.right = b.width = '';
      window.scrollTo(0, y);
      anchorY = y;
    }

    window.addEventListener('scroll', function () {
      // While Lucy has the cursor, only the visitor's own dragging counts as
      // scrolling; anything else is the keyboard pushing the page around.
      if (pinnedAt === null && (!lucyHasFocus() || dragging)) anchorY = window.scrollY;
    }, { passive: true });
    document.addEventListener('touchstart', function (e) {
      if (pinnedAt !== null && e.target !== lucyFrame) unpin();   // a finger on the page frees it
    }, { passive: true, capture: true });
    document.addEventListener('touchmove', dragStart, { passive: true, capture: true });
    document.addEventListener('touchend', function () { dragEnd(1200); }, { passive: true, capture: true });
    document.addEventListener('wheel', function () { dragStart(); dragEnd(300); }, { passive: true, capture: true });

    // focus moving into her frame is the tap on her text box
    window.addEventListener('blur', function () {
      var y = window.scrollY;      // read now, before the keyboard can move anything
      setTimeout(function () {
        if (!lucyHasFocus() || pinnedAt !== null) return;
        anchorY = y;
        pin();
      }, 0);
    });
    // focus coming back to the page itself (not just the window waking up) frees it
    window.addEventListener('focus', function () {
      setTimeout(function () { if (!lucyHasFocus()) unpin(); }, 0);
    });
    if (vv) vv.addEventListener('resize', function () {
      if (pinnedAt === null) {
        if (lucyHasFocus() && keyboardUp()) pin();     // keyboard came up later
        return;
      }
      if (keyboardUp()) sawKeyboard = true;
      else if (sawKeyboard) unpin();                    // keyboard has gone away
    });
  });

  if (reduce) return;

  // ---- splash stats count up to their values ----
  function countUp(el, delay) {
    var m = /^(\D*)([\d,]+)(.*)$/.exec(el.textContent.trim());
    if (!m) return;
    var target = parseInt(m[2].replace(/,/g, ''), 10);
    var commas = m[2].indexOf(',') > -1;
    var started = null, duration = 1400;
    function show(n) { el.textContent = m[1] + (commas ? n.toLocaleString('en-US') : n) + m[3]; }
    function step(now) {
      if (started === null) started = now;
      var p = Math.min(1, (now - started) / duration);
      show(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(step);
    }
    show(0);
    setTimeout(function () { requestAnimationFrame(step); }, delay);
  }
  if (splashShowing) {
    Array.prototype.forEach.call(document.querySelectorAll('.splash-stat-num'), function (el, i) {
      countUp(el, 1700 + i * 130);
    });
  }

  // ---- sections ease in as they scroll into view ----
  if (!('IntersectionObserver' in window)) return;
  var targets = Array.prototype.slice.call(document.querySelectorAll(
    '#resume .rv-header, #resume .rv-section-title, #resume .rv-job, #resume .rv-skill-group, ' +
    '#grid .tile, #contact .cf-heading, #contact .cf-sub, #contact .cf-form, #site-footer'));
  doc.classList.add('pl-js');
  targets.forEach(function (el) { el.classList.add('pl-reveal'); });

  var observer = new IntersectionObserver(function (entries) {
    var order = 0;
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      observer.unobserve(el);
      // things that arrive together come in one after another
      el.style.setProperty('--rd', Math.min(order++ * 80, 480) + 'ms');
      el.classList.add('pl-in');
      // once it has landed, hand the element back to its own styles
      setTimeout(function () {
        el.classList.remove('pl-reveal', 'pl-in');
        el.style.removeProperty('--rd');
      }, 1800);
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.04 });

  var started = false;
  function start() {
    if (started) return;
    started = true;
    targets.forEach(function (el) { observer.observe(el); });
  }
  if (splashShowing) {
    // Wait until the splash is dismissed, so the first screen is seen arriving.
    // Watch the splash itself rather than a click, since its Enter button stops
    // the click from bubbling; the first scroll is a second safety net.
    new MutationObserver(function (changes, watcher) {
      if (splash.classList.contains('fade-out') || splash.style.display === 'none') {
        watcher.disconnect();
        setTimeout(start, 380);
      }
    }).observe(splash, { attributes: true, attributeFilter: ['class', 'style'] });
    window.addEventListener('scroll', start, { once: true, passive: true });
  } else {
    start();
  }
})();
