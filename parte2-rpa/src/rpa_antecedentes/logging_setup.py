"""Configuración del registro (log) con marca de tiempo."""

from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

PACKAGE_LOGGER = "rpa_antecedentes"
LOG_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_MAX_BYTES = 5 * 1024 * 1024
_BACKUPS = 3


def configure_logging(level: str = "INFO", log_file: Path | None = None) -> None:
    """Envía el log a la consola (stderr) y, si se indica, a un archivo rotativo.

    Se puede llamar varias veces: reemplaza los manejadores anteriores en lugar de duplicarlos.
    """
    logger = logging.getLogger(PACKAGE_LOGGER)
    logger.setLevel(level.upper())
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()

    formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)
    console = logging.StreamHandler(sys.stderr)
    console.setFormatter(formatter)
    logger.addHandler(console)

    if log_file is not None:
        try:
            log_file.parent.mkdir(parents=True, exist_ok=True)
            file_handler = RotatingFileHandler(
                log_file, maxBytes=_MAX_BYTES, backupCount=_BACKUPS, encoding="utf-8"
            )
        except OSError as exc:
            # Un log que no se puede abrir no debe impedir el trabajo: se sigue por consola.
            logger.warning(
                "No se pudo abrir el archivo de log '%s' (%s); solo consola", log_file, exc
            )
        else:
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
