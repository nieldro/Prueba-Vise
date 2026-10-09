from __future__ import annotations

import logging
import threading

import pytest
import requests
import responses

from rpa_antecedentes.client import (
    ENDPOINT,
    AntecedentesClient,
    ConfigurationError,
    InvalidResponseError,
    ServiceUnavailableError,
)

BASE = "http://servicio.test"
URL = BASE + ENDPOINT
OK_BODY = {
    "cedula": "1234567",
    "nombres": "ANA PÉREZ",
    "tiene_antecedentes": False,
    "detalle": "ok",
}


def make_client(sleeps: list[float], **overrides: object) -> AntecedentesClient:
    """Cliente sin esperas reales: registra los tiempos de espera en `sleeps`."""
    options: dict[str, object] = {
        "timeout": 1.0,
        "max_retries": 3,
        "backoff_base": 0.5,
        "backoff_max": 8.0,
        "sleep": sleeps.append,
        "jitter": lambda delay: delay,  # sin azar: tiempos exactos
    }
    options.update(overrides)
    return AntecedentesClient(BASE, **options)  # type: ignore[arg-type]


@responses.activate
def test_successful_lookup_parses_the_response() -> None:
    responses.get(URL, json=OK_BODY)

    result = make_client([]).lookup("1234567")

    assert result.found is True
    assert result.names == "ANA PÉREZ"
    assert result.has_records is False
    assert result.detail == "ok"


@responses.activate
def test_sends_the_cedula_as_query_parameter() -> None:
    responses.get(URL, json=OK_BODY)

    make_client([]).lookup("1234567")

    assert responses.calls[0].request.params == {"cedula": "1234567"}  # type: ignore[attr-defined]


@responses.activate
def test_404_means_not_found_and_is_not_retried() -> None:
    responses.get(URL, status=404, json={"error": "no_encontrado"})
    sleeps: list[float] = []

    result = make_client(sleeps).lookup("1234567")

    assert result.found is False
    assert len(responses.calls) == 1
    assert sleeps == []


@responses.activate
def test_retries_503_with_exponential_backoff_then_succeeds() -> None:
    responses.get(URL, status=503)
    responses.get(URL, status=503)
    responses.get(URL, status=503)
    responses.get(URL, json=OK_BODY)
    sleeps: list[float] = []

    result = make_client(sleeps).lookup("1234567")

    assert result.found is True
    assert len(responses.calls) == 4
    assert sleeps == [0.5, 1.0, 2.0]  # base * 2**(n-1)


@responses.activate
def test_backoff_is_capped_by_backoff_max() -> None:
    for _ in range(5):
        responses.get(URL, status=500)
    responses.get(URL, json=OK_BODY)
    sleeps: list[float] = []

    make_client(sleeps, max_retries=5, backoff_base=1.0, backoff_max=3.0).lookup("1234567")

    assert sleeps == [1.0, 2.0, 3.0, 3.0, 3.0]


@responses.activate
def test_gives_up_after_exhausting_retries() -> None:
    responses.get(URL, status=500)
    sleeps: list[float] = []

    with pytest.raises(ServiceUnavailableError, match="4 intentos") as info:
        make_client(sleeps).lookup("1234567")

    assert info.value.attempts == 4
    assert len(responses.calls) == 4
    assert len(sleeps) == 3  # no se espera después del último intento


@responses.activate
def test_max_retries_zero_means_a_single_attempt() -> None:
    responses.get(URL, status=503)
    sleeps: list[float] = []

    with pytest.raises(ServiceUnavailableError):
        make_client(sleeps, max_retries=0).lookup("1234567")

    assert len(responses.calls) == 1
    assert sleeps == []


@responses.activate
def test_429_honours_retry_after_when_larger_than_backoff() -> None:
    responses.get(URL, status=429, headers={"Retry-After": "3"})
    responses.get(URL, json=OK_BODY)
    sleeps: list[float] = []

    make_client(sleeps).lookup("1234567")

    assert sleeps == [3.0]


@responses.activate
def test_retry_after_is_capped_by_backoff_max() -> None:
    responses.get(URL, status=429, headers={"Retry-After": "120"})
    responses.get(URL, json=OK_BODY)
    sleeps: list[float] = []

    make_client(sleeps, backoff_max=8.0).lookup("1234567")

    assert sleeps == [8.0]


@responses.activate
def test_unparseable_retry_after_falls_back_to_backoff() -> None:
    responses.get(URL, status=503, headers={"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"})
    responses.get(URL, json=OK_BODY)
    sleeps: list[float] = []

    make_client(sleeps).lookup("1234567")

    assert sleeps == [0.5]


@responses.activate
def test_connection_errors_are_retried() -> None:
    responses.get(URL, body=requests.ConnectionError("rechazada"))
    responses.get(URL, json=OK_BODY)
    sleeps: list[float] = []

    result = make_client(sleeps).lookup("1234567")

    assert result.found is True
    assert sleeps == [0.5]


