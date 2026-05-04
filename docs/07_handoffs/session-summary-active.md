# Session Summary - Activa

## Actualizacion 2026-05-02 - Integracion Marketplace + Reservas + Admin (post-push)

- Rama actual: `integration/marketplace-pure-booking-selective-2026-04-30`.
- Commits locales de la integracion:
  1. `c9ae415` - lock Prisma 7.7.0 + contrato selectivo booking/marketplace.
  2. `cbc4bdc` - restore de `/reservas` wizard.
  3. `b192c9b` - migracion `payment_proofs` + Prisma Client con `PaymentProof`.
  4. `845ca6e` - ruta viewer de comprobante (`/payment-proofs/view`).
  5. `45556ed` - ruta ops de revision de pago (`/ops/payment-review`).
  6. `cdfdb1d` - bloque `/admin` + `lib/auth/*` + `middleware.ts`.
  7. `d4952b8` - route de expiracion operativa `POST /api/bookings/expire`.
- Push confirmado:
  - remoto `origin/integration/marketplace-pure-booking-selective-2026-04-30` en `d4952b8c297b2e059a401811a889cd3c75bc81bf`.
- Tags locales de checkpoint:
  - `cp/contract-prisma77-booking-selective-2026-04-30`
  - `cp/reservas-wizard-restored-2026-04-30`
  - `cp/payment-review-ops-route-2026-05-02`
  - `cp/admin-auth-routes-2026-05-02`

### Entorno operativo usado en esta integracion

- `.env.local` del colaborador apunta a Neon host `ep-little-moon-...`.
- `DATABASE_URL`: pooled.
- `DIRECT_URL`: direct (sin `-pooler`).
- Se corrio `prisma/seed.ts` sobre esa DB para poblar catalogo base booking (`Service`, `ServiceVariant`, `Resource`) sin tocar modelos marketplace.

### Migracion y Prisma

- Migracion aplicada para pagos reportados:
  - `prisma/migrations/20260420113640_add_payment_proofs_phase1_base/migration.sql`
- Prisma Client regenerado y alineado con schema:
  - `PaymentProofDuplicateStatus`
  - `PaymentProof`
  - `BookingRequest.paymentProofs`
- Estado runtime validado: `prisma.paymentProof` disponible y operativo.

### Validacion funcional cerrada

- Marketplace con datos: OK.
- `/reservas`: abre wizard, submit real OK.
- Correo cliente: OK.
- Reportar pago con JPG: OK.
- Correo admin por pago reportado: OK.
- Ver comprobante (`/payment-proofs/view?token=...`): OK.
- `/ops/payment-review`: abre y opera.
- Confirmar pago: OK.
- Correo de reserva confirmada: OK.
- Google Calendar actualizado: OK.
- `/admin/login`: OK.
- `/admin`: OK.
- `/admin/bookings/[publicCode]/payment-proof`: OK.
- `auth + middleware` de admin: OK, sin romper `/marketplace`, `/reservas` ni `/ops/payment-review`.

### Pendientes explicitos (siguiente fase)

1. Probar `Marcar incidencia` end-to-end.
2. Configurar `BOOKINGS_EXPIRE_CRON_SECRET` en `.env.local` y entorno remoto.
3. Probar manualmente `POST /api/bookings/expire` con secret correcto e incorrecto.
4. Decidir automatizacion de expiracion: Vercel Cron vs cron externo/GitHub Actions/Make/cron-job.org.
5. Resolver tasa BCV desactualizada (`asOf` viejo) en frente separado.
6. Definir DB oficial de trabajo (vs DB de colaborador).
7. Mantener `var/` fuera de commits.

### Recomendacion de salida

- Push del bloque `expire route` ya completado. Mantener siguiente fase enfocada en validacion operativa y automatizacion controlada.

> Fecha de ultima actualizacion: 2026-04-26
> Tipo de nota: Checkpoint operativo de cierre
> Fuente principal: `docs/obsidian-vault/*`

---

## Estado real actual del proyecto (2026-04-29)

El marketplace está funcional, separado del booking y con foco en estabilización operativa.

### Sprint "Admin AI Copilot + BI/Analytics" Implementado
- **Admin AI Copilot (Read-only):** Implementado en `/marketplace/admin/copilot` y `/api/marketplace/admin/copilot`.
  - Acceso restringido a `SUPER` (roles admin).
  - Herramientas read-only: usuarios, ventas, operaciones pendientes, fondos, KPIs, resumen de transacción, métricas de listings, DB status y Blob metadata.
  - Seguridad estricta: sin acciones de escritura, sin exposición de secretos, sin logs de prompts/respuestas en DB, sin logs de datos bancarios.
- **Instrumentación Analytics/BI:**
  - Modelo `MpAnalyticsEvent` y `MpBlobObjectMetadata`.
  - Endpoint `/api/marketplace/analytics/event` con payload allowlist.
  - Eventos: `listing_view`, `listing_click`, `buy_click`, `favorite_click`, `checkout_start`, `admin_copilot_db_status_view`.
  - Limpieza de metadata: sin query/hash en URLs, sin `paymentProofUrl` privado.
- **Validaciones:** `npx prisma generate` OK, `npx tsc --noEmit` OK, `npm run build` OK.

