# Marketplace-Pure - Gemini Resume Handoff

**Fecha:** 2026-04-28
**Rama actual:** `Marketplace-Pure`
**Objetivo:** Retomar el trabajo tras el cierre de Codex, manteniendo el foco en Marketplace-Pure.

## Contexto de Rama y Commits
Rama creada desde `UI-UX-finalV3`. Commits cerrados y pusheados:
1. `18c5eec` style(marketplace): improve responsive public UX
2. `deef9f4` feat(marketplace): add scoped dark light theme
3. `70045a6` fix(marketplace): repair payout method and admin note editing

## QuÃ© quedÃ³ completado
- **UX PÃºblica Responsive:** Contraste mejorado, Q&A legible, cajas de preguntas mÃ³viles/desktop optimizadas, dropdown de bancos compacto, formato 12h AM/PM.
- **Dark/Light Mode Scoped:** `MarketplaceThemeProvider` aplicado a todo `/marketplace`. Toggle deslizante con labels dinÃ¡micos ("Modo oscuro"/"Modo claro"). Persistencia en `localStorage` (`turpial-marketplace-theme`). CorrecciÃ³n de banda negra superior en `app/layout.tsx`.
- **Sprint 2 Fixes:** Guardar mÃ©todo de cobro corregido. Banco como select (`VENEZUELAN_BANK_OPTIONS`). TelÃ©fono venezolano normalizado (`04XXXXXXXXX`). Nota interna admin estable (sin pÃ©rdida de foco).

## Hallazgos DiagnÃ³stico Sprint 3A (Pendiente ImplementaciÃ³n)
### A. Mensajes/badges intra-sesiÃ³n
- Necesidad de fuente Ãºnica `getMessageSummary()` para unreadCount total y por thread.
- Polling liviano (30s general, 10-15s en chat abierto).
- Callbacks desde `TransactionChat` hacia `DashboardClient` al enviar/leer.

### B. Disponibilidad de listing por transacciÃ³n activa
- Bloquear `initiatePurchase()` si existe transacciÃ³n activa (PENDING_PAYMENT, PAYMENT_RECEIVED, etc.).
- Regla: NO marcar `SOLD_OUT` antes de validaciÃ³n real por admin.
- Copy recomendado por estado (Reservado temporalmente, Pago en revisiÃ³n, Venta en proceso, etc.).

## PrÃ³ximo Sprint Recomendado
**Sprint 3B: ImplementaciÃ³n de Mensajes/Badges y Disponibilidad por TransacciÃ³n Activa.**

## LÃ­mites Operativos
- NO tocar `booking`.
- NO tocar `/reservas`.
- NO tocar `main` ni producciÃ³n.
- NO usar `stashes`.
- NO tocar `schema` ni `migrations`.
- NO implementar carrito, tasas, finanzas ni conformidad de fondos.
- NO tocar `paymentProofUrl` ni proxy `SUPER`.

## QA GAP OPERATIVO
Tasks propuestos (no registrar rutas falsas):
- `marketplace_messages_badges_session_refresh`
- `marketplace_listing_availability_active_transaction`

---
*Este documento sincroniza el estado real para Gemini CLI.*

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
