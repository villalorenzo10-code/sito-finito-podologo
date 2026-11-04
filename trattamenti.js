/* =========================================================
   trattamenti.js — comportamenti della pagina Trattamenti
   Nessuna dipendenza esterna.
   1. Funzioni di header già presenti in index.html (ombra, menu mobile, reveal)
   2. Gestione foto mancanti
   3. Lightbox
   ========================================================= */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ---------- 1. Header, menu mobile, reveal (come in index.html) ---------- */
  var header = document.getElementById('siteHeader');
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 8);
  });

  var hamburger = document.getElementById('hamburger');
  var drawer = document.getElementById('mobileDrawer');
  function closeDrawer() {
    drawer.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  hamburger.addEventListener('click', function () {
    var open = drawer.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  drawer.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeDrawer);
  });

  var reveals = document.querySelectorAll('.reveal:not(.in)');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- 2. Foto non trovate: la scheda resta ordinata ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.treatment-card'));

  function markMissing(card) {
    card.classList.add('is-missing');
    var btn = card.querySelector('.treatment-card__media');
    if (btn) { btn.disabled = true; }
  }
  cards.forEach(function (card) {
    var img = card.querySelector('.treatment-card__media img');
    if (!img) { return; }
    img.addEventListener('error', function () { markMissing(card); });
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      markMissing(card);
    }
  });

  /* ---------- 3. Lightbox ---------- */
  var box = document.getElementById('treatmentLightbox');
  if (!box || typeof box.showModal !== 'function') { return; }

  var boxImg = box.querySelector('.treatment-lightbox__img');
  var boxTitle = box.querySelector('.treatment-lightbox__title');
  var boxText = box.querySelector('.treatment-lightbox__text');
  var current = -1;

  function openable() {
    return cards.filter(function (c) { return !c.classList.contains('is-missing'); });
  }

  function show(index) {
    var list = openable();
    if (!list.length) { return; }
    current = (index + list.length) % list.length;
    var card = list[current];
    var img = card.querySelector('.treatment-card__media img');
    var title = card.querySelector('.treatment-card__title');
    var text = card.querySelector('.treatment-card__text');
    // data-full (opzionale) permette di indicare una versione più grande della foto
    var full = card.querySelector('.treatment-card__media').getAttribute('data-full');
    boxImg.src = full || img.currentSrc || img.src;
    boxImg.alt = img.alt;
    boxTitle.textContent = title ? title.textContent : '';
    boxText.textContent = text ? text.textContent : '';
    var single = list.length < 2;
    box.querySelector('.treatment-lightbox__prev').hidden = single;
    box.querySelector('.treatment-lightbox__next').hidden = single;
  }

  function open(card) {
    var list = openable();
    show(list.indexOf(card));
    document.body.classList.add('has-lightbox');
    box.showModal();
  }

  function close() { box.close(); }

  cards.forEach(function (card) {
    var btn = card.querySelector('.treatment-card__media');
    if (btn) {
      btn.addEventListener('click', function () {
        if (!card.classList.contains('is-missing')) { open(card); }
      });
    }
  });

  box.querySelector('.treatment-lightbox__close').addEventListener('click', close);
  box.querySelector('.treatment-lightbox__prev').addEventListener('click', function () { show(current - 1); });
  box.querySelector('.treatment-lightbox__next').addEventListener('click', function () { show(current + 1); });

  // Click sullo sfondo scuro (fuori da foto e pulsanti) chiude la finestra
  box.addEventListener('click', function (e) {
    if (e.target === box || e.target.classList.contains('treatment-lightbox__inner')) { close(); }
  });

  // Frecce da tastiera (Esc è gestito nativamente da <dialog>)
  box.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { show(current - 1); }
    if (e.key === 'ArrowRight') { show(current + 1); }
  });

  box.addEventListener('close', function () {
    document.body.classList.remove('has-lightbox');
    boxImg.removeAttribute('src');
  });
})();