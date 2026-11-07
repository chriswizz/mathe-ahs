'use strict';

/* ── Quiz für Grundbausteine (eine Vorlage für alle Baustein-Seiten) ──
 *
 * Die Seite enthält in der Quiz-Sektion nur
 *   <section class="section" id="sec-quiz"><h2>Quiz</h2>
 *     <script type="application/json" id="quiz-daten">[ …Fragen… ]</script>
 *   </section>
 * Dieses Script baut daraus Frage, Formel-Kasten, Antwort-Knöpfe, Rückmeldung
 * und Fußzeile (Klassen .quiz-* wie im Quad-Quiz).
 *
 * Fragen (eine pro Zeile im JSON; Felder und Prüfarten:
 * scripts/check_lernseite_rechnungen.py, Abschnitt Quiz):
 *   art       "rf" Stimmt/Stimmt nicht · "sc" Single Choice · "mc" Multiple Choice
 *   frage     Text, Formeln in $…$
 *   aussage   (rf) TeX ohne $
 *   ausgang   (sc/mc, optional) TeX ohne $; steht im Formel-Kasten
 *   soll      (optional, wird nicht angezeigt) TeX ohne $: verdeckter Sollwert für den
 *             Rechen-Check, z. B. bei Textaufgaben, deren Ansatz die Aufgabe ist.
 *             sc/mc: Optionen werden wie gegen ausgang geprüft; ohne ausgang kein Kasten.
 *             rf mit "pruefung": "soll": Aussage links = rechts stimmt ⇔ die Rechnung
 *             stimmt und rechts wertgleich soll.
 *   optionen  (sc/mc) TeX ohne $
 *   richtig   (rf) true/false · (sc/mc) Liste der richtigen Indizes in optionen
 *   warum     ein Satz, Formeln in $…$; erscheint bei falscher Antwort
 *   bedingung (optional) Liste TeX, z. B. ["x \\neq 0"]; steht als eigenes Element
 *             (.formula-bedingung, klein und grau) neben der Formel, schmal darunter —
 *             wie in Allgemein
 *
 * Ziehung: 10 Fragen, jedes Format aus dem Pool mindestens einmal, Reihenfolge gemischt.
 * Nach der Antwort (rf, sc, mc gleich): gewählt+richtig grün gefüllt (.richtig),
 * gewählt+falsch rot (.falsch), nicht gewählt+richtig grün umrandet (.verpasst),
 * sonst neutral.
 *
 * Kein gespeicherter Fortschritt.
 */
