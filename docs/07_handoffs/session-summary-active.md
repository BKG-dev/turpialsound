# Session Summary - Activa

> Fecha de ultima actualizacion: 2026-04-20
> Tipo de nota: Checkpoint operativo de cierre
> Fuente principal: `docs/obsidian-vault/*`

---

## Estado real actual del proyecto

El marketplace esta funcional y sigue separado del booking; no se cruza con el backend de booking de Jean.

El esquema del marketplace mantiene prefijo `MP_` en Prisma como regla de separacion y no colision.

El checkout del marketplace sigue en modo manual temporal: buyer reporta pago, admin concilia, luego entra a escrow y el payout al seller sigue siendo manual.

El flujo ya no debe usar base64 para imagenes ni comprobantes. La media quedo migrada a URLs con storage/asset externo temporal desacoplado.

La capa nueva de storage publico no-booking pertenece al frente de Manuel: home, subpaginas, marketplace y frontend publico no-booking. Usa `TS_WEB_BLOB_READ_WRITE_TOKEN`, no `BLOB_READ_WRITE_TOKEN`, y no debe compartir Blob/token con Jean.

Jean mantiene ownership separado sobre booking/reservas y cualquier superficie nacida de `/reservas`. No tocar ni consumir su Blob/token desde este frente.

Los comprobantes sensibles del marketplace no entran en el Blob publico no-booking. Quedan fuera de esa capa hasta definir storage sensible dedicado o proxy autenticado.

El dashboard admin y seller ya quedaron orientados al flujo manual actual y a la conciliacion operativa.

En esta ventana quedaron aplicadas correcciones funcionales del dashboard buyer/seller y del panel admin: contadores derivados del dataset real, detalle clickeable de compras/ventas, badge de mensajes navegable, mensajes priorizados, CSV corregido, datos de cobro visibles, nota interna estable y vista de tabla completa para admin.

TypeScript habia quedado limpio y luego se hicieron correcciones ESLint para cerrar el deploy de Vercel, por lo que el build quedo documentado como saneado.

El bloqueador de migracion/schema asociado a `paymentSenderBank` y `paymentPaidAt` ya quedo resuelto en la DB activa.

Falta QA manual end-to-end buyer -> admin -> escrow -> payout manual seller con imagenes y comprobantes reales.

SEO/AEO sigue siendo requisito transversal para todo el sitio, tambien en listings, slugs, metadata, landings y estructura publica del marketplace.

No se debe abrir otro frente antes de cerrar migracion real o confirmacion de schema y QA operativa.

## Bloqueos activos

- Critico: ejecutar QA manual completa del flujo buyer -> admin -> escrow -> payout manual seller.
- Alto: el checkout manual sigue siendo temporal; no es un bug, pero condiciona toda la operacion actual.
- Alto: el storage de media actual ya no usa base64, pero sigue siendo temporal; falta storage productivo definitivo.
- Medio-Alto: falta definir el cierre contable final despues de `RELEASED`.
- Medio: cron T+7 para auto-release sigue pendiente.
- Medio: queda en cola una mejora visual pro para el hero del marketplace con animacion tipo rayo/plasma, solo para ese hero, ligera y sin tocar el resto del site.

## Hallazgos funcionales activos del marketplace

- Operativo y Todos muestran casi la misma informacion.
  Impacto: la segmentacion del dashboard no ayuda a operar.
  Prioridad: media-alta.
- El tab de mensajes no refleja bien los 3 mensajes sin leer ni su ubicacion real.
  Impacto: mitigado por la nueva separacion entre chats por atender y todos los chats; falta QA real.
  Prioridad: media-alta.
- Totales y comisiones quedaron mas coherentes, pero requieren QA con operaciones reales para cerrar el frente.
  Impacto: posible ajuste residual en metricas operativas.
  Prioridad: alta.
- Desajuste transversal entre metricas, tabs y flujo real del dashboard.
  Impacto: ya no es bloqueo estructural; queda como validacion/pulido de segunda pasada.
  Prioridad: alta.

## Resuelto en esta ventana

- Mis compras ya no muestra cero falso.
- Compras y ventas ya tienen detalle clickeable con linea de estado.
- CSV exportado corregido.
- Datos de cobro del vendedor visibles en Pagos.
- Nota interna de validaciones ya permite escribir normalmente.
- Badge superior de mensajes sin leer ya navega al tab correcto.
- Mensaje operativo post `PAYMENT_RECEIVED` agregado para buyer y seller.
- Vista admin conmutada entre tarjetas y tabla completa agregada.
- `npm run build` limpio post-fix.
- `npx tsc --noEmit` limpio post-fix.

## Resuelto y no reabrir

