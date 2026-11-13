/* Super Tips Refill — student concept. Classic script (no modules), each init isolated. */
(function () {
  'use strict';

  var root = document.documentElement;

  function safe(fn, name) {
    try { fn(); } catch (e) { if (window.console) console.error('[init ' + name + ']', e); }
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  // Trapezoid 0 -> 1 (a..b), hold (b..c), 1 -> 0 (c..d)
  function win(p, a, b, c, d) {
    if (p <= a || p >= d) return 0;
    if (p < b) return smooth((p - a) / (b - a));
    if (p <= c) return 1;
    return 1 - smooth((p - c) / (d - c));
  }
  // Piecewise smooth interpolation over keyframes [[p, v1, v2...], ...]
  function keyframes(kf, p) {
    if (p <= kf[0][0]) return kf[0].slice(1);
    for (var i = 1; i < kf.length; i++) {
      if (p <= kf[i][0]) {
        var a = kf[i - 1], b = kf[i], t = smooth((p - a[0]) / (b[0] - a[0])), out = [];
        for (var j = 1; j < a.length; j++) out.push(lerp(a[j], b[j], t));
        return out;
      }
    }
    return kf[kf.length - 1].slice(1);
  }

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var btn = document.querySelector('.nav-toggle');
    var nav = document.getElementById('nav');
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { set(!nav.classList.contains('open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') set(false); });
  }

  /* ---------- Reveal on scroll (content is visible without it) ---------- */
  function initReveal() {
    var targets = document.querySelectorAll('.card, .route, .step, .evid, .parts-list li, .faq details, .adult-safety');
    if (!targets.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.03 });
    targets.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
    setTimeout(function () { targets.forEach(function (el) { el.classList.add('in'); }); }, 6000);
  }

  /* ---------- Scroll story (home) ---------- */
  function initStory() {
    var track = document.getElementById('story');
    var svg = document.getElementById('scene');
    if (!track || !svg) return;

    var pin = track.querySelector('.story-pin');
    var stage = document.getElementById('stage');
    var chapters = [].slice.call(track.querySelectorAll('.chapter'));
    var labels = [].slice.call(track.querySelectorAll('.lbl'));
    var steps = [].slice.call(track.querySelectorAll('.story-steps button'));
    var bar = document.getElementById('story-bar');
    var toggle = document.getElementById('motion-toggle');
    var strokes = document.getElementById('fx-strokes');
    var strokeThin = document.getElementById('stroke-thin');
    var strokeThick = document.getElementById('stroke-thick');
    var pack = document.getElementById('fx-pack');
    var tipMain = document.getElementById('tip-main');
    var tipSpare = document.getElementById('tip-spare');
    var note = stage.querySelector('.story-note');
    var openBody = document.getElementById('open-body');
    var openCap = document.getElementById('open-cap');

    // Part map: SVG group id -> assembled y (inside the group), exploded offset along the axis, stagger delay.
    var PARTS = {
      cap:       { el: document.getElementById('part-cap'),       off: -390, delay: 0 },
      tip:       { el: document.getElementById('part-tip'),       off: -80,  delay: 0.1 },
      body:      { el: document.getElementById('part-body'),      off: 0,    delay: 0 },
      reservoir: { el: document.getElementById('part-reservoir'), off: 390,  delay: 0.2 },
      plug:      { el: document.getElementById('part-plug'),      off: 380,  delay: 0.3 }
    };
    var ep = {};

    // Scroll progress keyframes (narrative guide, not rigid)
    var EXPLODE = [[0, 0], [0.03, 0], [0.34, 1], [0.87, 1], [0.985, 0], [1, 0]];
    var CAMERA = [ // p, centre y, visible height (SVG units)
      [0, 365, 900], [0.03, 365, 900], [0.34, 385, 1800], [0.41, 385, 1800],
      [0.52, 850, 900], [0.66, 850, 900], [0.74, 35, 980], [0.87, 35, 980],
      [0.985, 365, 900], [1, 365, 900]
    ];
    var FULL = { cy: 385, h: 1800 };

    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var userChoice = null; // 'static' | 'animated' | null (follow system)
    var isStatic = false;
    var inView = true;
    var raf = 0;

    function wantStatic() {
      if (userChoice) return userChoice === 'static';
      return !!(mq && mq.matches);
    }

    function setMode() {
      var s = wantStatic();
      isStatic = s;
      root.classList.toggle('is-static', s);
      if (toggle) {
        toggle.textContent = s ? 'Show animated view' : 'Show static view';
        toggle.setAttribute('aria-pressed', s ? 'true' : 'false');
      }
      chapters.forEach(function (c) { c.style.opacity = ''; c.style.visibility = ''; c.style.transform = ''; c.removeAttribute('aria-hidden'); });
      requestUpdate();
    }

    function setCamera(cy, h) {
      var w = stage.clientWidth, hh = stage.clientHeight;
      if (!w || !hh) return;
      var vw = h * (w / hh);
      // keep the scene clear of the disclosure note pinned to the bottom of the stage
      var reserve = note ? note.offsetHeight + 10 : 0;
      var cyv = cy + (reserve / 2) * (h / hh);
      svg.setAttribute('viewBox', (-vw / 2).toFixed(1) + ' ' + (cyv - h / 2).toFixed(1) + ' ' + vw.toFixed(1) + ' ' + h.toFixed(1));
    }

    function placeLabels(alphaFor) {
      var sr = stage.getBoundingClientRect();
      labels.forEach(function (lb) {
        var key = lb.getAttribute('data-key');
        var a = alphaFor(key);
        var anchor = document.getElementById(lb.getAttribute('data-for'));
        if (!anchor || a < 0.03) { lb.style.visibility = 'hidden'; lb.style.opacity = 0; return; }
        var r = anchor.getBoundingClientRect();
        var x = r.left + r.width / 2 - sr.left, y = r.top + r.height / 2 - sr.top;
        // fade near the stage edges so labels never collide with clipped parts
        var edge = Math.min(y, sr.height - y, x, sr.width - x);
        a *= clamp(edge / 50, 0, 1);
        if (a < 0.03) { lb.style.visibility = 'hidden'; lb.style.opacity = 0; return; }
        var w = lb.offsetWidth, h = lb.offsetHeight, side = lb.getAttribute('data-side');
        var gap = window.innerWidth < 860 ? 16 : 26, tx, ty;
        if (side === 'right') { tx = x + gap; ty = y - h / 2; }
        else if (side === 'left') { tx = x - gap - w; ty = y - h / 2; }
        else if (side === 'above') { tx = x - w / 2; ty = y - 12 - h; }
        else { tx = x - w / 2; ty = y + 12; }
        tx = clamp(tx, 6, sr.width - w - 6);
        ty = clamp(ty, 4, sr.height - h - 44);
        lb.style.visibility = 'visible';
        lb.style.opacity = a.toFixed(3);
        lb.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px)';
      });
    }

    function render(p) {
      var E = isStatic ? 1 : keyframes(EXPLODE, p)[0];
      Object.keys(PARTS).forEach(function (k) {
        var pt = PARTS[k];
        var e = smooth(E * 1.4 - pt.delay);
        ep[k] = e;
        if (pt.el) pt.el.setAttribute('transform', 'translate(0,' + (pt.off * e).toFixed(2) + ')');
      });

      // open ends are only visible once the neighbouring part has moved away
      if (openBody) openBody.style.opacity = Math.max(ep.plug, ep.reservoir).toFixed(3);
      if (openCap) openCap.style.opacity = ep.cap.toFixed(3);

      // tip swap + effects (animated mode only)
      var S = isStatic ? 0 : smooth((p - 0.74) / 0.08);
      var worn = isStatic ? 1 : (1 - 0.72 * S) * (1 - smooth((p - 0.86) / 0.04));
      if (tipMain) {
        tipMain.setAttribute('transform', 'translate(' + (170 * S).toFixed(1) + ',0)');
        tipMain.style.opacity = worn.toFixed(3);
      }
      if (tipSpare) {
        var sp = isStatic ? 0 : smooth((p - 0.735) / 0.025);
        tipSpare.setAttribute('transform', 'translate(' + (-170 * (1 - S)).toFixed(1) + ',0)');
        tipSpare.style.opacity = sp.toFixed(3);
      }
      var draw = isStatic ? 0 : smooth((p - 0.8) / 0.09);
      if (strokes) strokes.style.opacity = isStatic ? 0 : (draw > 0 ? (1 - smooth((p - 0.9) / 0.05)).toFixed(3) : 0);
      if (strokeThin) strokeThin.setAttribute('stroke-dashoffset', (1 - draw).toFixed(3));
      if (strokeThick) strokeThick.setAttribute('stroke-dashoffset', (1 - clamp((draw - 0.08) / 0.92, 0, 1)).toFixed(3));
      var pk = isStatic ? 0 : win(p, 0.43, 0.48, 0.66, 0.70);
      if (pack) {
        pack.style.opacity = pk.toFixed(3);
        pack.setAttribute('transform', 'translate(' + ((1 - pk) * 50).toFixed(1) + ',0)');
      }

      // camera
      var cam = isStatic ? [FULL.cy, FULL.h] : keyframes(CAMERA, p);
      setCamera(cam[0], cam[1]);

      // labels
      placeLabels(function (key) {
        if (isStatic) return key === 'pack' ? 0 : 1;
        if (key === 'pack') return win(p, 0.44, 0.5, 0.65, 0.69);
        var a = smooth((ep[key] - 0.78) / 0.22);
        if (key === 'tip') a *= 1 - win(p, 0.71, 0.74, 0.84, 0.87);
        return a;
      });

      // chapters
      if (!isStatic) {
        var wins = [
          win(p, -2, -1, 0.36, 0.40), win(p, 0.40, 0.44, 0.66, 0.70),
          win(p, 0.70, 0.73, 0.86, 0.89), win(p, 0.89, 0.92, 2, 3)
        ];
        chapters.forEach(function (c, i) {
          var a = wins[i] || 0;
          c.style.opacity = a.toFixed(3);
          c.style.transform = 'translateY(' + ((1 - a) * 14).toFixed(1) + 'px)';
          c.style.visibility = a < 0.02 ? 'hidden' : 'visible';
          c.style.pointerEvents = a < 0.5 ? 'none' : 'auto';
        });
        var active = p >= 0.9 ? 3 : p >= 0.70 ? 2 : p >= 0.40 ? 1 : 0;
        steps.forEach(function (b, i) { b.classList.toggle('on', i <= active); b.setAttribute('aria-current', i === active ? 'step' : 'false'); });
        if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
      }
    }

    function progress() {
      if (isStatic) return 0;
      var r = track.getBoundingClientRect();
      var range = r.height - pin.offsetHeight;
      return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
    }

    function update() { raf = 0; render(progress()); }
    function requestUpdate() { if (!raf) raf = requestAnimationFrame(update); }

    // Only do work while the story is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (inView) requestUpdate(); }, { rootMargin: '200px 0px' }).observe(track);
    }
    window.addEventListener('scroll', function () { if (inView) requestUpdate(); }, { passive: true });
    window.addEventListener('resize', requestUpdate);
    if ('ResizeObserver' in window) new ResizeObserver(requestUpdate).observe(stage);

    steps.forEach(function (b) {
      b.addEventListener('click', function () {
        var p = parseFloat(b.getAttribute('data-p'));
        var r = track.getBoundingClientRect();
        var range = r.height - pin.offsetHeight;
        window.scrollTo({ top: window.pageYOffset + r.top + p * range + (p === 0 ? 0 : 4) });
      });
    });
    if (toggle) toggle.addEventListener('click', function () { userChoice = isStatic ? 'animated' : 'static'; setMode(); });
    if (mq) {
      var onChange = function () { if (!userChoice) setMode(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    setMode();
    render(progress());
    window.addEventListener('load', requestUpdate);
  }

  /* ---------- Kit explorer (simulated, nothing stored or sent) ---------- */
  function initKit() {
    var form = document.getElementById('kit-form');
    var svg = document.getElementById('kit-scene');
    if (!form || !svg) return;
    var list = document.getElementById('kit-summary');
    var E = 0.55;
    var off = { cap: -390, tip: -80, body: 0, reservoir: 390, plug: 380 };
    Object.keys(off).forEach(function (k) {
      var el = document.getElementById('part-' + k);
      if (el) el.setAttribute('transform', 'translate(0,' + Math.round(off[k] * E) + ')');
    });
    var spare = document.getElementById('tip-spare');
    var main = document.getElementById('tip-main');
    var pack = document.getElementById('kit-pack');
    var level = svg.querySelector('.ink-level');

    function li(text, note) {
      var el = document.createElement('li');
      el.appendChild(document.createTextNode(text));
      if (note) { var s = document.createElement('small'); s.textContent = ' — ' + note; el.appendChild(s); }
      return el;
    }

    function update() {
      var refill = form.elements['refill'].checked;
      var tips = form.elements['tips'].checked;
      var inkEl = form.querySelector('input[name="ink"]:checked');
      var style = form.querySelector('input[name="tipstyle"]:checked').value;
      var ink = inkEl.value;
      svg.style.setProperty('--marker-ink', ink);
      root.style.setProperty('--marker-ink', ink);
      if (level) level.style.opacity = refill ? 1 : 0.15;
      if (pack) pack.style.opacity = refill ? 1 : 0;
      var sx = style === 'bold' ? 1.45 : 0.8;
      var spareX = -120;
      if (main) main.setAttribute('transform', 'scale(' + sx + ',1)');
      if (spare) {
        spare.style.opacity = tips ? 1 : 0;
        spare.setAttribute('transform', 'translate(' + spareX + ',0) scale(' + sx + ',1)');
      }
      list.textContent = '';
      list.appendChild(li('Concept marker', 'cap, reusable body, rear plug'));
      if (refill) list.appendChild(li('Ink refill, ' + inkEl.getAttribute('data-name').toLowerCase(), 'illustrative; not tested'));
      if (tips) list.appendChild(li('Spare tips, ' + (style === 'bold' ? 'bold concept' : 'fine-line concept'), 'illustrative; not tested'));
      if (!refill && !tips) list.appendChild(li('Marker only', 'no ink or tip extras chosen'));
    }
    form.addEventListener('change', update);
    var reset = document.getElementById('kit-reset');
    if (reset) reset.addEventListener('click', function () { form.reset(); update(); });
    update();
  }

  /* ---------- Assumption calculator (arithmetic on editable placeholders) ---------- */
  function initCalc() {
    var form = document.getElementById('calc');
    if (!form) return;
    var defaults = { 'c-pack': 3.75, 'c-count': 12, 'c-refill': 1.5, 'c-per': 12, 'c-prem': 0.5 };
    function v(id) { var n = parseFloat(document.getElementById(id).value); return isFinite(n) ? n : 0; }
    function gbp(n) { return '£' + n.toFixed(2); }
    function update() {
      var pack = v('c-pack'), count = Math.max(1, v('c-count')), refill = v('c-refill'), per = Math.max(1, v('c-per')), prem = v('c-prem');
      var newM = pack / count, refM = refill / per, save = newM - refM;
      document.getElementById('o-new').textContent = gbp(newM);
      document.getElementById('o-ref').textContent = gbp(refM);
      document.getElementById('o-save').textContent = (save >= 0 ? '' : '-') + gbp(Math.abs(save));
      var be = document.getElementById('o-be'), msg = document.getElementById('o-msg');
      if (save <= 0) {
        be.textContent = 'never';
        msg.textContent = 'On these numbers a refill costs as much as, or more than, a new marker, so refilling would not save money.';
      } else if (prem <= 0) {
        be.textContent = 'none needed';
        msg.textContent = 'With no upfront extra, every refill cycle is cheaper on these assumptions.';
      } else {
        var n = Math.ceil(prem / save);
        be.textContent = n + (n === 1 ? ' cycle' : ' cycles');
        msg.textContent = 'On these placeholder numbers the extra upfront cost is recovered after about ' + n + ' refill ' + (n === 1 ? 'cycle' : 'cycles') + '. Real use is untested.';
      }
    }
    form.addEventListener('input', update);
    var reset = document.getElementById('calc-reset');
    if (reset) reset.addEventListener('click', function () { Object.keys(defaults).forEach(function (k) { document.getElementById(k).value = defaults[k]; }); update(); });
    update();
  }

  safe(initNav, 'nav');
  safe(initReveal, 'reveal');
  safe(initStory, 'story');
  safe(initKit, 'kit');
  safe(initCalc, 'calc');
})();
