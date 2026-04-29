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
