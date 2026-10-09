# Parte 2: RPA de consulta de antecedentes

Lee un Excel con cédulas, descarta las repetidas y las que no son válidas, consulta cada una en un
servicio de antecedentes (con reintentos y espera exponencial) y genera un reporte en Excel.

> **Todo es simulado.** El servicio y las personas son ficticios. Ver
> [Sobre el servicio](#sobre-el-servicio-por-qué-no-se-consulta-el-portal-real).

```
cedulas.xlsx ─► reader ─► validator ─► processor ─► report ─► reporte_antecedentes.xlsx
                (Excel)   (6-10 dígitos,   │  (continúa si     (+ hoja Resumen
                           sin duplicados) │   una falla)       + resumen en consola)
                                           ▼
                                        client ──HTTP──► servicio de antecedentes
                                  (reintentos + backoff)   (simulado, incluido)
```

## Cómo ejecutarlo

### Con Docker (recomendado)

Desde la raíz del repositorio (la misma configuración levanta la Parte 1):

```bash
cp .env.example .env     # una sola vez; en PowerShell: Copy-Item .env.example .env
docker compose up --build
```

El servicio `rpa` procesa `parte2-rpa/data/cedulas.xlsx` y escribe
**`parte2-rpa/data/salida/reporte_antecedentes.xlsx`** (y el log `rpa_antecedentes.log` al lado).
El resumen sale en la consola de `docker compose`. Para repetir solo el RPA, o usar otro archivo:

```bash
docker compose run --rm rpa --input /data/cedulas.xlsx --output /data/salida/otro.xlsx --workers 4
docker compose run --rm rpa --help
```

> **Linux:** el contenedor corre sin privilegios y la carpeta `data/salida` es de su usuario. Para
> que pueda escribir el reporte, indique su usuario en `.env` (`RPA_UID=$(id -u)` y
> `RPA_GID=$(id -g)`, ver `.env.example`) o ejecute `RPA_UID=$(id -u) RPA_GID=$(id -g) docker
> compose up --build`. En Windows y macOS no hace falta.

**Ejemplo de resultado ya generado:** [`data/ejemplo/reporte_antecedentes.xlsx`](data/ejemplo/reporte_antecedentes.xlsx)
y su log [`data/ejemplo/rpa_antecedentes.log`](data/ejemplo/rpa_antecedentes.log), producidos con
este mismo código a partir de `data/cedulas.xlsx`. Cada ejecución real escribe en `data/salida/`
(que no se versiona).

### Sin Docker

Requiere Python 3.11 o superior.

```bash
cd parte2-rpa
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -e .

rpa-antecedentes-mock &           # terminal 1: servicio simulado en http://localhost:8080
rpa-antecedentes -i data/cedulas.xlsx -o data/salida/reporte_antecedentes.xlsx   # terminal 2
```

`python -m rpa_antecedentes ...` es equivalente a `rpa-antecedentes ...`.

**Scripts de ejecución (sin instalar nada)**, solo hace falta Python con `requests` y `openpyxl`
(`pip install -r requirements.txt`):

```bash
python ejecutar_servicio_simulado.py        # terminal 1: servicio simulado en http://127.0.0.1:8080
python ejecutar.py --input data/cedulas.xlsx --output data/salida/reporte_antecedentes.xlsx   # terminal 2
python ejecutar.py --help                   # todas las opciones
```

## Entrada y salida

**Entrada** (`cedulas.xlsx`): una hoja con una columna llamada `cedula` (sin importar mayúsculas,
espacios o tildes). Acepta celdas de texto o numéricas. Hay un ejemplo en `data/cedulas.xlsx`
(se regenera con `python scripts/make_sample_input.py`).

**Salida** (`reporte_antecedentes.xlsx`), hoja `Reporte`:

| Columna | Contenido |
| --- | --- |
| `cedula` | La cédula, guardada como texto (no pierde ceros ni pasa a notación científica) |
| `nombres` | Nombre devuelto por el servicio (vacío si no se obtuvo) |
| `estado` | `limpio`, `con antecedentes`, `no encontrado` o `error` |
| `detalle` | Explicación: respuesta del servicio, o el motivo del error |
| `fecha_consulta` | Cuándo se consultó (vacío si la cédula era inválida y no se consultó) |

La hoja `Resumen` guarda los totales, la duración y el servicio usado. El reporte se escribe de
forma atómica: nunca queda un archivo a medias.

**Resumen en consola** al terminar: total (cédulas únicas), limpios, con antecedentes, no
encontrados y errores, más las duplicadas eliminadas y las filas vacías ignoradas.

### Reglas de depuración

- Una cédula es válida si son **6 a 10 dígitos, solo 0-9** (sin letras, espacios ni puntos).
  Las inválidas no se consultan: salen en el reporte como `error` con el motivo.
- Los **duplicados se eliminan antes de consultar** (se conserva la primera aparición; los
  espacios de los extremos no cuentan, los ceros a la izquierda sí).
- Las filas vacías se ignoran.

## Manejo de errores y reintentos

| Situación | Qué hace el RPA |
| --- | --- |
| Timeout, sin conexión, HTTP 429, 500, 502, 503, 504 | Reintenta hasta `--retries` veces (3 por defecto) |
| Espera entre intentos | `base * 2^(n-1)` segundos (0,5 → 1 → 2 ...), con *jitter* y tope `--backoff-max` |
| HTTP 429 con `Retry-After` | Espera lo que pide el servidor si es mayor (con el mismo tope) |
| HTTP 404 | No es un error: la cédula queda como `no encontrado` |
| Otro HTTP 4xx, o respuesta ilegible | No reintenta (no serviría): `error` con el motivo |
| Se agotan los reintentos | `error`, y **continúa con la siguiente cédula** |
| Falla inesperada en una cédula | Se registra con su traza, queda como `error` y el lote sigue |

## Log

Cada intento de consulta queda en el log con marca de tiempo, en consola y en
`rpa_antecedentes.log` (junto al reporte; rotativo de 5 MB):

```
2026-10-09 09:08:19 | WARNING | rpa_antecedentes.client | consulta cedula=*****888 intento=1/4 falló (HTTP 503); reintento en 0.41s
2026-10-09 09:08:19 | INFO    | rpa_antecedentes.client | consulta cedula=*****888 intento=3/4 http=200 ms=3
2026-10-09 09:08:19 | INFO    | rpa_antecedentes.processor | resultado cedula=*****888 estado=limpio
```

Las cédulas se **enmascaran** en el log (solo los 3 últimos caracteres): es un dato personal y los
logs se comparten más que el reporte. `--log-full-ids` lo desactiva.

## Opciones

| Opción | Variable de entorno | Por defecto |
| --- | --- | --- |
| `-i, --input` | `RPA_INPUT` | `cedulas.xlsx` |
| `-o, --output` | `RPA_OUTPUT` | `reporte_antecedentes.xlsx` |
| `--url` | `ANTECEDENTES_URL` | `http://localhost:8080` |
| `--timeout` | `ANTECEDENTES_TIMEOUT` | `5` s por intento |
| `--retries` | `ANTECEDENTES_RETRIES` | `3` |
| `--backoff-base` / `--backoff-max` | `ANTECEDENTES_BACKOFF_BASE` / `_MAX` | `0.5` / `8` s |
| `--workers` | `RPA_WORKERS` | `1` (hasta 32 consultas en paralelo; el orden del reporte se conserva) |
| `--log-level` | `RPA_LOG_LEVEL` | `INFO` |
| `--log-file` | `RPA_LOG_FILE` | `rpa_antecedentes.log` junto al reporte |
| `--log-full-ids` | `RPA_LOG_FULL_IDS` | desactivado (cédulas enmascaradas) |

La línea de comandos tiene prioridad sobre el entorno. **Códigos de salida:** `0` terminó (revise
la columna `estado`); `1` error de entrada o de salida (no existe el Excel, falta la columna, no se
pudo escribir el reporte); `2` parámetros inválidos; `130` interrumpido con Ctrl+C.

## Sobre el servicio: por qué no se consulta el portal real

El enunciado indica que la prueba usa un servicio **simulado** con datos ficticios, y menciona como
destino `https://apps.procuraduria.gov.co/webcert/inicio.aspx?tpo=2`. Ese portal es un formulario web
con captcha, pensado para que una persona consulte antecedentes propios o de un tercero **con su
autorización**; no expone una API y automatizarlo no es un canal oficial. Por eso:

- El proyecto trae su propio servicio simulado (`rpa_antecedentes/mock_server.py`) con un contrato
  claro, y el RPA lo usa por defecto.
- Si se configura esa URL, el RPA **se detiene con un mensaje que lo explica** (código de salida 2)
  en lugar de intentar saltarse el captcha.
- Para usar un servicio real y autorizado bastaría con apuntar `--url` a uno que respete el mismo
  contrato, o con escribir otro cliente que implemente `lookup(cedula) -> ServiceResponse`: el
  resto del código no cambia.

**Contrato:** `GET /api/v1/antecedentes?cedula=<cédula>` → `200 {"nombres", "tiene_antecedentes",
"detalle"}` · `404` si no existe · `429`/`5xx` ante fallas temporales · `GET /health`.

### Cédulas de prueba del servicio simulado

El resultado es determinista. Normalmente depende de los dos últimos dígitos (`00-04` no
encontrada, `05-14` con antecedentes, el resto limpia). Los finales siguientes provocan fallas a
propósito:

| Cédula termina en | Comportamiento |
| --- | --- |
| `9999` | Responde 500 siempre: termina como `error` tras los reintentos |
| `8888` | Falla 2 veces con 503 y luego responde bien: se recupera con reintentos |
| `7777` | Responde 429 con `Retry-After: 1` la primera vez |
| `6666` | Tarda varios segundos en responder (prueba el timeout) |

## Estructura

```
parte2-rpa/
├── src/rpa_antecedentes/
│   ├── reader.py        lectura del Excel (columna, tipos de celda, errores claros)
│   ├── validator.py     validación 6-10 dígitos y eliminación de duplicados
│   ├── client.py        cliente HTTP: reintentos, backoff exponencial, Retry-After
│   ├── processor.py     orquesta las consultas; una falla no detiene el lote
│   ├── report.py        reporte Excel (atómico) y resumen
│   ├── config.py        opciones de línea de comandos y variables de entorno
│   ├── logging_setup.py log a consola y archivo con marca de tiempo
│   ├── privacy.py       enmascarado de cédulas en el log
│   ├── models.py        tipos de datos compartidos
│   ├── cli.py           punto de entrada
│   └── mock_server.py   servicio simulado (solo biblioteca estándar)
├── tests/               165 pruebas, 97 % de cobertura
├── ejecutar.py          script de ejecución (sin instalar el paquete)
├── ejecutar_servicio_simulado.py
├── scripts/make_sample_input.py
├── data/cedulas.xlsx    entrada de ejemplo
├── Dockerfile · requirements.txt · pyproject.toml
```

Cada módulo hace una sola cosa y depende de los otros solo por sus tipos, de modo que el lector, el
validador, el cliente y el generador de reporte se pueden cambiar o probar por separado.

## Pruebas y calidad

```bash
pip install -r requirements-dev.txt     # o: pip install -e ".[dev]"
pytest --cov                            # falla si la cobertura baja de 90 %
ruff check . && ruff format --check .   # estilo
mypy                                    # tipos (modo estricto)
```

Las pruebas incluyen datos inválidos (longitud, letras, separadores, dígitos de otros alfabetos),
duplicados, Excel corrupto o sin la columna, **servicio caído** (nadie escuchando en el puerto),
timeouts, límite de uso (429), fallas transitorias y persistentes, y el flujo completo contra el
servicio simulado real.
