// Vista de la curva de Lamé aⁿ + bⁿ = cⁿ sobre la rejilla de enteros.
// La curva se anima al cambiar n; en cada n entero se pide el análisis
// exacto del hueco de la rejilla (/api/lame). Las soluciones exactas
// (solo n = 2) se marcan en dorado.

import { viridisCss } from './api.js';

const MARGIN = 34;

export class LameView {
  constructor(canvas, tooltip, { onStats } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tip = tooltip;
    this.onStats = onStats;
    this.n = 3;
    this.nShown = 3; // exponente animado (real)
    this.c = 50;
    this.lattice = null;

    new ResizeObserver(() => this.#resize()).observe(canvas.parentElement);
    this.#resize();

    canvas.addEventListener('pointermove', (e) => this.#hover(e));
    canvas.addEventListener('pointerleave', () => { this.tip.hidden = true; this.scheduleDraw(); });
  }

  #resize() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = box.width;
    this.h = box.height;
    this.canvas.width = Math.round(box.width * dpr);
    this.canvas.height = Math.round(box.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scheduleDraw();
  }

  setLattice(data) {
    // {a: Int32Array, frac, rel: Float32Array, exact: [a...], n, c}
    this.lattice = data;
    this.scheduleDraw();
  }

  animateTo(n) {
    this.n = n;
    const from = this.nShown;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 350);
      const ease = t * (2 - t); // ease-out
      this.nShown = from + (n - from) * ease;
      this.scheduleDraw();
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  get #plot() {
    const size = Math.min(this.w, this.h) - 2 * MARGIN;
    return { x: (this.w - size) / 2, y: (this.h - size) / 2, size };
  }

  #sx(a) { const p = this.#plot; return p.x + (a / this.c) * p.size; }
  #sy(b) { const p = this.#plot; return p.y + p.size - (b / this.c) * p.size; }

  scheduleDraw() {
    if (this.#pending) return;
    this.#pending = requestAnimationFrame(() => {
      this.#pending = null;
      this.#draw();
    });
  }

  #draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, w, h);
    const p = this.#plot;
    ctx.strokeStyle = '#2a3546';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x - 0.5, p.y - 0.5, p.size + 1, p.size + 1);

    this.#drawGrid(p);
    this.#drawLattice(p);
    this.#drawCurve(p);
    this.#drawLegend(p);
  }

  #drawGrid(p) {
    const { ctx } = this;
    ctx.strokeStyle = '#161d27';
    ctx.lineWidth = 1;
    const step = this.#gridStep();
    for (let v = 0; v <= this.c; v += step) {
      const x = this.#sx(v);
      const y = this.#sy(v);
      ctx.beginPath(); ctx.moveTo(x, p.y); ctx.lineTo(x, p.y + p.size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x, y); ctx.lineTo(p.x + p.size, y); ctx.stroke();
    }
  }

  #gridStep() {
    const target = Math.min(this.c, 20);
    const raw = this.c / target;
    const pow = 10 ** Math.floor(Math.log10(raw));
    return [1, 2, 5, 10].map((m) => m * pow).find((s) => this.c / s <= target * 1.4) ?? pow * 10;
  }

  #drawLattice(p) {
    if (!this.lattice) return;
    const { ctx } = this;
    const { a, rel } = this.lattice;
    const n = this.lattice.n;
    if (n !== this.n) return; // análisis válido solo en n entero actual
    const exactSet = new Set(this.lattice.exact);
    let minRel = Infinity;
    let minIdx = -1;
    for (let i = 0; i < rel.length; i++) {
      if (rel[i] < minRel && !exactSet.has(a[i])) { minRel = rel[i]; minIdx = i; }
    }
    for (let i = 0; i < rel.length; i++) {
      const ai = a[i];
      const bi = Math.round((this.c ** n - ai ** n) ** (1 / n));
      if (bi < 1 || bi > this.c) continue;
      const x = this.#sx(ai);
      const y = this.#sy(bi);
      if (exactSet.has(ai)) {
        ctx.fillStyle = '#ffd60a';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,214,10,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        const logRel = Math.log10(rel[i]);
        // error 10⁻⁸ o menor → t = 1 (brillante); 10⁰ → t = 0
        const t = Math.min(1, Math.max(0, -logRel / 8));
        ctx.fillStyle = viridisCss(Math.pow(t, 0.7), 0.95);
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }
    if (minIdx >= 0) {
      const ai = a[minIdx];
      const bi = Math.round((this.c ** n - ai ** n) ** (1 / n));
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(this.#sx(ai), this.#sy(bi), 5.5, 0, 2 * Math.PI);
      ctx.stroke();
      this.minInfo = { a: ai, b: bi, rel: rel[minIdx] };
    }
  }

  #drawCurve(p) {
    const { ctx } = this;
    const n = this.nShown;
    ctx.strokeStyle = '#e6b458';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    const steps = 400;
    for (let k = 0; k <= steps; k++) {
      const x = (k / steps) * this.c;
      const y = (this.c ** n - x ** n) ** (1 / n);
      if (!Number.isFinite(y)) continue;
      const px = this.#sx(x);
      const py = this.#sy(y);
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // etiqueta de la ecuación
    ctx.font = '13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#dbe4ee';
    ctx.fillText(`a${sup(n)} + b${sup(n)} = c${sup(n)}   (c = ${this.c.toLocaleString('es-ES')})`, p.x + 8, p.y - 12);
  }

  #drawLegend(p) {
    const { ctx } = this;
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.fillStyle = '#8b98a9';
    ctx.textAlign = 'left';
    ctx.fillText('puntos: (a, b) enteros más cercanos a la curva · dorado: solución exacta', p.x, p.y + p.size + 20);
    ctx.textAlign = 'right';
    if (this.lattice && this.minInfo) {
      const { a, b, rel } = this.minInfo;
      ctx.fillText(`mejor hueco: ${a}${sup(this.n)}+${b}${sup(this.n)} ≈ c${sup(this.n)} (error ${rel === 0 ? '0' : rel.toExponential(1)})`, p.x + p.size, p.y + p.size + 20);
    }
    ctx.textAlign = 'left';
  }

  #hover(e) {
    if (!this.lattice) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const a = Math.round(((mx - this.#plot.x) / this.#plot.size) * this.c);
    const b = Math.round((1 - (my - this.#plot.y) / this.#plot.size) * this.c);
    if (a < 1 || b < 1) { this.tip.hidden = true; return; }
    const n = this.n;
    const s = a ** n + b ** n;
    const cExact = s ** (1 / n);
    const c = Math.max(1, Math.round(cExact));
    const rel = Math.abs(s - c ** n) / c ** n;
    this.tip.hidden = false;
    this.tip.innerHTML =
      `<div class="row"><span>a, b</span><b>${a}, ${b}</b></div>` +
      `<div class="row"><span>a${sup(n)} + b${sup(n)}</span><b>${s.toLocaleString('es-ES')}</b></div>` +
      `<div class="row"><span>c exacto sería</span><b>${cExact.toFixed(4)}</b></div>` +
      `<div class="row"><span>error con c = ${c}</span><b>${rel === 0 ? '0 — ¡solución!' : rel.toExponential(2)}</b></div>`;
    const box = this.tip.getBoundingClientRect();
    this.tip.style.left = `${Math.min(mx + 14, this.w - box.width - 8)}px`;
    this.tip.style.top = `${Math.max(8, my - box.height - 12)}px`;
  }

  #pending = null;
}

function sup(v) {
  const map = { '-': '⁻', '.': '·', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return String(v).split('').map((ch) => map[ch] ?? ch).join('');
}
