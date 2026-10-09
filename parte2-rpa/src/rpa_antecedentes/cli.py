"""Punto de entrada por línea de comandos."""

from __future__ import annotations

import logging
import sys
from collections.abc import Sequence
from datetime import datetime

from rpa_antecedentes import __version__
from rpa_antecedentes.client import AntecedentesClient, ConfigurationError
from rpa_antecedentes.config import Settings, parse_settings
from rpa_antecedentes.logging_setup import configure_logging
from rpa_antecedentes.processor import Processor
from rpa_antecedentes.reader import InputFileError, read_cedulas
from rpa_antecedentes.report import ReportWriteError, build_summary, format_summary, write_report
from rpa_antecedentes.validator import sanitize

log = logging.getLogger(__name__)

EXIT_OK = 0
EXIT_IO_ERROR = 1
EXIT_USAGE = 2
EXIT_INTERRUPTED = 130


def _now() -> datetime:
    return datetime.now().astimezone().replace(tzinfo=None, microsecond=0)


def run(settings: Settings) -> int:
    """Ejecuta el flujo completo: leer, depurar, consultar, reportar."""
    configure_logging(settings.log_level, settings.log_file)
    started = _now()
    log.info(
        "Inicio rpa-antecedentes %s | entrada=%s | servicio=%s",
        __version__,
        settings.input_path,
        settings.service_url,
    )

    try:
        client = AntecedentesClient(
            settings.service_url,
            timeout=settings.timeout,
            max_retries=settings.max_retries,
            backoff_base=settings.backoff_base,
            backoff_max=settings.backoff_max,
            mask_ids=settings.mask_ids,
        )
    except ConfigurationError as exc:
        print(f"Error de configuración: {exc}", file=sys.stderr)
        return EXIT_USAGE

    try:
        excel = read_cedulas(settings.input_path)
    except InputFileError as exc:
        log.error("%s", exc)
        print(f"Error de entrada: {exc}", file=sys.stderr)
        return EXIT_IO_ERROR

    clean = sanitize(excel.rows)
    if not clean.candidates:
        log.warning("El Excel no contiene cédulas: se genera un reporte vacío")

    processor = Processor(client, workers=settings.workers, mask_ids=settings.mask_ids)
    results = processor.run(clean.candidates)

    summary = build_summary(
        results,
        rows_read=len(excel.rows),
        blank_rows=excel.blank_rows,
        duplicates_removed=clean.duplicates_removed,
        started_at=started,
        finished_at=_now(),
        service_url=client.url,
    )
    try:
        report_path = write_report(results, summary, settings.output_path)
    except ReportWriteError as exc:
        log.error("%s", exc)
        print(f"Error de salida: {exc}", file=sys.stderr)
        return EXIT_IO_ERROR

    print(format_summary(summary, report_path))
    log.info(
        "Fin: %d limpios, %d con antecedentes, %d no encontrados, %d errores",
        summary.clean,
        summary.with_records,
        summary.not_found,
        summary.errors,
    )
    return EXIT_OK


def main(argv: Sequence[str] | None = None) -> int:
    settings = parse_settings(argv)
    try:
        return run(settings)
    except KeyboardInterrupt:
        print("\nProceso interrumpido por el usuario.", file=sys.stderr)
        return EXIT_INTERRUPTED
