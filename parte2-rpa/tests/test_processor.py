from __future__ import annotations

import logging
import threading
from datetime import datetime

import pytest

from rpa_antecedentes.client import InvalidResponseError, ServiceResponse, ServiceUnavailableError
from rpa_antecedentes.models import Candidate, Status
from rpa_antecedentes.processor import Processor

FIXED = datetime(2026, 10, 9, 12, 0, 0)


class FakeClient:
    """Cliente falso: `script` asigna a cada cédula una respuesta o una excepción."""

    def __init__(self, script: dict[str, ServiceResponse | Exception]) -> None:
        self.script = script
        self.calls: list[str] = []
        self._lock = threading.Lock()

    def lookup(self, cedula: str) -> ServiceResponse:
        with self._lock:
            self.calls.append(cedula)
        outcome = self.script[cedula]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


def candidate(cedula: str, error: str | None = None, row: int = 2) -> Candidate:
    return Candidate(row=row, cedula=cedula, error=error)


def processor(client: FakeClient, **kwargs: object) -> Processor:
    return Processor(client, clock=lambda: FIXED, **kwargs)  # type: ignore[arg-type]


def test_maps_each_service_outcome_to_a_status() -> None:
    client = FakeClient(
        {
            "1111111": ServiceResponse(True, "ANA PÉREZ", False, "No registra antecedentes"),
            "2222222": ServiceResponse(True, "LUIS GÓMEZ", True, "Registra 1 antecedente"),
            "3333333": ServiceResponse(found=False),
        }
    )

    results = processor(client).run(
        [candidate("1111111"), candidate("2222222"), candidate("3333333")]
    )

    assert [r.status for r in results] == [Status.CLEAN, Status.WITH_RECORDS, Status.NOT_FOUND]
    assert results[0].names == "ANA PÉREZ"
    assert results[1].detail == "Registra 1 antecedente"
    assert results[2].detail == "La cédula no figura en el servicio"
    assert all(r.queried_at == FIXED for r in results)


def test_a_failing_query_does_not_stop_the_rest() -> None:
    client = FakeClient(
        {
            "1111111": ServiceResponse(True, "A", False, ""),
            "2222222": ServiceUnavailableError("sin respuesta tras 4 intentos", attempts=4),
            "3333333": InvalidResponseError("HTTP 403"),
            "4444444": ServiceResponse(True, "D", True, ""),
        }
    )

    results = processor(client).run([candidate(c) for c in client.script])

    assert [r.status for r in results] == [
        Status.CLEAN,
        Status.ERROR,
        Status.ERROR,
        Status.WITH_RECORDS,
    ]
    assert "4 intentos" in results[1].detail
    assert results[1].queried_at == FIXED
    assert client.calls == list(client.script)  # las 4 se consultaron


def test_unexpected_exceptions_are_contained_and_reported() -> None:
    client = FakeClient(
        {
            "1111111": RuntimeError("bug inesperado"),
            "2222222": ServiceResponse(True, "B", False, ""),
        }
    )

    results = processor(client).run([candidate("1111111"), candidate("2222222")])

    assert results[0].status is Status.ERROR
    assert "RuntimeError" in results[0].detail
    assert results[1].status is Status.CLEAN


def test_invalid_cedulas_are_reported_as_error_without_querying() -> None:
    client = FakeClient({"1111111": ServiceResponse(True, "A", False, "")})

    results = processor(client).run(
        [candidate("12", error="debe tener entre 6 y 10 dígitos"), candidate("1111111")]
    )

    assert client.calls == ["1111111"]
    assert results[0].status is Status.ERROR
    assert results[0].detail.startswith("Cédula inválida:")
    assert results[0].cedula == "12"
    assert results[0].queried_at is None


def test_results_keep_input_order_with_several_workers() -> None:
    cedulas = [f"{n:07d}" for n in range(1000000, 1000040)]
    client = FakeClient({c: ServiceResponse(True, f"N{c}", False, "") for c in cedulas})

    results = processor(client, workers=8).run([candidate(c) for c in cedulas])

    assert [r.cedula for r in results] == cedulas
    assert sorted(client.calls) == sorted(cedulas)


def test_empty_input_returns_no_results() -> None:
    assert processor(FakeClient({})).run([]) == []


@pytest.mark.parametrize("workers", [0, -1, 33])
def test_workers_out_of_range_are_rejected(workers: int) -> None:
    with pytest.raises(ValueError, match="workers"):
        Processor(FakeClient({}), workers=workers)


def test_results_are_logged_with_masked_ids(caplog: pytest.LogCaptureFixture) -> None:
    client = FakeClient({"1012345678": ServiceResponse(True, "A", False, "")})

    with caplog.at_level(logging.INFO, logger="rpa_antecedentes"):
        processor(client).run([candidate("1012345678")])

    assert "resultado cedula=*******678 estado=limpio" in caplog.text
    assert "1012345678" not in caplog.text


def test_default_clock_returns_naive_local_time() -> None:
    client = FakeClient({"1111111": ServiceResponse(True, "A", False, "")})

    result = Processor(client).run([candidate("1111111")])[0]

    assert result.queried_at is not None
    assert result.queried_at.tzinfo is None  # Excel no admite zonas horarias
