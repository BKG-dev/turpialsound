# Action Center: Próximos Pasos (Dashboard)

> **Branch:** `Manuel/marketplace-action-center-next-steps`
> **Base:** `Manuel/marketplace-integrated-finance-discovery` (commit `0689bce`)
> **Date:** 2026-05-05

## Overview

Compact prioritized rail inserted between `ProfileHeader` and `TabBar` in [`DashboardClient.tsx`](../../components/marketplace/dashboard/DashboardClient.tsx). Shows actionable next steps for buyers and sellers derived purely from existing transaction data.

## Architecture

```
deriveActionItems(purchases, sales, hasUsablePayoutMethod) → ActionItem[]
                │
                ▼
     ActionCenterSection renders prioritized list
                │
                ▼
     handleActionCenterCta dispatches to existing actions
```

## Priority System

| Priority | Chip Label | Icon | Meaning |
|----------|-----------|------|---------|
| `required` | "Acción requerida" | `AlertTriangle` (orange) | User must act now |
| `review` | "En revisión" | `Clock` (blue) | Team is reviewing |
| `pending` | "Esperando comprador" / "Pago pendiente" / "Coordina entrega" | `Shield` (gray) | Waiting on counterparty |
| `closed` | "Cerrada" | `CheckCircle2` (green) | Terminal state, no action |

## Buyer State Mapping

| Status | Priority | Description | CTA |
|--------|----------|-------------|-----|
| `PENDING_PAYMENT` | required | "Completa o reporta tu pago" | `view-detail` |
| `PAYMENT_RECEIVED` / `VALIDATING` | review | "Pago en revisión por el equipo" | `view-detail` |
| `IN_ESCROW` | pending | "Coordina entrega con el vendedor" | `open-messages` |
| `DELIVERY_CONFIRMED` | required | "Confirma que recibiste el producto/servicio" | `confirm-delivery` |
| `RELEASED` | pending | "Pago al vendedor pendiente" | — |
| `DISPUTED` | review | "Disputa en revisión" | `view-detail` |
| `REFUNDED` / `CANCELLED` / `PAYMENT_FAILED` | closed | "Operación cerrada" | — |

## Seller State Mapping

| Status | Priority | Description | CTA |
|--------|----------|-------------|-----|
| `PAYMENT_RECEIVED` / `VALIDATING` | review | "Pago en revisión por el equipo" | `view-detail` |
| `IN_ESCROW` | required | "Coordina la entrega con el comprador" | `seller-deliver` |
| `DELIVERY_CONFIRMED` | pending | "Esperando confirmación del comprador" | — |
| `RELEASED` (with payout method) | pending | "Pago pendiente de liberación" | — |
| `RELEASED` (without payout method) | required | "Configura tu método de cobro" | `payout-setup` |
| `DISPUTED` | review | "Disputa en revisión" | `view-detail` |
| `REFUNDED` / `CANCELLED` / `PAYMENT_FAILED` | closed | "Operación cerrada" | — |

## CTA Types

| CTA Type | Handler | Behavior |
|----------|---------|----------|
| `view-detail` | Opens `TransactionDetailModal` | `handleOpenTransaction(tx, viewAs)` |
| `confirm-delivery` | Calls `confirmDelivery(tx.id)` | Reloads on success |
| `seller-deliver` | Calls `sellerDeliver(tx.id)` | Reloads on success |
| `open-messages` | Opens chat thread | Matches by `buyerId + sellerId` |
| `payout-setup` | Switches to payouts tab | `handleTabChange('payouts')` |

## Safety Rules

1. **No frozenRate requirement**: Amount display only uses existing `txPayoutDisplay` from `finance.ts`. If `frozenRate` is null, shows "—" gracefully.
2. **RELEASED ≠ closed**: RELEASED transactions appear as `pending` priority (buyer) or `required`/`pending` (seller depending on payout method). They are NOT hidden.
3. **No new server actions**: All CTAs use existing `confirmDelivery`, `sellerDeliver`, `getTransaction`, `handleOpenThread`, `handleTabChange`.
4. **Idempotency**: `actionBusyKey` prevents double-clicks. `confirmDelivery` and `sellerDeliver` already check state transitions server-side.
5. **Zero new fetches**: `deriveActionItems` is a pure projection of props — no `useEffect`, no `fetch`.

## Files Modified

- [`components/marketplace/dashboard/DashboardClient.tsx`](../../components/marketplace/dashboard/DashboardClient.tsx) — sole file touched
  - Added imports: `useMemo`, `CheckCircle2`, `Send`, `ExternalLink`, `confirmDelivery`, `sellerDeliver`
  - Added types: `ActionPriority`, `ActionItem`
  - Added functions: `deriveActionItems`, `ActionCenterSection`
  - Added to main component: `actionBusyKey` state, `actionItems` useMemo, `handleActionCenterCta` handler
  - Inserted `<ActionCenterSection>` between `<ProfileHeader>` and `<TabBar>`

## Validation

- `npx tsc --noEmit`: Only pre-existing `flipclock` module error; zero new errors
- `npm run build`: TBD
- `git diff --check`: TBD
