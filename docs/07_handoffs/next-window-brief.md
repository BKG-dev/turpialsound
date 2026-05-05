# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-05
**Frente activo:** Marketplace — Rates Integration (Fase 1: Schema)
**Rama activa:** `Manuel/marketplace-rates-diagnosis` (base: `integration/lab-marketplace-sprint2a-selective-2026-05-04`)
**Tipo de nota:** Checkpoint post-diagnosis para siguiente ventana de implementacion.

---

## Estado resumido

Diagnostico de tasas completado (solo-lectura). Se identifico la causa raiz de "Pendiente de tasa de pago": desconexion arquitectural entre los resolvers de tasa (completos) y el flujo de creacion de transacciones (usa `USD_REFERENCE_RATE=1`). Schema carece de columnas para congelar tasa. Deliverable: `docs/marketplace/RATES_DIAGNOSIS_2026-05-04.md` (8 gaps, 4 fases).

## Bloqueos activos
- CRITICO: No implementar sin autorizacion explicita para salir de solo-lectura.
- CRITICO: `MpTransaction` sin columnas `frozenRate`, `frozenRateType`, `fechaValor`, `rateSnapshotId`.
- CRITICO: `MpReferenceRateSnapshot` no existe como modelo Prisma.
- ALTO: Migracion `MpBinanceRateSnapshot` pendiente de aplicacion en produccion.
- ALTO: Transacciones existentes con `platformFeeAmount`/`sellerNetAmount` calculados con rate=1 (~40x error en Bs).

## Resuelto (Hitos clave)
- Diagnostico completo de rates: root cause, gaps, plan de correccion.
- Verificacion de no-interferencia con booking y `/reservas`.
- Mapeo completo de archivos y flujos afectados.
- 8 gaps clasificados (A-H) con severidad.

## Siguiente accion exacta (Fase 1 — Schema)

1. Crear modelo `MpReferenceRateSnapshot` en `prisma/schema.prisma` (analogo a `MpBinanceRateSnapshot`).
2. Anadir columnas a `MpTransaction`: `frozenRate Decimal(12,4)`, `frozenRateType String`, `fechaValor DateTime`, `rateSnapshotId String?`.
3. Aplicar migracion `MpBinanceRateSnapshot` si no esta aplicada.
4. Modificar `resolveReferenceRate()` en `lib/marketplace/reference-rate.ts` para persistir en `MpReferenceRateSnapshot`.
5. Generar migracion y validar con `npx tsc --noEmit` + `npm run build`.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/marketplace/RATES_DIAGNOSIS_2026-05-04.md

Confirma autorizacion para salir de solo-lectura.
Ejecuta Fase 1 — Schema:
  1. Crear MpReferenceRateSnapshot en schema.prisma.
  2. Anadir columnas de tasa a MpTransaction.
  3. Verificar/aplicar migracion MpBinanceRateSnapshot.
  4. Modificar resolveReferenceRate() para persistir en DB.
No tocar booking ni /reservas.
No implementar Fase 2 (integracion en initiatePurchase) hasta que Fase 1 este validada.
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
