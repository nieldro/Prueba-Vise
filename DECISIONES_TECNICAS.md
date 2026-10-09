# Decisiones técnicas

## Parte 1: inventario (NestJS, PostgreSQL, Prisma, React)

**Stack.** NestJS por su estructura en módulos y la validación por decoradores; Prisma por las migraciones versionadas y el tipado de extremo a extremo; React con Vite y TypeScript. Un `docker compose` levanta todo.

**Consistencia del stock.** Una salida no hace "leer, comparar, escribir": ejecuta `UPDATE ... WHERE stock >= cantidad` dentro de una transacción, así Postgres serializa las salidas simultáneas y la segunda ve el stock ya descontado. Además hay restricciones `CHECK` en la base. Verificado con 12 salidas simultáneas de 3 unidades sobre 20: 6 aceptadas, 6 rechazadas (422) y stock final 2.

**Kardex y motivo.** Cada movimiento guarda su saldo resultante, calculado en la misma transacción, y un **motivo obligatorio** (venta, dañado, pérdida, dotación, compra, devolución, ajuste) que debe corresponder al tipo. Se valida en la API (400) y con un `CHECK` en la tabla. El stock solo cambia por movimientos.

**Seguridad y errores.** bcrypt (coste 12), JWT con expiración validado contra la base, guard global (una ruta nueva nace protegida), validación con lista blanca, límite de peticiones, `helmet` y variables de entorno validadas al arrancar. Los errores de Prisma se traducen a 404/409; las reglas de negocio responden 422 o 409.

**Alcance.** Sin CRUD de usuarios (no se pide). Un producto con historial no se elimina. Pruebas unitarias sobre los servicios de movimientos y categorías; la interfaz se verificó recorriendo cada control en un navegador real.

**Interfaz.** Estructura y estilo 3D de la referencia entregada, con la paleta de la prueba y el logo de VISE. Cada control tiene una acción real; los filtros viven en la URL y los listados se exportan a CSV. El efecto 3D es solo CSS y respeta `prefers-reduced-motion`.

## Parte 2: RPA (Python)

**Modularidad.** Lector, validador, cliente HTTP, procesador y generador de reporte son módulos independientes que se comunican por tipos, así que cada uno se prueba o reemplaza por separado.

**Servicio simulado.** El enunciado pide un servicio simulado, aunque cita el portal real de la Procuraduría. Ese portal usa captcha y exige autorización del titular, por lo que no se automatiza: el proyecto incluye su propio servicio (determinista, con cédulas que provocan fallas) y el cliente rechaza explícitamente la URL real con un mensaje claro. Cambiar de fuente solo requiere otro cliente con el mismo método `lookup`.

**Reintentos.** Se reintenta lo transitorio (timeout, conexión, 429, 5xx) con espera `base · 2^(n-1)`, *jitter* y tope; se respeta `Retry-After`. No se reintenta lo que no mejora (404, otros 4xx, respuestas ilegibles). Agotados los intentos la cédula queda como `error` y el lote **continúa**.

**Datos y privacidad.** Validación estricta (6 a 10 dígitos ASCII), duplicados eliminados antes de consultar y cédulas inválidas reportadas, no descartadas. El log lleva marca de tiempo y **enmascara** las cédulas. El reporte se escribe de forma atómica y guarda la cédula como texto.

**Calidad.** 162 pruebas (datos inválidos, servicio caído, timeouts, 429, flujo completo) con 97 % de cobertura, `ruff` y `mypy` estricto, y CI que también construye las imágenes de Docker.
