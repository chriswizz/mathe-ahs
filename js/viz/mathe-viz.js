'use strict';

/**
 * MatheViz — dünne Visualisierungs-Helper für Mathe AHS.
 * Torten/Brüche: eigenes SVG (Look an CSS-Variablen).
 * Interaktiv Geo/Graphen später: JSXGraph unter vendor/jsxgraph/.
 */
(function (global) {
  const NS = 'http://www.w3.org/2000/svg';
  let uid = 0;

  function el(sel) {
    if (typeof sel === 'string') return document.querySelector(sel);
    return sel;
  }

  function svgEl(name, attrs) {
    const node = document.createElementNS(NS, name);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v != null && v !== false) node.setAttribute(k, String(v));
      }
    }
    return node;
  }

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function polar(cx, cy, r, degFromTop) {
    const rad = ((degFromTop - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  function slicePath(cx, cy, r, i, den) {
    const a0 = (i * 360) / den;
    const a1 = ((i + 1) * 360) / den;
    const large = 360 / den > 180 ? 1 : 0;
    const [x0, y0] = polar(cx, cy, r, a0);
    const [x1, y1] = polar(cx, cy, r, a1);
    return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
  }

  /**
   * Bruch-Torte als SVG.
   * @param {string|Element} target
   * @param {{ num: number, den: number, size?: number }} opts
   */
  function fractionPie(target, opts) {
    const { num, den, size = 120 } = opts;
    if (!den || den < 1) throw new Error('MatheViz.fractionPie: den >= 1');
    const filled = Math.max(0, Math.min(num, den));
    const root = el(target);
    if (!root) return null;

    const fill = cssVar('--baustein-light', '#cffafe');
    const strokeFill = cssVar('--baustein', '#0e7490');
    const strokeGrid = cssVar('--border-strong', '#cbd5e1');

    const svg = svgEl('svg', {
      class: 'bruch-torte',
      viewBox: '0 0 100 100',
      width: size,
      height: size,
      'aria-hidden': 'true',
    });
    svg.appendChild(
      svgEl('circle', {
        cx: 50,
        cy: 50,
        r: 46,
        fill: '#fff',
        stroke: strokeGrid,
        'stroke-width': 2,
      })
    );

    for (let i = 0; i < den; i++) {
      const path = svgEl('path', {
        d: slicePath(50, 50, 46, i, den),
        fill: i < filled ? fill : 'transparent',
        stroke: i < filled ? strokeFill : strokeGrid,
        'stroke-width': 1.5,
        'vector-effect': 'non-scaling-stroke',
      });
      svg.appendChild(path);
    }

    root.replaceChildren(svg);
    return svg;
  }

  /**
   * Zwei Torten; Bögen mittig auf Tortenhöhe.
   * Oben: kürzen (→), unten: erweitern (←).
   * Typisch: links ungekürzt, rechts gekürzt (Leserichtung = zuerst kürzen).
   */
  function fractionDual(target, opts) {
    const root = el(target);
    if (!root) return null;
    const [ln, ld] = opts.left;
    const [rn, rd] = opts.right;
    const id = `mv${++uid}`;

    const accent = cssVar('--baustein', '#0e7490');

    root.classList.add('bruch-dual');
    root.replaceChildren();

    function setLabel(node, n, d, custom) {
      if (custom) {
        node.textContent = custom;
        return;
      }
      if (opts.katex && global.katex) {
        global.katex.render(`\\dfrac{${n}}{${d}}`, node, { throwOnError: false });
      } else {
        node.textContent = `${n}/${d}`;
      }
    }

    const leftPie = document.createElement('div');
    leftPie.className = 'bruch-dual-pie';
    fractionPie(leftPie, { num: ln, den: ld, size: 120 });
    const leftLab = document.createElement('div');
    leftLab.className = 'bruch-dual-label';
    setLabel(leftLab, ln, ld, opts.leftTex);

    const rightPie = document.createElement('div');
    rightPie.className = 'bruch-dual-pie';
    fractionPie(rightPie, { num: rn, den: rd, size: 120 });
    const rightLab = document.createElement('div');
    rightLab.className = 'bruch-dual-label';
    setLabel(rightLab, rn, rd, opts.rightTex);

    const mid = document.createElement('div');
    mid.className = 'bruch-dual-mid';
    mid.setAttribute('aria-hidden', 'true');

    const midSvg = svgEl('svg', {
      class: 'bruch-dual-arcs',
      viewBox: '0 0 150 120',
      width: 150,
      height: 120,
    });
    const defs = svgEl('defs');
    function marker(suf, color) {
      const m = svgEl('marker', {
        id: `${id}-${suf}`,
        markerWidth: 7,
        markerHeight: 7,
        refX: 6,
        refY: 3.5,
        orient: 'auto',
      });
      m.appendChild(svgEl('path', { d: 'M0,0 L7,3.5 L0,7 Z', fill: color }));
      defs.appendChild(m);
    }
    marker('kur', accent);
    marker('ext', accent);
    midSvg.appendChild(defs);

    const tKur = svgEl('text', {
      x: 75,
      y: 16,
      'text-anchor': 'middle',
      fill: accent,
      'font-size': 12,
      'font-weight': 700,
    });
    tKur.textContent = 'kürzen';
    midSvg.appendChild(tKur);
    midSvg.appendChild(
      svgEl('path', {
        d: 'M18 42 C55 18, 95 18, 132 42',
        fill: 'none',
        stroke: accent,
        'stroke-width': 2.25,
        'stroke-linecap': 'round',
        'marker-end': `url(#${id}-kur)`,
      })
    );

    midSvg.appendChild(
      svgEl('path', {
        d: 'M132 78 C95 102, 55 102, 18 78',
        fill: 'none',
        stroke: accent,
        'stroke-width': 2.25,
        'stroke-linecap': 'round',
        'marker-end': `url(#${id}-ext)`,
      })
    );
    const tExt = svgEl('text', {
      x: 75,
      y: 114,
      'text-anchor': 'middle',
      fill: accent,
      'font-size': 12,
      'font-weight': 700,
    });
    tExt.textContent = 'erweitern';
    midSvg.appendChild(tExt);

    mid.appendChild(midSvg);

    const spacer = document.createElement('div');
    spacer.className = 'bruch-dual-spacer';
    root.append(leftPie, mid, rightPie, leftLab, spacer, rightLab);
    return root;
  }

  function board(target, boardOpts) {
    if (!global.JXG || !global.JXG.JSXGraph) {
      console.warn('MatheViz.board: JSXGraph nicht geladen (vendor/jsxgraph/jsxgraphcore.js)');
      return null;
    }
    const node = el(target);
    if (!node) return null;
    if (!node.id) node.id = `jxg-${++uid}`;
    return global.JXG.JSXGraph.initBoard(node.id, {
      boundingbox: [-5, 5, 5, -5],
      axis: false,
      showCopyright: false,
      showNavigation: false,
      pan: { enabled: false },
      zoom: { enabled: false },
      ...boardOpts,
    });
  }

  global.MatheViz = {
    fractionPie,
    fractionDual,
    board,
    version: '0.1.1',
  };
})(typeof window !== 'undefined' ? window : globalThis);