### Bloqueos activos
- Crítico: QA manual final del Admin Copilot y el nuevo DB Status.
- No realizar commit/push hasta la validación funcional.

### Pendientes (Fase futura)
- Automatización de acciones de escritura (requiere confirmación UI).
- Tráfico/bandwidth real (requiere Vercel Observability).
- Módulo financiero/P&L.
- Orquestador Oreshnik.

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
# Checkpoint â€” QA marketplace / sesiÃ³n Codex rota por modelo

Fecha: 2026-04-21

Estado actual:
- El marketplace ya tiene checkout buyer con post-submit mÃ¡s explÃ­cito:
  - â€œPago procesadoâ€
  - â€œTu pago estÃ¡ siendo validadoâ€
  - â€œNotificaremos la resoluciÃ³n o la liberaciÃ³n del escrow en menos de 24hâ€
- La migraciÃ³n/schema de conciliaciÃ³n ya quedÃ³ aplicada y validada.
- La segunda pasada de tabs/mÃ©tricas/mensajes/payout/CSV quedÃ³ estabilizada y con build limpio.
- La QA automÃ¡tica buyer llegÃ³ hasta submit real, pero la sesiÃ³n de Codex quedÃ³ rota por error de modelo.

Bloqueo actual:
- Codex terminÃ³ con `404 Not Found: Model not found gpt-5.4`.
- La sesiÃ³n no debe seguir tal como estÃ¡.
- No seguir insistiendo en esta thread con el mismo modelo.

Siguiente paso:
1) cerrar o limpiar la sesiÃ³n actual;
2) abrir una sesiÃ³n nueva o reanudar con un modelo disponible;
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
- lÃ³gica de negocio ya validada
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
- SeÃ±ales de cierre:
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

## Checkpoint 2026-04-24 - continuidad post-commit/push

- Commits de cierre creados y pusheados.
- Rama vigente: `UI-UX-finalV3`.
- `payment_proof_sensitive_preview` queda validado manualmente y no se reabre salvo regresion con evidencia.
- Siguiente frente minimo: generar preview fresco y correr regresion corta por ruta despachada en `docs/07_handoffs/qa-dispatcher.json`.
- No improvisar CDP, server actions reverse engineered ni HTTP ad hoc.
- No tocar booking ni `/reservas`.

## Actualizacion 2026-04-24 - Glosario UX marketplace

- El lenguaje visible del marketplace fue simplificado para publico general en Venezuela.
- Seller Cobros y Admin Pagos ya evitan jerga como escrow, payout, released, operativo, neto operativo, fee y unknown en el copy principal.
- Los estados visibles del dashboard se normalizan como: Pago pendiente, Pago en revision, Venta en proceso de aprobacion y Lista para pagar.
- Se creo el glosario formal `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`.
- Futuras pantallas del marketplace deben seguir ese glosario antes de introducir nuevos terminos visibles.
- No se tocaron booking ni `/reservas`; no se cambiaron enums, estados internos ni logica de negocio.

## Actualizacion 2026-04-24 - Refactor UI Seller Cobros

- Seller Cobros recibio una pasada UI/UX acotada sobre `components/marketplace/dashboard/DashboardClient.tsx`.
- Causa raiz visual corregida: el dashboard estaba limitado a `max-w-3xl`, los tabs competian en una sola fila estrecha y las metricas de cobro mezclaban montos principales con cargos tecnicos sin jerarquia clara.
- Cambios aplicados: ancho util ampliado, tabbar en grilla estable, hero de estado de cobros, KPIs principales separados de comisiones/cargos, resumen de estado mas legible y datos de cobro con mejor lectura.
- No se tocaron booking, `/reservas`, enums ni logica de negocio.
- No se toco Admin Pagos.
- `npx tsc --noEmit`: limpio.
- `npm run build`: limpio.

## Checkpoint 2026-04-25 - Seller Cobros polish commit sin push

- Commit creado: `9d44def style(marketplace): polish seller payouts dashboard`.
- El commit incluyo unicamente el polish staged de `components/marketplace/dashboard/DashboardClient.tsx`.
- `git diff --cached --check` estaba sin errores antes del commit.
- No se hizo push.
- No se corrio `npm run build` despues del commit por instruccion explicita.
- No se corrio QA despues del commit por instruccion explicita.
- No se tocaron booking ni `/reservas`.
- No se mataron procesos: no habia `Get-Job` activo ni procesos `node` recientes atribuibles a esta sesion.
- El worktree sigue sucio con cambios unstaged/untracked fuera del commit, incluyendo docs, scripts, `.obsidian`, admin/actions, hunks no staged en `components/marketplace/dashboard/DashboardClient.tsx`, `.tmp-preview-dev.log` y `.tmp-seller-cobros-polish-staged.patch`.
- Stash viejo intacto: `stash@{0}: On UI-UX-finalV3: pre-seller-cobros-polish-unstaged`.
- Existe `.tmp-seller-cobros-polish-staged.patch` y no debe borrarse sin instruccion explicita.
- No limpiar, no aplicar stash, no borrar patch, no borrar `.tmp-preview-dev.log` y no hacer push sin instruccion explicita.
- Proximo paso recomendado: limpieza controlada del worktree separando:
  - cambios que deben conservarse,
  - basura temporal eliminable,
  - stash viejo pendiente de decision.

