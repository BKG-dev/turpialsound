# Marketplace E2E Checklist (Lite)

Usar junto con `docs/07_handoffs/marketplace-e2e-qa-runbook-2026-05-07.md`.

## Preflight

- [ ] Preview URL correcta (no produccion).
- [ ] Branch/commit del deployment confirmados.
- [ ] DB integrada correcta para marketplace (`mp_*` presente).
- [ ] `DATABASE_URL` pooled y `DIRECT_URL` direct al mismo proyecto.
- [ ] Sesiones separadas listas: buyer (A), seller (B), admin (C).

## Smoke rutas

- [ ] `/marketplace` abre y lista contenido esperado.
- [ ] Dashboard buyer/seller accesible (si aplica).
- [ ] Admin marketplace accesible (si aplica).
- [ ] `/reservas` smoke no-regresion (sin booking profundo).

## Flujo E2E

- [ ] Seller con listing `ACTIVE`.
- [ ] Buyer pregunta.
- [ ] Seller responde.
- [ ] Buyer inicia compra.
- [ ] Buyer reporta pago.
- [ ] Admin valida pago.
- [ ] Estado `IN_ESCROW`.
- [ ] Seller marca entregado.
- [ ] Fondos no se liberan aun.
- [ ] Buyer confirma recibido.
- [ ] Estado `DELIVERY_CONFIRMED`.
- [ ] Admin libera/cierra solo desde `DELIVERY_CONFIRMED`.

## Cierre

- [ ] Evidencias guardadas con formato estandar.
- [ ] Hallazgos clasificados en P0/P1/P2.
- [ ] Si hay P0, sprint no se cierra.