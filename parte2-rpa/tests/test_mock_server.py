from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request

import pytest

from rpa_antecedentes.mock_server import (
    MockConfig,
    create_server,
    default_outcome,
    fake_names,
    main,
)


def get(base: str, path: str) -> tuple[int, dict[str, object], dict[str, str]]:
    try:
        with urllib.request.urlopen(base + path, timeout=5) as response:
            return response.status, json.load(response), dict(response.headers)
    except urllib.error.HTTPError as error:
        return error.code, json.load(error), dict(error.headers)


def lookup(base: str, cedula: str) -> tuple[int, dict[str, object], dict[str, str]]:
    return get(base, f"/api/v1/antecedentes?cedula={cedula}")


def test_health(mock_service: str) -> None:
    assert get(mock_service, "/health")[:2] == (200, {"status": "ok"})


def test_unknown_route_is_404(mock_service: str) -> None:
    status, body, _ = get(mock_service, "/otra/cosa")

    assert status == 404
    assert body["error"] == "ruta_desconocida"


@pytest.mark.parametrize("cedula", ["", "12345", "12345678901", "abc1234567", "12 345 678"])
def test_invalid_cedula_is_400(mock_service: str, cedula: str) -> None:
    assert lookup(mock_service, cedula.replace(" ", "%20"))[0] == 400


def test_clean_person(mock_service: str) -> None:
    status, body, _ = lookup(mock_service, "1012345678")  # 78 -> limpio

    assert status == 200
    assert body["tiene_antecedentes"] is False
    assert isinstance(body["nombres"], str)
    assert "ficticio" in str(body["detalle"])


def test_person_with_records(mock_service: str) -> None:
    status, body, _ = lookup(mock_service, "1098765409")  # 09 -> con antecedentes

    assert status == 200
    assert body["tiene_antecedentes"] is True


def test_not_found(mock_service: str) -> None:
    assert lookup(mock_service, "63777103")[0] == 404  # 03 -> no encontrado


def test_answers_are_deterministic(mock_service: str) -> None:
    assert (
        lookup(mock_service, "79845123")[1]["nombres"]
        == lookup(mock_service, "79845123")[1]["nombres"]
    )


def test_persistent_error_trigger(mock_service: str) -> None:
    for _ in range(3):
        assert lookup(mock_service, "77779999")[0] == 500


def test_transient_error_trigger_fails_twice_then_recovers(mock_service: str) -> None:
    statuses = [lookup(mock_service, "55558888")[0] for _ in range(4)]

    assert statuses == [503, 503, 200, 200]


def test_rate_limit_trigger_sends_retry_after_once(mock_service: str) -> None:
    first = lookup(mock_service, "66667777")
    second = lookup(mock_service, "66667777")

    assert first[0] == 429
    assert first[2]["Retry-After"] == "1"
    assert second[0] == 200


def test_slow_trigger_delays_the_answer(mock_service: str) -> None:
    started = time.perf_counter()
    status, _, _ = lookup(mock_service, "12346666")  # 66 -> limpio, pero lenta (1.5 s en pruebas)

    assert status == 200
    assert time.perf_counter() - started >= 1.4


def test_fake_names_are_stable_and_uppercase() -> None:
    assert fake_names("1012345678") == fake_names("1012345678")
    assert fake_names("1012345678").isupper()
    assert fake_names("1012345678") != fake_names("1012345679")


@pytest.mark.parametrize(
    ("cedula", "expected"),
    [
        ("1000000", "not_found"),
        ("1000004", "not_found"),
        ("1000005", "records"),
        ("1000014", "records"),
        ("1000015", "clean"),
        ("1000099", "clean"),
    ],
)
def test_default_outcome_buckets(cedula: str, expected: str) -> None:
    assert default_outcome(cedula) == expected


def test_random_failure_rate_makes_the_service_busy() -> None:
    server = create_server("127.0.0.1", 0, MockConfig(failure_rate=1.0, seed=1))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        status = lookup(f"http://127.0.0.1:{server.server_address[1]}", "1012345678")[0]
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

    assert status == 503


def test_invalid_failure_rate_is_rejected(capsys: pytest.CaptureFixture[str]) -> None:
    with pytest.raises(SystemExit) as exit_info:
        main(["--failure-rate", "2"])

    assert exit_info.value.code == 2
    assert "failure-rate" in capsys.readouterr().err
