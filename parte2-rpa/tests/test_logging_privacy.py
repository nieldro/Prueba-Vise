from __future__ import annotations

import logging
import re
from pathlib import Path

import pytest

from rpa_antecedentes.logging_setup import PACKAGE_LOGGER, configure_logging
from rpa_antecedentes.privacy import mask_id


@pytest.fixture(autouse=True)
def _clean_handlers() -> None:
    yield  # type: ignore[misc]
    logger = logging.getLogger(PACKAGE_LOGGER)
    for handler in list(logger.handlers):
        logger.removeHandler(handler)
        handler.close()


@pytest.mark.parametrize(
    ("cedula", "expected"),
    [
        ("1012345678", "*******678"),
        ("123456", "***456"),
        ("1234", "*234"),
        ("123", "123"),
        ("", ""),
    ],
)
def test_mask_id_keeps_only_the_last_three_characters(cedula: str, expected: str) -> None:
    assert mask_id(cedula) == expected


def test_mask_id_can_be_disabled() -> None:
    assert mask_id("1012345678", enabled=False) == "1012345678"


def test_log_lines_carry_a_timestamp_level_and_logger_name(tmp_path: Path) -> None:
    log_file = tmp_path / "x.log"
    configure_logging("INFO", log_file)

    logging.getLogger(f"{PACKAGE_LOGGER}.prueba").info("mensaje de prueba")

    line = log_file.read_text(encoding="utf-8").strip()
    assert line.endswith("| rpa_antecedentes.prueba | mensaje de prueba")
    assert re.match(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| INFO", line)


def test_calling_configure_twice_does_not_duplicate_handlers(tmp_path: Path) -> None:
    configure_logging("INFO", tmp_path / "a.log")
    configure_logging("INFO", tmp_path / "a.log")

    assert len(logging.getLogger(PACKAGE_LOGGER).handlers) == 2  # consola + archivo


def test_level_is_respected(tmp_path: Path) -> None:
    log_file = tmp_path / "x.log"
    configure_logging("WARNING", log_file)
    logger = logging.getLogger(f"{PACKAGE_LOGGER}.nivel")

    logger.info("no debe aparecer")
    logger.warning("sí debe aparecer")

    text = log_file.read_text(encoding="utf-8")
    assert "sí debe aparecer" in text
    assert "no debe aparecer" not in text


def test_unwritable_log_file_falls_back_to_console(tmp_path: Path) -> None:
    blocker = tmp_path / "es_un_archivo"
    blocker.write_text("x", encoding="utf-8")

    configure_logging("INFO", blocker / "x.log")  # no debe lanzar excepción

    assert len(logging.getLogger(PACKAGE_LOGGER).handlers) == 1


def test_console_only_when_no_file_is_given() -> None:
    configure_logging("INFO", None)

    assert len(logging.getLogger(PACKAGE_LOGGER).handlers) == 1
