"""Los scripts de ejecución funcionan directamente, sin instalar el paquete."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def run_script(name: str, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(ROOT / name), *args],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
        cwd=ROOT,
        # Sin PYTHONPATH: el script debe encontrar el paquete por sí solo.
        env={"PATH": "", "SYSTEMROOT": "C:\\Windows"} if sys.platform == "win32" else {"PATH": ""},
    )


@pytest.mark.parametrize("script", ["ejecutar.py", "ejecutar_servicio_simulado.py"])
def test_scripts_show_help_without_installing_the_package(script: str) -> None:
    result = run_script(script, "--help")

    assert result.returncode == 0, result.stderr
    assert "usage:" in result.stdout.lower()


def test_ejecutar_runs_the_whole_flow_against_a_missing_input(tmp_path: Path) -> None:
    result = run_script("ejecutar.py", "--input", str(tmp_path / "no_existe.xlsx"))

    assert result.returncode == 1
    assert "No existe el archivo de entrada" in result.stderr
