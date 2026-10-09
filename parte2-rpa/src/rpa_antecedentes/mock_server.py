"""Servicio simulado de antecedentes (datos ficticios).

Reemplaza al servicio real durante la prueba. Es determinista: la misma cédula siempre produce
el mismo resultado, y algunas cédulas "gatillo" reproducen fallas para ejercitar los reintentos.

    GET /api/v1/antecedentes?cedula=<6-10 dígitos>
        200 {"cedula", "nombres", "tiene_antecedentes", "detalle", "consultado_en"}
        404 {"error": "no_encontrado"}     400 {"error": "cedula_invalida"}
    GET /health  ->  200 {"status": "ok"}

Resultado normal según `cedula % 100`:  0-4 no encontrada | 5-14 con antecedentes | resto limpia.

Cédulas gatillo (se evalúan por el final del número):
    ...9999  siempre responde 500            (falla persistente)
    ...8888  falla 2 veces con 503 y luego responde bien   (falla transitoria)
    ...7777  responde 429 con Retry-After: 1 la primera vez (límite de uso)
    ...6666  tarda `slow_seconds` en responder             (lentitud / timeout)
"""

from __future__ import annotations

import argparse
import json
import logging
import random
import signal
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import ParseResult, parse_qs, urlparse

log = logging.getLogger("rpa_antecedentes.mock")

#: Respuesta HTTP: código, cuerpo JSON y cabeceras extra.
Reply = tuple[HTTPStatus, dict[str, Any], dict[str, str]]

FIRST_NAMES = (
    "CARLOS",
    "MARÍA",
    "JUAN",
    "LUZ",
    "ANDRÉS",
    "ANA",
    "PEDRO",
    "SOFÍA",
    "DIEGO",
    "LAURA",
    "JORGE",
    "CAMILA",
    "LUIS",
    "VALENTINA",
    "MIGUEL",
    "PAULA",
    "FELIPE",
    "DANIELA",
    "ÓSCAR",
    "NATALIA",
)
LAST_NAMES = (
    "GÓMEZ",
    "RODRÍGUEZ",
    "MARTÍNEZ",
    "LÓPEZ",
    "GARCÍA",
    "HERNÁNDEZ",
    "PÉREZ",
    "SÁNCHEZ",
    "RAMÍREZ",
    "TORRES",
    "FLÓREZ",
    "DÍAZ",
    "VARGAS",
    "CASTRO",
    "ROJAS",
    "MORENO",
    "JIMÉNEZ",
    "OSORIO",
    "PARRA",
    "SUÁREZ",
)
PERSISTENT_ERROR_SUFFIX = "9999"
TRANSIENT_ERROR_SUFFIX = "8888"
RATE_LIMIT_SUFFIX = "7777"
SLOW_SUFFIX = "6666"
TRANSIENT_FAILURES = 2


@dataclass(frozen=True, slots=True)
class MockConfig:
    slow_seconds: float = 8.0
    failure_rate: float = 0.0
    """Probabilidad (0-1) de responder 503 al azar, para pruebas de estrés."""
    seed: int | None = None