- Marketplace separado del booking.
- Prefijo `MP_` como regla de separacion en Prisma.
- Checkout manual temporal operativo.
- Conciliacion manual reflejada en codigo y dashboard.
- Aprobacion admin restringida para no aprobar desde `PENDING_PAYMENT`.
- `SOLD_OUT` solo despues de pago validado y entrada a escrow.
- Imagenes y comprobantes fuera del flujo productivo de base64.
- Persistencia actual de media por URL/asset externo temporal desacoplado.
- Build de Vercel documentado como limpio en tipos y luego corregido tambien en ESLint para cerrar deploy.
- DB activa correcta confirmada: Neon `neondb`.
- `paymentSenderBank`, `paymentPaidAt` e indices ya aplicados en `mp_transactions`.
- Historial Prisma alineado para `20260419_marketplace_manual_reconciliation`.
- `npm run build` limpio.
- `npx tsc --noEmit` limpio.

## Checkpoint para reanudar manana

- Estado marketplace: funcional, separado del booking y con foco en estabilizacion operativa.
- Estado checkout manual: activo como flujo temporal oficial; buyer reporta pago, admin valida manualmente.
- Estado imagenes/storage: base64 fuera del camino productivo; media guardada por URL en storage externo temporal desacoplado.
- Estado dashboard: util para conciliacion manual, estados operativos y seguimiento seller/admin.
- Estado dashboard post-fix: contadores alineados, compras/ventas con detalle, mensajes priorizados, CSV util, payout visible y tabla admin disponibles.
- Bloqueador `paymentSenderBank`: resuelto en la DB activa; no reabrir salvo evidencia de otro entorno distinto.
- Cola visual futura: `Hero marketplace plasma/rayo pro ligero`, solo para el hero del marketplace, preferencia CSS/SVG hibrida o equivalente liviano, sin canvas pesado y sin impacto SEO/AEO.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/obsidian-vault/00_CENTRAL_TURPIAL.md
- docs/obsidian-vault/ROADMAP_RESCATE.md
- docs/obsidian-vault/BUGS_CRITICOS.md
- docs/obsidian-vault/ARQUITECTURA_TASAS.md
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/marketplace/00_IMPLEMENTATION_SUMMARY.md
- docs/marketplace/01_ROADMAP_AND_STATUS.md

Confirma en 8-10 lineas el estado real del marketplace y no abras otro frente.
Confirma que paymentSenderBank/paymentPaidAt ya quedaron aplicados en la DB activa y no reabras ese frente.
Confirma que los fixes funcionales ya estan aplicados y no reabras ese frente sin evidencia.
Luego ejecuta QA manual completa buyer -> admin -> escrow -> payout manual seller validando:
- contadores vs listados,
- detalle de compra/venta,
- Operativo vs Todos + terminales,
- export CSV,
- datos de cobro del vendedor,
- totales/comisiones/neto/pendiente,
- nota interna,
- badge y tab de mensajes,
- mensaje post Pago recibido.
Si aparece algun residual, haz una segunda pasada puntual.
Documenta hallazgos residuales en Obsidian y handoff antes de tocar cualquier otra cosa.
```
# Checkpoint — QA marketplace / sesión Codex rota por modelo

Fecha: 2026-04-21

Estado actual:
- El marketplace ya tiene checkout buyer con post-submit más explícito:
  - “Pago procesado”
  - “Tu pago está siendo validado”
  - “Notificaremos la resolución o la liberación del escrow en menos de 24h”
- La migración/schema de conciliación ya quedó aplicada y validada.
- La segunda pasada de tabs/métricas/mensajes/payout/CSV quedó estabilizada y con build limpio.
- La QA automática buyer llegó hasta submit real, pero la sesión de Codex quedó rota por error de modelo.

Bloqueo actual:
- Codex terminó con `404 Not Found: Model not found gpt-5.4`.
- La sesión no debe seguir tal como está.
- No seguir insistiendo en esta thread con el mismo modelo.

Siguiente paso:
1) cerrar o limpiar la sesión actual;
2) abrir una sesión nueva o reanudar con un modelo disponible;
3) reintentar buyer-only corto sobre la instancia estable;
4) luego pasar a admin y seller solo si buyer queda estable.

Actualizacion 2026-04-20:
- Buyer ya quedo estable en `localhost:3002` sobre `qa-manual-temporal-user-20260420`.
- El checkout muestra en UI el estado post-pago:
  - `Pago procesado`
  - `Tu pago esta siendo validado.`
  - `Notificaremos la resolucion o la liberacion del escrow en menos de 24h.`
- La transaccion persistida para buyer quedo en `PAYMENT_RECEIVED`:
  - txId `cmo827au800002kne6v9ofhk4`
  - reference `QA1776741813862`
- El bug previo estaba en el runner de QA buyer, no en la logica productiva del checkout.
- Admin/seller siguen pendientes; el runner encadenado aun requiere ajuste en autenticacion/navegacion del panel admin.

No tocar:
- booking
- checkout manual temporal
- lógica de negocio ya validada
- base64 / media ya resuelto
 
## Actualizacion 2026-04-21 - Recuperacion de entorno / Preview

- `.env.local` local quedo realineado con `DATABASE_URL` valida, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, `USE_MOCK_DATA=false`, `MP_JWT_SECRET` local y `GOOGLE_GENERATIVE_AI_API_KEY` restaurada.
- Backup creado antes de tocar entorno: `.env.local.backup-20260421-134056`.
- Fallback aplicado: `DIRECT_URL` quedo igual a `DATABASE_URL` porque no habia una `DIRECT_URL` segura local para el host activo.
- Local responde en `http://localhost:3000/marketplace` y el placeholder `Conectar con API en produccion` ya no aparece.
- La DB activa tiene cuentas QA reutilizables `buyerIA` y `sellerIA` y el listing persistente `selleria-qa-e2e-persistente`; no hizo falta re-seed ni normalizacion adicional.
- Verificacion local directa del listing QA: `http://localhost:3000/marketplace/selleria-qa-e2e-persistente` responde `200`.
- Vercel Preview quedo con envs cargadas: `DATABASE_URL`, `DIRECT_URL`, `MP_JWT_SECRET`, `GOOGLE_GENERATIVE_AI_API_KEY`, `USE_MOCK_DATA=false`.
- `NEXT_PUBLIC_APP_URL` no se cargo en Preview para no fijar un URL efimero incorrecto: el proyecto no tiene Git conectado y los previews por CLI salen con URL aleatoria por deploy.
- Preview verificado: `https://turpialsound-3397rmisp-cerberus77s-projects.vercel.app`
- Verificacion online: `/marketplace` responde `200` sin placeholder y el slug QA `selleria-qa-e2e-persistente` responde `200` con contenido correcto.
- Si quedara algun residual visual en la grilla principal del Preview, el frente restante ya no es de entorno/DB sino de hidratacion/fetch cliente en la home del marketplace.