## Checkpoint 2026-04-25 - Seller Dashboard + Glosario UX cerrado

- Commit creado: `21bb346 style(marketplace): clarify seller dashboard payouts UX`.
- Alcance del commit:
  - `components/marketplace/dashboard/DashboardClient.tsx`
  - `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- Estado final registrado:
  - glosario UX creado en `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`;
  - Seller Dashboard/Cobros usa lenguaje mas humano para vendedor;
  - jerga interna eliminada del frente seller: escrow, payout, RELEASED y neto operativo;
  - Cobros separa `Monto en revision`, `Monto en proceso`, `Listo para cobrar` y `Datos de cobro`;
  - contenedor seller ampliado para desktop con `max-w-6xl`;
  - mobile-first preservado;
  - no se cambiaron calculos ni logica de negocio.
- Validacion cerrada:
  - `npx tsc --noEmit`: limpio.
  - `npm run build`: limpio.
  - `git status --short` final: limpio.
- No se toco:
  - AdminDashboard;
  - booking;
  - `/reservas`;
  - Prisma/runtime/db/env;
  - APIs/actions;
  - Blob/storage/paymentProofUrl/proxy SUPER.
- Push: no realizado.

## Continuidad recomendada post `21bb346`

1. Siguiente frente recomendado: Admin dashboard, alineando lenguaje operacional/financiero con el glosario sin tocar logica ni calculos.
2. Despues: SEO/AEO del marketplace publico.
3. Despues: disenar el cierre final de payout/pago al vendedor solo como diseno, porque implementarlo tocaria DB/schema.

Riesgos activos:
- No volver a tocar runtime/Prisma/env sin tarea explicita.
- No aplicar ni borrar stashes sin inspeccion y autorizacion.
- No mezclar Admin + SEO + payout final en una sola tarea.

## Checkpoint 2026-04-25 - Admin Dashboard UX cerrado

- Commit creado: `e8ce902 style(marketplace): clarify admin dashboard operations UX`.
- Alcance del commit:
  - `components/marketplace/admin/AdminDashboard.tsx`
  - `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- Estado final registrado:
  - Admin Dashboard alineado con el lenguaje del glosario UX;
  - jerga interna reducida en la superficie admin;
  - primera vista orientada a accion operativa: `Pagos por revisar`, `Dinero en proceso`, `Disputas abiertas` y `Monto listo para pagar`;
  - metricas informativas bajadas de jerarquia: transacciones totales, publicaciones activas, usuarios registrados y comision plataforma mensual;
  - reemplazos visibles: `Escrow` -> `En proceso` / `Dinero en proceso`, `RELEASED` / `Liberado` -> `Listo para pagar`, `Payouts listos` -> `Ventas listas`, `Neto vendedor` -> `Monto a pagar`, `Fee retenido` -> `Comision plataforma`;
  - layout admin ampliado a `max-w-6xl`;
  - tabs admin convertidos a grilla responsive;
  - glosario UX actualizado con terminos admin.
- Validacion cerrada:
  - `npm run build`: limpio.
  - lint/type check: limpio.
  - build genero 29 paginas.
  - `git status --short` final: limpio.
- No se toco:
  - seller dashboard;
  - booking;
  - `/reservas`;
  - Prisma/runtime/db/env;
  - APIs/actions;
  - Blob/storage/paymentProofUrl/proxy SUPER.
- Push: no realizado.

## Continuidad recomendada post `e8ce902`

1. Siguiente frente recomendado: SEO/AEO del marketplace publico.
2. Despues: disenar el cierre final de payout/pago al vendedor, solo como diseno primero porque implementarlo tocaria DB/schema.

Riesgos activos:
- No implementar cierre final de payout sin diseno previo.
- No tocar runtime/Prisma/env sin tarea explicita.
- No mezclar SEO/AEO con cierre contable.

## Checkpoint 2026-04-26 - SEO/AEO publico marketplace cerrado

- Commit creado: `60be254 feat(marketplace): improve public SEO and AEO`.
- Alcance del commit:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `app/marketplace/page.tsx`
  - `app/sitemap.ts`
- Estado final registrado:
  - `/marketplace` quedo convertido a Server Component con metadata publica;
  - la UI interactiva quedo movida a `MarketplacePageClient.tsx`;
  - metadata publica agregada: title, description, canonical, OpenGraph y Twitter card;
  - JSON-LD estatico agregado: `CollectionPage` + `BreadcrumbList`;
  - `/marketplace` quedo agregado a `app/sitemap.ts`;
  - el copy publico fue ajustado para no prometer escrow, fiduciario ni operacion sin riesgo.
- Validacion cerrada segun reporte de implementacion:
  - `git diff --check`: limpio, solo warnings LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio;
  - build genero 29 paginas, incluyendo `/marketplace` y `/sitemap.xml`.
- No se toco:
  - booking;
  - `/reservas`;
  - Prisma/runtime/db/env;
  - APIs/actions;
  - dashboards privados;
  - Blob/storage/paymentProofUrl/proxy SUPER.
- Push: no realizado.

## Continuidad recomendada post `60be254`

1. Siguiente frente recomendado: SEO/AEO de `/marketplace/[slug]`, solo metadata y semantica, sin tocar DB/actions.
2. Despues: disenar el cierre final de payout/pago al vendedor, solo diseno primero porque implementarlo tocaria DB/schema.

