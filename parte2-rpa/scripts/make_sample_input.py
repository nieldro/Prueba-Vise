"""Genera data/cedulas.xlsx: un Excel de ejemplo con casos válidos, duplicados e inválidos.

Uso:  python scripts/make_sample_input.py [ruta_de_salida]

Todas las cédulas son ficticias. Las que terminan en 7777, 8888 y 9999 son "cédulas gatillo" del
servicio simulado (ver rpa_antecedentes/mock_server.py). Los valores `int` y `float` se guardan
como números de Excel y los `str` como texto, para que el lector pruebe ambos formatos.
"""

from __future__ import annotations

import sys
from pathlib import Path

from openpyxl import Workbook

ROWS: list[object] = [
    "1012345678",  # limpio
    52123456,  # limpio, celda numérica
    "79845123",  # limpio
    "1098765409",  # con antecedentes
    "80123410",  # con antecedentes
    "41555112",  # con antecedentes
    "63777103",  # no encontrado
    "12345600",  # no encontrado
    "1030456790",  # limpio
    71600845,  # limpio, celda numérica
    "39654321",  # limpio
    1234567.0,  # limpio, celda con decimal (Excel a veces la guarda así)
    "55558888",  # falla 2 veces con 503 y luego responde (reintentos)
    "66667777",  # 429 con Retry-After en la primera consulta
    "77779999",  # el servicio falla siempre: termina como error
    "1012345678",  # duplicada de la fila 2
    "  52123456  ",  # duplicada con espacios
    "79845123",  # duplicada
    "12345",  # inválida: 5 dígitos
    "12345678901",  # inválida: 11 dígitos
    "ABC12345",  # inválida: letras
    "12 345 678",  # inválida: espacios internos
    "1.234.567",  # inválida: separadores de miles
    None,  # fila vacía
    "45001234",  # limpio
    "90876543",  # limpio
]


def build(path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    if sheet is None:
        raise RuntimeError("No se pudo crear la hoja")
    sheet.title = "Cedulas"
    sheet.append(["cedula"])
    for value in ROWS:
        sheet.append([value])
    sheet.column_dimensions["A"].width = 18
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(path)


if __name__ == "__main__":
    default = Path(__file__).resolve().parents[1] / "data" / "cedulas.xlsx"
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    build(target)
    print(f"Excel de ejemplo escrito en {target} ({len(ROWS)} filas)")
