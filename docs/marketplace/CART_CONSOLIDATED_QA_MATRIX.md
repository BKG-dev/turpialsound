# S-MP-01 Carrito Consolidado - QA Matrix

> Fecha: 2026-05-17
> Sprint: S-MP-01 - Carrito de Compras del Marketplace
> Ruta canonica: `smp01_cart_consolidated_checkout`
> Script: `npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01`
> Ultima validacion: 2026-05-17T21:24:48Z - 17/17 PASS

## Objetivo

Validar que el carrito funciona como una operacion consolidada para el comprador, pero mantiene control independiente por seller/listing para entrega, escrow, liberacion y payout.

## Contrato Funcional

| Area | Regla | Implementacion validada |
| --- | --- | --- |
| Inventario | El campo real del listing es `inventory`; `quantity` no existe en `MpListing`. | `MpListing.hasInventory`, `MpListing.inventory`; `MpTransaction.quantity` guarda unidades compradas. |
| Disponible real | El maximo comprable es `inventory - SUM(quantity)` de transacciones consumidoras. | Estados consumidores: `INITIATED`, `PENDING_PAYMENT`, `PAYMENT_RECEIVED`, `VALIDATING`, `IN_ESCROW`, `DELIVERY_CONFIRMED`, `DISPUTED`, `RELEASED`. |
| Carrito | Un item del mismo listing con cantidad N genera una sola transaccion con `quantity=N`. | `checkoutCart` crea una `MpTransaction` por linea del carrito. |
| Orden consolidada | Comprar varios sellers genera una sola operacion visible al comprador. | `MpOrder` padre con total consolidado y `MpTransaction.orderId` en cada hija. |
| Comprobante | El pago consolidado no puede reportarse sin comprobante. | `CartCheckoutModal` bloquea sin archivo; `submitOrderPaymentProof` rechaza sin `proofUrl`. |
| Propagacion de pago | Un solo reporte de pago actualiza orden e hijas. | `MpOrder.paymentProofUrl` y cada `MpTransaction.paymentProofUrl` quedan con la misma URL. |
| Entrega | Cada seller avanza su entrega de manera independiente. | Las acciones de dashboard operan por `transactionId`, no por `orderId`. |
| Liberacion | Se puede liberar el pago de un seller mientras otro sigue pendiente. | Cada hija puede llegar a `RELEASED` sin forzar el cierre de toda la orden. |
| Payout | El pago al vendedor se registra por transaccion hija. | `MpPayout.transactionIds` puede contener solo la hija liberada. |
| Dashboard | Buyer ve todas sus hijas; cada seller ve solo la suya. | `getMyTransactions('buyer'|'seller')` trabaja sobre `MpTransaction`. |

## Cobertura del Script `S-MP-01`

| Check | Que prueba | Criterio PASS |
| --- | --- | --- |
| `schema.listingInventory` | Existe `mp_listings.inventory`. | Columna presente. |
| `schema.listingHasInventory` | Existe `mp_listings.hasInventory`. | Columna presente. |
| `schema.noListingQuantity` | No se usa `quantity` en listing. | Columna ausente. |
| `schema.txQuantity` | La cantidad comprada vive en transaccion. | `mp_transactions.quantity` presente. |
| `schema.txUnitPrice` | Cada transaccion conserva precio unitario. | `mp_transactions.unitPrice` presente. |
| `schema.txOrderId` | Las hijas apuntan a orden consolidada. | `mp_transactions.orderId` presente. |
| `qaUsers` | Crea/actualiza buyer y dos sellers QA. | Usuarios disponibles. |
| `qaListings` | Crea dos listings con inventario. | Listings `ACTIVE`, inventario > 1. |
| `inventory.availableMinusPriorSales` | Descuenta ventas previas por cantidad. | `inventory=5`, venta previa `quantity=2`, disponible `3`. |
| `inventory.overbuyBlocked` | Bloquea comprar mas que disponible. | Pedido de `4` contra disponible `3` queda rechazado por regla. |
| `cart.consolidatedOrder` | Crea orden multivendedor. | Una `MpOrder`, dos hijas, dos sellers, total correcto. |
| `proof.required` | Requiere comprobante antes de reportar pago. | No hay path valido sin `paymentProofUrl`. |
| `proof.propagatedToChildren` | Propaga comprobante a todas las hijas. | Todas las hijas quedan `PAYMENT_RECEIVED` con la misma proof URL. |
| `fulfillment.independentChildren` | Avance independiente por seller. | Seller A `RELEASED`; seller B sigue `PAYMENT_RECEIVED`. |
| `payout.independentPerChild` | Payout parcial por hija. | Existe payout solo para la transaccion liberada. |
| `dashboard.visibilityModel` | Visibilidad buyer/seller. | Buyer ve 2 hijas; cada seller ve 1. |
| `inventory.afterCartQuantities` | Inventario final por cantidad. | Listing A disponible `1`; listing B disponible `2`. |

## Evidencia de Validacion

| Campo | Valor |
| --- | --- |
| Run ID | `2026-05-17T21-24-44-148Z` |
| Resultado | 17/17 checks PASS |
| Reporte JSON | `var/qa-results/report-2026-05-17T21-24-44-148Z.json` |
| Reporte MD | `var/qa-results/report-2026-05-17T21-24-44-148Z.md` |
| Listings QA | `qa-smp01-cart-a-20260517212444`, `qa-smp01-cart-b-20260517212444` |

## Comandos Canonicos

```powershell
npx prisma generate
npx tsc --noEmit
pnpm run build
npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01
```

## Limites Conocidos

- Este modulo es server-side/DB QA. No hace click real en UI.
- El flujo UI en preview sigue requiriendo una ruta Playwright/browser dedicada si se quiere validar:
  - boton `+` del listing/card,
  - apertura visual del carrito,
  - modal consolidado,
  - file picker real,
  - navegacion `Ver compras`.
- No usa CDP improvisado ni protocolo HTTP ad hoc de server actions.

## Proxima Ruta Recomendada

Crear un modulo Playwright separado cuando el dispatcher lo apruebe:

```text
task_id: smp01_cart_browser_preview
script: npx playwright test scripts/qa/playwright/smp01-cart-preview.spec.ts
layer: D
```

Ese modulo debe usar `data-testid` estables antes de considerarse canonico.