Riesgos activos:
- No agregar Product JSON-LD dinamico sin revisar datos reales.
- No tocar DB/actions para SEO.
- No mezclar SEO/AEO con payout final.

## Checkpoint 2026-04-26 - SEO/AEO detalle marketplace cerrado

- Commit creado: `745068b feat(marketplace): improve listing detail SEO and AEO`.
- Alcance del commit:
  - `app/marketplace/[slug]/page.tsx`
- Estado final registrado:
  - SEO/AEO de `/marketplace/[slug]` quedo cerrado;
  - metadata dinamica ampliada: title, description, canonical, OpenGraph, Twitter card, fallback de imagen y `noindex` para listing no encontrado;
  - JSON-LD conservador agregado: `ItemPage` + `BreadcrumbList`;
  - `Product` JSON-LD fue omitido por prudencia de datos;
  - copy publico corregido para no prometer pago fiduciario ni escrow;
  - la explicacion visible usa pago reportado, revision manual, validacion y confirmacion.
- Validacion cerrada segun reporte de implementacion:
  - `git diff --check`: limpio, solo warning LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio;
  - build genero 29 paginas y `/marketplace/[slug]` quedo dinamico server-rendered.
- No se toco:
  - sitemap;
  - booking;
  - `/reservas`;
  - Prisma/runtime/db/env;
  - APIs/actions;
  - dashboards privados;
  - Blob/storage/paymentProofUrl/proxy SUPER.
- Sitemap dinamico de slugs queda pendiente porque requeriria consultar DB.
- Push: no realizado.

## Continuidad recomendada post `745068b`

1. Siguiente frente recomendado: diseno del cierre final de payout/pago al vendedor, solo diseno primero porque implementarlo tocaria DB/schema/acciones admin.
2. Alternativa menor: revision visual/manual del marketplace publico despues del deployment.

Riesgos activos:
- No agregar Product JSON-LD dinamico sin datos consistentes.
- No consultar DB desde sitemap sin diseno.
- No implementar cierre final de payout sin especificacion.

## Checkpoint 2026-04-26 - P0 marketplace publico/mobile

- Commit creado: `586663b fix(marketplace): resolve mobile public marketplace regressions`.
- Alcance del commit:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `components/layout/AnimatedLogo.tsx`
  - `components/layout/MobileMenu.tsx`
  - `components/layout/SiteHeader.tsx`
  - `components/marketplace/ListingQASection.tsx`
  - `components/marketplace/MarketplaceAuthModal.tsx`
  - `components/marketplace/MarketplaceCard.tsx`
  - `components/marketplace/MarketplaceImage.tsx`
  - `components/marketplace/MarketplaceModals.tsx`
  - `components/marketplace/TransactionChat.tsx`
  - `content/marketplace.ts`
  - `lib/marketplace/media-client.ts`
- Quedo corregido:
  - navbar mobile sin overflow;
  - logo/texto mobile con constraints;
  - menu hamburguesa legible con fondo solido/opaco y z-index correcto;
  - `Quiero comprar` ya no debe quedar en spinner infinito; tiene estado de error acotado;
  - cards/listings sin copy de pago fiduciario;
  - fallbacks visibles y manejo de error para imagenes de listings;
  - upload movil mejorado para imagenes de publicaciones;
  - textarea de preguntas de listing con `id` y `name`.
- Validacion cerrada antes del commit:
  - `git diff --check`: limpio, solo warnings CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio.
- Commit unico usado porque la separacion parcial de `MarketplaceModals.tsx` no aplico limpio y se evito loop.
- No se toco:
  - booking;
  - `/reservas`;
  - Prisma/runtime/db/env;
  - APIs/actions;
  - dashboards privados;
  - Blob/storage/paymentProofUrl/proxy SUPER.
- Validacion pendiente en preview:
  - `/marketplace` mobile;
  - menu hamburguesa mobile;
  - `Quiero Comprar`;
  - `Quiero Vender` + upload de imagen desde movil;
  - cards/listings con imagenes o fallback;
  - listing detail + textarea de preguntas;
  - smoke rapido desktop.
- Riesgos activos:
  - `lib/marketplace/media-client.ts` cambio para upload movil; validar desde galeria/camara;
  - si el upload visual funciona pero falla backend/storage, reportar antes de tocar storage/backend;
  - no mezclar con payout final.
- Push: no realizado.

## Checkpoint 2026-04-28 - UX publico responsive marketplace

- Sprint ejecutado: UX publico responsive mobile + desktop, sin schema ni cambios de negocio.
- Cambios UX cerrados:
  - contraste reforzado en `/marketplace`, cards/listings, ficha `/marketplace/[slug]`, Q&A, checkout y chat;
  - preguntas/respuestas con texto mas legible, mejor espaciado y fondos con mayor separacion visual;
  - cajas de preguntas/respuestas en detalle y modales convertidas a superficies tactiles mas altas, con `id/name` donde aplica;
  - dropdown de banco emisor muestra label compacto `0105-Mercantil` sin cambiar el valor interno enviado;
  - horas visibles del chat marketplace pasan a formato 12h con `hour12`;
  - auth bar de marketplace ajustada para no degradar mobile ni desktop.
