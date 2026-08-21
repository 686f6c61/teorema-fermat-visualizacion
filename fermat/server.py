"""API web y servidor de la aplicación de Fermat.

Arranque::

    python main.py            # o: fermat (si se instala el paquete)

Endpoints:

- ``GET /api/triples?limit=1000&primitive=false`` → ternas pitagóricas (b64).
- ``GET /api/near?n=3&amax=300`` → mapa de errores y mejores casi-soluciones.
- ``GET /api/lame?n=3&c=50`` → análisis de la rejilla bajo aⁿ+bⁿ=cⁿ.
- ``GET /api/curiosities`` → casi-soluciones famosas (Simpson, Ramanujan).
"""

from __future__ import annotations

import base64
from pathlib import Path

import numpy as np
from fastapi import FastAPI, Query
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .near import lame_lattice, near_misses, simpsons_near_misses
from .triples import all_triples, primitive_triples

MAX_C = 20_000

app = FastAPI(
    title="Último Teorema de Fermat",
    description="Explorador interactivo de aⁿ + bⁿ = cⁿ: ternas, curvas y casi-soluciones",
    version="2.0.0",
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

_STATIC = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=_STATIC), name="static")


def _b64(array: np.ndarray) -> str:
    return base64.b64encode(array.astype(array.dtype.newbyteorder("<")).tobytes()).decode("ascii")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(_STATIC / "index.html")


@app.get("/api/triples")
def triples(
    limit: int = Query(1000, ge=5, le=MAX_C),
    primitive: bool = Query(False, description="solo ternas primitivas"),
) -> dict:
    data = primitive_triples(limit) if primitive else all_triples(limit)
    return {
        "limit": limit,
        "primitive": primitive,
        "count": int(data["c"].size),
        "a": _b64(data["a"].astype(np.int32)),
        "b": _b64(data["b"].astype(np.int32)),
        "c": _b64(data["c"].astype(np.int32)),
    }


@app.get("/api/near")
def near(
    n: int = Query(3, ge=2, le=12),
    amax: int = Query(300, ge=2, le=2000),
    top: int = Query(60, ge=1, le=200),
    ensure_a: int = Query(0, ge=0, description="incluye esta pareja con valores exactos"),
    ensure_b: int = Query(0, ge=0, description="incluye esta pareja con valores exactos"),
) -> dict:
    ensure = (ensure_a, ensure_b) if ensure_a and ensure_b else None
    result = near_misses(n, amax, top=top, ensure=ensure)
    return {
        "n": result["n"],
        "amax": result["amax"],
        "bmax": result["bmax"],
        "exact_count": result["exact_count"],
        "log_map": _b64(result["log_map"]),
        "top": result["top"],
        "ensured": result["ensured"],
    }


@app.get("/api/lame")
def lame(
    n: int = Query(3, ge=2, le=12),
    c: int = Query(50, ge=2, le=MAX_C),
) -> dict:
    data = lame_lattice(n, c)
    return {
        "n": data["n"],
        "c": data["c"],
        "a": _b64(data["a"]),
        "frac": _b64(data["frac"]),
        "rel": _b64(data["rel"]),
        "sign": _b64(data["sign"]),
        "exact": data["exact"],
    }


@app.get("/api/curiosities")
def curiosities() -> list[dict]:
    return simpsons_near_misses()


@app.get("/api/cloud")
def cloud(
    n: int = Query(3, ge=2, le=12, description="exponente"),
    m: int = Query(40, ge=4, le=80, description="la rejilla es m × m"),
) -> dict:
    """Nube 3D: (a, b, c) con c el entero más cercano a (aⁿ+bⁿ)^(1/n).

    ``exact`` marca las soluciones verdaderas (solo ocurren para n = 2).
    El chequeo de exactitud se hace con enteros de Python, no con float.
    """
    a = np.arange(1, m + 1, dtype=np.float64)
    b = np.arange(1, m + 1, dtype=np.float64)
    powers = a[:, None] ** n + b[None, :] ** n
    c_exact = powers ** (1.0 / n)
    c_int = np.maximum(np.rint(c_exact), 1.0)

    exact = np.zeros((m, m), dtype=bool)
    rel = np.empty((m, m), dtype=np.float64)
    for i in range(m):
        for j in range(m):
            ai, bj = i + 1, j + 1
            ck = round(float(c_exact[i, j]))
            cands = [c for c in (ck - 1, ck, ck + 1) if c >= 1]
            best = min(cands, key=lambda c: abs(ai**n + bj**n - c**n))
            rel[i, j] = abs(ai**n + bj**n - best**n) / best**n
            exact[i, j] = ai**n + bj**n == best**n
            c_int[i, j] = best

    aa, bb = np.meshgrid(a, b, indexing="ij")
    return {
        "n": n,
        "m": m,
        "a": _b64(aa.flatten().astype(np.int32)),
        "b": _b64(bb.flatten().astype(np.int32)),
        "c_int": _b64(c_int.flatten().astype(np.int32)),
        "rel": _b64(rel.flatten().astype(np.float32)),
        "exact": _b64(exact.flatten()),
    }


@app.get("/api/health")
def health() -> dict:
    triples_small = all_triples(100)
    return {"status": "ok", "triples_le_100": int(triples_small["c"].size)}


def main(host: str = "127.0.0.1", port: int = 8000) -> None:
    """Arranca el servidor de desarrollo (usado por ``python main.py``)."""
    import uvicorn

    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    main()