## Actualizacion 2026-04-23 - QA canonical runbook + contexto Blob/media

- Runbook canonico creado en `docs/07_handoffs/qa-canonical-runbook.md`.
- Regla operativa fuerte:
  - usar primero el script canonico documentado,
  - no buscar scripts alternativos salvo fallo explicito de precondicion,
  - separar preflight de ejecucion QA,
  - no redescubrir el flujo si el runbook ya lo define.
- Scripts canonicos:
  - `scripts/setup-marketplace-qa-accounts.ts`
  - `scripts/qa-marketplace-qa-accounts.mjs`
- Scripts de apoyo:
  - `qa-marketplace-buyer.mjs`
  - `qa-marketplace-seller-smoke.mjs`
  - `qa-marketplace-admin-smoke.mjs`
  - `qa-marketplace-reconcile.mjs`
- Scripts a no tomar como primera opcion:
  - `qa-marketplace-e2e-extended.mjs` = `LEGACY`
  - `qa-marketplace-temp.mjs` = `EXPERIMENTAL`
- Contexto media preservado:
  - `data:image/jpeg;base64,...` visible corresponde a legacy/base64.
  - Los uploads NUEVOS de seller publish ya enrutan a Blob en codigo.
  - `payment-proof` sigue fuera del Blob publico.
  - La validacion viva quedo bloqueada antes de publicar por el harness de login/CTA, no por evidencia de fallo en Blob.
  - Siguiente paso real pendiente: sellerIA manual en preview, publicar listing con imagen nueva y confirmar URL `https://*.public.blob.vercel-storage.com/...`.

## Actualizacion 2026-04-23 - Blob/media preview validado

- La validacion viva de seller publish con imagen nueva quedo confirmada en el preview vigente `https://turpialsound-732mlgxcv-cerberus77s-projects.vercel.app`.
- El preview viejo `https://turpialsound-3397rmisp-cerberus77s-projects.vercel.app` seguia `Ready`, pero estaba desactualizado y no debe usarse como evidencia del estado actual.
- Evidencia real del preview vigente:
  - sellerIA publico `QA blob verify 1776975409520`
  - detalle abierto en `https://turpialsound-732mlgxcv-cerberus77s-projects.vercel.app/marketplace/qa-blob-verify-1776975409520-1776975422206`
  - `/api/marketplace/upload` respondio `200`
  - payload devuelto por upload:
    - `https://6nylezvxxx1yjqtr.public.blob.vercel-storage.com/public-media/marketplace/listings/2026/04/1776975421901-dcdbb698-5517-46bd-9eb4-88f1e28e630f.webp`
- Señales de cierre:
  - `bodyHasSellerNotice = true`
  - `bodyHasBlob = true`
  - `bodyHasDataUrl = false`
  - la imagen renderizada en detalle salio via `_next/image` sobre la URL Blob publica
