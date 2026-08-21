// Cableado de la interfaz: vistas, controles y renderizado de resultados.

import { decodeColumn, fetchCloud, fetchCuriosities, fetchLame, fetchNear, fetchTriples, formatInt, formatSci } from './api.js';
import { ScatterChart } from './scatter.js';
import { HeatmapChart } from './heatmap.js';
import { LameView } from './lame.js';
import { Cloud3D } from './cloud3d.js';
import { renderCuriosities } from './curiosities.js';

const $ = (sel) => document.querySelector(sel);

/* ------------------------------------------------------------- vistas */

const views = {};
for (const btn of document.querySelectorAll('.tabs button')) {
  const name = btn.dataset.view;
  views[name] = document.getElementById(`view-${name}`);
  btn.addEventListener('click', () => {
    document.querySelector('.tabs button.active')?.classList.remove('active');
    btn.classList.add('active');
    for (const v of Object.values(views)) v.classList.remove('active');
    views[name].classList.add('active');
  });
}

const showView = (name) => document.querySelector(`.tabs button[data-view="${name}"]`)?.click();

function setStatus(el, text, isError = false) {
  el.classList.toggle('error', isError);
  el.textContent = text;
}

/* -------------------------------------------------------------- ternas */

const scatter = new ScatterChart($('#triples-canvas'), $('#triples-tip'), {
  labelX: 'cateto a',
  labelY: 'cateto b',
});
scatter.colorbarLabel = 'hipotenusa c';

async function loadTriples() {
  const limit = Number($('#triples-limit').value);
  const primitive = $('#triples-primitive').checked;
  setStatus($('#triples-status'), 'calculando…');
  try {
    const t0 = performance.now();
    const body = await fetchTriples(limit, primitive);
    const secs = ((performance.now() - t0) / 1000).toFixed(1).replace('.', ',');
    scatter.setData({
      x: decodeColumn(body.a, 'int32'),
      y: decodeColumn(body.b, 'int32'),
      value: decodeColumn(body.c, 'int32'),
    });
    setStatus(
      $('#triples-status'),
      `${formatInt(body.count)} ${primitive ? 'ternas primitivas' : 'ternas (con múltiplos)'} · ${secs} s`,
    );
  } catch (err) {
    setStatus($('#triples-status'), `error: ${err.message}`, true);
  }
}

$('#triples-update').addEventListener('click', loadTriples);
$('#triples-primitive').addEventListener('change', loadTriples);
for (const btn of document.querySelectorAll('#triples-presets button')) {
  btn.addEventListener('click', () => {
    $('#triples-limit').value = btn.dataset.limit;
    loadTriples();
  });
}

/* ----------------------------------------------------------- la curva */

const lame = new LameView($('#lame-canvas'), $('#lame-tip'));
let lameTimer = null;

async function loadLame() {
  const n = Number($('#lame-n').value);
  const c = Number($('#lame-c').value);
  lame.n = n;
  lame.c = c;
  lame.animateTo(n);
  clearTimeout(lameTimer);
  lameTimer = setTimeout(async () => {
    try {
      const body = await fetchLame(n, c);
      lame.setLattice({
        a: decodeColumn(body.a, 'int32'),
        frac: decodeColumn(body.frac, 'float32'),
        rel: decodeColumn(body.rel, 'float32'),
        exact: body.exact,
        n: body.n,
        c: body.c,
      });
      const exactTxt = body.exact.length
        ? `${body.exact.length} soluciones exactas (ternas: ${body.exact.slice(0, 6).join(', ')}…)`
        : '0 soluciones exactas — la curva esquiva toda la rejilla';
      setStatus($('#lame-status'), `n = ${n}, c = ${c}: ${exactTxt}`);
    } catch (err) {
      setStatus($('#lame-status'), `error: ${err.message}`, true);
    }
  }, 180);
}

$('#lame-n').addEventListener('input', () => { $('#lame-n-output').value = $('#lame-n').value; });
$('#lame-n').addEventListener('input', loadLame);
$('#lame-c').addEventListener('input', () => { $('#lame-c-output').value = $('#lame-c').value; });
$('#lame-c').addEventListener('input', loadLame);
$('#cloud-m').addEventListener('input', () => { $('#cloud-m-output').value = $('#cloud-m').value; });
for (const btn of document.querySelectorAll('#lame-presets button')) {
  btn.addEventListener('click', () => {
    $('#lame-n').value = btn.dataset.n;
    $('#lame-c').value = btn.dataset.c;
    loadLame();
  });
}

/* --------------------------------------------------- casi-soluciones */

const heatmap = new HeatmapChart($('#near-canvas'), $('#near-tip'));
let nearEnsure = null;

