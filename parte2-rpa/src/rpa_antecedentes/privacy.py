"""Utilidades de privacidad para los registros (logs)."""

from __future__ import annotations


def mask_id(cedula: str, enabled: bool = True) -> str:
    """Oculta una cédula en los logs dejando solo los 3 últimos caracteres: '*******678'.

    Un número de documento es un dato personal; los logs se comparten y se guardan por más
    tiempo que el reporte, así que por defecto no lo contienen completo.
    """
    if not enabled or len(cedula) <= 3:
        return cedula
    return "*" * (len(cedula) - 3) + cedula[-3:]
