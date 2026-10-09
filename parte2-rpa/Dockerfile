# RPA de antecedentes + servicio simulado. La misma imagen sirve para ambos:
#   - por defecto ejecuta el RPA (python -m rpa_antecedentes ...)
#   - docker-compose reemplaza el entrypoint para arrancar el servicio simulado.
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencias primero: la capa se reutiliza mientras requirements.txt no cambie.
COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install --no-deps .

# Usuario sin privilegios; /data es donde se montan el Excel de entrada y el reporte.
RUN useradd --system --uid 10001 --no-create-home rpa \
    && mkdir -p /data/salida \
    && chown -R rpa /data
USER rpa
WORKDIR /data

ENTRYPOINT ["python", "-m", "rpa_antecedentes"]
CMD ["--help"]
