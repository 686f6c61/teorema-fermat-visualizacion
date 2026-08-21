"""Ternas pitagóricas por la parametrización de Euclides.

Toda terna primitiva (a, b, c) con a² + b² = c² se genera con

    a = m² − n²,   b = 2mn,   c = m² + n²

para enteros m > n > 0, coprimos y de paridad distinta. Eso permite
enumerarlas en O(√limit · limit) sin búsquedas brutales: para cada m solo
quedan los n que pasan el filtro, vectorizados con NumPy.
"""

from __future__ import annotations

import numpy as np

__all__ = ["all_triples", "primitive_triples"]


def primitive_triples(limit: int) -> dict[str, np.ndarray]:
    """Ternas primitivas con hipotenusa c <= ``limit``.

    Devuelve un diccionario con arrays columna ordenados por c.
    """
    if limit < 5:  # la primera terna es (3, 4, 5)
        return {k: np.empty(0, dtype=np.int32) for k in ("a", "b", "c")}

    blocks = []
    for m in range(2, int(limit**0.5) + 1):
        ns = np.arange(1, m)
        ns = ns[(m - ns) % 2 == 1]  # paridad distinta
        ns = ns[m * m + ns * ns <= limit]
        ns = ns[np.gcd(ns, m) == 1]  # coprimos
        if ns.size:
            blocks.append(np.stack([m * m - ns * ns, 2 * m * ns, m * m + ns * ns], axis=1))
    arr = np.concatenate(blocks).astype(np.int32)
    arr = arr[np.argsort(arr[:, 2], kind="stable")]
    return {"a": arr[:, 0].copy(), "b": arr[:, 1].copy(), "c": arr[:, 2].copy()}


def all_triples(limit: int) -> dict[str, np.ndarray]:
    """Todas las ternas (primitivas y sus múltiplos) con c <= ``limit``."""
    prims = primitive_triples(limit)
    if prims["c"].size == 0:
        return prims

    counts = limit // prims["c"]
    total = int(counts.sum())
    offsets = np.repeat(np.cumsum(counts) - counts, counts)
    k = np.arange(1, total + 1, dtype=np.int64) - offsets  # multiplicador por terna
    base = np.repeat(np.stack([prims["a"], prims["b"], prims["c"]], axis=1), counts, axis=0)
    scaled = base * k[:, None].astype(np.int64)
    order = np.argsort(scaled[:, 2], kind="stable")
    scaled = scaled[order]
    return {"a": scaled[:, 0], "b": scaled[:, 1], "c": scaled[:, 2]}
