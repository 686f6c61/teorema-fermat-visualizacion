// Cliente de la API en modo dual: FastAPI si existe, cálculo en navegador
// (GitHub Pages) con compute.js si no. Colormap compartido.

import * as compute from './compute.js';

const DTYPES = { int32: Int32Array, uint8: Uint8Array, int8: Int8Array, float32: Float32Array };

let backend = null;

export const mode = () => (backend === null ? 'desconocido' : backend ? 'servidor' : 'navegador');

export function decodeColumn(b64, dtype) {
  if (typeof b64 !== 'string') return b64; // typed array del modo estático
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ctor = DTYPES[dtype] ?? Int32Array;
  return new ctor(bytes.buffer, 0, bytes.byteLength / ctor.BYTES_PER_ELEMENT);
}

async function dual(path, computeFn) {
  if (backend !== false) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        backend = true;
        return await res.json();
      }
    } catch {
      /* sin backend: modo estático */
    }
    backend = false;
  }
  return computeFn();
}

export const fetchTriples = (limit, primitive) =>
  dual(`/api/triples?limit=${limit}&primitive=${primitive}`, () => compute.triples(limit, primitive));

export const fetchNear = (n, amax, top = 60, ensure = null) =>
  dual(
    `/api/near?n=${n}&amax=${amax}&top=${top}` +
      (ensure ? `&ensure_a=${ensure[0]}&ensure_b=${ensure[1]}` : ''),
    () => compute.near(n, amax, top, ensure),
  );

export const fetchLame = (n, c) => dual(`/api/lame?n=${n}&c=${c}`, () => compute.lame(n, c));

export const fetchCloud = (n, m) => dual(`/api/cloud?n=${n}&m=${m}`, () => compute.cloud(n, m));

export const fetchCuriosities = () => dual('/api/curiosities', () => compute.simpsons());

export const formatInt = (x) => x.toLocaleString('es-ES');

export const formatSci = (x, digits = 2) =>
  x
    .toExponential(digits)
    .replace(/e([+-])(\d+)/, '×10$1$2')
    .replace('.', ',');

// rampa tipo viridis (aproximada): t=0 violeta oscuro → t=1 amarillo
const VIRIDIS = [
  [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
  [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37],
];

export function viridis(t) {
  const x = Math.min(1, Math.max(0, t)) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(x));
  const f = x - i;
  const c = VIRIDIS[i].map((v, k) => Math.round(v + f * (VIRIDIS[i + 1][k] - v)));
  return c;
}

export const viridisCss = (t, alpha = 1) => {
  const [r, g, b] = viridis(t);
  return `rgba(${r},${g},${b},${alpha})`;
};
