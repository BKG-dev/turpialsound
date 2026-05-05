# Next Window Brief - Turpial Sound

**Fecha de actualización:** 2026-05-05
**Frente activo:** Marketplace — Rates Integration (Fase 2 cerrada, pendiente commit+push)
**Rama activa:** `Manuel/marketplace-rates-diagnosis` (base: `integration/lab-marketplace-sprint2a-selective-2026-05-04`)
**Tipo de nota:** Checkpoint post-Fase 2 para siguiente ventana.

---

## Estado resumido

Fase 2 de integración de tasas completada técnicamente. Schema Fase 1 cherry-picked desde `Manuel/marketplace-rates-schema-fase1`. `initiatePurchase()` ahora persiste tasas reales en columnas dedicadas (`frozenRate`, `frozenRateSource`, `frozenRateFechaValor`, `rateSnapshotId`), bloquea compras cuando no hay tasa disponible (sin fallback silencioso a `USD_REFERENCE_RATE=1`), y protege contra doble venta con `RELEASED` en el guard.

## Lo que ya está cerrado

- Schema: columnas de tasa en `MpTransaction`, modelo `MpReferenceRateSnapshot`, migración, `reference-rate.ts` con DB.
- `calcFee()`: firma simplificada, eliminada dependencia de `USD_REFERENCE_RATE`.
- `initiatePurchase()`: 3 rutas (USDT directo / BCV / Binance), bloqueo en unavailable, persistencia real, `RELEASED` guard.
- `releaseEscrow()`: verificado que acepta `DELIVERY_CONFIRMED`.
- `RATES_BLOCKER_FASE2.md`: eliminado.
- `tsc --noEmit`: limpio.

## Lo que falta por hacer en esta rama

1. Commit + push con mensaje: `feat(marketplace): persist resolved purchase rates — Fase 2 closure`.
2. (Opcional) `npm run build` final.

## Gaps pendientes para siguientes fases

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| D | ALTO | Dashboard (`DashboardClient.tsx`) recalcula con `USD_REFERENCE_RATE=1` |
| E | ALTO | Admin payout report usa montos con rate=1 |
| F | ALTO | Migración `MpBinanceRateSnapshot` no aplicada en producción |
| H | BAJO | UI placeholders cosméticos en dashboard |

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md

Confirma si deseas commit + push en rama Manuel/marketplace-rates-diagnosis.
O si prefieres avanzar a Fase 3 (dashboard/payout recalculation con tasas reales).
No tocar booking ni /reservas.
```

---

## Restricciones vigentes

- No main/production.
- No booking, no `/reservas`.
- No schema/DB/migrations sin autorización explícita.
- No ejecutar `prisma migrate` ni `prisma db push`.
