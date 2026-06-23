# QA Canonical Runbook

> Fecha de actualizacion: 2026-06-22
> Alcance: marketplace no-booking
> Objetivo: dejar una golden path operativa para QA/CLI sin redescubrir scripts

## Fuente de despacho

- Fuente de despacho machine-readable: `docs/07_handoffs/qa-dispatcher.json`
- Este runbook explica contexto humano y rutas conocidas, pero no sustituye al dispatcher.
- Si un objetivo no tiene entrada exacta en el dispatcher, o la entrada no tiene ruta canonica exacta ejecutable, se debe detener la ejecucion y reportar `GAP OPERATIVO`.

## Regla operativa obligatoria

Usar primero el dispatcher y luego la ruta canonica documentada. No buscar scripts alternativos salvo fallo explicito de precondicion. Separar siempre preflight de ejecucion QA. Si el dispatcher ya define el flujo, no redescubrirlo.

## Estado de contexto que se debe preservar

- La imagen inspeccionada con `data:image/jpeg;base64,...` corresponde a legacy/base64.
- Los uploads nuevos de seller publish ya enrutan a Blob en codigo:
  - `MarketplaceModals.tsx -> uploadMarketplaceFile(file, 'listing-image')`
  - `/api/marketplace/upload -> storeMarketplaceFile(file, purpose)`
  - `lib/marketplace/media.ts -> listing-image -> storePublicNoBookingMedia(...)`
  - `lib/media/public-no-booking-storage.ts -> TS_WEB_BLOB_READ_WRITE_TOKEN -> Vercel Blob put(...)`
- `payment-proof` no entra en el Blob publico no-booking.
- La validacion viva de Blob/media sigue abierta: el bloqueo observado fue del harness de automatizacion antes de publicar, no evidencia de fallo en Blob.
- No migrar imagenes legacy en este frente.

## Preflight minimo

1. Confirmar entorno objetivo:
   - Local QA por defecto: `http://localhost:3002`
   - Si la app corre en otro puerto, exportar `APP_URL` explicito antes de usar scripts
   - Preview para Blob/media: usar URL real del ultimo deploy
2. Confirmar Chrome instalado en:
   - `C:\Program Files\Google\Chrome\Application\chrome.exe`
3. Confirmar cuentas QA persistentes cuando haya drift de datos:
   - buyer: `QA_BUYER_IDENTIFIER` / `QA_BUYER_PASSWORD`
   - seller: `QA_SELLER_IDENTIFIER` / `QA_SELLER_PASSWORD`
4. Confirmar credenciales admin solo para smoke local:
   - principal: `QA_ADMIN_IDENTIFIER` / `QA_ADMIN_PASSWORD`
   - alterno: `Igor` con password local fuera del repo
5. Confirmar envs minimas segun frente:
   - normalizacion QA: `DATABASE_URL`
   - media publica no-booking: `TS_WEB_BLOB_READ_WRITE_TOKEN`
   - scripts headless: `APP_URL` opcional, `DEBUG_PORT` opcional, `REUSE_BROWSER` opcional

## Golden Path

