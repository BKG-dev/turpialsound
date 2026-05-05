---
tags: ["#central", "#map"]
---

# Mapa de Contenido Principal

## Áreas del Proyecto
- [[ARQUITECTURA_TASAS]]
- [[BUGS_CRITICOS]]
- [[ROADMAP_RESCATE]]

## Enlaces Relacionados
- [[MEMORY]]
- [[docs/marketplace/00_IMPLEMENTATION_SUMMARY]]
- [[docs/marketplace/01_ROADMAP_AND_STATUS]]
- [[docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX]]

## Checkpoint Activo - 2026-04-24

- Seller Cobros quedo refactorizado a nivel UI/UX y validado tecnicamente.
- El cambio mejora ancho util, tabs, jerarquia financiera, resumen de estado y datos de cobro.
- Validacion cerrada: `npx tsc --noEmit` limpio y `npm run build` limpio.
- No se tocaron booking, `/reservas`, Admin Pagos, enums ni logica de negocio.
- Detalle completo en [[ROADMAP_RESCATE]] y [[BUGS_CRITICOS]].

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
