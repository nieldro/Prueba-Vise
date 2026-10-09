"""Parámetros de ejecución: línea de comandos con valores por defecto desde variables de entorno."""

from __future__ import annotations

import argparse
import os
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

from rpa_antecedentes.processor import MAX_WORKERS

DEFAULT_URL = "http://localhost:8080"
LOG_LEVELS = ("DEBUG", "INFO", "WARNING", "ERROR")


@dataclass(frozen=True, slots=True)
class Settings:
    input_path: Path
    output_path: Path
    service_url: str
    timeout: float
    max_retries: int
    backoff_base: float
    backoff_max: float
    workers: int
    log_level: str
    log_file: Path
    mask_ids: bool


def _env_number(environ: Mapping[str, str], name: str, default: float, kind: type) -> float:
    raw = environ.get(name)
    if raw is None or raw == "":
        return default
    try:
        return float(kind(raw))
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"La variable {name}='{raw}' no es un número válido"
        ) from exc


def build_parser(environ: Mapping[str, str]) -> argparse.ArgumentParser:
    env = environ.get
    parser = argparse.ArgumentParser(
        prog="rpa-antecedentes",
        description=(
            "Lee un Excel con una columna 'cedula', consulta cada cédula única en el servicio de "
            "antecedentes y genera un reporte Excel. Cada opción puede darse también por la "
            "variable de entorno indicada."
        ),
        epilog="Códigos de salida: 0 = terminó (revise la columna estado); 1 = error de "
        "entrada/salida; 2 = parámetros inválidos; 130 = interrumpido.",
    )
    parser.add_argument(
        "-i",
        "--input",
        type=Path,
        default=Path(env("RPA_INPUT", "cedulas.xlsx")),
        help="Excel de entrada con la columna 'cedula' [RPA_INPUT] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path(env("RPA_OUTPUT", "reporte_antecedentes.xlsx")),
        help="Excel del reporte [RPA_OUTPUT] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "--url",
        default=env("ANTECEDENTES_URL", DEFAULT_URL),
        help="URL base del servicio [ANTECEDENTES_URL] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=_env_number(environ, "ANTECEDENTES_TIMEOUT", 5.0, float),
        help="segundos máximos por intento [ANTECEDENTES_TIMEOUT] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=int(_env_number(environ, "ANTECEDENTES_RETRIES", 3, int)),
        help="reintentos tras el primer intento [ANTECEDENTES_RETRIES] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "--backoff-base",
        type=float,
        default=_env_number(environ, "ANTECEDENTES_BACKOFF_BASE", 0.5, float),
        help="espera inicial en segundos; se duplica en cada reintento "
        "[ANTECEDENTES_BACKOFF_BASE] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "--backoff-max",
        type=float,
        default=_env_number(environ, "ANTECEDENTES_BACKOFF_MAX", 8.0, float),
        help="tope de la espera entre reintentos [ANTECEDENTES_BACKOFF_MAX] "
        "(por defecto: %(default)s)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=int(_env_number(environ, "RPA_WORKERS", 1, int)),
        help=f"consultas en paralelo, 1-{MAX_WORKERS} [RPA_WORKERS] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "--log-level",
        choices=LOG_LEVELS,
        default=env("RPA_LOG_LEVEL", "INFO").upper(),
        help="nivel del log [RPA_LOG_LEVEL] (por defecto: %(default)s)",
    )
    parser.add_argument(
        "--log-file",
        type=Path,
        default=env("RPA_LOG_FILE") or None,
        help="archivo del log [RPA_LOG_FILE] (por defecto: rpa_antecedentes.log junto al reporte)",
    )
    parser.add_argument(
        "--log-full-ids",
        action="store_true",
        default=env("RPA_LOG_FULL_IDS", "").lower() in {"1", "true", "yes", "si"},
        help="escribe las cédulas completas en el log [RPA_LOG_FULL_IDS]; "
        "por defecto se enmascaran",
    )
    return parser


def parse_settings(
    argv: Sequence[str] | None = None, environ: Mapping[str, str] | None = None
) -> Settings:
    """Convierte argumentos y entorno en `Settings`. Termina con código 2 si son inválidos."""
    env = os.environ if environ is None else environ
    try:
        parser = build_parser(env)
    except argparse.ArgumentTypeError as exc:
        raise SystemExit(f"rpa-antecedentes: error: {exc}") from exc
    args = parser.parse_args(argv)

    if not 1 <= args.workers <= MAX_WORKERS:
        parser.error(f"--workers debe estar entre 1 y {MAX_WORKERS}")
    if args.retries < 0:
        parser.error("--retries no puede ser negativo")

    output: Path = args.output
    return Settings(
        input_path=args.input,
        output_path=output,
        service_url=args.url,
        timeout=args.timeout,
        max_retries=args.retries,
        backoff_base=args.backoff_base,
        backoff_max=args.backoff_max,
        workers=args.workers,
        log_level=args.log_level,
        log_file=Path(args.log_file) if args.log_file else output.parent / "rpa_antecedentes.log",
        mask_ids=not args.log_full_ids,
    )