| Frente | Ruta oficial | Script canonico | Precondiciones minimas | Criterio de exito |
| --- | --- | --- | --- | --- |
| QA accounts normalization | Local | `npx tsx scripts/setup-marketplace-qa-accounts.ts` | `DATABASE_URL` valida; app no es necesaria | `buyerIA`, `sellerIA`, payout QA seller y listing `selleria-qa-e2e-persistente` quedan normalizados sin duplicados |
| Marketplace login smoke | Local | `node scripts/qa-marketplace-login-smoke.mjs` | app viva en `APP_URL`; `QA_BUYER_*` y `QA_SELLER_*` disponibles; Chrome instalado | buyer y seller inician sesion por UI usando credenciales QA desde env, sin hardcodear passwords |
| Buyer/seller/admin smoke reutilizable | Local | `node scripts/qa-marketplace-qa-accounts.mjs` | app viva en `APP_URL`; cuentas QA ya normalizadas | buyer reporta pago, seller ve ventas/mensajes/cobros y admin ve `Validaciones` para el listing QA persistente |
| Buyer-only corto | Local | `node scripts/qa-marketplace-buyer.mjs` | app viva en `APP_URL`; listing QA accesible | buyer llega a `Pago procesado` sobre `qa-manual-temporal-user-20260420` |
| Seller shell smoke | Local | `node scripts/qa-marketplace-seller-smoke.mjs` | app viva en `APP_URL`; credenciales seller locales validas | seller entra a dashboard y valida `Mis Ventas`, `Mensajes` y `Cobros` |
| Admin smoke | Local | `node scripts/qa-marketplace-admin-smoke.mjs` | app viva en `APP_URL`; credenciales admin validas | admin entra al shell, tabs principales visibles y sin bloqueo basico |
| Reconcile / payout lectura puntual | Local | `node scripts/qa-marketplace-reconcile.mjs` | app viva en `APP_URL`; seller/admin accesibles | lectura puntual de `Cobros` y superficies de conciliacion sin rerun completo |
| Blob/media verification | Preview manual | `N/A - validacion manual obligatoria por ahora` | preview viva; `TS_WEB_BLOB_READ_WRITE_TOKEN` configurado; login sellerIA posible | listing nuevo publicado con imagen nueva y URL final `https://*.public.blob.vercel-storage.com/...` |

## Regla de despacho

- Resolver primero el `task_id` exacto en `qa-dispatcher.json`.
- Si el `task_id` existe y tiene ruta canonica exacta, usar esa ruta.
- Si el `task_id` no existe, o existe pero no tiene ruta ejecutable exacta, detenerse y reportar `GAP OPERATIVO`.
- No usar este runbook narrativo como sustituto del dispatcher.

## Cuándo NO redescubrir alternativas

- Si lo que buscas es smoke general buyer/seller/admin con cuentas persistentes, no busques otro script: usa `scripts/qa-marketplace-qa-accounts.mjs`.
- Si lo que buscas es rehidratar cuentas QA, no busques seeds ni scripts viejos: usa `scripts/setup-marketplace-qa-accounts.ts`.
- Si el objetivo es Blob/media, no intentes migrar legacy ni usar harnesses temporales como primera opcion: la ruta oficial actual es manual en preview con `sellerIA`.
- Si no existe entrada exacta en el dispatcher para el objetivo, no improvises otra ruta.
- Si una precondicion falla, corrige la precondicion; no saltes a otro script sin documentar el motivo.

## Qué NO volver a probar por defecto

- No reabrir booking ni `/reservas`.
- No revalidar el frente ya cerrado de schema `paymentSenderBank/paymentPaidAt`.
- No reabrir proofs sensibles en el Blob publico.
- No intentar migracion de imagenes legacy/base64 en esta pasada.
- No usar scripts `temp` o `extended` como primera opcion.

## Si falla una precondicion

- `APP_URL` incorrecto o puerto cambiado:
  - levantar app en `3002` o exportar `APP_URL=http://localhost:3000`
- Drift de cuentas/listing QA:
  - correr `npx tsx scripts/setup-marketplace-qa-accounts.ts`
- Harness headless no abre login/CTA:
  - detener la automatizacion y pasar a validacion manual minima si el frente es Blob/media
- Falta `TS_WEB_BLOB_READ_WRITE_TOKEN`:
  - no seguir con Blob/media; corregir Vercel env primero
- No existe ruta canonica exacta en el dispatcher:
  - detenerse y reportar `GAP OPERATIVO`
  - clasificar primero el objetivo antes de proponer una ruta nueva

## Blob / media verification pendiente

Objetivo actual:
- no migrar legacy
- no tocar proofs sensibles
- comprobar solo que un upload NUEVO de seller publish sale por Blob

Ruta oficial:
1. Abrir preview vigente.
2. Iniciar sesion como `sellerIA`.
3. Entrar a `Quiero Vender`.
4. Publicar listing de prueba con imagen nueva real.
5. Abrir detalle recien creado.
6. Confirmar que la URL final de imagen empieza por `https://*.public.blob.vercel-storage.com/...`

