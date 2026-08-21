"""Tests del núcleo matemático y de la API de Fermat."""

from __future__ import annotations

import base64

import numpy as np
import pytest
from fastapi.testclient import TestClient

from fermat.near import lame_lattice, near_misses, simpsons_near_misses
from fermat.triples import all_triples, primitive_triples

# ------------------------------------------------------------------ ternas


def test_first_primitives():
    data = primitive_triples(30)
    got = {tuple(sorted(ab)) for ab in zip(data["a"].tolist(), data["b"].tolist(), strict=True)}
    # c = 5, 13, 17, 25, 29 — las cinco primitivas con hipotenusa <= 30
    assert got == {(3, 4), (5, 12), (8, 15), (7, 24), (20, 21)}


def test_primitive_counts_known():
    assert primitive_triples(100)["c"].size == 16
    assert all_triples(100)["c"].size == 52  # valor conocido (OEIS A224558)


def test_triples_satisfy_pythagoras():
    for limit in (50, 317):
        data = all_triples(limit)
        assert np.all(data["a"] ** 2 + data["b"] ** 2 == data["c"] ** 2)
        assert data["c"].max() <= limit
        assert data["c"].min() >= 5


def test_primitives_are_primitive():
    data = primitive_triples(2000)
    assert np.all(np.gcd(np.gcd(data["a"], data["b"]), data["c"]) == 1)
    # a y b de paridad distinta en toda terna primitiva
    assert np.all((data["a"] % 2) != (data["b"] % 2))


def test_tiny_limits():
    assert primitive_triples(4)["c"].size == 0
    assert all_triples(4)["c"].size == 0


# ---------------------------------------------------------- casi-soluciones


def test_no_exact_solutions_for_n_greater_than_2():
    for n in (3, 4, 5, 7, 12):
        result = near_misses(n, 60, top=30)
        assert result["exact_count"] == 0
        for e in result["top"]:
            assert e["a"] ** n + e["b"] ** n != e["c"] ** n


def test_n2_finds_exact_triples():
    result = near_misses(2, 60, top=60)
    assert result["exact_count"] > 0
    for e in result["top"]:
        if e["rel"] == 0:
            assert e["a"] ** 2 + e["b"] ** 2 == e["c"] ** 2


def test_best_cube_near_miss_small_range():
    """Con a, b <= 100 la mejor casi-solución de cubos es 64³ + 94³ = 103³ + 1."""
    result = near_misses(3, 100, top=5)
    best = result["top"][0]
    assert (best["a"], best["b"]) in {(64, 94), (94, 64)}
    assert best["c"] == 103
    assert best["rel"] == pytest.approx(1 / 103**3)


def test_ranking_is_exact():
    """El ranking re-verificado debe ser consistente con enteros grandes."""
    result = near_misses(12, 150, top=20)
    rels = [e["rel"] for e in result["top"]]
    assert rels == sorted(rels)
    for e in result["top"]:
        expected = abs(e["a"] ** 12 + e["b"] ** 12 - e["c"] ** 12) / e["c"] ** 12
        assert e["rel"] == expected


def test_near_validation():
    with pytest.raises(ValueError):
        near_misses(13, 50)
    with pytest.raises(ValueError):
        near_misses(3, 5000)


# --------------------------------------------------------------- Lamé


def test_lame_n2_hits_lattice_at_triples():
    data = lame_lattice(2, 25)
    # (7, 24, 25) y (15, 20, 25) son ternas: deben aparecer como exactas
    assert 7 in data["exact"] and 15 in data["exact"]
    assert all(f == 0 or 0 < f < 1 for f in data["frac"].tolist())


def test_lame_n3_never_exact():
    data = lame_lattice(3, 200)
    assert data["exact"] == []
    assert data["rel"].min() > 0


def test_lame_validation():
    with pytest.raises(ValueError):
        lame_lattice(20, 50)
    with pytest.raises(ValueError):
        lame_lattice(3, 1)


# ---------------------------------------------------------- curiosidades


def test_curiosities_exact():
    curiosities = {
        e["note"] is not None and (e["a"], e["b"], e["c"], e["n"]): e
        for e in simpsons_near_misses()
    }
    simpsons1 = curiosities[(1782, 1841, 1922, 12)]
    assert simpsons1["matching"] == 9
    assert simpsons1["rel"] == pytest.approx(2.755e-10, rel=0.01)

    ramanujan = curiosities[(9, 10, 12, 3)]
    assert ramanujan["left"] == "1729"
    assert 9**3 + 10**3 == 12**3 + 1

    for e in simpsons_near_misses():
        assert e["a"] ** e["n"] + e["b"] ** e["n"] != e["c"] ** e["n"]
        assert len(e["left"]) == len(str(e["a"] ** e["n"] + e["b"] ** e["n"]))


# ---------------------------------------------------------------- API


@pytest.fixture()
def client():
    from fermat.server import app

    return TestClient(app)


def _decode(b64: str, dtype: str) -> np.ndarray:
    dt = np.dtype(dtype).newbyteorder("<")
    return np.frombuffer(base64.b64decode(b64), dtype=dt)


def test_api_health(client):
    assert client.get("/api/health").json() == {"status": "ok", "triples_le_100": 52}


def test_api_triples(client):
    body = client.get("/api/triples", params={"limit": 100}).json()
    a, b, c = _decode(body["a"], "int32"), _decode(body["b"], "int32"), _decode(body["c"], "int32")
    assert body["count"] == 52
    assert np.all(a**2 + b**2 == c**2)
    prim = client.get("/api/triples", params={"limit": 100, "primitive": True}).json()
    assert prim["count"] == 16


def test_api_near(client):
    body = client.get("/api/near", params={"n": 3, "amax": 80, "top": 10}).json()
    grid = _decode(body["log_map"], "float32").reshape(80, 80)
    assert grid.shape == (80, 80)
    assert body["exact_count"] == 0
    best = body["top"][0]
    assert best["a"] ** 3 + best["b"] ** 3 != best["c"] ** 3


def test_api_lame(client):
    body = client.get("/api/lame", params={"n": 2, "c": 25}).json()
    assert 7 in body["exact"] and 15 in body["exact"]
    assert _decode(body["frac"], "float32").size == 24


def test_api_curiosities(client):
    body = client.get("/api/curiosities").json()
    assert any(e["a"] == 1782 and e["matching"] == 9 for e in body)
    assert any(e["left"] == "1729" for e in body)


def test_api_validation(client):
    assert client.get("/api/near", params={"n": 13}).status_code == 422
    assert client.get("/api/triples", params={"limit": 10**6}).status_code == 422
    assert client.get("/api/lame", params={"n": 3, "c": 10**6}).status_code == 422
