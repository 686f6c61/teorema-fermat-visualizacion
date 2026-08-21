// Cliente de la API + utilidades compartidas (decodificación binaria, colormap).

const DTYPES = { int32: Int32Array, uint8: Uint8Array, int8: Int8Array, float32: Float32Array };

export function decodeColumn(b64, dtype) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const ctor = DTYPES[dtype] ?? Int32Array;
  return new ctor(bytes.buffer, 0, bytes.byteLength / ctor.BYTES_PER_ELEMENT);
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
  return res.json();
}

export const fetchTriples = (limit, primitive) =>
  getJson(`/api/triples?limit=${limit}&primitive=${primitive}`);

export const fetchNear = (n, amax, top = 60, ensure = null) =>
  getJson(
    `/api/near?n=${n}&amax=${amax}&top=${top}` +
      (ensure ? `&ensure_a=${ensure[0]}&ensure_b=${ensure[1]}` : ''),
  );

export const fetchLame = (n, c) => getJson(`/api/lame?n=${n}&c=${c}`);

export const fetchCloud = (n, m) => getJson(`/api/cloud?n=${n}&m=${m}`);

export const fetchCuriosities = () => getJson('/api/curiosities');

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