Criterio de cierre:
- si la imagen nueva sale por Blob, el frente de enrutamiento queda confirmado
- si aparece `data:image/...` en una imagen vieja, eso sigue siendo legacy y no bloquea este cierre

## Actualizacion 2026-04-23 - cierre de validacion Blob/media

- Validado en preview vigente `https://turpialsound-732mlgxcv-cerberus77s-projects.vercel.app`.
- No usar como referencia el preview `3397rmisp` de hace 2 dias aunque siga `Ready`; estaba desactualizado respecto al deploy vigente.
- Evidencia cerrada:
  - sellerIA publico `QA blob verify 1776975409520`
  - `/api/marketplace/upload` devolvio `200`
  - la URL persistida fue `https://6nylezvxxx1yjqtr.public.blob.vercel-storage.com/public-media/marketplace/listings/2026/04/1776975421901-dcdbb698-5517-46bd-9eb4-88f1e28e630f.webp`
  - el detalle final quedo en `https://turpialsound-732mlgxcv-cerberus77s-projects.vercel.app/marketplace/qa-blob-verify-1776975409520-1776975422206`
  - no hubo `data:image/...` en el listing nuevo
- Regla adicional para futuras validaciones vivas:
  - primero confirmar el preview `Ready` mas reciente con `vercel ls`
  - no reutilizar una URL de preview vieja solo porque aun responde `200`

## Clasificacion de scripts

- `scripts/setup-marketplace-qa-accounts.ts`: `CANONICAL`
- `scripts/qa-marketplace-qa-accounts.mjs`: `CANONICAL`
- `scripts/qa-marketplace-buyer.mjs`: `SUPPORTING`
- `scripts/qa-marketplace-seller-smoke.mjs`: `SUPPORTING`
- `scripts/qa-marketplace-admin-smoke.mjs`: `SUPPORTING`
- `scripts/qa-marketplace-reconcile.mjs`: `SUPPORTING`
- `scripts/qa-marketplace-e2e-extended.mjs`: `LEGACY`
- `scripts/qa-marketplace-temp.mjs`: `EXPERIMENTAL`

## Actualizacion 2026-04-23 - payment-proof sensible preview smoke

Ruta operativa usada:
1. leer este runbook y conservar cuentas QA vigentes
2. verificar preview objetivo y env sensible en Vercel
3. intentar smoke corto solo buyer/admin sobre preview nuevo

Preview intentado:
- `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`

Preflight confirmado:
- preview accesible
- `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` presente en `Preview`
- cuentas QA del runbook siguen siendo las correctas

Bloqueo exacto observado en esta sesion:
- no hubo browser/CDP reutilizable para conducir el flujo UI real
- fallback headless por server actions del preview tampoco quedo utilizable:
  - action IDs reales del build local resueltos
  - request con `Next-Action` + `Next-Router-State-Tree` + `encodeReply(...)`
  - respuesta del preview: `200 text/html`, no `text/x-component`

Regla adicional para este frente:
- si el smoke de proofs sensibles requiere preview y no hay browser interactivo funcional, detenerse ahi y reportar el bloqueo exacto
- no abrir QA transaccional extensa ni inventar otra ruta no canonica en esa misma sesion
- no improvisar CDP, server actions ni HTTP ad hoc si el dispatcher no ofrece ruta exacta ejecutable

## Regla de mantenimiento

- Si un script o metodo queda validado para un `task_id`, registrarlo primero en `docs/07_handoffs/qa-dispatcher.json`.
- Despues reflejar la narrativa humana en este runbook.
- Si el objetivo no tiene entrada exacta, el primer resultado correcto es clasificarlo como `manual_preview`, `manual_local`, `blocked` o `gap`, no improvisar ejecucion.

