"""Casi-soluciones de aⁿ + bⁿ = cⁿ con verificación exacta.

Para n > 2 el teorema de Fermat garantiza que no hay soluciones enteras,
pero las hay *casi*: pares (a, b) para los que aⁿ + bⁿ cae pegadísimo a
una n-ésima potencia perfecta. Aquí las buscamos con una pasada vectorizada
en float64 y re-verificamos a los finalistas con enteros de precisión
arbitraria de Python, para que el ranking sea exactamente correcto.
"""

from __future__ import annotations

import numpy as np

__all__ = ["lame_lattice", "near_misses", "simpsons_near_misses"]

#: casi-soluciones famosas de «Los Simpson» (temporadas 5–10) y de Ramanujan
_FAMOUS = [
    (
        1782,
        1841,
        1922,
        12,
        "Los Simpson, «The Wizard of Evergreen Terrace» (1998). Además es la mejor "
        "casi-solución de duodécimas con a, b ≤ 1841: compruébalo en casi-soluciones.",
    ),
    (3987, 4361, 4472, 12, "Los Simpson, «Treehouse of Horror VI» (1995)"),
    (6, 8, 9, 3, "6³ + 8³ = 9³ − 1, casi-cubo clásico"),
    (9, 10, 12, 3, "9³ + 10³ = 12³ + 1, el número del taxista de Ramanujan (1729)"),
    (64, 94, 103, 3, "64³ + 94³ = 103³ + 1, la mejor con a, b ≤ 100"),
]


def _exact_rel(a: int, b: int, c: int, n: int) -> tuple[float, int]:
    """Error relativo exacto |aⁿ+bⁿ−cⁿ|/cⁿ y el signo del hueco."""
    left = a**n + b**n
    right = c**n
    gap = left - right
    return abs(gap) / right, (1 if gap > 0 else -1 if gap < 0 else 0)


def near_misses(
    n: int, amax: int, bmax: int | None = None, top: int = 60, ensure: tuple[int, int] | None = None
) -> dict:
    """Mejores casi-soluciones de aⁿ + bⁿ = cⁿ con 1 <= a <= amax, 1 <= b <= bmax.

    Devuelve el mapa completo de errores relativos (float32, log₁₀) y la
    lista ``top`` re-verificada con aritmética entera exacta. Con ``ensure``
    se incluye además la pareja pedida con sus valores exactos (usado por
    las curiosidades para resaltar, p. ej., 1782¹² + 1841¹²).

    Nota sobre precisión: float64 distingue ~16 dígitos significativos, así
    que en el mapa los errores por debajo de ~10⁻¹³ se saturan; el ranking
    ``top``, en cambio, se recalcula con enteros y es exacto.
    """
    if not 2 <= n <= 12:
        raise ValueError("n debe estar entre 2 y 12")
    if amax < 2 or amax > 2000:
        raise ValueError("amax debe estar entre 2 y 2000")
    bmax = bmax or amax
    top = min(top, amax * bmax)

    a = np.arange(1, amax + 1, dtype=np.float64)
    b = np.arange(1, bmax + 1, dtype=np.float64)
    powers = a[:, None] ** n + b[None, :] ** n
    # en toda solución genuina c > max(a, b): sin este límite, parejas con
    # a ≫ b darían "casi-soluciones" triviales con c = a
    c = np.maximum(np.rint(powers ** (1.0 / n)), np.maximum(a[:, None], b[None, :]) + 1.0)
    rel = np.abs(powers - c**n) / c**n

    # mapa para el heatmap: log10 del error, saturado en la resolución flotante
    log_map = np.log10(np.maximum(rel, 1e-13)).astype(np.float32)

    # candidatos acotados (top*3): con float64 los valores pequeños empatan
    # en masa y filtrar por umbral devolvería cientos de miles de celdas
    k = min(top * 3, rel.size)
    idx = np.argpartition(rel.ravel(), k - 1)[:k]
    ii, jj = np.unravel_index(idx, rel.shape)

    candidates = []
    for i, j in zip(ii.tolist(), jj.tolist(), strict=True):
        entry = _exact_entry(i + 1, j + 1, round(float(c[i, j])), n)
        for c_try in (entry["c"] - 1, entry["c"] + 1):  # el c óptimo puede diferir del float
            if c_try > max(i + 1, j + 1):  # c debe superar a ambos catetos
                r2, s2 = _exact_rel(i + 1, j + 1, c_try, n)
                if r2 < entry["rel"]:
                    entry = {"a": i + 1, "b": j + 1, "c": c_try, "rel": r2, "sign": s2}
        candidates.append(entry)

    ensured = None
    if ensure and 1 <= ensure[0] <= amax and 1 <= ensure[1] <= bmax:
        ea, eb = ensure
        c_float = round(float(c[ea - 1, eb - 1]))
        ensured = _exact_entry(ea, eb, c_float, n)
        for c_try in (ensured["c"] - 1, ensured["c"], ensured["c"] + 1):
            if c_try > max(ea, eb):  # c debe superar a ambos catetos
                r2, s2 = _exact_rel(ea, eb, c_try, n)
                if r2 < ensured["rel"]:
                    ensured = {"a": ea, "b": eb, "c": c_try, "rel": r2, "sign": s2}

    candidates.sort(key=lambda e: e["rel"])
    ranked = candidates[:top]

    exact = [e for e in ranked if e["rel"] == 0]
    return {
        "n": n,
        "amax": amax,
        "bmax": bmax,
        "log_map": log_map,
        "top": ranked,
        "exact_count": len(exact),
        "ensured": ensured,
    }


