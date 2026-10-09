#!/usr/bin/env python3
"""Script de ejecución del RPA por línea de comandos (no requiere instalar el paquete).

Uso:
    python ejecutar.py --input data/cedulas.xlsx --output data/salida/reporte_antecedentes.xlsx
    python ejecutar.py --help

Necesita el servicio de antecedentes en marcha (por defecto http://localhost:8080). El servicio
simulado que se incluye se arranca con:  python ejecutar_servicio_simulado.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from rpa_antecedentes.cli import main

if __name__ == "__main__":
    raise SystemExit(main())
