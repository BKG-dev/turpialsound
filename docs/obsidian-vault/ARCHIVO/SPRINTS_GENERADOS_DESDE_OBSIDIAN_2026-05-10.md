---
tags: ["#sprints", "#marketplace", "#plan", "#status/live-source"]
fecha: 2026-05-10
base: integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07
---

# Sprints Generados desde Obsidian - 2026-05-10

## Decision

Este archivo pasa a ser el **indice ejecutivo** del cierre marketplace. El detalle operativo por owner, locks, ramas y stop conditions vive en [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]].

## Estado actual

- **Sprint documental activo:** S00B - Replanteo Bus de Control / Marketplace Co-development
- **Rama documental:** `Manuel/docs-replan-marketplace-codev-bus-2026-05-10`
- **Base:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Scope:** docs, Obsidian, handoffs, prompts operativos. Cero codigo producto.

## Resumen ejecutivo de sprints

| Sprint | Owner | Reviewer | Que cierra |
|--------|-------|----------|------------|
| S01 | Manuel | Jean | Autonomia real de preview BKG desde `Manuel/*` |
| S02 | Jean | Manuel | Discovery runtime estable y clasificado para release |
| S03 | Manuel | Jean | Login buyer/seller/admin cerrado a nivel QA |
| S04 | Jean | Manuel | Payment proof protegido validado de punta a punta |
| S05 | Manuel | Jean | Delivery/receipt sin bloqueo operativo |
| S06 | Jean | Manuel | Registro admin de payout con cierre auditable |
| S07 | Jean | Manuel | Finanzas, tasas y accounting endurecidos |
| S08 | Manuel | Jean | UX operativa y action center claros |
| S09 | Manuel | Jean | Discovery publico listo para mostrar/lanzar |
| S10 | Jean | Manuel | Launch readiness, rotacion y gate final |

## Secuencia por fase

### Fase A - Autonomia y runtime seguro

1. **S01** - Manuel confirma preview autonomo.
2. **S02** - Jean estabiliza o descarta el error Prisma/query en discovery.
3. **S03** - Manuel cierra QA de auth/login.

### Fase B - Flujo transaccional critico

4. **S04** - Jean valida payment proof protegido.
5. **S05** - Manuel cierra delivery/receipt.
6. **S06** - Jean formaliza payout admin.

### Fase C - Finanzas, UX y lanzamiento

7. **S07** - Jean endurece tasas/finanzas/accounting.
8. **S08** - Manuel cierra UX/action center/notificaciones.
9. **S09** - Manuel pule discovery publico y SEO/AEO.
10. **S10** - Jean ejecuta launch readiness y gate final.

## Confirmado

- El plan ahora esta segregado por owner principal y reviewer.
- Jean y Manuel pueden trabajar marketplace en paralelo.
- La rama madre operativa admite push de ambos solo con checklist y locks.
- `main` y produccion siguen gateados por Jean.

## Riesgo

La velocidad sube solo si cada sprint respeta:

- una sola zona activa,
- un owner claro,
- un reviewer claro,
- y cero mezcla con booking, schema o envs sin lock.

## Documento operativo

- Ver detalle completo: [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]]
