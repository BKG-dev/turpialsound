# Marketplace-Pure - Gemini Resume Handoff

**Fecha:** 2026-04-29
**Rama actual:** `Marketplace-Pure`
**Objetivo:** Sincronización final del sprint "Asistente IA público marketplace".

## Contexto de Rama y Commits
Rama creada desde `UI-UX-finalV3`.

## Qué quedó completado
- **UX Pública Responsive:** Contraste mejorado, Q&A legible, componentes móviles/desktop optimizados, selectores de banco y normalización de teléfonos venezolanos.
- **Dark/Light Mode Scoped:** Implementación global en `/marketplace` con persistencia en `localStorage`.
- **Asistente IA Público:** Implementación completa en `/api/marketplace/assistant` y `components/marketplace/MarketplaceAssistant.tsx`.
  - Corrección de truncamiento (ajuste a 900 tokens).
  - Ampliación de KB y guardrails (foco musical, sin fugas de datos internos).
  - QA Matrix: `docs/marketplace/ASSISTANT_QA_MATRIX.md`.
  - Smoke Script: `scripts/qa-marketplace-assistant-smoke.mjs`.
- **Sprint 2/3 Fixes:** Payout methods corregidos, nota interna admin estable, bloqueo de compra por transacción activa, tasas Binance persistidas, Admin Pagos mejorado.

## Próximo Sprint Recomendado
**Sprint 4: QA End-to-End manual y polish de lanzamiento.**

## LÃ­mites Operativos
- NO tocar `booking`.
- NO tocar `/reservas`.
- NO tocar `main` ni producciÃ³n.
- NO usar `stashes`.
- NO tocar `schema` ni `migrations` (salvo la de Binance, pendiente de aplicación controlada).
- NO implementar carrito, tasas automáticas, finanzas ni conformidad de fondos.
- NO tocar `paymentProofUrl` ni proxy `SUPER`.

## QA MATRIZ Y DISPATCHER
- Seguir estrictamente `docs/marketplace/ASSISTANT_QA_MATRIX.md` para validar el asistente.
- Seguir `docs/07_handoffs/qa-dispatcher.json` para nuevos frentes. Si un objetivo no está en el dispatcher, reportar `GAP OPERATIVO`.

---
*Este documento sincroniza el estado real para Gemini CLI.*

## Checkpoint 2026-04-29 - Asistente IA publico marketplace

**Rama:** `Marketplace-Pure`
**Estado:** implementado sin commit/push.

### Implementado
- Reemplazo de CTA público por `MarketplaceAssistant`.
- Endpoint `app/api/marketplace/assistant/route.ts` con Vercel AI SDK.
- KB y Guardrails públicos curados (`docs/marketplace/PUBLIC_ASSISTANT_KB.md`).
- UI responsiva con tokens ` --mp-*` para dark/light mode.

### Seguridad
- API key (`GOOGLE_GENERATIVE_AI_API_KEY`) solo en servidor.
- Guardrails estrictos contra fuga de secretos, arquitectura, datos privados o finanzas internas.

### Limites
- No accede a datos privados, cuentas o transacciones.
- Sin cambios en booking, schema/migrations, tasas, liquidación o finanzas.

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

## Checkpoint 2026-04-29 - Admin Pagos vendedores

**Rama:** `Marketplace-Pure`
**Estado:** implementado sin commit/push.

### Causa encontrada
- `getPayoutReport()` solo leia payout method `isDefault + isActive`.
- No habia fallback a metodo activo usable.
- No se incluian detalles de `encryptedData`.
- La UI agrupaba todo `RELEASED` como listo aunque faltara metodo.

### Correccion
- Query admin usa metodo activo con prioridad default.
- El reporte expone `hasPayoutMethod` y detalles visibles.
- Admin > Pagos vendedores separa `Listo para pagar` y `Falta método de cobro`.
- El KPI `Listo para pagar` suma solo operaciones con metodo de cobro usable.

### Datos visibles
- Metodo, etiqueta, banco, telefono, cedula, titular/beneficiario, cuenta, email o wallet segun aplique.

### Limites
- Sin schema/migrations.
- Sin payout final ni cierre contable.
- Sin conformidad/fondos.
- Sin booking ni `/reservas`.
- Sin Playwright/CDP/QA automatizada.

## Checkpoint 2026-04-29 - Binance rate persistente

**Rama:** `Marketplace-Pure`
**Estado:** implementado sin commit/push.

### Diagnostico
- El diff amplio anterior habia reescrito BCV y el contrato de `/api/bcv-rate`; fue reconciliado.
- BCV queda con el flujo previo de `reference-rate.ts`: 3 fuentes, storage memory/file y fallback `BCV_FALLBACK_RATE`.
- Binance no estaba persistida.
- La tasa Binance no estaba asociada a `MpTransaction`.

### Implementado
- Modelo `MpBinanceRateSnapshot` y tabla `mp_binance_rate_snapshots`.
- Migracion `20260429_marketplace_binance_rate_snapshots`.
- Helper `lib/marketplace/binance-rate.ts` con `resolveBinanceRate()`.
- Fuente primaria: Binance P2P API USDT/VES BUY, mediana de `data[].adv.price` top 10.
- Google Sheets CSV queda como fallback opcional solo para Binance.
- `/api/bcv-rate` no agrega campos Binance y mantiene contrato previo.

### Limites
- No se aplico migracion contra produccion desde esta tarea.
- No hay URL Google Sheets configurada todavia; usar `MP_RATES_GOOGLE_SHEETS_CSV_URL`.
- No se implemento liquidacion seller final, CSV final ni payout final.
- Falta asociar snapshot/tasa Binance a `MpTransaction` en un sprint posterior.

## Checkpoint 2026-04-29 - Asistente IA publico marketplace

**Rama:** `Marketplace-Pure`
**Estado:** implementado sin commit/push.

### Implementado
- Se reemplazo la seccion publica `Ve el chat de compra en accion` por `MarketplaceAssistant`.
- Endpoint nuevo `app/api/marketplace/assistant/route.ts`.
- KB publico creado en `docs/marketplace/PUBLIC_ASSISTANT_KB.md`.
- Guardrails y prompt publico en `lib/marketplace/assistant-knowledge.ts`.
- UI mobile/desktop y dark/light en `components/marketplace/MarketplaceAssistant.tsx`.

### Seguridad
- La API key solo se lee en servidor desde `GOOGLE_GENERATIVE_AI_API_KEY`.
- No se uso `NEXT_PUBLIC` ni se escribieron secretos.
- El asistente rechaza informacion interna, tecnica o sensible y responde solo sobre uso publico del marketplace.

### Limites
- No accede a cuentas, transacciones reales, proofs, datos bancarios privados ni decisiones admin.
- No se tocaron booking, `/reservas`, schema/migrations, tasas, liquidacion seller, payout final, carrito, conformidad/fondos ni `paymentProofUrl`/proxy SUPER.
