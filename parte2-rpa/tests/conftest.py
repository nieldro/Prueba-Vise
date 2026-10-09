from __future__ import annotations

import threading
from collections.abc import Callable, Iterable, Iterator
from pathlib import Path

import pytest
from openpyxl import Workbook

from rpa_antecedentes.client import AntecedentesClient
from rpa_antecedentes.mock_server import MockConfig, create_server

ExcelFactory = Callable[..., Path]


@pytest.fixture
def make_excel(tmp_path: Path) -> ExcelFactory:
    """Crea un .xlsx con la columna `cedula` (u otra) y los valores dados."""

    def factory(
        values: Iterable[object],
        *,
        header: str | None = "cedula",
        name: str = "cedulas.xlsx",
    ) -> Path:
        workbook = Workbook()
        sheet = workbook.active
        assert sheet is not None
        if header is not None:
            sheet.append([header])
        for value in values:
            sheet.append([value])
        path = tmp_path / name
        workbook.save(path)
        return path

    return factory


@pytest.fixture
def mock_service() -> Iterator[str]:
    """Servicio simulado real en un puerto libre; devuelve su URL base."""
    server = create_server("127.0.0.1", 0, MockConfig(slow_seconds=1.5))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


@pytest.fixture
def fast_client(mock_service: str) -> AntecedentesClient:
    """Cliente con esperas mínimas para que las pruebas no tarden."""
    return AntecedentesClient(
        mock_service, timeout=0.5, max_retries=3, backoff_base=0.01, backoff_max=0.05
    )
