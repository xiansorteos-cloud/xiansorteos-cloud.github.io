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
    // the story marker is on the same page, so every lookup stays inside this svg
    Object.keys(off).forEach(function (k) {
      var el = svg.querySelector('#part-' + k + '-k');
      if (el) el.setAttribute('transform', 'translate(0,' + Math.round(off[k] * E) + ')');
    });
    var spare = svg.querySelector('#tip-spare-k');
    var main = svg.querySelector('#tip-main-k');
    var pack = svg.querySelector('#kit-pack');
    var level = svg.querySelector('.ink-level');
    var lastInk = null, lastRefill = false;

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
      if (refill && lastInk !== null && (ink !== lastInk || !lastRefill)) {
        svg.classList.remove('kit-pour'); svg.getBoundingClientRect(); svg.classList.add('kit-pour');
      }
      lastInk = ink; lastRefill = refill;
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
      if (refill) list.appendChild(li('Refill bottle, ' + inkEl.getAttribute('data-name').toLowerCase(), 'one colour, several doses; illustrative, not tested'));
      if (tips) list.appendChild(li('Spare tips, ' + (style === 'bold' ? 'bold concept' : 'fine-line concept'), 'illustrative; not tested'));
      if (!refill && !tips) list.appendChild(li('Marker only', 'no ink or tip extras chosen'));
    }
    form.addEventListener('change', update);
    var reset = document.getElementById('kit-reset');
    if (reset) reset.addEventListener('click', function () { form.reset(); update(); });
    update();
  }

  /* ---------- Two-family calculator (arithmetic on editable assumptions) ---------- */
  function initCalc() {
    var form = document.getElementById('calc');
    if (!form) return;
    var defaults = { 'c-pack': 3.58, 'c-kit': 7.16, 'c-bottle': 1.2, 'c-doses': 6, 'c-life': 5, 'c-tipprice': 0.99, 'c-tipevery': 4 };
    function v(id) { var n = parseFloat(document.getElementById(id).value); return isFinite(n) ? n : 0; }
    function gbp(n) { return (n < 0 ? '-£' : '£') + Math.abs(n).toFixed(2); }
    function update() {
      var pack = v('c-pack'), kit = v('c-kit'), bottle = v('c-bottle'), doses = Math.max(1, Math.round(v('c-doses')));
      var life = Math.min(20, Math.max(1, Math.round(v('c-life'))));
      var tips = document.getElementById('c-tips').checked, tipPrice = v('c-tipprice'), every = Math.max(1, Math.round(v('c-tipevery')));
      var refillRound = 12 * bottle / doses;      // ink for all 12 colours once
      var tipEvent = 3 * tipPrice;                 // 12 tips = 3 packs of 4
      var a = 0, b = 0, even = 0, cheaper = 0, rows = '';
      for (var r = 1; r <= life + 1; r++) {
        a += pack;
        var note = '';
        if (r === 1) { b += kit; note = 'kit'; }
        else {
          b += refillRound; note = 'refill';
          if (tips && (r - 1) % every === 0) { b += tipEvent; note = 'refill + tips'; }
        }
        var d = a - b;
        if (!even && Math.abs(d) < 0.005) even = r;
        if (!cheaper && d >= 0.005) cheaper = r;
        rows += '<tr><th scope="row">' + r + (r === 1 ? ' (first ink)' : '') + '</th><td>' + gbp(a) + '</td><td>' + gbp(b) + ' <small>' + note + '</small></td><td>' +
          (Math.abs(d) < 0.005 ? 'equal' : (d > 0 ? 'B spends ' + gbp(d) + ' less' : 'B spends ' + gbp(-d) + ' more')) + '</td></tr>';
      }
      document.getElementById('o-rows').innerHTML = rows;
      var msg = document.getElementById('o-msg');
      if (cheaper) msg.textContent = 'On these numbers Family B spends less from round ' + cheaper + ' (after ' + (cheaper - 1) + ' refills of every colour), if the markers last that long.';
      else if (even) msg.textContent = 'On these numbers the two families only draw level, at round ' + even + '. Family B never spends less within the marker\'s life.';
      else msg.textContent = 'On these numbers Family B never spends less within the marker\'s life of ' + life + ' refills.';
    }
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    var reset = document.getElementById('calc-reset');
    if (reset) reset.addEventListener('click', function () { Object.keys(defaults).forEach(function (k) { document.getElementById(k).value = defaults[k]; }); document.getElementById('c-tips').checked = false; update(); });
    update();
  }

  /* ---------- Ink hero (home): a stroke drawn by scrolling, then it runs out ---------- */
  function initInkHero() {
    var track = document.getElementById('inkhero');
    var svg = document.getElementById('ink-scene');
    if (!track || !svg) return;

    var pin = track.querySelector('.story-pin');
    var chapters = [].slice.call(track.querySelectorAll('.chapter'));
    var stroke = document.getElementById('ink-stroke');
    var bottle = document.getElementById('ink-bottle');
    var marker = document.getElementById('ink-marker');
    var len = stroke && stroke.getTotalLength ? stroke.getTotalLength() : 0;

    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var isStatic = false;
    var inView = true;
    var raf = 0;
    var cur = -1;
    var last = 0;

    function setMode() {
      isStatic = !!(mq && mq.matches);
      root.classList.toggle('is-static', isStatic);
      chapters.forEach(function (c) { c.style.opacity = ''; c.style.visibility = ''; c.style.transform = ''; c.style.pointerEvents = ''; });
      cur = -1;
      requestUpdate();
    }

    // Marker tip rides the leading end of the stroke; the barrel leans like a hand-held pen.
    function placeMarker(t, lift, alpha) {
      if (!marker || !len) return;
      var d = t * len;
      var pt = stroke.getPointAtLength(d);
      var a = stroke.getPointAtLength(Math.max(0, d - 8));
      var b = stroke.getPointAtLength(Math.min(len, d + 8));
      var tan = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      var rot = lerp(118, 84, t) + tan * 0.3 - lift * 10;
      marker.setAttribute('transform', 'translate(' + (pt.x - lift * 30).toFixed(1) + ',' + (pt.y - lift * 80).toFixed(1) + ') rotate(' + rot.toFixed(1) + ')');
      marker.style.opacity = alpha.toFixed(3);
    }

    function render(p) {
      if (isStatic) {
        if (stroke) stroke.style.strokeDashoffset = '0';
        if (marker) marker.style.opacity = 0;
        if (bottle) { bottle.style.opacity = 1; bottle.setAttribute('transform', 'translate(735,255) scale(.62)'); }
        return;
      }
      var x = clamp((p - 0.04) / 0.58, 0, 1);
      var t = lerp(x, smooth(x), 0.5);
      if (stroke) stroke.style.strokeDashoffset = (1 - t).toFixed(4);
      placeMarker(t, smooth((p - 0.64) / 0.12), 1 - smooth((p - 0.67) / 0.1));

      var bOp = smooth((p - 0.76) / 0.14);
      if (bottle) {
        bottle.style.opacity = bOp.toFixed(3);
        bottle.setAttribute('transform', 'translate(' + (735 + (1 - bOp) * 26).toFixed(1) + ',' + (255 - (1 - bOp) * 18).toFixed(1) + ') scale(' + (0.52 + 0.1 * bOp).toFixed(3) + ')');
      }

      var wins = [win(p, -2, -1, 0.30, 0.37), win(p, 0.38, 0.45, 0.70, 0.78), win(p, 0.80, 0.88, 2, 3)];
      chapters.forEach(function (c, i) {
        var a = wins[i] || 0;
        c.style.opacity = a.toFixed(3);
        c.style.transform = 'translateY(' + ((1 - a) * 14).toFixed(1) + 'px)';
        c.style.visibility = a < 0.02 ? 'hidden' : 'visible';
        c.style.pointerEvents = a < 0.5 ? 'none' : 'auto';
      });
    }

    function progress() {
      if (isStatic) return 1;
      var r = track.getBoundingClientRect();
      var range = r.height - pin.offsetHeight;
      return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
    }
    // Eased chase: the drawing trails the scroll position instead of snapping to it.
    function tick(now) {
      raf = 0;
      var target = progress();
      if (isStatic || cur < 0) {
        cur = target;
      } else {
        var dt = Math.min(400, (now - last) || 16);
        cur += (target - cur) * (1 - Math.exp(-dt / 140));
        if (Math.abs(target - cur) < 0.0004) cur = target;
      }
      last = now;
      render(cur);
      if (cur !== target && inView) requestUpdate();
    }
    function requestUpdate() { if (!raf) raf = requestAnimationFrame(tick); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (inView) requestUpdate(); }, { rootMargin: '200px 0px' }).observe(track);
    }
    window.addEventListener('scroll', function () { if (inView) requestUpdate(); }, { passive: true });
    window.addEventListener('resize', requestUpdate);
    if (mq) {
      var onChange = function () { setMode(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    setMode();
  }

  /* ---------- Strategy Canvas: curves draw in, legend isolates one ---------- */
  function initCanvas() {
    var svg = document.getElementById('canvas-svg');
    if (!svg) return;
    var curves = [].slice.call(svg.querySelectorAll('.cv-curve'));
    var clips = [].slice.call(svg.querySelectorAll('.cv-clip'));
    var btns = [].slice.call(document.querySelectorAll('.legend-btn'));
    var W = svg.viewBox.baseVal.width;
    var focus = -1;
    function paint(hover) {
      var f = hover >= 0 ? hover : focus;
      curves.forEach(function (c, i) { c.style.opacity = f < 0 || f === i ? 1 : 0.14; });
      btns.forEach(function (b, i) { b.setAttribute('aria-pressed', focus === i ? 'true' : 'false'); });
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { focus = focus === i ? -1 : i; paint(-1); });
      b.addEventListener('mouseenter', function () { paint(i); });
      b.addEventListener('mouseleave', function () { paint(-1); });
    });

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    var plan = [[0, 900], [350, 900], [700, 900], [1500, 1500]]; // start delay, duration (ms); our own curve last
    clips.forEach(function (r) { r.setAttribute('width', 0); });
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect();
      var t0 = performance.now();
      (function frame(now) {
        var busy = false;
        clips.forEach(function (r, i) {
          var pl = plan[i] || [0, 900], t = clamp((now - t0 - pl[0]) / pl[1], 0, 1);
          r.setAttribute('width', (smooth(t) * W).toFixed(1));
          if (t < 1) busy = true;
        });
        if (busy) requestAnimationFrame(frame);
      })(t0);
    }, { threshold: 0.35 });
    io.observe(svg);
  }

  /* ---------- Step sketches (how it works): each one plays its step when seen ---------- */
  function initSchem() {
    var arts = [].slice.call(document.querySelectorAll('.schem'));
    if (!arts.length) return;
    if (!('IntersectionObserver' in window)) { arts.forEach(function (s) { s.classList.add('play'); }); return; }
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('play'); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    arts.forEach(function (s) {
      io.observe(s);
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'replay'; b.textContent = 'Replay';
      b.setAttribute('aria-label', 'Replay this step');
      b.addEventListener('click', function () {
        s.classList.add('noanim'); s.classList.remove('play');
        s.getBoundingClientRect();
        s.classList.remove('noanim'); s.classList.add('play');
      });
      s.parentNode.appendChild(b);
    });
  }

  /* ---------- Try it (home): use a colour up, refill just that one ---------- */
  function initTry() {
    var box = document.getElementById('try');
    if (!box) return;
    var svg = document.getElementById('try-svg');
    var hint = document.getElementById('try-hint');
    var status = document.getElementById('try-status');
    var nEl = document.getElementById('try-n');
    var btns = [].slice.call(box.querySelectorAll('.try-m'));
    var NS = 'http://www.w3.org/2000/svg';
    var FULL = 3, next = 0, refills = 0;
    var PATHS = [
      'M40,90 C120,30 180,150 260,80 S400,40 470,100',
      'M90,250 C160,190 240,300 320,230 S470,200 540,260',
      'M330,60 C380,20 450,30 500,70 S560,150 520,180',
      'M60,170 C100,140 150,210 200,170 S290,150 330,190',
      'M370,290 C410,240 460,300 510,255 S560,240 565,295',
      'M150,40 Q205,120 150,200 T185,305',
      'M420,120 C460,160 380,200 430,240 S500,260 470,300',
      'M30,300 C120,280 200,322 290,292'
    ];

    function setLevel(b, lvl) {
      b._lvl = lvl;
      b.style.setProperty('--lvl', (lvl / FULL).toFixed(3));
      b.classList.toggle('is-empty', lvl === 0);
      var n = b.getAttribute('data-n');
      b.querySelector('.try-state').textContent = lvl === 0 ? 'Refill' : lvl === FULL ? 'Full' : lvl === 1 ? 'Low' : '';
      b.setAttribute('aria-label', n + ' marker, ' + (lvl === 0 ? 'empty. Tap to refill just this colour.' : (lvl === FULL ? 'full' : 'in use') + '. Tap to draw.'));
    }
    function stroke(color, dry) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', PATHS[next % PATHS.length]);
      next++;
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', 'try-line' + (dry ? ' dry' : ''));
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', dry ? 9 : (next % 3 === 0 ? 7 : 16));
      svg.appendChild(p);
      while (svg.childNodes.length > 12) svg.removeChild(svg.firstChild);
      p.getBoundingClientRect();
      p.setAttribute('class', p.getAttribute('class') + ' on');
    }
    function tap(b) {
      if (b.classList.contains('is-filling')) return;
      var n = b.getAttribute('data-n');
      hint.classList.add('off');
      if (b._lvl === 0) {
        b.classList.remove('is-empty'); b.classList.add('is-filling');
        b.style.setProperty('--lvl', '1');
        refills++; nEl.textContent = refills;
        status.textContent = n + ' refilled. Same marker, back in the tray.';
        setTimeout(function () { b.classList.remove('is-filling'); setLevel(b, FULL); }, 900);
        return;
      }
      var lvl = b._lvl - 1;
      stroke(b.getAttribute('data-c'), lvl === 0);
      setLevel(b, lvl);
      status.textContent = lvl === 0 ? n + ' ran out. Tap it again to refill just the ' + n.toLowerCase() + '.' : (lvl === 1 ? n + ' is running low.' : 'Keep drawing.');
    }
    function reset() {
      svg.textContent = ''; next = 0; refills = 0; nEl.textContent = '0';
      btns.forEach(function (b) { b.classList.remove('is-filling'); setLevel(b, FULL); });
      hint.classList.remove('off');
      status.textContent = 'All six markers are full.';
    }
    btns.forEach(function (b) { setLevel(b, FULL); b.addEventListener('click', function () { tap(b); }); });
    var r = document.getElementById('try-reset');
    if (r) r.addEventListener('click', reset);
  }

  safe(initNav, 'nav');
  safe(initReveal, 'reveal');
  safe(initInkHero, 'inkhero');
  safe(initStory, 'story');
  safe(initKit, 'kit');
  safe(initCalc, 'calc');
  safe(initCanvas, 'canvas');
  safe(initSchem, 'schem');
  safe(initTry, 'try');
})();
