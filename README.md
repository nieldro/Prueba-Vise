<p align="center">
  <img src="parte1-inventario/frontend/public/brand/logo_vise.png" alt="VISE Ltda" width="220" />
</p>

# Prueba técnica: Desarrollador Full Stack

Empresa: **VISE Ltda**. El repositorio tiene dos partes en carpetas separadas:

| Parte | Carpeta | Estado |
| --- | --- | --- |
| 1. Mini sistema de inventario (NestJS + PostgreSQL + Prisma + React) | [`parte1-inventario/`](parte1-inventario) | Completa |
| 2. RPA de consulta de antecedentes (Python) | `parte2-rpa/` | Pendiente |

Las decisiones técnicas están resumidas en [`DECISIONES_TECNICAS.md`](DECISIONES_TECNICAS.md).

## Levantar el proyecto con Docker

Requisitos: Docker y Docker Compose v2.

```bash
cp .env.example .env        # en Windows PowerShell: Copy-Item .env.example .env
# Edita .env: define POSTGRES_PASSWORD y JWT_SECRET (mínimo 32 caracteres)
docker compose up --build
```

Al arrancar, el backend aplica las migraciones y los datos semilla de forma automática.

| Servicio | URL |
| --- | --- |
| Aplicación (React) | http://localhost:5173 |
| API | http://localhost:3000/api |
| Documentación de la API (Swagger) | http://localhost:3000/api/docs |

**Usuario de prueba** (datos semilla): `admin@vise.com` / `Admin123*`

Para detener: `docker compose down`. Para borrar también la base de datos: `docker compose down -v`.

> `POSTGRES_PASSWORD` se inserta en una URL de conexión; usa solo letras y números para evitar caracteres reservados.

## Desarrollo local (sin Docker)

Requisitos: Node 22+ y un PostgreSQL accesible.

```bash
# Backend
cd parte1-inventario/backend
cp .env.example .env              # ajusta DATABASE_URL y JWT_SECRET
npm install
npx prisma migrate deploy         # aplica las migraciones
npm run seed                      # datos semilla (idempotente)
npm run start:dev                 # http://localhost:3000/api

# Frontend (otra terminal)
cd parte1-inventario/frontend
npm install
npm run dev                       # http://localhost:5173 (reenvía /api al backend)
```

Pruebas unitarias del backend: `npm test` (dentro de `parte1-inventario/backend`).

## Parte 1: qué incluye

**API** (todas las rutas bajo `/api`; todas exigen JWT salvo `POST /auth/login` y `GET /health`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/login` | Devuelve un JWT con expiración |
| GET | `/auth/me` | Usuario autenticado |
| GET | `/products?page&limit&categoryId&search` | Listado paginado con filtro por categoría |
| GET | `/products/low-stock?threshold` | Productos con stock menor o igual al umbral |
| GET / POST / PATCH / DELETE | `/products`, `/products/:id` | CRUD con validación |
| POST | `/movements` | Registra una entrada o salida; rechaza stock negativo |
| GET | `/products/:id/kardex` | Historial con saldo acumulado y totales |
| GET / POST | `/categories` | Categorías |
| GET | `/dashboard/summary?days` | Indicadores y serie diaria para el tablero |

**Códigos HTTP**: 200/201/204 éxito, 400 validación, 401 sin sesión o credenciales inválidas, 404 recurso inexistente, 409 conflicto (SKU repetido, producto con movimientos), 422 stock insuficiente, 429 demasiadas peticiones.

**Interfaz**: resumen con indicadores y gráfica, productos (búsqueda, filtro, paginación, alta, edición, baja), movimientos, kardex por producto, categorías y stock bajo.

## Estructura

```
.
├── docker-compose.yml
├── .env.example
├── DECISIONES_TECNICAS.md
└── parte1-inventario/
    ├── backend/    NestJS: auth, products, categories, movements, dashboard, prisma
    └── frontend/   React + Vite + TypeScript
```
