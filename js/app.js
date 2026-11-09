'use strict';

document.addEventListener('DOMContentLoaded', equalizeGrundideeZeilen);

/* Pro Grundidee-Kasten: alle Zeilen so hoch wie die höchste Zeile in diesem Kasten. */
function equalizeGrundideeZeilen() {
  document.querySelectorAll('.grundidee-zeilen').forEach(ul => {
    const lis = [...ul.querySelectorAll(':scope > li')];
    if (!lis.length) return;
    lis.forEach(li => { li.style.minHeight = ''; });
    const max = Math.max(...lis.map(li => li.getBoundingClientRect().height));
    if (!max) return;
    const px = Math.ceil(max) + 'px';
    lis.forEach(li => { li.style.minHeight = px; });
  });
}

window.addEventListener('resize', equalizeGrundideeZeilen);

/* ── Formel-Umbruch ──────────────────────────────────
 * KaTeX bricht Inline-Formeln nach jedem +, −, ·, = um, auch mitten in einer Klammer.
 * Hier werden die Teile (.base) jeder Formel zu Gliedern (.katex-glied, nowrap) gebündelt;
 * ein Glied endet nur nach einem Relationszeichen (=, ⇔, →, ≥ …) außerhalb von Klammern.
 * Umbruch also nur dort; ist ein Glied breiter als die Zeile, zusätzlich nach + / − (Notfall).
 * Läuft für jede gerenderte Formel (auch später, z. B. im Quiz). Ohne app.js (Quad) bleibt
 * KaTeX unverändert.
 */

/* Teile (.base, Kinder von html) zu Gliedern bündeln. Ein Glied endet nach einem Teil, dessen
 * letztes Zeichen ein Umbruchzeichen ist (ende), auf Klammertiefe 0 — nicht aber, wenn davor
 * im Glied nichts steht (eine Zeile „= …“ bricht nicht hinter dem ersten =). */
function katexBuendeln(html, teile, ende) {
  let glied = null, tiefe = 0, inhalt = false;
  const glieder = [];
  for (const t of teile) {
    if (!glied) {
      glied = document.createElement('span');
      glied.className = 'katex-glied';
      html.insertBefore(glied, t);
      glieder.push(glied);
      inhalt = false;
    }
    glied.appendChild(t);
    let letztes = null, vorher = inhalt;
    for (const k of t.children) {
      if (k.classList.contains('mopen')) tiefe++;
      else if (k.classList.contains('mclose')) tiefe--;
      if (k.classList.contains('mspace') || k.classList.contains('strut')) continue;
      if (letztes) vorher = true;
      letztes = k;
    }
    inhalt = vorher || !!letztes;
    if (tiefe <= 0 && vorher && letztes && ende(letztes)) glied = null;
  }
  return glieder;
}

// „:“ setzt KaTeX als Relation, hier ist es aber geteilt — dort nicht umbrechen
const istRelation = k => k.classList.contains('mrel') && k.textContent.trim() !== ':';
const istPlusMinus = k => istRelation(k) ||
  (k.classList.contains('mbin') && ['+', '−', '-', '±', '∓'].includes(k.textContent.trim()));

function katexGlieder(html) {
  if (html.hasAttribute('data-glieder')) return;
  html.setAttribute('data-glieder', '');
  if (html.closest('.katex-display')) return;
  const teile = [...html.children];
  if (teile.length < 2 || teile.some(t => !t.classList.contains('base'))) return;
  katexBuendeln(html, teile, istRelation);
  breitePruefen(html);
}

/* Notfall: Passt ein Glied nicht in die Zeile (kein = zum Umbrechen), darf es zusätzlich
 * nach + und − (außerhalb von Klammern) umbrechen — lieber dort als überlaufen. */
function katexNotfall(html, breite) {
  for (const g of [...html.querySelectorAll(':scope > .katex-glied')]) {
    if (g.hasAttribute('data-notfall') || g.getBoundingClientRect().width <= breite + 0.5) continue;
    const teile = [...g.children];
    teile.forEach(t => html.insertBefore(t, g));
    g.remove();
    katexBuendeln(html, teile, istPlusMinus).forEach(n => n.setAttribute('data-notfall', ''));
  }
}

function blockVorfahr(el) {
  let p = el.parentElement;
  while (p && getComputedStyle(p).display.startsWith('inline') && p.parentElement) p = p.parentElement;
  return p;
}

const katexZeilen = new WeakMap();   // Block → Formeln darin

function blockPruefen(block) {
  const cs = getComputedStyle(block);
  const breite = block.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  if (breite <= 0) return;   // verborgen: der ResizeObserver meldet sich beim Aufdecken
  (katexZeilen.get(block) || []).forEach(html => { if (html.isConnected) katexNotfall(html, breite); });
}

// Breite ändert sich (Drehen, Fenster, Aufdecken einer Sektion) → neu prüfen
const katexBeobachter = new ResizeObserver(eintraege => eintraege.forEach(e => blockPruefen(e.target)));

function breitePruefen(html) {
  const block = blockVorfahr(html.closest('.katex') || html);
  if (!block) return;
  if (!katexZeilen.has(block)) { katexZeilen.set(block, []); katexBeobachter.observe(block); }
  const liste = katexZeilen.get(block).filter(h => h.isConnected);
  liste.push(html);
  katexZeilen.set(block, liste);
  setTimeout(() => blockPruefen(block), 0);   // neue Formel in schon beobachtetem Block (Quiz)
}

function katexGliederIn(knoten) {
  if (knoten.nodeType !== 1) return;
  if (knoten.classList.contains('katex-html')) katexGlieder(knoten);
  else knoten.querySelectorAll('.katex-html').forEach(katexGlieder);
}

new MutationObserver(liste => {
  for (const m of liste) m.addedNodes.forEach(katexGliederIn);
}).observe(document.documentElement, { childList: true, subtree: true });
katexGliederIn(document.documentElement);
