# Next Window Brief - Turpial Sound

**Fecha de actualización:** 2026-05-05
**Frente activo:** Marketplace — Rates Integration (Fase 3-A Financiero-Operacional cerrada, pendiente commit+push)
**Rama activa:** `Manuel/marketplace-rates-diagnosis` (base: `integration/lab-marketplace-sprint2a-selective-2026-05-04`)
**Tipo de nota:** Checkpoint post-Fase 3-A para siguiente ventana.

---

## Estado resumido

Fase 2 (persistencia de tasas en compra) + Fase 3-A (dashboard financiero-operacional) completadas técnicamente. El dashboard ya no recalcula con `rate=1`. El flujo escrow ahora tiene los 3 pasos correctos: seller entrega → buyer confirma → admin/auto libera. Las transacciones legacy sin frozen rate muestran "Operación anterior sin tasa congelada" sin fabricar montos falsos.

## Lo que ya está cerrado (Fase 2 + Fase 3-A)

### Fase 2 (Rates Integration)
- Schema: columnas de tasa en `MpTransaction`, modelo `MpReferenceRateSnapshot`, migración, `reference-rate.ts` con DB.
- `calcFee()`: firma simplificada, eliminada dependencia de `USD_REFERENCE_RATE`.
- `initiatePurchase()`: 3 rutas (USDT directo / BCV / Binance), bloqueo en unavailable, persistencia real, `RELEASED` guard.
- `RATES_BLOCKER_FASE2.md`: eliminado.

### Fase 3-A (Financiero-Operacional)
- **`finance.ts`**: Eliminado `USD_REFERENCE_RATE = 1`. `positiveRate()` → 0. Nuevos tipos `FrozenRatePayload`, `TxPayoutDisplay`. Nueva función `txPayoutDisplay()`.
- **`DashboardClient.tsx`**: `getTxPayoutCalculation()` usa frozen rates reales. Legacy muestra "Operación anterior sin tasa congelada". `FinancialBreakdown` con 3 ramas (USDT/BS-frozen/BS-legacy).
- **`transactions.ts`**: Creado `sellerDeliver()` (`IN_ESCROW` → `DELIVERY_CONFIRMED`). Corregido `confirmDelivery()` (`DELIVERY_CONFIRMED` → `RELEASED`, con dispute guard). Corregido `releaseEscrow()` (solo `DELIVERY_CONFIRMED`).
- **Labels**: `IN_ESCROW` = "Esperando conformidad", `RELEASED` = "Fondos por liberar".
- **AdminDashboard**: Confirmado limpio (USD-only, sin rate=1).
- **`sellerDeliver`** exportado en barrel `actions/marketplace.ts`.

## Lo que falta por hacer en esta rama

1. Commit + push con mensaje: `feat(marketplace): financial-operational rates — Fase 3-A closure`.

## Gaps pendientes para siguientes fases

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| F | ALTO | Migración `MpBinanceRateSnapshot` no aplicada en producción (Jean) |
| — | ALTO | Migración `MpReferenceRateSnapshot` (`20260505_marketplace_rate_schema_fase1`) no aplicada en producción (Jean) |
| — | MEDIO | `MpPayout` model existe pero no hay server action de "pago enviado al vendedor" |
| — | BAJO | `flipclock` bloquea build completo en `PaymentFlipCountdown.tsx` (Jean) |

## Validación

- `npx tsc --noEmit`: Solo error pre-existente `flipclock`. Cero errores nuevos.
- `npm run build`: ✓ Compiled successfully. Falla solo en `flipclock`.
- `git diff --check`: Limpio.
- Archivos modificados: `actions/marketplace.ts`, `actions/marketplace/transactions.ts`, `components/marketplace/dashboard/DashboardClient.tsx`, `lib/marketplace/finance.ts`.

---

## Restricciones vigentes

- No main/production.
- No booking, no `/reservas`.
- No schema/DB/migrations sin autorización explícita.
- No ejecutar `prisma migrate` ni `prisma db push`.
- Migraciones `MpBinanceRateSnapshot` y `MpReferenceRateSnapshot` deben ser aplicadas por Jean o con candado explícito antes de producción.