async function loadNear() {
  const n = Number($('#near-n').value);
  const amax = Number($('#near-amax').value);
  setStatus($('#near-status'), 'calculando…');
  try {
    const t0 = performance.now();
    const body = await fetchNear(n, amax, 60, nearEnsure);
    const secs = ((performance.now() - t0) / 1000).toFixed(1).replace('.', ',');
    heatmap.setData(n, body.amax, decodeColumn(body.log_map, 'float32'));
    renderNearTable(body, n);
    setStatus(
      $('#near-status'),
      `${body.exact_count === 0 ? 'ninguna solución exacta' : `${body.exact_count} soluciones exactas`} · ${secs} s`,
    );
  } catch (err) {
    setStatus($('#near-status'), `error: ${err.message}`, true);
  }
}

function nearRow(e, n, cls = '') {
  return (
    `<tr class="${cls}"><td>${e.a}</td><td>${e.b}</td><td>${e.c}</td>` +
    `<td class="mono">${e.rel === 0 ? 'exacta' : formatSci(e.rel)}</td>` +
    `<td>${e.sign > 0 ? '+' : e.sign < 0 ? '−' : '='}</td>` +
    `<td class="mono">${(e.a ** n + e.b ** n).toLocaleString('es-ES')}</td>` +
    `<td class="mono">${(e.c ** n).toLocaleString('es-ES')}</td></tr>`
  );
}

function renderNearTable(body, n) {
  const rows = [];
  if (body.ensured) {
    rows.push(nearRow(body.ensured, n, 'ensured'));
    const dup = body.top.findIndex((e) => e.a === body.ensured.a && e.b === body.ensured.b);
    if (dup >= 0) body.top.splice(dup, 1);
  }
  rows.push(...body.top.slice(0, 25).map((e) => nearRow(e, n)));
  $('#near-tbody').innerHTML = rows.join('');
  const extra = body.ensured ? ' · fila dorada: pareja de la curiosidad' : '';
  $('#near-count').textContent =
    `mejores ${Math.min(25, body.top.length)} de ${formatInt(body.amax)}×${formatInt(body.bmax)} casos${extra}`;
  if (n >= 10) {
    $('#near-note').hidden = false;
  } else {
    $('#near-note').hidden = true;
  }
}

$('#near-update').addEventListener('click', () => {
  nearEnsure = null;
  loadNear();
});
for (const btn of document.querySelectorAll('#near-presets button')) {
  btn.addEventListener('click', () => {
    nearEnsure = null;
    $('#near-n').value = btn.dataset.n;
    $('#near-amax').value = btn.dataset.amax;
    loadNear();
  });
}

/* ------------------------------------------------------- curiosidades */

async function loadCuriosities() {
  try {
    renderCuriosities(await fetchCuriosities(), {
      onExplore: ({ n, amax, a, b }) => {
        $('#near-n').value = n;
        $('#near-amax').value = amax;
        nearEnsure = a && b ? [a, b] : null;
        loadNear();
        showView('near');
      },
    });
  } catch (err) {
    setStatus($('#curiosities-status'), `error: ${err.message}`, true);
  }
}

/* ---------------------------------------------------------------- 3D */

const cloud = new Cloud3D($('#cloud-canvas'), $('#cloud-tip'));

async function loadCloud() {
  const n = Number($('#cloud-n').value);
  const m = Number($('#cloud-m').value);
  setStatus($('#cloud-status'), 'calculando…');
  try {
    const body = await fetchCloud(n, m);
    cloud.setData({
      n: body.n,
      m: body.m,
      a: decodeColumn(body.a, 'int32'),
      b: decodeColumn(body.b, 'int32'),
      cInt: decodeColumn(body.c_int, 'int32'),
      rel: decodeColumn(body.rel, 'float32'),
      exact: decodeColumn(body.exact, 'uint8'),
    });
    const nExact = cloud.data.exact.reduce((s, v) => s + v, 0);
    setStatus($('#cloud-status'), nExact ? `${nExact} puntos exactos sobre la superficie` : 'ningún punto toca la superficie');
  } catch (err) {
    setStatus($('#cloud-status'), `error: ${err.message}`, true);
  }
}

$('#cloud-update').addEventListener('click', loadCloud);

/* ----------------------------------------------------- acerca de */

for (const btn of document.querySelectorAll('.try-n')) {
  btn.addEventListener('click', () => {
    const { view, n, c, amax, limit } = btn.dataset;
    if (view === 'ternas') { $('#triples-limit').value = limit; loadTriples(); }
    if (view === 'lame') { $('#lame-n').value = n; $('#lame-c').value = c; loadLame(); }
    if (view === 'near') { $('#near-n').value = n; $('#near-amax').value = amax; loadNear(); }
    showView(view ?? 'ternas');
  });
}

/* ------------------------------------------------------------ inicio */

loadTriples();
loadLame();
loadNear();
loadCuriosities();
loadCloud();
