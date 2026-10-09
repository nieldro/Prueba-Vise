<p align="center">
  <img src="parte1-inventario/frontend/public/brand/logo_vise.png" alt="VISE Ltda" width="220" />
</p>

# Prueba técnica: Desarrollador Full Stack

Empresa: **VISE Ltda**. El repositorio tiene las dos partes en carpetas separadas:

| Parte | Carpeta | Tecnologías |
| --- | --- | --- |
| 1. Mini sistema de inventario | [`parte1-inventario/`](parte1-inventario) | NestJS · PostgreSQL · Prisma · React · Docker |
| 2. RPA de consulta de antecedentes | [`parte2-rpa/`](parte2-rpa) (ver su [README](parte2-rpa/README.md)) | Python 3.12 · openpyxl · requests · logging · Docker |

Las decisiones técnicas están resumidas en [`DECISIONES_TECNICAS.md`](DECISIONES_TECNICAS.md).

## Levantar todo con Docker

Requisitos: Docker y Docker Compose v2.

```bash
cp .env.example .env        # en Windows PowerShell: Copy-Item .env.example .env
# Edita .env: define POSTGRES_PASSWORD y JWT_SECRET (mínimo 32 caracteres)
docker compose up --build
```

Un solo comando levanta la base de datos, la API, la aplicación web, el servicio simulado de
antecedentes y ejecuta el RPA una vez. El backend aplica las migraciones y los datos semilla solo.

| Servicio | URL / resultado |
| --- | --- |
| Aplicación web (React) | http://localhost:5173 |
| API y documentación (Swagger) | http://localhost:3000/api · http://localhost:3000/api/docs |
| Servicio simulado de antecedentes | http://localhost:8080/health |
| **Reporte del RPA** | `parte2-rpa/data/salida/reporte_antecedentes.xlsx` (y su log al lado) |

**Usuario de prueba** (Parte 1): `admin@vise.com` / `Admin123*`

Comandos útiles:

```bash
docker compose run --rm rpa --help              # opciones del RPA; repetirlo con otro Excel
docker compose down                             # detener
docker compose down -v                          # detener y borrar la base de datos
```

> `POSTGRES_PASSWORD` se inserta en una URL de conexión; usa solo letras y números.

## Parte 1: inventario

Detalle de ejecución sin Docker:

```bash
# Backend (Node 22+ y un PostgreSQL accesible)
cd parte1-inventario/backend
cp .env.example .env              # ajusta DATABASE_URL y JWT_SECRET
npm install && npx prisma migrate deploy && npm run seed
npm run start:dev                 # http://localhost:3000/api   |   pruebas: npm test

# Frontend (otra terminal)
cd parte1-inventario/frontend
npm install && npm run dev        # http://localhost:5173 (reenvía /api al backend)
```

**API** (rutas bajo `/api`; todas exigen JWT salvo `POST /auth/login` y `GET /health`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/login` | Devuelve un JWT con expiración |
| GET | `/auth/me` | Usuario autenticado |
| GET | `/products?page&limit&categoryId&search` | Listado paginado con filtro por categoría |
| GET | `/products/low-stock?threshold` | Productos con stock menor o igual al umbral |
| GET / POST / PATCH / DELETE | `/products`, `/products/:id` | CRUD con validación |
| POST | `/movements` | Registra una entrada o salida con su **motivo**; rechaza stock negativo y motivos que no corresponden al tipo |
| GET | `/movements?page&limit&type&reason&productId&date&search` | Historial general de movimientos |
| GET | `/products/:id/kardex` | Historial con saldo acumulado y totales |
| GET / POST / PATCH / DELETE | `/categories`, `/categories/:id` | Categorías (no se elimina una con productos) |
| GET | `/dashboard/summary?days` | Indicadores, serie diaria y salidas por motivo |
| GET | `/dashboard/calendar?month=AAAA-MM` | Movimientos por día de un mes |

**Códigos HTTP**: 200/201/204 éxito, 400 validación, 401 sin sesión o credenciales inválidas, 404
recurso inexistente, 409 conflicto (SKU repetido, producto con movimientos), 422 stock
insuficiente, 429 demasiadas peticiones.

**Interfaz** (cada botón tiene una acción real):
- **Resumen**: tarjetas que abren la vista filtrada correspondiente, gráfica por periodo (7, 14 o 30 días), salidas por motivo, calendario de actividad que lleva al historial del día elegido, últimos movimientos y productos por reponer.
- **Nuevo producto** (pestaña propia): formulario con vista previa en vivo, stock inicial (queda en el kardex) e imagen opcional.
- **Registrar movimiento** (pestaña propia): se busca el producto, se elige entrada o salida y **por qué**: compra, devolución de cliente o ajuste; venta, dañado, pérdida o robo, dotación a vigilante, devolución a proveedor o ajuste. Muestra el stock resultante antes de confirmar.
- **Productos**: foto, búsqueda, filtro por categoría, paginación, edición, baja, registro de movimiento desde la fila y exportación a CSV.
- **Ficha de producto**: galería de imágenes, información general, historial (kardex con motivo) y especificaciones técnicas.
- **Historial**: movimientos con filtros (tipo, motivo, producto, día, texto), paginación y exportación a CSV.
- **Categorías**: crear, renombrar, eliminar (si está vacía) y abrir sus productos.
- **Stock bajo**: umbral configurable y botón para reponer.

**Datos de ejemplo**: catálogo de equipos de seguridad y vigilancia (cámaras, control de acceso, radios, protección personal, armamento autorizado, extintores) con 30 días de movimientos. Las imágenes son ilustraciones propias en SVG, generadas con `parte1-inventario/frontend/scripts/generate-product-art.mjs`.

## Parte 2: RPA de antecedentes

Lee `cedulas.xlsx`, valida (6 a 10 dígitos) y elimina duplicados, consulta cada cédula con
reintentos y espera exponencial, registra cada consulta en un log con marca de tiempo, continúa si
una falla y genera `reporte_antecedentes.xlsx` con `cedula, nombres, estado, detalle,
fecha_consulta` más un resumen en consola. **Usa un servicio simulado incluido**; el portal real de
la Procuraduría no se consulta (captcha y autorización del titular), y el RPA lo explica si se le
configura. Detalle, opciones, cédulas de prueba y arquitectura en
[`parte2-rpa/README.md`](parte2-rpa/README.md).

```bash
cd parte2-rpa && pip install -e ".[dev]"
pytest --cov && ruff check . && mypy       # 162 pruebas, 97 % de cobertura
```

## Estructura

```
.
├── docker-compose.yml            todo el proyecto: db, backend, frontend, servicio simulado y RPA
├── .env.example
├── DECISIONES_TECNICAS.md
├── .github/workflows/ci.yml      pruebas, tipos, estilo y construcción de imágenes
├── parte1-inventario/
│   ├── backend/                  NestJS: auth, products, categories, movements, dashboard, prisma
│   └── frontend/                 React + Vite + TypeScript
└── parte2-rpa/
    ├── src/rpa_antecedentes/     lector, validador, cliente HTTP, procesador, reporte, servicio simulado
    ├── tests/                    pruebas (datos inválidos, servicio caído, reintentos, flujo completo)
    ├── data/cedulas.xlsx         entrada de ejemplo
    └── Dockerfile
```
