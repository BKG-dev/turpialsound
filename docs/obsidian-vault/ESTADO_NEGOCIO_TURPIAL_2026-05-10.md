---
tags: ["#central", "#status/live-source", "#negocio"]
fecha: 2026-05-10
---

# Estado Actual del Negocio - Turpial Sound

## Resumen ejecutivo

Turpial Sound opera dos frentes dentro del mismo repo:

1. **Booking de salas** en `/reservas`
2. **Marketplace** de compra/venta musical en `/marketplace`

Ambos frentes comparten infraestructura, pero no comparten libertad operativa. Booking sigue protegido bajo Jean. Marketplace entra en modo **co-development controlado** entre Jean y Manuel.

## Confirmado

| Area | Estado | Responsable |
|------|--------|-------------|
| Booking (`/reservas`) | Activo en produccion | Jean |
| Marketplace (`/marketplace`) | Preview only, no produccion | Jean + Manuel |
| Rama madre operativa | `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` | Jean gate / Manuel habilitado a push |
| Preview env `Manuel/*` | Resuelto en BKG Vercel | Jean + Manuel |
| Login marketplace | Corregido a nivel runtime | Manuel |
| Payment proof protegido | Implementado a nivel tecnico | Jean + Manuel |
| BCV | Responde tasa fresca | Jean |

## Pendiente

| Area | Estado | Bloqueante |
|------|--------|------------|
| Discovery runtime estable para release | Pendiente | S02 |
| QA formal buyer/seller/admin | Pendiente | S03 |
| Cierre operativo payment proof protegido | Pendiente | S04 |
| Delivery/receipt sin bloqueo operativo | Pendiente | S05 |
| Payout admin auditable | Pendiente | S06 |
| Finanzas y tasas auditables para launch | Pendiente | S07 |
| UX operativa y action center | Pendiente | S08 |
| Discovery publico listo para lanzamiento | Pendiente | S09 |
| Launch readiness y rotacion de secretos | Pendiente | S10 |

## Decision metodologica

- **Antes:** Jean integraba y gateaba; Manuel desarrollaba marketplace y entregaba.
- **Ahora:** Jean y Manuel desarrollan marketplace y cierran sprints de marketplace.
- **Se mantiene:** Jean sigue gateando `main`, produccion, booking, envs criticos y release.
- **No cambia:** cero loops, sprints cerrables, preview antes de produccion, docs versionados, Obsidian como centro.

## Reparto operativo

### Jean

- Co-desarrollador marketplace
- Gatekeeper de `main`/produccion/release
- Owner de booking `/reservas`
- Owner/reviewer fuerte de integracion, Vercel production, envs, DB/schema, rollback, release

### Manuel

- Co-desarrollador marketplace
- Product owner marketplace
- Owner de QA buyer/seller/admin
- Owner de UX operativa, action center, delivery/receipt, admin marketplace y docs

## Riesgos activos

1. Secretos expuestos durante setup previo de preview. Deben rotarse antes de launch.
2. Error Prisma/query en discovery durante intento de deploy productivo. No asumir readiness por HEAD.
3. Colision humana sobre rama madre o zona critica si no se respetan locks y ownership.
4. Booking `/reservas` sigue siendo zona de alto riesgo y no entra en sprints marketplace.

## Reglas de negocio y release

- Marketplace puede avanzar en preview y en rama madre operativa.
- Nadie despliega a produccion sin gate explicito de Jean.
- Nadie toca booking, schema, migrations o env values sin acuerdo y lock.
- Nadie mezcla dos sprints en una sola rama.

## Fuente de plan

- Resumen ejecutivo: [[SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10]]
- Plan operativo segregado: [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]]
