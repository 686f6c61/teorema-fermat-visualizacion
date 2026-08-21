// Curiosidades: las casi-soluciones famosas de Los Simpson y de Ramanujan,
// con la comparación dígito a dígito de las potencias exactas.

import { formatSci } from './api.js';

function digitsHTML(number, matching) {
  // resalta en qué dígito divergen las dos potencias
  return number
    .split('')
    .map((d, i) =>
      i === matching
        ? `<span class="diff">${d}</span>`
        : i < matching
          ? `<span class="match">${d}</span>`
          : `<span>${d}</span>`,
    )
    .join('');
}

export function renderCuriosities(items, { onExplore } = {}) {
  const container = document.getElementById('curiosities-grid');
  container.innerHTML = items
    .map((e, idx) => {
      const isSimpsons = e.note.includes('Simpson');
      const shortLeft = e.left.length > 16;
      return `
      <article class="curio-card ${isSimpsons ? 'simpsons' : 'ramanujan'}">
        <header>
          <span class="badge">${isSimpsons ? '📺 Los Simpson' : '🚕 Ramanujan'}</span>
          <h3>${e.a}<sup>${e.n}</sup> + ${e.b}<sup>${e.n}</sup> ≈ ${e.c}<sup>${e.n}</sup></h3>
        </header>
        ${shortLeft
          ? `<div class="digits"><div class="side"><span class="lbl">aⁿ+bⁿ</span><code>${digitsHTML(e.left, e.matching)}</code></div>
             <div class="side"><span class="lbl">cⁿ</span><code>${digitsHTML(e.right, e.matching)}</code></div></div>`
          : `<div class="digits one-line"><code><span class="lbl">aⁿ+bⁿ</span> ${digitsHTML(e.left, e.matching)}</code>
             <code><span class="lbl">cⁿ&nbsp;&nbsp;&nbsp;&nbsp;</span> ${digitsHTML(e.right, e.matching)}</code></div>`}
        <dl class="curio-stats">
          <div><dt>coinciden</dt><dd>${e.matching} de ${e.digits} dígitos</dd></div>
          <div><dt>error relativo</dt><dd>${formatSci(e.rel)}</dd></div>
        </dl>
        <p class="note">${e.note}</p>
        ${e.a <= 2000 && e.b <= 2000
          ? `<button class="ghost explore" data-idx="${idx}" type="button">explorar en casi-soluciones →</button>`
          : '<p class="hint">fuera del rango del mapa interactivo (a, b ≤ 2000)</p>'}
      </article>`;
    })
    .join('');

  for (const btn of container.querySelectorAll('.explore')) {
    btn.addEventListener('click', () => {
      const item = items[Number(btn.dataset.idx)];
      const amax = Math.min(2000, Math.max(item.a, item.b, 100));
      onExplore({ n: item.n, amax, a: item.a, b: item.b });
    });
  }
}
