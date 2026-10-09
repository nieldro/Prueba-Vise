"""Cliente HTTP del servicio de antecedentes, con reintentos y espera exponencial."""

from __future__ import annotations

import logging
import random
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from time import perf_counter
from urllib.parse import urlparse

import requests

from rpa_antecedentes.privacy import mask_id

log = logging.getLogger(__name__)

#: Respuestas que indican un problema temporal del servidor: vale la pena reintentar.
RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
#: Portal real al que este cliente NO se conecta (ver `_ensure_simulated_service`).
REAL_PORTAL_DOMAIN = "procuraduria.gov.co"
ENDPOINT = "/api/v1/antecedentes"


class ConfigurationError(ValueError):
    """Parámetros del cliente inválidos."""


class ServiceError(Exception):
    """Error al consultar el servicio."""


class ServiceUnavailableError(ServiceError):
    """El servicio no respondió bien tras agotar los reintentos."""

    def __init__(self, message: str, attempts: int) -> None:
        super().__init__(message)
        self.attempts = attempts


class InvalidResponseError(ServiceError):
    """Respuesta que no se puede interpretar o error del cliente (4xx): reintentar no ayuda."""


@dataclass(frozen=True, slots=True)
class ServiceResponse:
    found: bool
    names: str = ""
    has_records: bool = False
    detail: str = ""


def _equal_jitter(delay: float) -> float:
    """Entre la mitad y el total de la espera: evita que muchos clientes reintenten a la vez."""
    return delay * random.uniform(0.5, 1.0)


def _new_session() -> requests.Session:
    session = requests.Session()
    session.headers["Accept"] = "application/json"
    session.headers["User-Agent"] = "rpa-antecedentes/1.0"
    return session


def _retry_after_seconds(response: requests.Response) -> float | None:
    """Segundos que pide esperar el servidor (cabecera Retry-After en segundos), si los indica."""
    value = response.headers.get("Retry-After")
    if value is None:
        return None
    try:
        seconds = float(value)
    except ValueError:
        return None  # formato fecha HTTP: se ignora y se usa la espera exponencial
    return seconds if seconds >= 0 else None


def _ensure_simulated_service(base_url: str) -> str:
    """Valida la URL base y rechaza el portal real de la Procuraduría.

    Ese portal es un formulario web con captcha, pensado para que una persona consulte sus
    propios antecedentes o los de un tercero con su autorización. No expone el contrato de este
    cliente y automatizarlo no es una vía oficial; la prueba usa un servicio simulado.
    """
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ConfigurationError(
            f"URL del servicio inválida: '{base_url}' (use http:// o https://)"
        )
    host = parsed.hostname.lower()
    if host == REAL_PORTAL_DOMAIN or host.endswith("." + REAL_PORTAL_DOMAIN):
        raise ConfigurationError(
            "Este RPA consulta un servicio simulado y no el portal real de la Procuraduría: ese "
            "portal usa captcha y exige autorización del titular. Use la URL del servicio "
            "simulado (por defecto http://localhost:8080)."
        )
    return base_url.rstrip("/")


