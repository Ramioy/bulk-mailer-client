# Bulk Mailer frontend — instrucciones para Claude

Responde al usuario en **español**. El código, los identificadores y los mensajes de commit van en **inglés**; los textos de la interfaz, en **español**.

## Reglas de trabajo (las mismas del backend)

1. **La arquitectura está pactada y no se rompe.** La interfaz habla con el backend solo a través de los puertos de `src/api/ports.ts`; el adaptador HTTP (`src/api/http/`) es el único que llama a `fetch`; `src/main.tsx` es el único punto de composición; `src/domain/` es TypeScript puro. `src/architecture.test.ts` y oxlint lo hacen cumplir.
2. **Todo requisito nuevo se adapta a la arquitectura.** Si choca con lo acordado, se propone el cambio paso a paso y se espera la aprobación del usuario.
3. **El backend es la fuente de verdad del contrato** (`bulk-mailer-backend`: controladores en `src/adapters/inbound/http/**`, tipos de resultado en `src/application/**`, decisiones en `docs/architecture/decisiones.md`). Este repositorio **no cambia el backend**: lo que el backend deba cambiar se reporta al usuario como propuesta.
4. Cada cambio termina con `pnpm lint && pnpm typecheck && pnpm test` (y `pnpm test:e2e` cuando toca flujos), commit y push a `main`.
5. Los supuestos que se tomen se anotan en el README o se informan al usuario.

## Convenciones

- Sin dependencias pesadas: React, Vite y nada más en producción. Estado con `useLoad`/`useAction` (`src/ui/hooks.ts`), rutas por *hash* (`src/ui/router.ts`).
- Errores del backend como `ApiError` (código tipado en inglés, p. ej. `MANIFEST_CHANGED`) y su texto en `src/domain/labels.ts`. Un código desconocido se muestra tal cual.
- Sesión: token Bearer; ante `401 INVALID_ACCESS_TOKEN` se renueva una vez y se repite. Nunca el token en la URL; el SSE va con `fetch` + `Authorization` y `Last-Event-ID` (D11, D12).
- Toda acción auditada lleva nota del operador (`NoteAction`).
- Las pruebas e2e usan el backend real con sus simulados (`e2e/backend/start-backend.mjs`) en su propia base `bulk_mailer_e2e`; nunca la de desarrollo.

## Entorno

```bash
export PATH=/opt/node26/bin:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
pnpm install
```

- Chromium está preinstalado en `/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`); `@playwright/test` está fijado a 1.63.0 para usar ese navegador. No correr `playwright install` en este contenedor.
- PostgreSQL: el del backend (`pnpm db:up` en el backend, puerto 5432).
- Para detener procesos usar su PID; no usar `pkill -f` con un patrón que aparezca en el propio comando.
- Identidad de git: `Yoimar <yoimar.mb@outlook.com>`.