@responses.activate
def test_timeouts_are_retried() -> None:
    responses.get(URL, body=requests.Timeout("lento"))
    responses.get(URL, json=OK_BODY)
    sleeps: list[float] = []

    result = make_client(sleeps).lookup("1234567")

    assert result.found is True
    assert sleeps == [0.5]


@responses.activate
def test_persistent_timeout_reports_the_reason() -> None:
    responses.get(URL, body=requests.Timeout("lento"))

    with pytest.raises(ServiceUnavailableError, match="timeout"):
        make_client([], max_retries=1).lookup("1234567")


@responses.activate
def test_other_network_errors_are_retried() -> None:
    responses.get(URL, body=requests.exceptions.ChunkedEncodingError("cortada"))
    responses.get(URL, json=OK_BODY)

    assert make_client([]).lookup("1234567").found is True


@responses.activate
@pytest.mark.parametrize("status", [400, 401, 403, 422])
def test_client_errors_are_not_retried(status: int) -> None:
    responses.get(URL, status=status)
    sleeps: list[float] = []

    with pytest.raises(InvalidResponseError, match=str(status)):
        make_client(sleeps).lookup("1234567")

    assert len(responses.calls) == 1
    assert sleeps == []


@responses.activate
def test_non_json_body_is_an_invalid_response() -> None:
    responses.get(URL, body="<html>mantenimiento</html>", content_type="text/html")

    with pytest.raises(InvalidResponseError, match="JSON"):
        make_client([]).lookup("1234567")


@responses.activate
@pytest.mark.parametrize(
    "body",
    [
        [],
        {"nombres": "ANA"},
        {"nombres": 5, "tiene_antecedentes": False},
        {"nombres": "A", "tiene_antecedentes": "no"},
    ],
)
def test_unexpected_json_shape_is_an_invalid_response(body: object) -> None:
    responses.get(URL, json=body)

    with pytest.raises(InvalidResponseError, match="formato"):
        make_client([]).lookup("1234567")


@responses.activate
def test_missing_detail_defaults_to_empty() -> None:
    responses.get(URL, json={"nombres": "ANA", "tiene_antecedentes": True})

    result = make_client([]).lookup("1234567")

    assert result.has_records is True
    assert result.detail == ""


def test_log_masks_the_cedula_by_default(caplog: pytest.LogCaptureFixture) -> None:
    with responses.RequestsMock() as mock:
        mock.get(URL, json=OK_BODY)
        with caplog.at_level(logging.INFO, logger="rpa_antecedentes"):
            make_client([]).lookup("1012345678")

    assert "*******678" in caplog.text
    assert "1012345678" not in caplog.text


def test_log_can_show_the_full_cedula(caplog: pytest.LogCaptureFixture) -> None:
    with responses.RequestsMock() as mock:
        mock.get(URL, json=OK_BODY)
        with caplog.at_level(logging.INFO, logger="rpa_antecedentes"):
            make_client([], mask_ids=False).lookup("1012345678")

    assert "cedula=1012345678" in caplog.text


def test_every_attempt_is_logged(caplog: pytest.LogCaptureFixture) -> None:
    with responses.RequestsMock() as mock:
        mock.get(URL, status=503)
        mock.get(URL, json=OK_BODY)
        with caplog.at_level(logging.INFO, logger="rpa_antecedentes"):
            make_client([]).lookup("1234567")

    assert "intento=1/4 falló (HTTP 503)" in caplog.text
    assert "intento=2/4 http=200" in caplog.text


@pytest.mark.parametrize(
    "url",
    [
        "https://apps.procuraduria.gov.co/webcert/inicio.aspx?tpo=2",
        "https://apps.procuraduria.gov.co",
        "http://PROCURADURIA.GOV.CO/algo",
    ],
)
def test_real_procuraduria_portal_is_rejected_with_an_explanation(url: str) -> None:
    with pytest.raises(ConfigurationError, match="captcha"):
        AntecedentesClient(url)


@pytest.mark.parametrize("url", ["", "localhost:8080", "ftp://servicio.test", "http://"])
def test_invalid_urls_are_rejected(url: str) -> None:
    with pytest.raises(ConfigurationError, match="URL del servicio inválida"):
        AntecedentesClient(url)


def test_trailing_slash_in_base_url_is_normalised() -> None:
    assert AntecedentesClient("http://servicio.test/").url == URL


@pytest.mark.parametrize(
    "options",
    [
        {"timeout": 0},
        {"max_retries": -1},
        {"backoff_base": 0},
        {"backoff_base": 2.0, "backoff_max": 1.0},
    ],
)
def test_invalid_parameters_are_rejected(options: dict[str, float]) -> None:
    with pytest.raises(ConfigurationError):
        AntecedentesClient(BASE, **options)  # type: ignore[arg-type]


def test_real_sessions_are_per_thread() -> None:
    client = AntecedentesClient(BASE)
    sessions: list[object] = []
    sessions.append(client._session())
    sessions.append(client._session())
    worker = threading.Thread(target=lambda: sessions.append(client._session()))
    worker.start()
    worker.join()

    assert sessions[0] is sessions[1]
    assert sessions[0] is not sessions[2]
