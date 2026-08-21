// Mapa de calor del error relativo |aⁿ+bⁿ−cⁿ|/cⁿ sobre la rejilla (a, b).
// Los datos llegan como log₁₀ del error (float32) y se pintan a ImageData;
// zoom/pan con transform sobre el bitmap (vecino más cercano).

import { viridis } from './api.js';

const PAD = { left: 66, right: 74, top: 18, bottom: 46 };

export class HeatmapChart {
  constructor(canvas, tooltip) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tip = tooltip;
    this.data = null; // {n, amax, logMap: Float32Array}
    this.view = { x0: 0, x1: 1, y0: 0, y1: 1 }; // en coordenadas de celda

    new ResizeObserver(() => this.#resize()).observe(canvas.parentElement);
    this.#resize();

    canvas.addEventListener('wheel', (e) => this.#onWheel(e), { passive: false });
    canvas.addEventListener('pointerdown', (e) => this.#onDown(e));
    canvas.addEventListener('pointermove', (e) => this.#onMove(e));
    canvas.addEventListener('dblclick', () => {
      this.view = { x0: 0, x1: 1, y0: 0, y1: 1 };
      this.scheduleDraw();
    });
    canvas.addEventListener('pointerleave', () => this.#hideTip());
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

  setData(n, amax, logMap) {
    this.data = { n, amax, logMap };
    this.view = { x0: 0, x1: amax, y0: 0, y1: amax };
    this.#buildBitmap();
    this.scheduleDraw();
  }

  #buildBitmap() {
    const { logMap, amax } = this.data;
    const img = new ImageData(amax, amax);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < logMap.length; i++) {
      if (logMap[i] < lo) lo = logMap[i];
      if (logMap[i] > hi) hi = logMap[i];
    }
    this.scale = { lo, hi };
    // logMap llega como [a, b] (fila = a); el bitmap se escribe transpuesto
    // y con b invertida para que ambos ejes crezcan hacia arriba/derecha.
    for (let i = 0; i < amax; i++) {
      for (let j = 0; j < amax; j++) {
        const t = 1 - (logMap[i * amax + j] - lo) / (hi - lo || 1);
        const [r, g, b] = viridis(t);
        const px = (amax - 1 - j) * amax + i;
        img.data[px * 4] = r;
        img.data[px * 4 + 1] = g;
        img.data[px * 4 + 2] = b;
        img.data[px * 4 + 3] = 255;
      }
    }
    this.off = document.createElement('canvas');
    this.off.width = amax;
    this.off.height = amax;
    this.off.getContext('2d').putImageData(img, 0, 0);
  }

  get plot() {
    return { x: PAD.left, y: PAD.top, w: this.w - PAD.left - PAD.right, h: this.h - PAD.top - PAD.bottom };
  }

  #onWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    const py = e.clientY - rect.top - PAD.top;
    const at = this.#cellAt(px, py);
    const f = e.deltaY < 0 ? 1 / 1.25 : 1.25;
    const v = this.view;
    v.x0 = at.x + (v.x0 - at.x) * f;
    v.x1 = at.x + (v.x1 - at.x) * f;
    v.y0 = at.y + (v.y0 - at.y) * f;
    v.y1 = at.y + (v.y1 - at.y) * f;
    this.scheduleDraw();
  }

  #onDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    this.drag = { x: e.clientX, y: e.clientY };
  }

  #onMove(e) {
    if (this.drag) {
      const v = this.view;
      const p = this.plot;
      const dxCells = ((e.clientX - this.drag.x) / p.w) * (v.x1 - v.x0);
      const dyCells = ((e.clientY - this.drag.y) / p.h) * (v.y1 - v.y0);
      v.x0 -= dxCells; v.x1 -= dxCells;
      v.y0 += dyCells; v.y1 += dyCells;
      this.drag = { x: e.clientX, y: e.clientY };
      this.scheduleDraw();
      this.#hideTip();
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const at = this.#cellAt(e.clientX - rect.left - PAD.left, e.clientY - rect.top - PAD.top);
    if (!at) { this.#hideTip(); return; }
    const { n, amax, logMap } = this.data;
    const a = Math.min(amax, Math.max(1, Math.round(at.x + 0.5)));
    const b = Math.min(amax, Math.max(1, Math.round(at.y + 0.5)));
    const s = a ** n + b ** n;
    const c = Math.max(1, Math.round(s ** (1 / n)));
    const rel = Math.abs(s - c ** n) / c ** n;
    this.tip.hidden = false;
    this.tip.innerHTML =
      `<div class="row"><span>a, b</span><b>${a}, ${b}</b></div>` +
      `<div class="row"><span>c más cercano</span><b>${c}</b></div>` +
      `<div class="row"><span>error relativo</span><b>${rel === 0 ? '0 — ¡exacta!' : rel.toExponential(2)}</b></div>`;
    const box = this.tip.getBoundingClientRect();
    this.tip.style.left = `${Math.min(e.clientX - rect.left + 14, this.w - box.width - 8)}px`;
    this.tip.style.top = `${Math.max(8, e.clientY - rect.top - box.height - 12)}px`;
  }

  #cellAt(px, py) {
    const p = this.plot;
    if (px < 0 || px > p.w || py < 0 || py > p.h) return null;
    const v = this.view;
    return {
      x: v.x0 + (px / p.w) * (v.x1 - v.x0),
      y: v.y0 + (1 - py / p.h) * (v.y1 - v.y0),
    };
  }

  #hideTip() {
    if (!this.tip.hidden) { this.tip.hidden = true; }
  }

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
    if (!this.off) return;
    const p = this.plot;
    const v = this.view;
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    ctx.imageSmoothingEnabled = false;
    const spanX = v.x1 - v.x0;
    const drawW = spanX <= 0 ? p.w : p.w * (this.data.amax / spanX);
    const sx = p.x - (v.x0 / spanX) * p.w;
    const bottom = p.y + p.h + (v.y0 / (v.y1 - v.y0)) * p.h;
    ctx.drawImage(this.off, sx, bottom - drawW, drawW, drawW);
    ctx.restore();
    this.#drawAxes();
  }

  #drawAxes() {
    const { ctx } = this;
    const p = this.plot;
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.fillStyle = '#8b98a9';
    ctx.strokeStyle = '#2a3546';
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w, p.h);
    const v = this.view;
    const span = v.x1 - v.x0;
    for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
      const val = v.x0 + frac * span;
      const x = p.x + frac * p.w;
      const y = p.y + p.h - frac * p.h;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(val)}`, x, p.y + p.h + 18);
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(val)}`, p.x - 8, y + 4);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5f6c7d';
    ctx.fillText('a', p.x, this.h - 10);
    ctx.save();
    ctx.translate(13, p.y + p.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText('b', 0, 0);
    ctx.restore();
    // colorbar
    const cxx = p.x + p.w + 22;
    for (let yy = 0; yy < p.h; yy++) {
      ctx.fillStyle = `rgb(${viridis(1 - yy / p.h).join(',')})`;
      ctx.fillRect(cxx, p.y + yy, 12, 1.5);
    }
    ctx.strokeStyle = '#2a3546';
    ctx.strokeRect(cxx + 0.5, p.y + 0.5, 12, p.h);
    ctx.fillStyle = '#8b98a9';
    const { lo, hi } = this.scale;
    ctx.fillText(`10${sup(hi)}`, cxx + 18, p.y + 8);
    ctx.fillText(`10${sup(lo)}`, cxx + 18, p.y + p.h);
    ctx.save();
    ctx.translate(cxx + 46, p.y + p.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('error relativo', 0, 0);
    ctx.restore();
  }

  #pending = null;
}

function sup(v) {
  const rounded = Math.round(v * 10) / 10;
  const map = { '-': '⁻', '.': '·', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return String(rounded).split('').map((ch) => map[ch] ?? ch).join('');
}