Siguiente paso minimo al retomar:
1. reusar preview `mpwpxahfc` o el ultimo `Ready` mas reciente si cambia el deploy
2. ejecutar el smoke corto desde una sesion con browser interactivo funcional
3. buyerIA adjunta proof nuevo
4. admin/super abre el proof por `/api/marketplace/payment-proofs/...`
5. confirmar ausencia de `https://*.public.blob.vercel-storage.com/...` en el proof nuevo

## Actualizacion 2026-04-24 - cierre manual payment-proof sensible preview

Task:
- `payment_proof_sensitive_preview`

Modo:
- `manual_preview`

Preview validado:
- `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`

Credenciales usadas:
- buyer QA: `QA_BUYER_IDENTIFIER` / `QA_BUYER_PASSWORD`
- SUPER QA: `QA_ADMIN_IDENTIFIER` / `QA_ADMIN_PASSWORD`

Evidencia confirmada:
- buyerIA subio un proof nuevo en preview.
- El `paymentProofUrl` final quedo bajo ruta interna autenticada:
  - `/api/marketplace/payment-proofs/marketplace-sensitive-media/marketplace/payment-proofs/2026/04/1777011359365-8ff99e05-ec49-4178-962b-0295b361eb5d.webp`
- El proof nuevo no quedo expuesto como `https://*.public.blob.vercel-storage.com/...`.
- SUPER pudo abrir el comprobante por el proxy autenticado.

Ruta manual validada:
1. abrir preview vigente,
2. login buyerIA,
3. comprar listing QA persistente,
4. adjuntar proof nuevo,
5. confirmar upload correcto,
6. confirmar `paymentProofUrl` bajo `/api/marketplace/payment-proofs/...`,
7. login SUPER,
8. entrar a `Validaciones`,
9. abrir el comprobante por proxy autenticado y confirmar que no usa Blob publico.

Estado:
- frente validado manualmente.
- no existe script canonico.
- mantener prohibidos CDP improvisado, server actions reverse engineered y HTTP ad hoc.

## Booking custom bundle contract

Objetivo:
- validar el contrato tecnico del configurador Preview de `Arma tu paquete`
  sin navegador, sin HTTP, sin Prisma y sin escrituras.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-contract.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar precios internos, presentacion declarativa, conteo semantico de adicionales y validaciones deterministas del catalogo.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking custom bundle resource policy

Objetivo:
- validar la politica canonica de recursos fisicos para las lineas temporales del paquete.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-resource-policy.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar la politica de recursos para servicios gestionados, la prioridad de candidatos y la exclusion de servicios sin politica.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking isolated custom bundle resource conflicts

Objetivo:
- validar en PostgreSQL efimero la asignacion de recursos y la deteccion aislada de colisiones.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/isolated-custom-bundle-resource-conflicts.ts /tmp/turpial-current-baseline.sql prisma/proposed/20260622_bkg04_snapshot_booking_items.sql`

Precondiciones:
- GitHub Actions disponible;
- PostgreSQL service container disponible;
- baseline SQL generado;
- propuesta SQL validada;
- URL exclusivamente local;
- opt-in aislado habilitado;
- single-connection SQL session disponible.

Criterio de evidencia:
- confirmar catalogo de recursos, prioridad de candidatos, intervalos half-open, estados de bloqueo, asignacion de fallback, adapter de solo lectura, rollback y limpieza final.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking custom bundle submission contract

Objetivo:
- validar el contrato puro de submission mult-item para `Arma tu paquete`
  sin persistencia, sin navegador, sin HTTP, sin Prisma y sin escrituras.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-submission-contract.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar parsing estricto, normalizacion de requester, rechazo de dinero cliente, mappings SERVICE_VARIANT y gaps de catalogo.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking custom bundle authoritative repricing

Objetivo:
- validar el recálculo autoritativo del paquete desde el catálogo interno
  sin confiar en dinero del cliente, sin Prisma, sin HTTP y sin escrituras.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-authoritative-repricing.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar que el servidor reconstruye el quote, detecta `catalogGaps`, deriva incluidos y preserva la paridad con el motor canónico.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking custom bundle persistence contract

Objetivo:
- validar el adaptador de persistencia mult-item aislado sin Prisma, sin red y sin escrituras reales fuera del gate efimero.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-persistence-contract.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar contract/business/server_context/catalog_resolution/persistence, rollback controlado y persistencia snapshot-backed en memoria.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking isolated custom bundle persistence

Objetivo:
- validar en PostgreSQL efimero el adapter autoritativo y la persistencia snapshot-backed mult-item.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/isolated-custom-bundle-persistence-gate.ts /tmp/turpial-current-baseline.sql prisma/proposed/20260622_bkg04_snapshot_booking_items.sql`