def _exact_entry(a: int, b: int, c: int, n: int) -> dict:
    rel, sign = _exact_rel(a, b, c, n)
    return {"a": a, "b": b, "c": c, "rel": rel, "sign": sign}


def lame_lattice(n: int, c: int) -> dict:
    """Análisis de la rejilla entera bajo la curva de Lamé aⁿ + bⁿ = cⁿ.

    Para cada entero 1 <= a < c calcula b* = (cⁿ − aⁿ)^(1/n) (no entero salvo
    solución exacta) y el hueco exacto del punto entero más cercano de la
    rejilla. La existencia de soluciones sería b* entero para algún a: para
    n = 2 ocurre en las ternas pitagóricas, para n > 2 nunca.
    """
    if not 2 <= n <= 12:
        raise ValueError("n debe estar entre 2 y 12")
    if not 2 <= c <= 200_000:
        raise ValueError("c debe estar entre 2 y 200000")

    a = np.arange(1, c, dtype=np.float64)
    b_star = (c**n - a**n) ** (1.0 / n)
    frac = b_star - np.floor(b_star)

    exact_a: list[int] = []
    rel = np.empty(c - 1, dtype=np.float64)
    sign = np.empty(c - 1, dtype=np.int8)
    for i in range(c - 1):
        ai = i + 1
        b_floor = int(b_star[i])
        entries = [be for be in (b_floor, b_floor + 1) if be >= 1]
        best = None
        for be in entries:
            r, s = _exact_rel(ai, be, c, n)
            if best is None or r < best[0]:
                best = (r, s, be)
        rel[i], sign[i], _ = best
        if best[0] == 0:
            exact_a.append(ai)
    return {
        "n": n,
        "c": c,
        "a": a.astype(np.int32),
        "frac": frac.astype(np.float32),
        "rel": rel.astype(np.float32),
        "sign": sign.astype(np.int8),
        "exact": exact_a,
    }


def simpsons_near_misses() -> list[dict]:
    """Las casi-soluciones famosas, verificadas dígito a dígito con enteros."""
    result = []
    for a, b, c, n, note in _FAMOUS:
        left = a**n + b**n
        right = c**n
        s_left, s_right = str(left), str(right)
        match = next(
            (i for i, (x, y) in enumerate(zip(s_left, s_right, strict=False)) if x != y),
            min(len(s_left), len(s_right)),
        )
        result.append(
            {
                "a": a,
                "b": b,
                "c": c,
                "n": n,
                "note": note,
                "left": s_left,
                "right": s_right,
                "digits": len(s_right),
                "matching": match,
                "rel": abs(left - right) / right,
            }
        )
    return result
