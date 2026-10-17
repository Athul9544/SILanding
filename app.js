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
    el.style.transitionDelay = (order * 90) + 'ms';
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

  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
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
