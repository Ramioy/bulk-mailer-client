# Bulk Mailer — cliente web (operador)

Interfaz del operador para el backend de Bulk Mailer ([Ramioy/bulk-mailer-backend](https://github.com/Ramioy/bulk-mailer-backend)): cargar soportes de un periodo y bloque, revisar el resumen, enviar con la versión del manifiesto, seguir la ejecución en vivo, atender alertas, liberar direcciones suprimidas y administrar conceptos y copia de archivo. Primera iteración: esqueleto funcional con los flujos reales; el diseño gráfico queda para después (§13 del contexto).

## Pila

- **Vite + React 19 + TypeScript estricto** (pnpm, Node 26). Sin enrutador ni gestor de estado externos: rutas por *hash* (`src/ui/router.ts`) y estado local con dos *hooks* (`useLoad`, `useAction`).
- **oxlint** (el mismo del backend), **Vitest** + Testing Library para pruebas unitarias, **Playwright** para e2e contra el backend real.

## Arquitectura

```
src/api/ports.ts        puertos: AuthApi, BatchesApi, ExecutionsApi, AlertsApi, AdminApi, SuppressionsApi, SystemApi
src/api/types.ts        contrato HTTP del backend (cuerpos y respuestas)
src/api/http/           adaptador HTTP: único lugar que llama a fetch (token Bearer, renovación ante 401, SSE)
src/domain/             TypeScript puro: periodos (America/Bogota), textos en español, progreso de la ejecución
src/ui/                 React: pantallas y componentes; solo usan los puertos (useApi)
src/main.tsx            único punto de composición (crea el adaptador HTTP)
```

`src/architecture.test.ts` y la regla `no-restricted-globals` de oxlint hacen cumplir que la interfaz nunca llame a `fetch` ni importe el adaptador.

- **Sesión:** `POST /auth/sign-in` → token de acceso y de renovación en `sessionStorage` (por pestaña). Ante `401 INVALID_ACCESS_TOKEN` se renueva una sola vez con `POST /auth/refresh` (compartida por las peticiones concurrentes) y se repite la petición; si la renovación falla, vuelve a la pantalla de inicio.
- **SSE (D11, D12):** `GET /executions/{id}/events` con `fetch` y `Authorization: Bearer`, nunca `EventSource` ni el token en la URL. Reanuda con `Last-Event-ID`; ante `TOKEN_EXPIRED` renueva y reconecta; si se cae la conexión reintenta y, si la ejecución ya terminó, se detiene.
- **Al iniciar sesión** se consulta `GET /executions/current` y, si hay una en curso, se ofrece su progreso (D10).

## Pantallas

| Pantalla | Ruta | Qué hace |
|---|---|---|
| Inicio de sesión | — | Usuario y contraseña; errores en español |
| Lote | `#/lotes?periodo=&bloque=` | Periodo (actual o anterior) y bloque; carga de PDF (campo `files`) con resultado por archivo (incluye `DUPLICATE_CONFLICT`); resumen con estado, versión del manifiesto, *listos*, *requieren corrección* (`errorType` y `fileError` aparte), *enviando*, *enviados*, *inciertos*; sincronizar destinatarios; enviar con la versión revisada (un `409 MANIFEST_CHANGED` muestra las diferencias y deshabilita *Enviar* hasta revisar de nuevo); liberar archivos (D51); por soporte: retirar, resolver conflicto (D31), resolver incierto, verificar entrega, reenviar |
| Ejecución | `#/ejecuciones/{id}` | Progreso en vivo (enviados contra total, por estado, por tipo de error, pausa con motivo y próximo envío), registro de eventos, detener con nota y opción de forzar (D32) |
| Alertas | `#/alertas` | Por defecto *Por atender* (`pending=true&resolved=false`); *Resueltas, por reconocer* y *Historial*; filtros por tipo y sujeto; reconocer con nota |
| Supresiones | `#/supresiones` | Lista y liberación con confirmación del negocio, de la consola de ZeptoMail (D19) y nota |
| Ajustes | `#/ajustes` | Catálogo de conceptos (crear, cambiar asunto, retirar, reactivar) y copia de archivo (bcc) |

En la cabecera, el indicador de `/health` y `/instance` (instancia principal o en espera, D47).

## Demo local completa (`demo/`)

Toda la pila en Docker, para probar el flujo a mano desde el navegador: PostgreSQL, los simuladores de Tayrona, SAP y ZeptoMail del backend (`mocks/`), el backend en modo producción (TLS autofirmado, rol de base de datos restringido) y este cliente servido por nginx, que reenvía `/api` al backend en el mismo origen.

Requisitos: Docker con Compose v2, git, openssl y curl. El backend se clona al lado de este repositorio (o se indica con `BACKEND_DIR`), en `main` desde el commit `fbc450d` (los simuladores escuchan en `HOST`).

```bash
git clone https://github.com/Ramioy/bulk-mailer-backend.git
```

```bash
git clone https://github.com/Ramioy/bulk-mailer-client.git
```

```bash
cd bulk-mailer-client && ./demo/up.sh
```

Al terminar imprime la URL (`http://localhost:8080`, cambiable con `WEB_PORT`) y el usuario y la contraseña del operador, que quedan en `demo/.env` (no se versiona). Para detenerla y borrar sus datos:

```bash
./demo/down.sh
```

Los contratos de prueba están en `demo/contracts-tayrona.json` (bloques de Tayrona) y `demo/contracts-sap.json` (bloque `ANGLO`). El escenario de entrega va en la dirección del contrato: `100004` rebota duro y suprime la dirección, `100005` rebota blando, `100006` genera una queja, `100007` pierde la respuesta del proveedor (queda incierto y la conciliación lo confirma al minuto), `100008` lo rechaza el proveedor (`SM_113`), `100009` está inactivo y `100010` no tiene correo. Un PDF cualquiera sirve (basta con que empiece por `%PDF-`); el nombre debe seguir la regla del backend, por ejemplo `Conjunto Altos CNCPT MULTA CNTRT 100001.pdf`.

Comprobado el 2026-10-31 por la API (carga, ejecución, rebote duro con alerta, respuesta perdida conciliada, historial del soporte y CORS del SSE); el contenedor de nginx no pudo construirse en el entorno de esa comprobación por un límite de descarga de imágenes, así que su configuración (`demo/nginx.conf`) queda por confirmar en la primera ejecución local.

## Uso

```bash
export PATH=/opt/node26/bin:$PATH   # Node 26 con pnpm (corepack)
pnpm install
pnpm dev                            # http://localhost:5173; /api → BACKEND_URL (por defecto http://localhost:3000)
```

El cliente llama a `/api/...` y el servidor de Vite lo reenvía al backend en el **mismo origen** (en despliegue, el *proxy* inverso hace lo mismo). Si se prefiere llamar al backend directamente, `VITE_API_BASE_URL=https://backend` y el backend debe tener ese origen en `CORS_ALLOWED_ORIGINS` (D49); hoy el SSE no funciona así (ver *Pendientes del backend*).

## Pruebas

```bash
pnpm lint && pnpm typecheck && pnpm test   # unitarias
pnpm test:e2e                               # e2e contra el backend real
```

`pnpm test:e2e` es autocontenido salvo PostgreSQL: Playwright arranca

1. el **backend real** con sus adaptadores simulados (`e2e/backend/start-backend.mjs`): clona el backend en `../bulk-mailer-backend-e2e` (o usa `BACKEND_DIR`), lo instala y compila, **recrea el esquema** de su propia base `bulk_mailer_e2e`, migra, crea la cuenta `operador.e2e` y lo arranca en el puerto 3100 con `CONTRACT_SOURCE=fake`, `EMAIL_PROVIDER=fake`, `FAKE_CONTRACTS_FILE=deploy/dev/fake-contracts.json` y `CORS_ALLOWED_ORIGINS=http://localhost:5174`; no lee ni modifica el `.env` del backend ni toca la base `bulk_mailer` de `pnpm dev`;
2. el **cliente** con Vite en el puerto 5174, con `/api` hacia el puerto 3100.

Requisito: un PostgreSQL accesible en `E2E_DATABASE_URL` (por defecto `postgres://bulk_mailer:bulk_mailer_local@localhost:5432/bulk_mailer_e2e`, el de `pnpm db:up` del backend). Variables opcionales: `BACKEND_DIR`, `BACKEND_REPO` (qué clonar; p. ej. la ruta local del backend), `BACKEND_REF`, `E2E_BACKEND_PORT`, `E2E_WEB_PORT`, `E2E_SEND_PAUSE_MS`, `E2E_SKIP_BACKEND_BUILD=1`.

Los PDF de prueba se generan al vuelo (`%PDF-1.7 … %%EOF`, contenido único por prueba).

## CI

`.github/workflows/ci.yml`: `lint`, `typecheck`, `test` y `build` en cada *push* a `main` y en los PR. El trabajo `e2e` (backend + PostgreSQL como servicio) está listo pero **apagado**: el backend es un repositorio privado y el `GITHUB_TOKEN` no puede leerlo. Para activarlo: secreto `BACKEND_REPO_TOKEN` (token con lectura del backend) y variable `E2E_ENABLED=true` en el repositorio.

## Pendientes del backend (reportados, no cambiados aquí)

- **El SSE no lleva cabeceras CORS.** `GET /executions/{id}/events` hace `reply.hijack()` y escribe con `raw.writeHead`, así que las cabeceras que agrega `@fastify/cors` (`access-control-allow-origin`) no salen: un navegador en otro origen rechaza el flujo. Por eso el cliente usa el mismo origen (`/api` por *proxy*).
- `GET /alerts` no acepta `since` (D46/D52 lo mencionan).
