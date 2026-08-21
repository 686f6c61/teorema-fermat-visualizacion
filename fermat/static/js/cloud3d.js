// Nube 3D: superficie z = (xⁿ + yⁿ)^(1/n) en alambre + puntos enteros
// (a, b, c) más cercanos, coloreados por el hueco. Motor 3D mínimo en
// canvas: proyección perspectiva, rotación por arrastre, zoom con rueda.

import { viridisCss } from './api.js';

export class Cloud3D {
  constructor(canvas, tooltip) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tip = tooltip;
    this.data = null;
    this.yaw = -0.65;
    this.pitch = 0.42;
    this.zoom = 1;
    this.autoRotate = true;

    new ResizeObserver(() => this.#resize()).observe(canvas.parentElement);
    this.#resize();

    canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      this.rot = { x: e.clientX, y: e.clientY };
      this.autoRotate = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.rot) {
        this.yaw += (e.clientX - this.rot.x) * 0.008;
        this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch + (e.clientY - this.rot.y) * 0.008));
        this.rot = { x: e.clientX, y: e.clientY };
      }
    });
    canvas.addEventListener('pointerup', () => { this.rot = null; });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.4, Math.min(4, this.zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    }, { passive: false });
    canvas.addEventListener('dblclick', () => { this.autoRotate = !this.autoRotate; });

    const tick = () => {
      if (this.autoRotate) this.yaw += 0.0035;
      this.#draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  #resize() {
    const box = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = box.width;
    this.h = box.height;
    this.canvas.width = Math.round(box.width * dpr);
    this.canvas.height = Math.round(box.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setData(data) {
    // {n, m, a, b, cInt, rel, exact} arrays planos
    this.data = data;
  }

  #project(x, y, z) {
    // normaliza al cubo [0,1]³, rota y proyecta
    const cy = Math.cos(this.yaw);
    const sy = Math.sin(this.yaw);
    const cp = Math.cos(this.pitch);
    const sp = Math.sin(this.pitch);
    const X = x - 0.5;
    const Y = y - 0.5;
    const Z = z - 0.5;
    const x1 = X * cy + Z * sy;
    const z1 = -X * sy + Z * cy;
    const y2 = Y * cp - z1 * sp;
    const z2 = Y * sp + z1 * cp;
    const depth = z2 + 2.6; // delante de la cámara
    const f = (Math.min(this.w, this.h) * 0.62 * this.zoom) / depth;
    return { x: this.w / 2 + x1 * f, y: this.h / 2 - y2 * f, depth };
  }

  #draw() {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, w, h);
    if (!this.data) return;
    const { n, m } = this.data;

    // ejes
    ctx.strokeStyle = '#2a3546';
    ctx.lineWidth = 1;
    for (const [x0, y0, z0, x1, y1, z1] of [
      [0, 0, 0, 1.08, 0, 0], [0, 0, 0, 0, 1.08, 0], [0, 0, 0, 0, 0, 1.3],
    ]) {
      const p0 = this.#project(x0, y0, z0);
      const p1 = this.#project(x1, y1, z1);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillStyle = '#8b98a9';
    const lx = this.#project(1.14, 0, 0);
    const ly = this.#project(0, 1.14, 0);
    const lz = this.#project(0, 0, 1.34);
    ctx.fillText('a', lx.x, lx.y);
    ctx.fillText('b', ly.x, ly.y);
    ctx.fillText('c', lz.x, lz.y);

    // superficie en alambre: z = ((x/m)ⁿ + (y/m)ⁿ)^(1/n)
    const lines = 14;
    ctx.strokeStyle = 'rgba(230, 180, 88, 0.22)';
    ctx.lineWidth = 0.8;
    for (let i = 1; i <= lines; i++) {
      const x = i / lines;
      ctx.beginPath();
      for (let j = 0; j <= 40; j++) {
        const y = j / 40;
        const z = (x ** n + y ** n) ** (1 / n);
        const p = this.#project(x, y, z);
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      const y = i / lines;
      ctx.beginPath();
      for (let j = 0; j <= 40; j++) {
        const x2 = j / 40;
        const z = (x2 ** n + y ** n) ** (1 / n);
        const p = this.#project(x2, y, z);
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // puntos (a, b, c) — lejanos primero
    const { a, b, cInt, rel, exact } = this.data;
    const pts = [];
    for (let k = 0; k < a.length; k++) {
      const p = this.#project(a[k] / m, b[k] / m, cInt[k] / m);
      pts.push({ ...p, k });
    }
    pts.sort((p, q) => q.depth - p.depth);
    for (const p of pts) {
      const k = p.k;
      const size = Math.max(1.2, 4.2 / p.depth);
      if (exact[k]) {
        ctx.fillStyle = '#ffd60a';
        ctx.fillRect(p.x - size, p.y - size, size * 2, size * 2);
      } else {
        const t = Math.min(1, Math.max(0, -Math.log10(Math.max(rel[k], 1e-12)) / 8));
        ctx.fillStyle = viridisCss(t, 0.85);
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }
    }

    // leyenda
    ctx.font = '11px ui-sans-serif, system-ui';
    ctx.fillStyle = '#8b98a9';
    ctx.textAlign = 'left';
    ctx.fillText('arrastra = rotar · rueda = zoom · doble clic = pausar rotación', 14, this.h - 12);
    ctx.fillStyle = '#ffd60a';
    ctx.fillText('■ soluciones exactas (solo n = 2)', 14, 22);
    ctx.fillStyle = '#dbe4ee';
    ctx.fillText(`a${supStr(n)} + b${supStr(n)} = c${supStr(n)} · rejilla ${m}×${m}`, 14, 40);
    ctx.textAlign = 'left';
  }
}

function supStr(v) {
  const map = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  return String(v).split('').map((ch) => map[ch] ?? ch).join('');
}
