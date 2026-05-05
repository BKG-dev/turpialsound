---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

Obsidian es la fuente de trazabilidad viva del proyecto. Este archivo refleja el estado operativo real del marketplace al 2026-04-29 y deja el checkpoint para retomar sin rearmar contexto.

## Estado actual real del marketplace (2026-04-29)

El marketplace está funcional y separado del booking. El flujo operativo vigente es manual temporal.

### Hitos completados (Sprint "Admin AI Copilot + BI/Analytics")
- **Admin AI Copilot (Read-only):** Implementado en `/marketplace/admin/copilot`. Acceso restringido a `SUPER`. Herramientas de lectura operativa y BI.
- **Instrumentación Analytics/BI:** Modelos `MpAnalyticsEvent` y `MpBlobObjectMetadata` creados. Endpoints y eventos instrumentados.
- **Seguridad:** Aislamiento total de escritura en Copilot y limpieza de metadata sensible.

### Bloqueos activos
- [ ] Ejecutar QA manual E2E buyer -> admin -> escrow -> payout seller siguiendo runbook.
- [ ] Validar Admin AI Copilot (restricciones de lectura y acceso).
- [ ] Verificar build con `git diff --check`, `tsc` y `npm run build`.

### Pendientes posteriores (Nivel 2)
- [ ] Automatización de acciones de escritura (requiere confirmación UI).
- [ ] Tráfico/bandwidth real (requiere Vercel Observability).
- [ ] Módulo financiero/P&L.
- [ ] Orquestador Oreshnik.

## Reglas de oro
- No tocar `booking` ni `/reservas`.
- No implementar nuevas migraciones sin aprobación explícita.
- No tocar `paymentProofUrl` ni proxy `SUPER`.
- Si un objetivo no está en `docs/07_handoffs/qa-dispatcher.json`, reportar `GAP OPERATIVO` y no improvisar.

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
