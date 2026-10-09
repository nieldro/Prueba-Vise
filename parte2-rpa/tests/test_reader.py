from __future__ import annotations

from pathlib import Path

import pytest
from openpyxl import Workbook

from rpa_antecedentes.reader import InputFileError, read_cedulas

from .conftest import ExcelFactory


def test_reads_text_and_numeric_cells(make_excel: ExcelFactory) -> None:
    path = make_excel(["1012345678", 52123456, 1234567.0, "  79845123  "])

    result = read_cedulas(path)

    assert [r.raw for r in result.rows] == ["1012345678", "52123456", "1234567", "79845123"]
    assert result.blank_rows == 0


def test_row_numbers_match_the_sheet(make_excel: ExcelFactory) -> None:
    result = read_cedulas(make_excel(["111111", "222222"]))

    assert [r.row for r in result.rows] == [2, 3]


def test_blank_rows_are_ignored_and_counted(make_excel: ExcelFactory) -> None:
    result = read_cedulas(make_excel(["111111", None, "   ", "222222"]))

    assert [r.raw for r in result.rows] == ["111111", "222222"]
    assert result.blank_rows == 2


@pytest.mark.parametrize("header", ["cedula", "Cedula", "CEDULA", " cedula ", "Cédula", "CÉDULA"])
def test_header_matching_ignores_case_spaces_and_accents(
    make_excel: ExcelFactory, header: str
) -> None:
    result = read_cedulas(make_excel(["1234567"], header=header))

    assert len(result.rows) == 1


def test_missing_column_lists_the_columns_found(make_excel: ExcelFactory) -> None:
    path = make_excel(["1234567"], header="documento")

    with pytest.raises(InputFileError, match=r"columna llamada 'cedula'.*documento"):
        read_cedulas(path)


def test_empty_workbook_is_rejected(make_excel: ExcelFactory) -> None:
    path = make_excel([], header=None)

    with pytest.raises(InputFileError, match="vacío"):
        read_cedulas(path)


def test_file_that_does_not_exist(tmp_path: Path) -> None:
    with pytest.raises(InputFileError, match="No existe"):
        read_cedulas(tmp_path / "nada.xlsx")


def test_unsupported_extension(tmp_path: Path) -> None:
    csv = tmp_path / "cedulas.csv"
    csv.write_text("cedula\n1234567\n", encoding="utf-8")

    with pytest.raises(InputFileError, match="Formato no soportado"):
        read_cedulas(csv)


def test_corrupt_xlsx(tmp_path: Path) -> None:
    broken = tmp_path / "roto.xlsx"
    broken.write_bytes(b"esto no es un excel")

    with pytest.raises(InputFileError, match="No se pudo abrir"):
        read_cedulas(broken)


def test_first_data_row_is_not_confused_with_the_header(make_excel: ExcelFactory) -> None:
    # La primera fila con contenido es el encabezado; una cédula nunca se descarta como tal.
    result = read_cedulas(make_excel(["1234567"]))

    assert [r.raw for r in result.rows] == ["1234567"]


def test_blank_rows_before_the_header_are_skipped(tmp_path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    sheet.append([])
    sheet.append([None, None])
    sheet.append(["cedula"])
    sheet.append(["1234567"])
    path = tmp_path / "con_filas_vacias.xlsx"
    workbook.save(path)

    result = read_cedulas(path)

    assert [(r.row, r.raw) for r in result.rows] == [(4, "1234567")]


def test_header_without_data_rows_returns_nothing(make_excel: ExcelFactory) -> None:
    result = read_cedulas(make_excel([]))

    assert result.rows == []
    assert result.blank_rows == 0


def test_other_columns_are_ignored(tmp_path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    sheet.append(["nombre", "cedula", "observacion"])
    sheet.append(["Ana", "1234567", "x"])
    sheet.append(["Luis", None, "sin cédula"])
    path = tmp_path / "varias_columnas.xlsx"
    workbook.save(path)

    result = read_cedulas(path)

    assert [r.raw for r in result.rows] == ["1234567"]
    assert result.blank_rows == 1
