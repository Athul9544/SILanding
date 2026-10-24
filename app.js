/* 01 / About: the section is pinned for a stretch of scrolling, and while it
   is held the two claim cards fly in from the bottom corners - outside the
   frame, diagonally. Position in that hold drives the frame, so dragging the
   scrollbar scrubs the flight back and forth.

   Written here rather than as a CSS scroll timeline so it behaves the same in
   every browser. Runs before the reveal module below and takes the cards off
   its hands, so only one thing is ever moving them. */
(function () {
  'use strict';

  var pin = document.querySelector('.intro-pin');
  var stick = document.querySelector('.intro-stick');
  var cards = document.querySelectorAll('.claims .claim');
  if (!pin || !stick || cards.length !== 2) return;

  // must match the media query that builds the runway in styles.css
  var ROOMY = '(min-width: 681px) and (min-height: 640px)';
  var REDUCED = '(prefers-reduced-motion: reduce)';
  var mq = window.matchMedia ? window.matchMedia(ROOMY) : null;

  // the slice of the hold the flight occupies: a little in, so the heading
  // lands first, and done well before the section lets go
  var FROM = 0.08, TO = 0.62;

  // how far outside the frame each card starts
  var OUT_X = 0.62;   // of the viewport width, to its own side
  var OUT_Y = 0.52;   // of the viewport height, below
  var TILT = 7;       // degrees
  var SMALL = 0.82;   // starting scale

  var flying = false;

  function roomy() {
    if (window.matchMedia && window.matchMedia(REDUCED).matches) return false;
    return mq ? mq.matches : true;
  }

  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  /* 0 at the moment the section locks, 1 when it is about to let go */
  function hold() {
    var box = pin.getBoundingClientRect();
    var span = box.height - (window.innerHeight || 0);
    if (span <= 0) return 1;
    return clamp01(-box.top / span);
  }

  function place(el, dir, t, op) {
    if (t >= 1) {
      // landed: drop the inline transform so :hover can lift it again
      el.style.transform = '';
      el.style.opacity = '';
      el.removeAttribute('data-flying');
      return;
    }
    el.setAttribute('data-flying', '');
    var out = 1 - t;
    var x = dir * OUT_X * out * (window.innerWidth || 0);
    var y = OUT_Y * out * (window.innerHeight || 0);
    el.style.transform = 'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) ' +
      'rotate(' + (dir * TILT * out).toFixed(2) + 'deg) ' +
      'scale(' + (SMALL + (1 - SMALL) * t).toFixed(4) + ')';
    el.style.opacity = op.toFixed(3);
  }

  function frame() {
    var t = clamp01((hold() - FROM) / (TO - FROM));
    // Ease out, but only gently. A steeper curve covers most of the distance
    // in the first fraction of the scroll, and the cards then appear to come
    // straight up out of the middle - the diagonal is over before they are
    // visible.
    var eased = 1 - Math.pow(1 - t, 2);
    // Up to full while still well outside the frame, so the travel is the
    // part you watch rather than the part you miss.
    var op = Math.min(1, t / 0.3);
    place(cards[0], 1, eased, op);    // left card, in from the right
    place(cards[1], -1, eased, op);   // right card, in from the left
  }

  function clear() {
    Array.prototype.forEach.call(cards, function (el) {
      el.style.transform = '';
      el.style.opacity = '';
      el.removeAttribute('data-flying');
    });
  }

  // same latch guard as the sweeps below: never let a dropped frame wedge it
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    var ran = false;
    function run() {
      if (ran) return;
      ran = true;
      ticking = false;
      if (flying) frame();
    }
    window.requestAnimationFrame(run);
    window.setTimeout(run, 120);
  }

  function sync() {
    var want = roomy();
    if (want === flying) { if (flying) frame(); return; }
    flying = want;
    if (flying) {
      // take the cards off the reveal module - it reads [data-reveal] when it
      // starts, just below, so by then these two are no longer in the set
      Array.prototype.forEach.call(cards, function (el) {
        el.removeAttribute('data-reveal');
        el.classList.remove('in');
      });
      frame();
    } else {
      clear();
    }
  }

  sync();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', sync);
  window.addEventListener('load', sync);

  // exposed so the layout can be measured without faking scroll events
  window.__introScrub = { frame: frame, hold: hold, sync: sync };
})();

