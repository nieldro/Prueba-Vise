"""Validación y depuración (duplicados) de las cédulas leídas."""

from __future__ import annotations

import logging
from collections.abc import Iterable
from dataclasses import dataclass, field

from rpa_antecedentes.models import Candidate, InputRow

log = logging.getLogger(__name__)

MIN_DIGITS = 6
MAX_DIGITS = 10


def validation_error(value: str) -> str | None:
    """Devuelve el motivo por el que la cédula es inválida, o `None` si es válida.

    Una cédula válida son entre 6 y 10 dígitos numéricos (solo 0-9, sin separadores).
    """
    if not value:
        return "está vacía"
    # `isdigit()` acepta dígitos de otros alfabetos y superíndices; se exige ASCII estricto.
    if not (value.isascii() and value.isdigit()):
        return "debe contener solo dígitos numéricos (sin letras, espacios ni separadores)"
    if not MIN_DIGITS <= len(value) <= MAX_DIGITS:
        return f"debe tener entre {MIN_DIGITS} y {MAX_DIGITS} dígitos (tiene {len(value)})"
    return None


@dataclass(frozen=True, slots=True)
class Sanitized:
    candidates: list[Candidate]
    """Cédulas únicas (válidas e inválidas) en el orden en que aparecieron."""
    duplicates_removed: int
    duplicate_rows: list[int] = field(default_factory=list)

    @property
    def invalid_count(self) -> int:
        return sum(1 for c in self.candidates if not c.is_valid)


def sanitize(rows: Iterable[InputRow]) -> Sanitized:
    """Valida cada cédula y elimina las repetidas **antes** de consultar el servicio.

    Se conserva la primera aparición. Dos valores son la misma cédula si coinciden carácter a
    carácter tras quitar espacios (los ceros a la izquierda sí cuentan).
    """
    seen: set[str] = set()
    candidates: list[Candidate] = []
    duplicate_rows: list[int] = []

    for item in rows:
        if item.raw in seen:
            duplicate_rows.append(item.row)
            continue
        seen.add(item.raw)
        candidates.append(
            Candidate(row=item.row, cedula=item.raw, error=validation_error(item.raw))
        )

    if duplicate_rows:
        log.info("Eliminadas %d cédulas duplicadas (filas %s)", len(duplicate_rows), duplicate_rows)
    result = Sanitized(
        candidates=candidates,
        duplicates_removed=len(duplicate_rows),
        duplicate_rows=duplicate_rows,
    )
    if result.invalid_count:
        log.warning(
            "%d cédulas no pasan la validación y se reportarán como error", result.invalid_count
        )
    return result
