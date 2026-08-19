'use strict';

/* ── Grundbausteine: Fortschritt via localStorage ── */
const STORAGE_KEY = 'gb_progress';

function getProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function setProgress(id, verstanden) {
  const p = getProgress();
  p[id] = verstanden;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

function applyProgress() {
  const p = getProgress();
  document.querySelectorAll('[data-gb]').forEach(el => {
    el.classList.toggle('verstanden', !!p[el.dataset.gb]);
    const status = el.querySelector('.gb-card-status');
    if (status) status.textContent = p[el.dataset.gb] ? '✓ Verstanden' : 'Noch offen';
    const chipStatus = el.querySelector('.chip-status-label');
    if (chipStatus) chipStatus.textContent = p[el.dataset.gb] ? '✓' : '';
  });
}

function initBausteinChips() {
  document.querySelectorAll('.baustein-chip[data-gb]').forEach(chip => {
    chip.addEventListener('click', e => {
      e.preventDefault();
      const id = chip.dataset.gb;
      const p = getProgress();
      setProgress(id, !p[id]);
      applyProgress();
    });
    chip.title = 'Klicken zum Markieren als verstanden';
  });
}

function initMarkButtons() {
  document.querySelectorAll('.mark-btn[data-gb]').forEach(btn => {
    const id = btn.dataset.gb;
    btn.addEventListener('click', () => {
      const p = getProgress();
      const next = !p[id];
      setProgress(id, next);
      applyProgress();
      btn.classList.toggle('active', next);
      btn.textContent = next ? '✓ Als verstanden markiert' : 'Als verstanden markieren';
    });
    const p = getProgress();
    if (p[id]) {
      btn.classList.add('active');
      btn.textContent = '✓ Als verstanden markiert';
    }
  });
}

/* ── Schritt-Animationen ─────────────────────────── */
function initAnimations() {
  document.querySelectorAll('.animation-container').forEach(container => {
    const frames = Array.from(container.querySelectorAll('.anim-frame'));
    const btnNext = container.querySelector('.btn-next');
    const btnPrev = container.querySelector('.btn-prev');
    const indicator = container.querySelector('.anim-indicator');
    let current = 0;

    function show(i) {
      frames.forEach((f, idx) => f.classList.toggle('active', idx === i));
      if (indicator) indicator.textContent = `${i + 1} / ${frames.length}`;
      if (btnPrev) btnPrev.disabled = i === 0;
      if (btnNext) btnNext.disabled = i === frames.length - 1;
    }

    btnNext?.addEventListener('click', () => { if (current < frames.length - 1) show(++current); });
    btnPrev?.addEventListener('click', () => { if (current > 0) show(--current); });

    show(0);
  });
}

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initBausteinChips();
  initMarkButtons();
  initAnimations();
  applyProgress();
});