/* Reveal elements as they scroll into view, cascading within a group. */
(function () {
  'use strict';

  // tells the inline watchdog in <head> that this module is alive
  window.__revealReady = true;

  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Without IntersectionObserver (or with motion reduced) just show everything
  // rather than leaving the sections blank.
  if (reduced || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(items, function (el) { el.classList.add('in'); });
    return;
  }

  var pending = Array.prototype.slice.call(items);

  // idempotent, so the observer and the scroll sweep can both call it
  function reveal(el, order) {
    if (el.classList.contains('in')) return;
    // The cascade is capped: a batch can be 20+ elements when the page is
    // jumped to the end, and an uncapped 90ms step would trail for over two
    // seconds. Beyond the cap everything lands together.
    el.style.transitionDelay = Math.min(order * 90, 420) + 'ms';
    el.classList.add('in');
    var i = pending.indexOf(el);
    if (i !== -1) pending.splice(i, 1);
  }

  // "has reached the reveal line, or is already above it" - deliberately not
  // bounded below, so jumping down the page does not strand the sections
  // above the viewport at opacity 0
  function inView(el) {
    return el.getBoundingClientRect().top < (window.innerHeight || 0) * 0.92;
  }

  // The reveal line sits 8% above the fold, so anything inside that last 8%
  // of the document can never cross it - there is no scroll left. Once the
  // page bottoms out, everything still pending is due.
  function atDocumentEnd() {
    var doc = document.documentElement;
    var y = window.scrollY || window.pageYOffset || 0;
    return (window.innerHeight + y) >= doc.scrollHeight - 2;
  }

  // Backstop: reveals anything on screen. Runs on scroll and once after load,
  // so the sections still appear even if the observer never delivers.
  var ticking = false;
  function sweep() {
    ticking = false;
    var end = atDocumentEnd();
    pending.slice()
      .filter(function (el) { return end || inView(el); })
      .forEach(function (el, i) { reveal(el, i); });
    if (!pending.length) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  }
  // rAF can be throttled to nothing in a background tab or an offscreen
  // frame. A boolean latch plus rAF alone would then wedge on `true` and the
  // sweep would never run again, leaving content stuck at opacity 0 - so a
  // timer races the frame and whichever arrives first clears the latch.
  function onScroll() {
    if (ticking) return;
    ticking = true;
    var ran = false;
    function run() {
      if (ran) return;
      ran = true;
      sweep();            // clears `ticking` itself
    }
    window.requestAnimationFrame(run);
    window.setTimeout(run, 120);
  }

  var observer = new IntersectionObserver(function (entries) {
    // entries can arrive out of order; sort so the stagger follows the layout
    entries
      .filter(function (e) { return e.isIntersecting; })
      .sort(function (a, b) {
        return a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top;
      })
      .forEach(function (entry, i) {
        reveal(entry.target, i);
        observer.unobserve(entry.target);   // reveal once, then stop watching
      });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  Array.prototype.forEach.call(items, function (el) { observer.observe(el); });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', sweep);
  setTimeout(sweep, 1200);
})();

/* Decorative layers drift against the scroll. Nothing here is content, so
   if this never runs the page just renders them static. */
(function () {
  'use strict';

  var layers = document.querySelectorAll('[data-parallax]');
  if (!layers.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ticking = false;

  function frame() {
    ticking = false;
    var vh = window.innerHeight || 0;

    Array.prototype.forEach.call(layers, function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;   // off screen, skip

      // how far this element's centre is from the middle of the viewport
      var fromCentre = (r.top + r.height / 2) - vh / 2;
      var rate = parseFloat(el.getAttribute('data-parallax')) || 0;
      el.style.setProperty('--py', (fromCentre * rate).toFixed(1) + 'px');
    });
  }

  // same latch guard as the reveal sweep: never let a dropped frame wedge it
  function onScroll() {
    if (ticking) return;
    ticking = true;
    var ran = false;
    function run() {
      if (ran) return;
      ran = true;
      frame();            // clears `ticking` itself
    }
    window.requestAnimationFrame(run);
    window.setTimeout(run, 120);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  frame();
})();

/* Enquiry modal: opened by the Get Started button. */
(function () {
  'use strict';

  var modal = document.getElementById('contact-modal');
  if (!modal) return;

  var card = modal.querySelector('.modal-card');
  var form = modal.querySelector('.modal-form');
  var done = modal.querySelector('.modal-done');
  var lastFocused = null;

  var FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

  function visibleFocusable() {
    return Array.prototype.filter.call(card.querySelectorAll(FOCUSABLE), function (el) {
      return el.offsetParent !== null;
    });
  }

  function open() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    // keep the page behind from scrolling while the dialog is up
    document.body.style.overflow = 'hidden';
    // land on the first field, not the close button
    var target = card.querySelector('.modal-form:not([hidden]) input, .modal-done:not([hidden]) button')
      || visibleFocusable()[0];
    if (target) target.focus();
  }

  var closeTimer = 0;

  function finishClose() {
    window.clearTimeout(closeTimer);
    closeTimer = 0;
    modal.classList.remove('is-closing');
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function close() {
    if (modal.hidden || modal.classList.contains('is-closing')) return;

    // focus must leave before the dialog is hidden, or it is lost to the page
    if (lastFocused && lastFocused.focus) lastFocused.focus();

    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { finishClose(); return; }

    // let the exit animation retrace the entrance, then hide for real.
    // The timer is a backstop: if animationend never fires (interrupted,
    // or animations disabled) the dialog still closes.
    modal.classList.add('is-closing');
    card.addEventListener('animationend', finishClose, { once: true });
    closeTimer = window.setTimeout(finishClose, 400);
  }

  function reset() {
    form.hidden = false;
    done.hidden = true;
    form.reset();
    Array.prototype.forEach.call(form.querySelectorAll('.field'), function (f) {
      f.classList.remove('invalid');
    });
  }

  /* --- triggers --------------------------------------------------------- */

  Array.prototype.forEach.call(
    document.querySelectorAll('a[href="#get-started"], [data-open-modal]'),
    function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        reset();
        open();
      });
    }
  );

  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    // keep tabbing inside the dialog
    if (e.key === 'Tab') {
      var items = visibleFocusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* --- validation + submit ---------------------------------------------- */

  function fieldOf(input) { return input.closest('.field'); }

  function check(input) {
    var value = input.value.trim();
    var ok = true;

    if (input.hasAttribute('required') && !value) ok = false;
    if (ok && input.type === 'email' && value) ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

    fieldOf(input).classList.toggle('invalid', !ok);
    return ok;
  }

  Array.prototype.forEach.call(form.querySelectorAll('input, textarea'), function (input) {
    input.addEventListener('input', function () {
      if (fieldOf(input).classList.contains('invalid')) check(input);
    });
    input.addEventListener('blur', function () {
      if (input.value.trim()) check(input);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var required = form.querySelectorAll('[required]');
    var firstBad = null;

    Array.prototype.forEach.call(required, function (input) {
      if (!check(input) && !firstBad) firstBad = input;
    });

    if (firstBad) { firstBad.focus(); return; }

    // No backend wired up: POST the payload to your endpoint here.
    // var payload = Object.fromEntries(new FormData(form).entries());

    form.hidden = true;
    done.hidden = false;
    var btn = done.querySelector('button');
    if (btn) btn.focus();
  });

  // deep link: /index.html#get-started opens the dialog directly
  if (window.location.hash === '#get-started') { reset(); open(); }
})();
