"""Explorador interactivo del Último Teorema de Fermat."""

from .near import lame_lattice, near_misses, simpsons_near_misses
from .triples import all_triples, primitive_triples

__all__ = [
    "all_triples",
    "lame_lattice",
    "near_misses",
    "primitive_triples",
    "simpsons_near_misses",
]
