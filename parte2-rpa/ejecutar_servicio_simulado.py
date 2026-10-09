#!/usr/bin/env python3
"""Arranca el servicio simulado de antecedentes (datos ficticios), sin instalar el paquete.

Uso:
    python ejecutar_servicio_simulado.py                 # http://127.0.0.1:8080
    python ejecutar_servicio_simulado.py --port 9000
    python ejecutar_servicio_simulado.py --help
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from rpa_antecedentes.mock_server import main

if __name__ == "__main__":
    raise SystemExit(main())
