// Dispersión con zoom/pan, color continuo y colorbar (ternas pitagóricas).
// Adaptado del cometa de Goldbach: ejes con ticks 1-2-5, culling por x.

import { viridisCss } from './api.js';

const PAD = { left: 66, right: 74, top: 18, bottom: 46 };

function maxOf(arr) {
  let m = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > m) m = arr[i];
  return m;
}

function niceTicks(min, max, target = 8) {
  const span = max - min;
  if (span <= 0) return [min];
  const rough = span / target;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => span / s <= target * 1.4) ?? 10 * pow;
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) ticks.push(v);
  return ticks;
}

const fmtTick = (v) =>
  v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${Math.round(v / 1e3)}k` : `${Math.round(v)}`;

function lowerBound(arr, value) {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export class ScatterChart {
  constructor(canvas, tooltip, { labelX = 'a', labelY = 'b', onPick } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tip = tooltip;
    this.labelX = labelX;
    this.labelY = labelY;
    this.onPick = onPick;
    this.data = null;
    this.view = null;
    this.home = null;

    new ResizeObserver(() => this.#resize()).observe(canvas.parentElement);
    this.#resize();

    canvas.addEventListener('wheel', (e) => this.#onWheel(e), { passive: false });
    canvas.addEventListener('pointerdown', (e) => this.#onDown(e));
    canvas.addEventListener('pointermove', (e) => this.#onMove(e));
    canvas.addEventListener('pointerup', (e) => this.#onUp(e));
    canvas.addEventListener('dblclick', () => this.reset());
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

  setData(data) {
    // data: {x, y, value} arrays; el color es value normalizado a [0, 1]
    this.data = data;
    const mx = maxOf(data.x) || 1;
    const my = maxOf(data.y) || 1;
    this.home = { x0: 0, x1: mx * 1.03, y0: 0, y1: my * 1.03 };
    this.maxValue = maxOf(data.value) || 1;
    this.reset();
  }

  reset() {
    if (this.home) this.view = { ...this.home };
    this.scheduleDraw();
  }

  get plot() {
    return { x: PAD.left, y: PAD.top, w: this.w - PAD.left - PAD.right, h: this.h - PAD.top - PAD.bottom };
  }

  #sx(v) { return PAD.left + ((v - this.view.x0) / (this.view.x1 - this.view.x0)) * this.plot.w; }
  #sy(v) { return PAD.top + (1 - (v - this.view.y0) / (this.view.y1 - this.view.y0)) * this.plot.h; }
  #dataAt(px, py) {
    return {
      x: this.view.x0 + ((px - PAD.left) / this.plot.w) * (this.view.x1 - this.view.x0),
      y: this.view.y0 + (1 - (py - PAD.top) / this.plot.h) * (this.view.y1 - this.view.y0),
    };
  }

  #onWheel(e) {
    e.preventDefault();
    if (!this.view) return;
    const rect = this.canvas.getBoundingClientRect();
    const at = this.#dataAt(e.clientX - rect.left, e.clientY - rect.top);
    const f = e.deltaY < 0 ? 1 / 1.18 : 1.18;
    for (const [k, atv] of [['x0', at.x], ['x1', at.x], ['y0', at.y], ['y1', at.y]]) {
      this.view[k] = atv + (this.view[k] - atv) * f;
    }
    this.scheduleDraw();
  }

  #onDown(e) {
    this.canvas.setPointerCapture(e.pointerId);
    this.drag = { x: e.clientX, y: e.clientY, moved: false };
  }

  #onMove(e) {
    if (this.drag && this.view) {
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;
      const sx = ((dx / this.plot.w) * (this.view.x1 - this.view.x0));
      const sy = ((dy / this.plot.h) * (this.view.y1 - this.view.y0));
      this.view.x0 -= sx; this.view.x1 -= sx;
      this.view.y0 += sy; this.view.y1 += sy;
      this.drag.x = e.clientX; this.drag.y = e.clientY;
      this.scheduleDraw();
      this.#hideTip();
      return;
    }
    this.#hover(e);
  }

  #onUp(e) {
    const wasDrag = this.drag?.moved;
    this.drag = null;
    if (!wasDrag && this.onPick && this.data) {
      const hit = this.#nearest(e);
      if (hit !== -1) this.onPick(hit);
    }
  }

  #local(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  #nearest(e) {
    if (!this.data) return -1;
    const { x, y } = this.#local(e);
    const p = this.plot;
    if (x < p.x || x > p.x + p.w || y < p.y || y > p.y + p.h) return -1;
    const dx = this.view.x1 - this.view.x0;
    const dy = this.view.y1 - this.view.y0;
    const i0 = Math.max(0, lowerBound(this.data.x, this.#dataAt(x - 10, 0).x));
    const i1 = Math.min(this.data.x.length - 1, lowerBound(this.data.x, this.#dataAt(x + 10, 0).x));
    const step = Math.max(1, Math.ceil((i1 - i0) / 3000));
    let best = -1;
    let bestDist = 14 * 14;
    for (let i = i0; i <= i1; i += step) {
      const px = this.#sx(this.data.x[i]) - x;
      const py = this.#sy(this.data.y[i]) - y;
      const d = px * px + py * py;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  #hover(e) {
    const i = this.#nearest(e);
    if (i === -1) { this.#hideTip(); return; }
    const { x, y, value } = this.data;
    this.tip.hidden = false;
    this.tip.innerHTML =
      `<div class="row"><span>a</span><b>${x[i]}</b></div>` +
      `<div class="row"><span>b</span><b>${y[i]}</b></div>` +
      `<div class="row"><span>hipotenusa c</span><b>${value[i]}</b></div>`;
    const { x: mx, y: my } = this.#local(e);
    const box = this.tip.getBoundingClientRect();
    this.tip.style.left = `${Math.min(mx + 14, this.w - box.width - 8)}px`;
    this.tip.style.top = `${Math.max(8, my - box.height - 12)}px`;
    this.scheduleDraw(i);
  }

  #hideTip() {
    if (!this.tip.hidden) { this.tip.hidden = true; this.scheduleDraw(); }
  }

  scheduleDraw(highlight = -1) {
    if (this.#pending) return;
    this.#pending = requestAnimationFrame(() => {
      this.#pending = null;
      this.#draw(highlight);
    });
  }

  #draw(highlight) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    if (!this.view || !this.data) return;
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, w, h);
    this.#drawGrid();
    this.#drawPoints(highlight);
    this.#drawColorbar();
  }

  #drawGrid() {
    const { ctx } = this;
    const p = this.plot;
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.strokeStyle = '#1a222e';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#8b98a9';
    for (const t of niceTicks(this.view.x0, this.view.x1, 9)) {
      const x = this.#sx(t);
      if (x < p.x - 1 || x > p.x + p.w + 1) continue;
      ctx.beginPath(); ctx.moveTo(x + 0.5, p.y); ctx.lineTo(x + 0.5, p.y + p.h); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillText(fmtTick(t), x, p.y + p.h + 18);
    }
    for (const t of niceTicks(this.view.y0, this.view.y1, 7)) {
      const y = this.#sy(t);
      if (y < p.y - 1 || y > p.y + p.h + 1) continue;
      ctx.beginPath(); ctx.moveTo(p.x, y + 0.5); ctx.lineTo(p.x + p.w, y + 0.5); ctx.stroke();
      ctx.textAlign = 'right'; ctx.fillText(fmtTick(t), p.x - 8, y + 4);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = '#5f6c7d';
    ctx.fillText(this.labelX, p.x, this.h - 10);
    ctx.save();
    ctx.translate(13, p.y + p.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText(this.labelY, 0, 0);
    ctx.restore();
  }

  #drawPoints(highlight) {
    const { ctx } = this;
    const { x, y, value } = this.data;
    const v = this.view;
    const i0 = Math.max(0, lowerBound(x, v.x0) - 1);
    const i1 = Math.min(x.length - 1, lowerBound(x, v.x1) + 1);
    const size = Math.max(1.6, Math.min(3.4, 240000 / Math.max(1, i1 - i0)));
    const half = size / 2;
    for (let i = i0; i <= i1; i++) {
      if (y[i] < v.y0 || y[i] > v.y1) continue;
      const t = i === highlight ? 1.25 : value[i] / this.maxValue;
      ctx.fillStyle = i === highlight ? '#ffffff' : this.colorOf(t);
      ctx.fillRect(this.#sx(x[i]) - half, this.#sy(y[i]) - half, size, size);
    }
  }

  #drawColorbar() {
    const { ctx } = this;
    const p = this.plot;
    const x = p.x + p.w + 22;
    const h = p.h;
    for (let yy = 0; yy < h; yy++) {
      ctx.fillStyle = this.colorOf(1 - yy / h);
      ctx.fillRect(x, p.y + yy, 12, 1.5);
    }
    ctx.strokeStyle = '#2a3546';
    ctx.strokeRect(x + 0.5, p.y + 0.5, 12, h);
    ctx.font = '10px ui-sans-serif, system-ui';
    ctx.fillStyle = '#8b98a9';
    ctx.textAlign = 'left';
    ctx.fillText(fmtTick(this.maxValue), x + 18, p.y + 8);
    ctx.fillText('0', x + 18, p.y + h);
    ctx.save();
    ctx.translate(x + 42, p.y + h / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(this.colorbarLabel ?? 'valor', 0, 0);
    ctx.restore();
  }

  colorOf(t) {
    return viridisCss(t);
  }

  #pending = null;
}
