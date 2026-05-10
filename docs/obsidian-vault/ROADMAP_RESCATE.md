---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
fecha: 2026-05-10
---

# Roadmap de Rescate - Marketplace Turpial Sound

## Estado real activo (2026-05-10)

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD base de referencia:** `525602c`
- **`/reservas`:** congelado como zona sana
- **`/marketplace`:** activo en preview, no en produccion
- **Bus de Control:** Nivel 2.5 co-development marketplace
- **Jean y Manuel:** habilitados para desarrollo y cierre de sprints marketplace
- **Gate de `main`/produccion:** Jean

## Cerrado

- [x] Marketplace vacio por DB target incorrecta - causa raiz identificada
- [x] BCV corregido con tasa fresca
- [x] Login marketplace reparado a nivel runtime
- [x] Preview env `Manuel/*` funcional en BKG Vercel
- [x] Payment proof protegido implementado a nivel tecnico
- [x] Replanteo documental inicial de Obsidian/control bus

## En progreso

- [ ] **S00B - Replanteo Bus de Control / Marketplace Co-development**
  - owner: Manuel
  - rama: `Manuel/docs-replan-marketplace-codev-bus-2026-05-10`
  - salida esperada: bus 2.5, sprints segregados, prompts S01/S02, handoffs alineados

## Habilitado para ejecucion inmediata

- [ ] **S01 - BKG Preview Smoke Autonomy**
  - owner: Manuel
  - reviewer: Jean
  - cierre: preview BKG autonomo

- [ ] **S02 - Marketplace Discovery Runtime Stabilization**
  - owner: Jean
  - reviewer: Manuel
  - cierre: discovery estable o error Prisma/query clasificado

## Bloqueado

- [ ] **Produccion marketplace**
  - bloqueado por: S01-S09 incompletos, secretos sin rotar, gate de Jean requerido

- [ ] **Cambios de schema/migrations**
  - bloqueado por: lock Jean + Manuel y sprint de arquitectura

## Decision

El plan ya no corre por un solo carril marketplace. Ahora se reparte por ownership:

- Jean toma runtime critico, proofs, payouts, finanzas y release.
- Manuel toma preview autonomy, login QA, delivery/receipt, UX/action center y discovery publico.

## Riesgos activos

1. **CRIT-001:** secretos expuestos en setup previo. Rotacion obligatoria antes de launch.
2. **CRIT-002:** error Prisma/query de discovery en intento de produccion. S02 lo resuelve o lo clasifica.
3. **HIGH-001:** colision humana en madre o zona critica sin lock.
4. **HIGH-002:** booking `/reservas` tocado por error.

## Hilo conductor

- Mapa central: [[00_CENTRAL_TURPIAL]]
- Estado del negocio: [[ESTADO_NEGOCIO_TURPIAL_2026-05-10]]
- Bus de control: [[BUS_CONTROL_TURPIAL]]
- Plan operativo: [[SPRINTS_CODEV_MARKETPLACE_2026-05-10]]
- Bugs criticos: [[BUGS_CRITICOS]]