def fake_names(cedula: str) -> str:
    """Nombre ficticio estable derivado de la cédula."""
    n = int(cedula)
    first = n % 20
    second = (first + 1 + (n // 20) % 19) % 20  # siempre distinto del primer nombre
    return (
        f"{FIRST_NAMES[first]} {FIRST_NAMES[second]} "
        f"{LAST_NAMES[(n // 400) % 20]} {LAST_NAMES[(n // 8000) % 20]}"
    )


def default_outcome(cedula: str) -> str:
    """'not_found', 'records' o 'clean' según el residuo de la cédula."""
    bucket = int(cedula) % 100
    if bucket < 5:
        return "not_found"
    if bucket < 15:
        return "records"
    return "clean"


class MockServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address: tuple[str, int], config: MockConfig) -> None:
        super().__init__(address, _Handler)
        self.config = config
        self.rng = random.Random(config.seed)
        self._hits: dict[str, int] = {}
        self._lock = threading.Lock()

    def next_hit(self, cedula: str) -> int:
        """Cuántas veces se ha consultado esta cédula (1 en la primera)."""
        with self._lock:
            self._hits[cedula] = self._hits.get(cedula, 0) + 1
            return self._hits[cedula]

    def random_failure(self) -> bool:
        with self._lock:
            return self.rng.random() < self.config.failure_rate


class _Handler(BaseHTTPRequestHandler):
    server: MockServer
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        log.debug("%s - %s", self.address_string(), format % args)

    def _send(
        self, status: HTTPStatus, body: dict[str, Any], headers: dict[str, str] | None = None
    ) -> None:
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        status, body, headers = self._answer(urlparse(self.path))
        self._send(status, body, headers)

    def _answer(self, url: ParseResult) -> Reply:
        """Decide qué responder; `do_GET` solo se ocupa de enviarlo."""
        if url.path == "/health":
            return HTTPStatus.OK, {"status": "ok"}, {}
        if url.path != "/api/v1/antecedentes":
            return HTTPStatus.NOT_FOUND, {"error": "ruta_desconocida"}, {}

        cedula = parse_qs(url.query).get("cedula", [""])[0]
        if not (cedula.isascii() and cedula.isdigit() and 6 <= len(cedula) <= 10):
            return HTTPStatus.BAD_REQUEST, {"error": "cedula_invalida"}, {}
        if self.server.random_failure():
            return HTTPStatus.SERVICE_UNAVAILABLE, {"error": "servicio_ocupado"}, {}

        failure = self._trigger_failure(cedula, self.server.next_hit(cedula))
        if failure is not None:
            return failure
        if cedula.endswith(SLOW_SUFFIX):
            time.sleep(self.server.config.slow_seconds)
        return self._lookup(cedula)

    @staticmethod
    def _trigger_failure(cedula: str, hit: int) -> Reply | None:
        """Falla programada de las cédulas gatillo, o `None` si responden normal."""
        if cedula.endswith(PERSISTENT_ERROR_SUFFIX):
            return HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "error_interno"}, {}
        if cedula.endswith(TRANSIENT_ERROR_SUFFIX) and hit <= TRANSIENT_FAILURES:
            return HTTPStatus.SERVICE_UNAVAILABLE, {"error": "temporalmente_no_disponible"}, {}
        if cedula.endswith(RATE_LIMIT_SUFFIX) and hit == 1:
            return (
                HTTPStatus.TOO_MANY_REQUESTS,
                {"error": "demasiadas_consultas"},
                {"Retry-After": "1"},
            )
        return None

    @staticmethod
    def _lookup(cedula: str) -> Reply:
        outcome = default_outcome(cedula)
        if outcome == "not_found":
            return HTTPStatus.NOT_FOUND, {"error": "no_encontrado"}, {}
        has_records = outcome == "records"
        body: dict[str, Any] = {
            "cedula": cedula,
            "nombres": fake_names(cedula),
            "tiene_antecedentes": has_records,
            "detalle": (
                "Registra 1 antecedente disciplinario (dato ficticio)"
                if has_records
                else "No registra antecedentes (dato ficticio)"
            ),
            "consultado_en": datetime.now().astimezone().isoformat(timespec="seconds"),
        }
        return HTTPStatus.OK, body, {}


def create_server(
    host: str = "127.0.0.1", port: int = 0, config: MockConfig | None = None
) -> MockServer:
    """Crea el servidor sin arrancarlo. `port=0` elige un puerto libre (útil en pruebas)."""
    return MockServer((host, port), config or MockConfig())


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="rpa-antecedentes-mock", description=__doc__.split("\n")[0]
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument(
        "--slow-seconds", type=float, default=8.0, help="demora de las cédulas ...6666"
    )
    parser.add_argument(
        "--failure-rate", type=float, default=0.0, help="probabilidad de 503 al azar (0-1)"
    )
    parser.add_argument("--seed", type=int, default=None, help="semilla del azar de --failure-rate")
    parser.add_argument("--log-level", default="INFO", choices=("DEBUG", "INFO", "WARNING"))
    args = parser.parse_args(argv)
    if not 0.0 <= args.failure_rate <= 1.0:
        parser.error("--failure-rate debe estar entre 0 y 1")

    logging.basicConfig(
        level=args.log_level, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    )
    server = create_server(
        args.host, args.port, MockConfig(args.slow_seconds, args.failure_rate, args.seed)
    )

    def stop(_signum: int, _frame: object) -> None:
        # `shutdown` bloquea hasta que `serve_forever` termina: se llama desde otro hilo.
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    log.info(
        "Servicio simulado en http://%s:%d (datos ficticios)", args.host, server.server_address[1]
    )
    try:
        server.serve_forever()
    finally:
        server.server_close()
        log.info("Servicio simulado detenido")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
