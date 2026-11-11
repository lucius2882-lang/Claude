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
