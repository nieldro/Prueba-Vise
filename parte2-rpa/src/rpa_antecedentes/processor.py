"""Orquesta las consultas: una cédula que falla nunca detiene a las demás."""

from __future__ import annotations

import logging
from collections.abc import Callable, Sequence
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Protocol

from rpa_antecedentes.client import ServiceError, ServiceResponse
from rpa_antecedentes.models import Candidate, QueryResult, Status
from rpa_antecedentes.privacy import mask_id

log = logging.getLogger(__name__)

MAX_WORKERS = 32


class CedulaLookup(Protocol):
    """Lo único que el procesador necesita del cliente (facilita sustituirlo en pruebas)."""

    def lookup(self, cedula: str) -> ServiceResponse: ...


def _now() -> datetime:
    """Hora local sin zona (Excel no admite fechas con zona horaria)."""
    return datetime.now().astimezone().replace(tzinfo=None, microsecond=0)


class Processor:
    def __init__(
        self,
        client: CedulaLookup,
        *,
        workers: int = 1,
        mask_ids: bool = True,
        clock: Callable[[], datetime] = _now,
    ) -> None:
        if not 1 <= workers <= MAX_WORKERS:
            raise ValueError(f"workers debe estar entre 1 y {MAX_WORKERS}")
        self._client = client
        self._workers = workers
        self._mask_ids = mask_ids
        self._clock = clock

    def run(self, candidates: Sequence[Candidate]) -> list[QueryResult]:
        """Devuelve un resultado por candidato, en el mismo orden de entrada."""
        total = len(candidates)
        log.info("Procesando %d cédulas con %d hilo(s)", total, self._workers)
        if self._workers == 1:
            return [self._process(candidate) for candidate in candidates]
        with ThreadPoolExecutor(max_workers=self._workers, thread_name_prefix="rpa") as pool:
            return list(pool.map(self._process, candidates))

    def _process(self, candidate: Candidate) -> QueryResult:
        shown = mask_id(candidate.cedula, self._mask_ids)

        if candidate.error is not None:
            log.warning("resultado cedula=%s estado=error (inválida: %s)", shown, candidate.error)
            return QueryResult(
                cedula=candidate.cedula,
                names="",
                status=Status.ERROR,
                detail=f"Cédula inválida: {candidate.error}",
                queried_at=None,
            )

        try:
            response = self._client.lookup(candidate.cedula)
        except ServiceError as exc:
            log.error("resultado cedula=%s estado=error (%s)", shown, exc)
            return self._error(candidate.cedula, str(exc))
        except Exception as exc:
            log.exception("resultado cedula=%s estado=error (falla inesperada)", shown)
            return self._error(candidate.cedula, f"Error inesperado: {type(exc).__name__}: {exc}")

        if not response.found:
            status, detail = Status.NOT_FOUND, "La cédula no figura en el servicio"
        elif response.has_records:
            status, detail = Status.WITH_RECORDS, response.detail
        else:
            status, detail = Status.CLEAN, response.detail
        log.info("resultado cedula=%s estado=%s", shown, status.value)
        return QueryResult(
            cedula=candidate.cedula,
            names=response.names,
            status=status,
            detail=detail,
            queried_at=self._clock(),
        )

    def _error(self, cedula: str, detail: str) -> QueryResult:
        return QueryResult(
            cedula=cedula,
            names="",
            status=Status.ERROR,
            detail=detail,
            queried_at=self._clock(),
        )