- Dark/light: no implementado. No existe infraestructura de tema segura y el marketplace tiene colores inline/hardcodeados; hacerlo bien requiere diseno/refactor de theme system en sprint separado.
- Validacion tecnica:
  - `git diff --check`: limpio, solo warnings CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- No se ejecuto Playwright, QA automatizada, CDP ni flujos UI ad hoc.
- No se tocaron booking, `/reservas`, main/produccion, stashes, schema/migrations, tasas, carrito, finanzas, conformidad/fondos ni `paymentProofUrl`/proxy SUPER.
- Siguiente frente recomendado: Sprint 2 de bugs internos acotados, empezando por validar el `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`; si no existe, reportar `GAP OPERATIVO`.

## Checkpoint 2026-04-28 - Dark/light marketplace implementado

- Rama de trabajo: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Estrategia tecnica:
  - `MarketplaceThemeProvider` local al marketplace, sin tema global en `html/body`;
  - atributo scoped `data-marketplace-theme` sobre `.mp-theme-root`;
  - variables CSS `--mp-*` en `styles/globals.css`;
  - persistencia en `localStorage` con key `turpial-marketplace-theme`;
  - preferencia inicial desde `prefers-color-scheme` cuando no hay preferencia guardada;
  - script bootstrap inline dentro del provider para reducir parpadeo antes de hidratacion;
  - toggle visible en la auth bar publica de `/marketplace` y en la barra sticky de `/marketplace/[slug]`.
- Archivos de codigo tocados:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `app/marketplace/[slug]/page.tsx`
  - `components/marketplace/MarketplaceTheme.tsx`
  - `components/marketplace/MarketplaceAuthModal.tsx`
  - `components/marketplace/ListingDetailActions.tsx`
  - `components/marketplace/CheckoutModal.tsx`
  - `components/marketplace/ListingQASection.tsx`
  - `components/marketplace/MarketplaceCard.tsx`
  - `components/marketplace/MarketplaceModals.tsx`
  - `components/marketplace/TransactionChat.tsx`
  - `styles/globals.css`
- Superficies cubiertas por codigo:
  - `/marketplace`;
  - `/marketplace/[slug]`;
  - cards/listings;
  - Q&A;
  - auth modal;
  - modales de marketplace;
  - checkout modal;
  - chat/transaccion;
  - acciones de compra/contacto/favorito en detalle.
- `SiteHeader` y `MobileMenu` fueron inspeccionados y no se modificaron para evitar impacto global fuera del marketplace.
- Validacion tecnica:
  - `git diff --check`: limpio, solo warnings LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- No se ejecuto Playwright, QA automatizada, CDP ni flujos UI ad hoc.
- No se tocaron booking, `/reservas`, main/produccion, stashes, schema/migrations, carrito, tasas, finanzas, conformidad/fondos ni `paymentProofUrl`/proxy SUPER.
- Pendiente residual: revision visual humana opcional en mobile y desktop; si se pide QA automatizada futura, debe resolverse primero un `task_id` exacto en `qa-dispatcher.json`.

## Checkpoint 2026-04-28 - Dark/light marketplace extendido a todo /marketplace

- Rama de trabajo: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Correccion principal:
  - se creo `app/marketplace/layout.tsx`;
  - `MarketplaceThemeProvider` ahora envuelve todo el arbol `/marketplace`;
  - se retiraron providers locales de `/marketplace` y `/marketplace/[slug]` para evitar contextos duplicados;
  - dashboard usuario/seller y admin quedan dentro del mismo `data-marketplace-theme`.
- Toggle UX:
  - si el tema actual es claro, el label muestra `Modo oscuro`;
  - si el tema actual es oscuro, el label muestra `Modo claro`;
  - el control ahora usa apariencia de switch deslizante con thumb, track, foco visible y texto accesible.
- Superficies cubiertas:
  - landing marketplace;
  - detalle de listing;
  - dashboard usuario/seller;
  - dashboard admin;
  - tabs de dashboard/admin;
  - cards, badges, tablas nativas si aparecen, paneles, inputs, forms y modales.
- Archivos nuevos/modificados de esta extension:
  - `app/marketplace/layout.tsx`
  - `app/marketplace/MarketplacePageClient.tsx`
  - `app/marketplace/[slug]/page.tsx`
  - `app/marketplace/admin/page.tsx`
  - `components/marketplace/MarketplaceTheme.tsx`
  - `components/marketplace/dashboard/DashboardClient.tsx`
  - `components/marketplace/admin/AdminDashboard.tsx`
  - `styles/globals.css`
- Validacion tecnica:
  - `git diff --check`: limpio, solo warnings LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- No se ejecuto Playwright, QA automatizada ni CDP.
- No se tocaron booking, `/reservas`, main/produccion, stashes, schema/migrations, carrito, tasas, finanzas, conformidad/fondos, logica de pagos, SOLD_OUT ni `paymentProofUrl`/proxy SUPER.

## Checkpoint 2026-04-28 - Barrido final theme/contraste marketplace

- Rama de trabajo: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Objetivo cerrado:
  - pulido final de contraste y consistencia visual del theme en todo `/marketplace`;
  - light mode con superficies limpias y legibles;
  - dark mode con secundarios menos tenues;
  - residuos oscuros inline cubiertos por tokens scoped.
