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
