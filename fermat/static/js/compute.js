// Núcleo de Fermat en el navegador (modo GitHub Pages): port de fermat/
// triples.py y near.py. La búsqueda flotante preselecciona y el ranking se
// re-verifica con BigInt, igual que en el servidor.

// ---- ternas por Euclides ------------------------------------------------

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

export function triples(limit, primitive) {
  const out = [];
  for (let m = 2; m * m <= limit; m++) {
    for (let n = 1; n < m; n++) {
      if ((m - n) % 2 === 1 && gcd(m, n) === 1) {
        const c0 = m * m + n * n;
        if (c0 > limit) break;
        const a0 = m * m - n * n;
        const b0 = 2 * m * n;
        if (primitive) {
          out.push([a0, b0, c0]);
        } else {
          for (let k = 1; k * c0 <= limit; k++) out.push([a0 * k, b0 * k, c0 * k]);
        }
      }
    }
  }
  out.sort((x, y) => x[2] - y[2]);
  return {
    limit,
    primitive,
    count: out.length,
    a: Int32Array.from(out, (t) => t[0]),
    b: Int32Array.from(out, (t) => t[1]),
    c: Int32Array.from(out, (t) => t[2]),
  };
}

// ---- casi-soluciones ----------------------------------------------------

function exactRel(a, b, c, n) {
  const left = BigInt(a) ** BigInt(n) + BigInt(b) ** BigInt(n);
  const right = BigInt(c) ** BigInt(n);
  const gap = left - right;
  const rel = Number(gap < 0n ? -gap : gap) / Number(right);
  return [rel, gap > 0n ? 1 : gap < 0n ? -1 : 0];
}

export function near(n, amax, top = 60, ensure = null) {
  if (!(n >= 2 && n <= 12)) throw new Error('n debe estar entre 2 y 12');
  if (!(amax >= 2 && amax <= 2000)) throw new Error('amax debe estar entre 2 y 2000');

  const rel = new Float64Array(amax * amax);
  const logMap = new Float32Array(amax * amax);
  for (let i = 1; i <= amax; i++) {
    for (let j = 1; j <= amax; j++) {
      const s = i ** n + j ** n;
      const c = Math.max(Math.round(s ** (1 / n)), Math.max(i, j) + 1);
      const r = Math.abs(s - c ** n) / c ** n;
      const k = (i - 1) * amax + (j - 1);
      rel[k] = r;
      logMap[k] = Math.log10(Math.max(r, 1e-13));
    }
  }

  // top·3 candidatos por selección parcial (heap simple vía sort de índices)
  const k = Math.min(top * 3, rel.length);
  const idx = Array.from(rel.keys());
  // selección rápida: partial sort aproximado con un umbral
  const threshold = quickSelect(rel, k - 1);
  const candidates = idx.filter((i) => rel[i] <= threshold).slice(0, k * 2);

  const verified = [];
  for (const i of candidates) {
    const a = Math.floor(i / amax) + 1;
    const b = (i % amax) + 1;
    let entry = { a, b, c: Math.max(Math.round((a ** n + b ** n) ** (1 / n)), Math.max(a, b) + 1), rel: Infinity, sign: 0 };
    for (const c of [entry.c - 1, entry.c, entry.c + 1]) {
      if (c > Math.max(a, b)) {
        const [r, s] = exactRel(a, b, c, n);
        if (r < entry.rel) entry = { a, b, c, rel: r, sign: s };
      }
    }
    verified.push(entry);
  }
  verified.sort((x, y) => x.rel - y.rel);
  const ranked = verified.slice(0, top);

  let ensured = null;
  if (ensure && ensure[0] <= amax && ensure[1] <= amax) {
    const [ea, eb] = ensure;
    let e = { a: ea, b: eb, c: Math.max(Math.round((ea ** n + eb ** n) ** (1 / n)), Math.max(ea, eb) + 1), rel: Infinity, sign: 0 };
    for (const c of [e.c - 1, e.c, e.c + 1]) {
      if (c > Math.max(ea, eb)) {
        const [r, s] = exactRel(ea, eb, c, n);
        if (r < e.rel) e = { a: ea, b: eb, c, rel: r, sign: s };
      }
    }
    ensured = e;
  }

  return {
    n,
    amax,
    bmax: amax,
    exact_count: ranked.filter((e) => e.rel === 0).length,
    log_map: logMap,
    top: ranked,
    ensured,
  };
}

function quickSelect(arr, k) {
  // selección del k-ésimo menor (Hoare con pivote aleatorio, arrays pequeños)
  const a = Array.from(arr);
  const qs = (lo, hi) => {
    while (true) {
      if (lo >= hi) return a[lo];
      const p = a[(lo + hi) >> 1];
      let i = lo;
      let j = hi;
      while (i <= j) {
        while (a[i] < p) i++;
        while (a[j] > p) j--;
        if (i >= j) break;
        [a[i], a[j]] = [a[j], a[i]];
        i++;
        j--;
      }
      if (k <= j) hi = j;
      else if (k >= i) lo = i;
      else return a[k];
    }
  };
  return qs(0, a.length - 1);
}

