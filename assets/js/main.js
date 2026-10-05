/* main.js — behaviour shared by every page:
   1. current year in the footer
   2. mobile navigation toggle
   3. FAQ accordion (answers hidden by default, revealed/hidden by the user) */

(function () {
  'use strict';

  // 1. Footer year ------------------------------------------------------
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // 2. Mobile nav toggle ------------------------------------------------
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // 3. FAQ accordion ----------------------------------------------------
  document.querySelectorAll('.faq-q').forEach(function (button) {
    button.addEventListener('click', function () {
      var answer = document.getElementById(button.getAttribute('aria-controls'));
      if (!answer) return;
      var expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      answer.hidden = expanded; // expanded -> hide, collapsed -> show
    });
  });
})();