class AntecedentesClient:
    """Consulta una cédula en el servicio.

    Reintenta (hasta `max_retries` veces después del primer intento) cuando hay timeouts,
    problemas de conexión o respuestas 429/5xx, esperando `backoff_base * 2**(n-1)` segundos
    entre intentos (con jitter y tope `backoff_max`). Si el servidor envía `Retry-After`, se
    respeta cuando es mayor. Un 404 no es un error: significa "no encontrado".

    El cliente se puede usar desde varios hilos: cada hilo tiene su propia sesión HTTP.
    """

    def __init__(
        self,
        base_url: str,
        *,
        timeout: float = 5.0,
        max_retries: int = 3,
        backoff_base: float = 0.5,
        backoff_max: float = 8.0,
        mask_ids: bool = True,
        sleep: Callable[[float], None] = time.sleep,
        jitter: Callable[[float], float] = _equal_jitter,
        session_factory: Callable[[], requests.Session] = _new_session,
    ) -> None:
        if timeout <= 0:
            raise ConfigurationError("timeout debe ser mayor que 0")
        if max_retries < 0:
            raise ConfigurationError("max_retries no puede ser negativo")
        if backoff_base <= 0 or backoff_max < backoff_base:
            raise ConfigurationError("backoff_base debe ser > 0 y backoff_max >= backoff_base")

        self._url = _ensure_simulated_service(base_url) + ENDPOINT
        self._timeout = timeout
        self._max_retries = max_retries
        self._backoff_base = backoff_base
        self._backoff_max = backoff_max
        self._mask_ids = mask_ids
        self._sleep = sleep
        self._jitter = jitter
        self._session_factory = session_factory
        self._local = threading.local()

    @property
    def url(self) -> str:
        return self._url

    def _session(self) -> requests.Session:
        session: requests.Session | None = getattr(self._local, "session", None)
        if session is None:
            session = self._session_factory()
            self._local.session = session
        return session

    def _backoff(self, attempt: int) -> float:
        # attempt=1 -> base, 2 -> 2*base, 3 -> 4*base... (desplazamiento = 2 ** (attempt - 1))
        return min(self._backoff_max, self._backoff_base * (1 << (attempt - 1)))

    def lookup(self, cedula: str) -> ServiceResponse:
        """Consulta una cédula ya validada.

        Raises:
            ServiceUnavailableError: tras agotar los reintentos.
            InvalidResponseError: respuesta 4xx distinta de 404 o cuerpo ilegible.
        """
        total_attempts = self._max_retries + 1
        shown = mask_id(cedula, self._mask_ids)

        for attempt in range(1, total_attempts + 1):
            started = perf_counter()
            retry_after: float | None = None
            try:
                response = self._session().get(
                    self._url, params={"cedula": cedula}, timeout=self._timeout
                )
            except requests.Timeout:
                reason = f"timeout tras {self._timeout:g}s"
            except requests.ConnectionError:
                reason = "sin conexión con el servicio"
            except requests.RequestException as exc:
                reason = f"error de red ({type(exc).__name__})"
            else:
                elapsed_ms = (perf_counter() - started) * 1000
                status = response.status_code
                if status == 200:
                    log.info(
                        "consulta cedula=%s intento=%d/%d http=200 ms=%.0f",
                        shown,
                        attempt,
                        total_attempts,
                        elapsed_ms,
                    )
                    return self._parse(response)
                if status == 404:
                    log.info(
                        "consulta cedula=%s intento=%d/%d http=404 ms=%.0f",
                        shown,
                        attempt,
                        total_attempts,
                        elapsed_ms,
                    )
                    return ServiceResponse(found=False)
                if status not in RETRYABLE_STATUS:
                    raise InvalidResponseError(f"El servicio respondió HTTP {status}")
                reason = f"HTTP {status}"
                retry_after = _retry_after_seconds(response)

            if attempt == total_attempts:
                log.error(
                    "consulta cedula=%s intento=%d/%d fallo definitivo: %s",
                    shown,
                    attempt,
                    total_attempts,
                    reason,
                )
                raise ServiceUnavailableError(
                    f"El servicio no respondió tras {total_attempts} intentos (último: {reason})",
                    attempts=total_attempts,
                )

            wait = min(
                self._backoff_max, max(self._jitter(self._backoff(attempt)), retry_after or 0)
            )
            log.warning(
                "consulta cedula=%s intento=%d/%d falló (%s); reintento en %.2fs",
                shown,
                attempt,
                total_attempts,
                reason,
                wait,
            )
            self._sleep(wait)

        raise AssertionError("inalcanzable")  # pragma: no cover

    @staticmethod
    def _parse(response: requests.Response) -> ServiceResponse:
        try:
            body = response.json()
        except ValueError as exc:
            raise InvalidResponseError("La respuesta del servicio no es JSON válido") from exc
        if (
            not isinstance(body, dict)
            or not isinstance(body.get("nombres"), str)
            or not isinstance(body.get("tiene_antecedentes"), bool)
        ):
            raise InvalidResponseError("La respuesta del servicio no tiene el formato esperado")
        detail = body.get("detalle", "")
        return ServiceResponse(
            found=True,
            names=body["nombres"],
            has_records=body["tiene_antecedentes"],
            detail=detail if isinstance(detail, str) else "",
        )