// ---- rejilla bajo la curva de Lamé --------------------------------------

export function lame(n, c) {
  if (!(n >= 2 && n <= 12)) throw new Error('n debe estar entre 2 y 12');
  if (!(c >= 2 && c <= 200000)) throw new Error('c debe estar entre 2 y 200000');
  const a = [];
  const frac = [];
  const rel = [];
  const sign = [];
  const exact = [];
  for (let ai = 1; ai < c; ai++) {
    // fracción flotante para el gráfico; hueco exacto con BigInt para el color
    const bStar = (c ** n - ai ** n) ** (1 / n);
    const bf = Math.floor(bStar);
    let best = null;
    for (const be of [bf, bf + 1]) {
      if (be < 1) continue;
      const left = BigInt(ai) ** BigInt(n) + BigInt(be) ** BigInt(n);
      const right = BigInt(c) ** BigInt(n);
      const gap = left - right;
      const r = Number(gap < 0n ? -gap : gap) / Number(right);
      if (!best || r < best.r) best = { be, r, s: gap > 0n ? 1 : gap < 0n ? -1 : 0 };
    }
    a.push(ai);
    frac.push(bStar - bf);
    rel.push(best.r);
    sign.push(best.s);
    if (best.r === 0) exact.push(ai);
  }
  return {
    n,
    c,
    a: Int32Array.from(a),
    frac: Float32Array.from(frac),
    rel: Float32Array.from(rel),
    sign: Int8Array.from(sign),
    exact,
  };
}

function bigNthRootFloor(value, n) {
  if (value < 2n) return value;
  let x = BigInt(Math.floor(Math.pow(Number(value), 1 / n))) + 1n;
  while (x ** BigInt(n) > value) x -= 1n;
  return x;
}

// ---- curiosidades --------------------------------------------------------

const FAMOUS = [
  [1782, 1841, 1922, 12, 'Los Simpson, «The Wizard of Evergreen Terrace» (1998). Además es la mejor casi-solución de duodécimas con a, b ≤ 1841: compruébalo en casi-soluciones.'],
  [3987, 4361, 4472, 12, 'Los Simpson, «Treehouse of Horror VI» (1995)'],
  [6, 8, 9, 3, '6³ + 8³ = 9³ − 1, casi-cubo clásico'],
  [9, 10, 12, 3, '9³ + 10³ = 12³ + 1, el número del taxista de Ramanujan (1729)'],
  [64, 94, 103, 3, '64³ + 94³ = 103³ + 1, la mejor con a, b ≤ 100'],
];

export function simpsons() {
  return FAMOUS.map(([a, b, c, n, note]) => {
    const left = BigInt(a) ** BigInt(n) + BigInt(b) ** BigInt(n);
    const right = BigInt(c) ** BigInt(n);
    const sLeft = left.toString();
    const sRight = right.toString();
    let matching = Math.min(sLeft.length, sRight.length);
    for (let i = 0; i < Math.min(sLeft.length, sRight.length); i++) {
      if (sLeft[i] !== sRight[i]) {
        matching = i;
        break;
      }
    }
    return {
      a,
      b,
      c,
      n,
      note,
      left: sLeft,
      right: sRight,
      digits: sRight.length,
      matching,
      rel: Number(left > right ? left - right : right - left) / Number(right),
    };
  });
}

// ---- nube 3D -------------------------------------------------------------

export function cloud(n, m) {
  const size = m * m;
  const a = new Int32Array(size);
  const b = new Int32Array(size);
  const cInt = new Int32Array(size);
  const rel = new Float32Array(size);
  const exact = new Uint8Array(size);
  let k = 0;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= m; j++) {
      const left = BigInt(i) ** BigInt(n) + BigInt(j) ** BigInt(n);
      const ck = Math.round(Number(left) ** (1 / n));
      let best = null;
      for (const c of [ck - 1, ck, ck + 1]) {
        if (c < 1) continue;
        const gap = left - BigInt(c) ** BigInt(n);
        const r = Number(gap < 0n ? -gap : gap) / Number(BigInt(c) ** BigInt(n));
        if (!best || r < best.r) best = { c, r };
      }
      a[k] = i;
      b[k] = j;
      cInt[k] = best.c;
      rel[k] = best.r;
      exact[k] = left === BigInt(best.c) ** BigInt(n) ? 1 : 0;
      k++;
    }
  }
  return { n, m, a, b, c_int: cInt, rel, exact };
}