Precondiciones:
- GitHub Actions disponible;
- PostgreSQL service container disponible;
- baseline SQL generado;
- propuesta SQL validada;
- URL exclusivamente local;
- opt-in aislado habilitado.

Criterio de evidencia:
- confirmar booking request, cinco snapshot items, catalog gaps, rollback, conflicto de publicCode y limpieza final.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking custom bundle continuous schedule

Objetivo:
- validar el bloque continuo determinista de `Arma tu paquete` usando solo las líneas temporales autoritativas.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-continuous-schedule.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar orden temporal canónico, continuidad, exclusiones, rollover de fecha y paridad de duraciones.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking custom bundle hold contract

Objetivo:
- validar el contrato puro del hold expirante y la fingerprint canonica de `Arma tu paquete` sin DB, sin Prisma y sin escrituras.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-hold-contract.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar ventana de hold, fingerprint canonica, replay activo/expirado e independencia del orden.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking isolated custom bundle hold schema

Objetivo:
- validar en PostgreSQL efimero el esquema aditivo de holds e idempotencia.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/isolated-custom-bundle-hold-schema.ts /tmp/turpial-current-baseline.sql prisma/proposed/20260622_bkg04_snapshot_booking_items.sql prisma/proposed/20260622_bkg07_custom_bundle_holds.sql`

Precondiciones:
- GitHub Actions disponible;
- PostgreSQL service container disponible;
- baseline SQL generado;
- BKG-04 proposal validated;
- BKG-07 proposal validated;
- URL exclusivamente local;
- opt-in aislado habilitado.

Criterio de evidencia:
- confirmar compatibilidad legacy, unicidad de idempotency, formato de fingerprint, restricciones de ventana, indices y limpieza final.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking custom bundle hold acquisition

Objetivo:
- validar el contrato transaccional de adquisicion del hold con reintentos, replay e inmutabilidad de la clave de idempotencia.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/custom-bundle-hold-acquisition-contract.ts`

Precondiciones:
- Node y pnpm disponibles;
- dependencias instaladas;
- no requiere app levantada;
- no requiere `DATABASE_URL`;
- no requiere navegador;
- no requiere red.

Criterio de evidencia:
- confirmar contexto de servidor, replay activo/expirado, conflicto de idempotencia, rollback seguro y reintentos serializables.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.

## Booking isolated custom bundle hold acquisition

Objetivo:
- validar en PostgreSQL efimero la adquisicion transaccional del hold, incluyendo replay, concurrencia y limpieza final.

Ruta canonica:
- `pnpm exec tsx scripts/qa/bookings/isolated-custom-bundle-hold-acquisition.ts /tmp/turpial-current-baseline.sql prisma/proposed/20260622_bkg04_snapshot_booking_items.sql prisma/proposed/20260622_bkg07_custom_bundle_holds.sql`

Precondiciones:
- GitHub Actions disponible;
- PostgreSQL service container disponible;
- baseline SQL generado;
- BKG-04 proposal validated;
- BKG-07 proposal validated;
- URL exclusivamente local;
- opt-in aislado habilitado;
- session SQL con una sola conexion disponible.

Criterio de evidencia:
- confirmar adquisicion mixta, replay activo/expirado, conflicto de idempotencia, colisiones, rollback, aislamiento y limpieza final.

Regla:
- si esta ruta deja de ser valida, detenerse y reportar `GAP OPERATIVO`; no improvisar CDP, HTTP ad hoc ni reverse engineering.