(function () {
  const ANZAHL_MAX = 10;
  const PAUSE = 700;
  const DELIM = [{ left: '$', right: '$', display: false }];

  function mischen(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function neu(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    parent.appendChild(e);
    return e;
  }

  function formel(el, tex) {
    katex.render(tex, el, { throwOnError: false });
  }

  function satz(el, text) {
    el.textContent = text;
    renderMathInElement(el, { delimiters: DELIM, throwOnError: false });
  }

  function init() {
    const daten = document.getElementById('quiz-daten');
    if (!daten) return;
    const pool = JSON.parse(daten.textContent);
    const sec = daten.parentNode;
    const ANZAHL = Math.min(ANZAHL_MAX, pool.length);

    const frageEl   = neu('p', 'quiz-frage', sec);
    const box       = neu('div', 'formel-box quiz-formel', sec);
    const aufgabe   = neu('div', 'quiz-aufgabe', box);
    const antworten = neu('div', 'quiz-antworten', sec);
    const feedback  = neu('div', 'quiz-feedback', sec);
    const endscore  = neu('div', 'quiz-endscore', sec);
    const footer    = neu('div', 'quiz-footer', sec);
    const progress  = neu('span', 'quiz-progress', footer);
    const streakEl  = neu('span', 'quiz-streak', footer);
    const nextBtn   = neu('button', 'quiz-next-btn', footer);

    let auswahl = [], idx = 0, score = 0, streak = 0, bestStreak = 0;
    let richtigSet = new Set();
    let gewaehlt = new Set();
    let modus = 'frage';   // 'frage' | 'pruefen' (mc mit Auswahl) | 'weiter' | 'ende'

    function updateProgress() {
      progress.textContent = `Aufgabe ${idx + 1} / ${ANZAHL} · ${score} richtig`;
      streakEl.textContent = streak > 0 ? `${streak} in Folge richtig` : '';
    }

    // je Format eine Frage, Rest zufällig aus dem übrigen Pool, dann mischen
    function ziehen() {
      const alle = mischen(pool.map((f, i) => i));
      const arten = mischen([...new Set(pool.map(f => f.art))]);
      const fest = arten.map(a => alle.find(i => pool[i].art === a)).slice(0, ANZAHL);
      const rest = alle.filter(i => !fest.includes(i)).slice(0, ANZAHL - fest.length);
      return mischen(fest.concat(rest));
    }

    function starten() {
      auswahl = ziehen();
      idx = 0; score = 0; streak = 0; bestStreak = 0;
      endscore.style.display = 'none';
      endscore.textContent = '';
      zeigen();
    }

    function knopf(i, inhalt, istFormel) {
      const b = neu('button', 'quiz-btn' + (istFormel ? ' quiz-btn-formel' : ''), antworten);
      b.dataset.i = String(i);
      if (istFormel) formel(b, inhalt); else b.textContent = inhalt;
      b.addEventListener('click', () => klick(b));
      return b;
    }

    function zeigen() {
      const nr = auswahl[idx];
      const f = pool[nr];
      sec.dataset.quizNr = String(nr);
      modus = 'frage';
      gewaehlt = new Set();

      satz(frageEl, f.frage + (f.art === 'mc' ? ' (mehrere richtig)' : ''));

      const tex = f.art === 'rf' ? f.aussage : f.ausgang;
      const mitBed = !!(tex && f.bedingung && f.bedingung.length);
      aufgabe.classList.toggle('mit-bedingung', mitBed);
      if (tex) {
        formel(aufgabe, tex);
        if (mitBed) formel(neu('span', 'formula-bedingung', aufgabe), '(' + f.bedingung.join(',\\ ') + ')');
        box.hidden = false;
      }
      else { aufgabe.textContent = ''; box.hidden = true; }

      antworten.textContent = '';
      if (f.art === 'rf') {
        knopf(0, 'Stimmt', false);
        knopf(1, 'Stimmt nicht', false);
        richtigSet = new Set([f.richtig ? 0 : 1]);
      } else {
        mischen(f.optionen.map((o, i) => i)).forEach(i => knopf(i, f.optionen[i], true));
        richtigSet = new Set(f.richtig);
      }

      feedback.className = 'quiz-feedback';
      feedback.style.display = 'none';
      nextBtn.style.display = 'none';
      updateProgress();
    }

    function klick(b) {
      if (modus !== 'frage' && modus !== 'pruefen') return;
      const i = Number(b.dataset.i);
      if (pool[auswahl[idx]].art !== 'mc') { auswerten(new Set([i])); return; }
      if (gewaehlt.has(i)) gewaehlt.delete(i); else gewaehlt.add(i);
      b.classList.toggle('gewaehlt', gewaehlt.has(i));
      if (gewaehlt.size) {
        modus = 'pruefen';
        nextBtn.textContent = 'Prüfen';
        nextBtn.style.display = 'inline-flex';
      } else {
        modus = 'frage';
        nextBtn.style.display = 'none';
      }
    }

    function auswerten(wahl) {
      const f = pool[auswahl[idx]];
      const richtig = wahl.size === richtigSet.size && [...wahl].every(i => richtigSet.has(i));
      if (richtig) { score++; streak++; if (streak > bestStreak) bestStreak = streak; }
      else { streak = 0; }

      antworten.querySelectorAll('.quiz-btn').forEach(b => {
        const i = Number(b.dataset.i);
        b.disabled = true;
        b.classList.remove('gewaehlt');
        if (richtigSet.has(i)) b.classList.add(wahl.has(i) ? 'richtig' : 'verpasst');
        else if (wahl.has(i))  b.classList.add('falsch');
      });

      if (richtig) feedback.textContent = '✓ Richtig';
      else satz(feedback, '✗ ' + f.warum);
      feedback.className = 'quiz-feedback ' + (richtig ? 'richtig' : 'falsch');
      feedback.style.display = '';
      nextBtn.style.display = 'none';

      const istLetzte = idx === ANZAHL - 1;
      if (richtig && !istLetzte) {
        modus = 'weiter';
        updateProgress();
        setTimeout(() => { idx++; zeigen(); }, PAUSE);
        return;
      }
      if (istLetzte) {
        modus = 'ende';
        endscore.textContent = `${score} von ${ANZAHL} richtig` +
          (bestStreak > 1 ? ` · beste Serie: ${bestStreak}` : '');
        endscore.style.display = 'block';
        progress.textContent = `${score} von ${ANZAHL} richtig`;
        streakEl.textContent = bestStreak > 1 ? `beste Serie: ${bestStreak}` : '';
        nextBtn.textContent = 'Weiter üben';
        if (richtig) setTimeout(() => { nextBtn.style.display = 'inline-flex'; }, PAUSE);
        else nextBtn.style.display = 'inline-flex';
        return;
      }
      modus = 'weiter';
      updateProgress();
      nextBtn.textContent = 'Nächste →';
      nextBtn.style.display = 'inline-flex';
    }

    nextBtn.addEventListener('click', () => {
      if (modus === 'pruefen') { auswerten(new Set(gewaehlt)); return; }
      if (modus === 'ende') { starten(); return; }
      if (modus === 'weiter') { idx++; zeigen(); }
    });

    starten();
  }

  init();
})();