- Causa de la banda negra superior:
  - `app/layout.tsx` aplica `pt-16` al `<main>` global;
  - el provider de `/marketplace` empezaba despues de ese padding;
  - en light mode quedaba visible el fondo global oscuro en el hueco superior.
- Fix de banda superior:
  - `app/marketplace/layout.tsx` usa `mp-route-shell`;
  - `.mp-route-shell` compensa el `pt-16` global con `margin-top: -4rem` y `padding-top: 4rem`, cubriendo el hueco con `--mp-page-bg`.
- Barrido visual:
  - tokens `--mp-*` ajustados para mejor contraste en dark/light;
  - compatibilidad scoped ampliada para fondos inline oscuros y superficies lavadas;
  - colores secundarios inline `rgba(255,255,255,0.x)` elevados en dark y mapeados a tokens legibles en light;
  - tablas nativas, inputs, textareas, selects, cards, badges, panels y tabs quedan bajo el sistema visual del marketplace;
  - `reset-password` queda cubierto por el CSS scoped del provider sin tocar logica.
- Archivos modificados en este barrido:
  - `app/marketplace/layout.tsx`
  - `styles/globals.css`
- Validacion tecnica:
  - `git diff --check`: limpio, solo warnings LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- No se ejecuto Playwright, QA automatizada ni CDP.
- No se tocaron booking, `/reservas`, main/produccion, stashes, schema/migrations, carrito, tasas, finanzas, conformidad/fondos, logica de pagos, SOLD_OUT ni `paymentProofUrl`/proxy SUPER.

## Checkpoint 2026-04-28 - Theme residual dashboard usuario/seller

- Rama de trabajo: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Causa encontrada:
  - `components/marketplace/dashboard/DashboardClient.tsx` conservaba fondos/gradientes inline oscuros en KPI, TabBar, Mensajes, listados internos, Cobros y metodos de cobro;
  - varias etiquetas secundarias seguian usando `#3a3a3a`, `#5a5a5a`, `#8a8a8a` o superficies `rgba(13,13,13)`/`rgba(30,30,30)`;
  - el barrido CSS global ayudaba, pero estas cards necesitaban tokens directos para quedar igual de consistentes que home/admin.
- Correccion:
  - KPI cards superiores migradas a `--mp-card`, `--mp-border`, `--mp-card-shadow`, `--mp-text-*`;
  - TabBar y cards de Mensajes migradas a tokens del theme;
  - Cobros, Cargos/comisiones, Datos de cobro, Resumen y Metodos registrados migrados a superficies claras/oscuras themeadas;
  - listados internos (`TxCard`, publicaciones, favoritos, preguntas/interacciones) dejan fondos negros fijos en las superficies principales.
- Archivos de este pase:
  - `components/marketplace/dashboard/DashboardClient.tsx`
  - docs de handoff/roadmap/bugs.
- Validacion tecnica:
  - `git diff --check`: pendiente post-docs;
  - `npx tsc --noEmit`: limpio antes de docs;
  - `npm run build`: pendiente post-docs.
- No se ejecuto Playwright, QA automatizada ni CDP.
- No se tocaron admin, home, booking, `/reservas`, schema/migrations, carrito, tasas, finanzas/P&L, conformidad/fondos, acciones server, pagos, SOLD_OUT ni `paymentProofUrl`/proxy SUPER.

## Checkpoint 2026-04-28 - Sprint 2 bugs internos marketplace

- Rama de trabajo: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Bugs corregidos:
  - `Guardar metodo de cobro` en dashboard usuario/seller;
  - escritura continua de nota interna en dashboard admin.
- Causa metodo de cobro:
  - la UI ofrecia `BINANCE_PAY`, pero el enum persistible de payout methods usa `CRYPTO_WALLET`;
  - la accion server aceptaba string sin normalizar ni validar payload;
  - el formulario solo aparecia cuando habia ventas relevantes, impidiendo registrar datos por adelantado.
- Correccion metodo de cobro:
  - `BINANCE_PAY` se normaliza a `CRYPTO_WALLET` antes de persistir;
  - el cliente valida datos requeridos, evita duplicados exactos y actualiza la UI local tras guardar;
  - el server valida tipo, moneda, payload JSON y duplicados activos antes de crear;
  - el primer metodo activo queda como predeterminado.
- Causa nota interna admin:
  - los tabs internos estaban definidos como componentes dentro de `AdminDashboard` y se renderizaban como JSX;
  - al actualizar `pendingAction.note` en cada tecla, cambiaba la identidad del componente y React remountaba el subtree, provocando perdida de foco.
- Correccion nota interna:
  - los tabs internos se renderizan como helpers (`EscrowTab()`, etc.) para preservar el input controlado durante cada re-render;
  - el draft de nota sigue local en `pendingAction.note` y solo se envia al confirmar.
- Archivos de codigo:
  - `components/marketplace/dashboard/DashboardClient.tsx`;
  - `components/marketplace/admin/AdminDashboard.tsx`;
  - `actions/marketplace/users.ts`.
- Validacion tecnica:
  - `npx tsc --noEmit`: limpio antes de documentar;
  - validacion final completa pendiente al cierre (`git diff --check`, `npx tsc --noEmit`, `npm run build`).