- Con esto queda confirmado el enrutamiento real de uploads NUEVOS de seller publish hacia Blob publico no-booking.

## Actualizacion 2026-04-23 - Smoke tecnico proof sensible en preview nuevo

- Preview usado:
  - `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`
- Preflight cerrado:
  - preview accesible por `fetch` Node con `200`
  - cuentas QA vigentes preservadas por runbook: `buyerIA`, `sellerIA`, `mvera`
  - `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` presente en Vercel para `Preview`
- Bloqueo exacto encontrado:
  - el entorno actual no pudo abrir un browser reutilizable por CDP para conducir el flujo UI real
  - como fallback se intento invocar server actions del preview por HTTP usando:
    - cookie `mp_session` valida firmada
    - action IDs reales del build para `getMpSession` / flujo marketplace
    - `Next-Action` + `Next-Router-State-Tree` + `encodeReply(...)`
  - el preview respondio `200 text/html` en vez de `text/x-component`, por lo que desde esta sesion no hubo via estable para ejecutar `initiatePurchase -> submitPaymentProof` sin browser interactivo
- Estado del smoke:
  - `NO VALIDADO AUN`
  - no se llego a subir proof nuevo
  - no se genero `paymentProofUrl` nuevo
  - no se pudo comprobar lectura admin por proxy sobre un proof nuevo en este intento
- Interpretacion operativa:
  - no hay evidencia nueva de fallo del storage sensible, del token ni del proxy
  - el bloqueo pertenece al harness/ejecucion de la prueba en esta sesion
- Siguiente paso minimo:
  1. reintentar el smoke corto desde terminal/sesion con browser interactivo funcional
  2. usar buyer QA real en preview para completar solo `Confirmar pago` con comprobante
  3. abrir `Validaciones` con `SUPER` y confirmar que el link persistido es `/api/marketplace/payment-proofs/...` y no Blob publico

## Actualizacion 2026-04-23 - Dispatcher QA por objetivo

- El runbook si ayudo y fue usado correctamente.
- La debilidad operativa residual no era ignorar el runbook; era no tener una capa de despacho exacta por objetivo.
- Se crea `docs/07_handoffs/qa-dispatcher.json` como fuente machine-readable de despacho por `task_id`.
- Regla nueva:
  - si un objetivo no tiene entrada exacta en el dispatcher, no se improvisa
  - se detiene la ejecucion y se reporta `GAP OPERATIVO`
  - primero se clasifica el objetivo (`script`, `manual_preview`, `manual_local`, `blocked`, `gap`)
- `payment_proof_sensitive_preview` queda modelado como `manual_preview`.
- El intento por CDP / server actions / HTTP ad hoc no debe repetirse automaticamente.
- `AGENTS.md` queda agregado para forzar esta regla en la raiz del repo.

## Actualizacion 2026-04-24 - payment_proof_sensitive_preview no ejecutado

- Task confirmado por dispatcher: `payment_proof_sensitive_preview`.
- Mode: `manual_preview`.
- Preview objetivo: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`.
- Credenciales registradas para esta sesion:
  - buyerIA: `buyerIA / BuyerIA_QA_2026!`
  - SUPER: `mvera / 13894619`
- Resultado: `NO EJECUTADO`.
- Bloqueo exacto: esta sesion de Codex no tiene una herramienta de browser interactivo controlable para hacer login, adjuntar archivo y abrir el proxy. Usar Playwright/CDP, server actions reverse engineered o HTTP ad hoc violaria dispatcher/AGENTS.
- No hubo upload de proof, status de upload, `paymentProofUrl` ni validacion del proxy.
- No se actualizo dispatcher ni runbook como metodo validado.
- Siguiente minimo: reintentar solo desde una sesion con control real de browser interactivo o ejecutar manualmente en navegador humano siguiendo el task del dispatcher.

## Actualizacion 2026-04-24 - payment_proof_sensitive_preview validado manualmente

- Task: `payment_proof_sensitive_preview`.
- Mode: `manual_preview`.
- Preview usado: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`.
- Credenciales usadas:
  - buyerIA: `buyerIA / BuyerIA_QA_2026!`
  - SUPER: `mvera / 13894619`
- Resultado:
  - buyerIA subio proof nuevo.
  - `paymentProofUrl` final quedo bajo `/api/marketplace/payment-proofs/...`.
  - ruta confirmada: `/api/marketplace/payment-proofs/marketplace-sensitive-media/marketplace/payment-proofs/2026/04/1777011359365-8ff99e05-ec49-4178-962b-0295b361eb5d.webp`
  - no usa `https://*.public.blob.vercel-storage.com/...`.
  - SUPER pudo abrir el proof por proxy autenticado.
- Dispatcher y runbook quedaron actualizados con la ruta manual-preview validada.
- No se tocaron booking ni `/reservas`.
