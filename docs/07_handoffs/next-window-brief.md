# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-05
**Frente activo:** Marketplace — Rates Integration (Fase 2: Integracion en initiatePurchase)
**Rama activa:** `Manuel/marketplace-rates-schema-fase1` (base: `integration/lab-marketplace-sprint2a-selective-2026-05-04`)
**Tipo de nota:** Checkpoint post-Fase 1 para siguiente ventana de implementacion.

---

## Estado resumido

**Fase 1 — Schema cerrada.** Commit `8ea44d4` en `Manuel/marketplace-rates-schema-fase1`, pusheado. Working tree limpio.

### Schema agregado
- `MpTransaction`: 4 columnas nullable (`frozenRate`, `frozenRateSource`, `frozenRateFechaValor`, `rateSnapshotId`).
- `MpReferenceRateSnapshot`: nuevo modelo con `rate`, `fechaValor`, `source`, `mode`, `metadata`.
- Migracion: `prisma/migrations/20260505_marketplace_rate_schema_fase1/migration.sql` (manual, no aplicada a DB).

### Backend corregido
- `resolveReferenceRate()` persiste snapshots BCV en `MpReferenceRateSnapshot`.
- Fallback correcto: live → stale persistido → último snapshot DB → `unavailable` (`rate: null`).
- **Nunca devuelve `rate=1` ni constante inventada.**
- **No mezcla `lastValid` con `snapshotId` de otro row DB.**

### Validaciones
- `git diff --check`: ✅ Clean (source files).
- `npx prisma format`: ✅ OK.
- `npx prisma generate`: ✅ Prisma Client 7.7.0.
- `npx tsc --noEmit`: ⚠️ Solo error preexistente `flipclock` en bookings.
- `npm run build`: ⚠️ Webpack ✓ Compiled. Solo error preexistente `flipclock`.

## Bloqueos activos
- ALTO: Migraciones `20260429_marketplace_binance_rate_snapshots` y `20260505_marketplace_rate_schema_fase1` sin aplicar a DB productiva.
- ALTO: `flipclock` blocker en `components/bookings/PaymentFlipCountdown.tsx` — impide build limpio.
- ALTO: Transacciones existentes con `platformFeeAmount`/`sellerNetAmount` calculados con rate=1 (~40x error en Bs).
- MEDIO: `MpBinanceRateSnapshot` migracion no aplicada en prod (Gap F del diagnostico).

## Resuelto (Hitos clave)
- Gap A (CRITICO): `MpTransaction` ya tiene columnas de tasa.
- Gap B (CRITICO): `MpReferenceRateSnapshot` creado.
- Gap G (MEDIO): `resolveReferenceRate()` persiste en DB.
- Diagnostico completo documentado en `docs/marketplace/RATES_DIAGNOSIS_2026-05-04.md`.

## Siguiente accion exacta (Fase 2 — Integracion en initiatePurchase)

1. Jean resuelve blocker `flipclock` para build limpio.
2. Revisar/aprobar migraciones `20260429_marketplace_binance_rate_snapshots` y `20260505_marketplace_rate_schema_fase1`.
3. Aplicar migraciones en ambiente controlado cuando se autorice.
4. **Fase 2** (nueva rama, autorizacion explicita):
   - Modificar `initiatePurchase()` en `actions/marketplace/transactions.ts`.
   - Invocar `resolveBinanceRate()` o `resolveReferenceRate()` segun `paymentMethod`.
   - Pasar tasa real a `calcFee()` en vez de `USD_REFERENCE_RATE=1`.
   - Almacenar `frozenRate`, `frozenRateSource`, `frozenRateFechaValor`, `rateSnapshotId` en `MpTransaction`.
   - Manejar `mode: 'unavailable'` bloqueando la transaccion.
   - Wrap en Prisma `$transaction`.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/marketplace/RATES_DIAGNOSIS_2026-05-04.md

Fase 1 Schema cerrada en commit 8ea44d4 (Manuel/marketplace-rates-schema-fase1).
Migraciones sin aplicar a DB.
flipclock blocker aun activo en bookings.

Ejecuta Fase 2 — Integracion en initiatePurchase:
  1. Modificar actions/marketplace/transactions.ts.
  2. Invocar resolveBinanceRate() o resolveReferenceRate() segun paymentMethod.
  3. Pasar tasa real a calcFee().
  4. Almacenar frozenRate, frozenRateSource, frozenRateFechaValor, rateSnapshotId.
  5. Manejar mode: 'unavailable' bloqueando la transaccion.
  6. Wrap en Prisma $transaction.
No tocar booking ni /reservas.
No tocar UI/placeholders.
No tocar DB productiva sin autorizacion.
```

---

## Checkpoint operativo - rama madre integrada y trabajo paralelo

Fecha: 2026-05-04
Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

Se documento el metodo de trabajo paralelo para Jean y Manuel.

### Estado

La rama madre es controlada por Jean y funciona como base integrada. No se debe trabajar codigo directo sobre ella.

### Pendiente inmediato Jean

- Resolver bloqueo global de build por flipclock en components/bookings/PaymentFlipCountdown.tsx.
- Revisar/mergear Manuel/reconcile-sprint2a-on-integrated-mother, commit 6512972, que restaura piezas criticas de Sprint 2A en la integracion.

### Manuel

Manuel puede iniciar sus sprints en ramas propias desde la rama madre, priorizando rates diagnosis, payout design, listing state y QA operacional.

### Documentos fuente

- docs/07_handoffs/parallel-sprint-distribution-2026-05-04.md
- docs/obsidian-vault/SPRINTS_MARKETPLACE_PARALELO.md

---

## Checkpoint operativo - hitos pragmaticos marketplace

Fecha: 2026-05-04
Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

Se agrego una capa de hitos pragmaticos / Definition of Done para traducir cada sprint tecnico a resultados concretos verificables.

Documentos:
- docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md
- docs/obsidian-vault/HITOS_MARKETPLACE_PRACTICOS.md

Uso:
- Jean y Manuel deben leer estos hitos al iniciar sesion.
- Cada sprint debe cerrar con un resultado verificable, no solo con archivos modificados.
- La division tecnica de locks se mantiene en parallel-sprint-distribution.