- No se ejecuto Playwright, QA automatizada ni CDP.
- No se tocaron booking, `/reservas`, main/produccion, stashes, Prisma schema/migrations, carrito, tasas, finanzas/P&L, conformidad/fondos, pagos/escrow, SOLD_OUT, Blob/token de Jean ni `paymentProofUrl`/proxy SUPER.

## Checkpoint 2026-04-28 - Metodo de cobro banco/telefono

- Rama de trabajo: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Ajustes cerrados:
  - el campo Banco de metodos de cobro pasa de texto libre a select;
  - el select reutiliza `VENEZUELAN_BANK_OPTIONS` de `lib/marketplace/venezuelan-banks.ts`;
  - el valor guardado usa el mismo formato estandar del checkout (`0105 - Banco Mercantil, C.A. Banco Universal`) y muestra opcion compacta tipo `0105-Mercantil`;
  - se agrego `lib/marketplace/venezuelan-phone.ts` con `normalizeVenezuelanMobilePhone`;
  - telefonos se normalizan a `04XXXXXXXXX` y aceptan `0412`, `0414`, `0416`, `0422`, `0424`, `0426`;
  - validacion cliente/server bloquea telefonos invalidos y bancos fuera de lista;
  - `Metodos registrados` ya no muestra botones `Copiar` en datos propios.
- Ejemplos soportados:
  - `+584141333305` -> `04141333305`;
  - `584141333305` -> `04141333305`;
  - `4141333305` -> `04141333305`;
  - `0414-133-33-05` -> `04141333305`;
  - `0414 133 33 05` -> `04141333305`;
  - `+584221234567` -> `04221234567`;
  - `4221234567` -> `04221234567`.
- Archivos de codigo:
  - `components/marketplace/dashboard/DashboardClient.tsx`;
  - `actions/marketplace/users.ts`;
  - `lib/marketplace/venezuelan-phone.ts`.
- Validacion tecnica:
  - `npx tsc --noEmit`: limpio antes de documentar;
  - validacion final completa pendiente al cierre.
- No se ejecuto Playwright, QA automatizada ni CDP.
- No se tocaron booking, `/reservas`, main/produccion, stashes, Prisma schema/migrations, carrito, tasas, finanzas/P&L, conformidad/fondos, pagos/escrow, SOLD_OUT, Blob/token de Jean ni `paymentProofUrl`/proxy SUPER.

## Actualizacion 2026-04-28 - Marketplace-Pure Sync (Gemini)

- **Rama actual:** `Marketplace-Pure` (creada desde `UI-UX-finalV3`).
- **Commits cerrados:**
  - `18c5eec`: Mejora UX responsive pÃºblica (contraste, Q&A, dropdown bancos compacto, formato 12h).
  - `deef9f4`: Dark/light mode scoped a `/marketplace` con persistencia en `localStorage`.
  - `70045a6`: Fix en mÃ©todo de cobro (select de bancos, normalizaciÃ³n telÃ©fono) y nota interna admin (foco estable).
- **DiagnÃ³stico Sprint 3A (Pendiente):**
  - **Mensajes/badges:** Se requiere fuente Ãºnica `getMessageSummary()` y polling optimizado (30s/15s).
  - **Disponibilidad por TransacciÃ³n Activa:** Impedir nuevas compras si existe transacciÃ³n activa. Regla de NO marcar `SOLD_OUT` antes de validaciÃ³n real.
## SPRINT 3B1: DISPONIBILIDAD DE LISTING POR TRANSACCIÃ“N ACTIVA
Completado tÃ©cnicamente al 2026-04-28.
- Se implementÃ³ bloqueo de compra duplicada por transacciÃ³n activa: `initiatePurchase` rechaza nuevas compras si existe `activeTx`.
- `Listings/cards/detail` reciben `activeTransactionStatus`.
- `MarketplaceCard` muestra overlay y `ListingDetailActions` deshabilita CTA.
- Estados bloqueantes: PENDING_PAYMENT, PAYMENT_RECEIVED, VALIDATING, IN_ESCROW, DELIVERY_CONFIRMED, DISPUTED.
- Estados terminales: RELEASED, REFUNDED, PAYMENT_FAILED, CANCELLED.
- No se marca SOLD_OUT antes de validaciÃ³n admin.
- ValidaciÃ³n `npx tsc --noEmit` y `npm run build` OK. Pendiente validaciÃ³n manual local.

- **Estado final:** Rama pusheada, working tree limpio, listo para Sprint 3B.

## Checkpoint Sprint 3B1 - disponibilidad por transacción activa

**Fecha:** 2026-04-28
**Rama:** Marketplace-Pure
**Estado:** completado técnicamente, pendiente validación manual local antes de commit.

### Implementado
- Se agregó bloqueo de compra duplicada cuando un listing tiene una transacción activa.
- initiatePurchase() ahora rechaza nuevas compras si existe ctiveTx para el listing.
- La disponibilidad pública se deriva de ctiveTransactionStatus.
- MarketplaceCard muestra overlay de disponibilidad según estado.
- ListingDetailActions deshabilita el CTA de compra y muestra copy informativo.
- No se marca SOLD_OUT antes de validación real por admin.

### Estados bloqueantes
- PENDING_PAYMENT
- PAYMENT_RECEIVED
- VALIDATING
- IN_ESCROW
- DELIVERY_CONFIRMED
- DISPUTED

