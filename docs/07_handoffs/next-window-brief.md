# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-05
**Frente activo:** Marketplace — Sprint integrado final cerrado
**Rama activa:** `Manuel/marketplace-final-integrated-sprint` (base: `origin/Manuel/marketplace-integrated-finance-discovery`)
**Tipo de nota:** Checkpoint de cierre de integracion para revision.

---

## Estado resumido

Sprint final integrado cerrado. Combina finance/rates/payout/discovery base + Action Center (CTAs buyer/seller) + SEO/AEO (sitemap listings, JSON-LD hardening, canonical). Hardening semantico de estados verificado. Build limitado solo por flipclock externo de Jean.

## Ramas integradas

| Rama | Commit | Contenido |
|------|--------|-----------|
| `Manuel/marketplace-integrated-finance-discovery` | 0689bce | Base: finance, rates, payout, discovery, sellerDeliver, confirmDelivery |
| `Manuel/marketplace-action-center-next-steps` | 05ccf72 | Action Center: CTAs buyer/seller en DashboardClient |
| `Manuel/marketplace-seo-aeo-listings-sitemap` | 5577dc3 | SEO/AEO: sitemap dinamico, JSON-LD Product/Offers, canonical |

## Lo que ya esta cerrado

### Finance/Discovery (base)
- adminMarkSellerPaid con guards: SUPER, RELEASED-only, no doble pago, no disputa activa, payout method.
- sellerDeliver (IN_ESCROW -> DELIVERY_CONFIRMED).
- confirmDelivery (DELIVERY_CONFIRMED -> RELEASED, dispute guard).
- RELEASED no cancelable (nonCancellable guard).
- Frozen rates en transactions + financial breakdown.

### Action Center
- ActionCenterSection en DashboardClient con prioridades (required/review/pending/closed).
- CTAs: confirm-delivery, seller-deliver, payout-setup, open-messages, view-detail.
- Usa server actions existentes, sin nuevas.
- Mobile responsive preservado.
- Sin raw enums visibles.

### SEO/AEO
- Sitemap dinamico con listings ACTIVE (url, lastModified, changeFrequency=weekly, priority=0.65).
- Listing detail canonical limpio sin query params.
- JSON-LD: Product/Service + Offer (price, priceCurrency, availability).
- Availability map: InStock / LimitedAvailability / OutOfStock.
- Filtros client-side no generan URLs indexables falsas.

### Hardening semantico verificado
- IN_ESCROW = pago validado, esperando conformidad del comprador.
- sellerDeliver = reporta entrega, NO libera fondos.
- confirmDelivery = buyer confirma recepcion -> RELEASED.
- RELEASED = pago al vendedor pendiente, NO operacion cerrada.
- Payout COMPLETED = operacion cerrada.

## Gaps pendientes

| Gap | Severidad | Descripcion |
|-----|-----------|-------------|
| F | ALTO | Migracion `MpBinanceRateSnapshot` no aplicada en produccion (Jean) |
| — | ALTO | Migracion `MpReferenceRateSnapshot` no aplicada en produccion (Jean) |
| — | BAJO | `flipclock` bloquea build en `PaymentFlipCountdown.tsx` (Jean) |

## Validacion

- `git diff --check`: Limpio.
- `npx tsc --noEmit`: Solo error pre-existente flipclock.
- `npm run build`: Compila correctamente. Falla solo en flipclock.
- Working tree: limpio.

---

## Restricciones vigentes

- No main/produccion.
- No booking, no `/reservas`.
- No schema/DB/migraciones sin autorizacion explicita.
- Migraciones deben ser aplicadas por Jean o con candado explicito antes de produccion.
