"""Tipos de datos compartidos por todos los módulos."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum


class Status(StrEnum):
    """Estado de una cédula en el reporte. Los valores son los que exige la prueba."""

    CLEAN = "limpio"
    WITH_RECORDS = "con antecedentes"
    NOT_FOUND = "no encontrado"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class InputRow:
    """Una celda de la columna `cedula` tal como vino del Excel."""

    row: int
    """Número de fila en la hoja (la primera fila de datos es la 2)."""
    raw: str
    """Contenido ya convertido a texto y sin espacios en los extremos."""


@dataclass(frozen=True, slots=True)
class Candidate:
    """Una cédula depurada: válida (se consulta) o inválida (se reporta como error)."""

    row: int
    cedula: str
    """Valor normalizado. Si es inválida, conserva el texto original."""
    error: str | None = None
    """Motivo de invalidez; `None` si la cédula es válida."""

    @property
    def is_valid(self) -> bool:
        return self.error is None


@dataclass(frozen=True, slots=True)
class QueryResult:
    """Fila del reporte final."""

    cedula: str
    names: str
    status: Status
    detail: str
    queried_at: datetime | None
    """Momento de la consulta; `None` si no se consultó (cédula inválida)."""