### Estados terminales
- RELEASED
- REFUNDED
- PAYMENT_FAILED
- CANCELLED

### Copy operativo
- PENDING_PAYMENT: Reservado temporalmente
- PAYMENT_RECEIVED / VALIDATING: Pago en revisión
- IN_ESCROW: Venta en proceso
- DELIVERY_CONFIRMED: Entrega confirmada
- DISPUTED: Operación en disputa
- SOLD_OUT / RELEASED: Vendido
- ACTIVE sin transacción activa: Disponible

### Validación técnica reportada
-
px tsc --noEmit: OK.
-
pm run build: OK.
- Pendiente confirmar git diff --check tras esta sincronización documental.

### Restricciones respetadas
- No se tocó schema.prisma.
- No se aplicaron migraciones.
- No se tocó booking ni /reservas.
- No se tocó main ni producción.
- No se tocaron pasarelas, carrito, tasas, finanzas, conformidad/fondos ni paymentProofUrl/proxy SUPER.

## Checkpoint 2026-04-29 - Admin Pagos vendedores metodo de cobro

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Causa encontrada: `getPayoutReport()` solo incluia `payoutMethods` con `isDefault: true` y no traia `encryptedData`; si un seller tenia metodo activo no-default o detalles requeridos, el admin caia a `UNKNOWN / Sin metodo configurado`. Ademas todas las ventas `RELEASED` se presentaban como listas aunque faltara metodo de cobro usable.
- Fix aplicado: el query admin toma metodo activo con prioridad default, trae detalles del metodo, clasifica `hasPayoutMethod` y separa ventas con metodo vs ventas sin metodo.
- UI Admin > Pagos vendedores: ahora muestra secciones `Listo para pagar` y `Falta método de cobro`; el monto listo excluye operaciones sin datos de cobro.
- Datos visibles cuando existen: metodo, etiqueta, banco, telefono, cedula, titular/beneficiario, cuenta, email o wallet segun aplique.
- No se tocaron calculos financieros base, payout final, conformidad/fondos, schema, migraciones, booking, `/reservas`, Playwright, CDP ni QA automatizada.
- Validacion final requerida al cierre de esta tarea: `git diff --check`, `npx tsc --noEmit`, `npm run build`.

## Checkpoint 2026-04-29 - Binance rate persistente sin tocar BCV

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado tecnicamente; sin commit y sin push.
- Reconciliacion: el diff amplio anterior reescribia BCV y fue corregido. `lib/marketplace/reference-rate.ts` y `/api/bcv-rate` vuelven al flujo previo: 3 fuentes, storage memory/file y `BCV_FALLBACK_RATE`.
- Modelo creado: `MpBinanceRateSnapshot`, tabla `mp_binance_rate_snapshots`.
- Campos: `rate`, `fechaValor`, `source`, `mode`, `metadata`, `createdAt`, `updatedAt`.
- Migracion creada: `prisma/migrations/20260429_marketplace_binance_rate_snapshots/migration.sql`; no se aplico contra produccion desde esta tarea.
- Helper nuevo: `lib/marketplace/binance-rate.ts` con `resolveBinanceRate()`.
- Fuente primaria Binance: API P2P, payload USDT/VES BUY, top 10, mediana de `data[].adv.price`.
- Google Sheets queda solo como fallback opcional para Binance si se configura `MP_RATES_GOOGLE_SHEETS_CSV_URL` o alias equivalentes.
- Fallback final Binance: ultimo snapshot valido en DB; no se inventa tasa Binance.
- Queda pendiente aplicar migracion controlada y asociar tasa/snapshot a `MpTransaction` antes de liquidacion/CSV seller auditables.
- No se tocaron booking, `/reservas`, liquidacion seller final, CSV final, payout final, carrito ni conformidad/fondos.

## Checkpoint 2026-04-29 - Asistente IA publico marketplace

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Se reemplazo visualmente la seccion `Ve el chat de compra en accion` por un asistente IA publico desacoplado de chats reales.
- Endpoint nuevo: `/api/marketplace/assistant`, server-side, con Vercel AI SDK y `@ai-sdk/google`.
- API key: solo se lee desde `GOOGLE_GENERATIVE_AI_API_KEY`; no se escribio ni mostro ninguna clave y no se uso `NEXT_PUBLIC`.
- Modelo configurable por `MARKETPLACE_ASSISTANT_MODEL`, default `gemini-2.5-flash`.
- Feature flag: `MARKETPLACE_ASSISTANT_ENABLED=false` responde 503 controlado.
- KB publico creado en `docs/marketplace/PUBLIC_ASSISTANT_KB.md` y version consumible en `lib/marketplace/assistant-knowledge.ts`.
- Guardrails: rechaza secretos, arquitectura, rutas internas, Prisma/schema/tablas, antifraude, proof/proxy SUPER, notas admin, datos personales/bancarios privados, handoffs, roadmap, bugs, commits, ramas y finanzas/tasas internas.
- UI nueva: `components/marketplace/MarketplaceAssistant.tsx`, mobile/desktop y dark/light por tokens `--mp-*`.
- No se tocaron booking, `/reservas`, schema/migrations, tasas/Binance rate, liquidacion seller, payout final, carrito, conformidad/fondos, paymentProofUrl/proxy SUPER, env files, logica de transacciones, main ni produccion.
