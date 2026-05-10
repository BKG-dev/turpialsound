# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S00B - Replanteo Bus de Control / Marketplace Co-development
**Tipo de nota:** control tower / siguiente ventana

## Estado actual

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD base de referencia:** `525602c`
- **Rama documental activa:** `Manuel/docs-replan-marketplace-codev-bus-2026-05-10`
- **Bus de Control:** Nivel 2.5 co-development marketplace
- **`/reservas`:** congelado como zona sana
- **`/marketplace`:** preview only

## Proximas ventanas recomendadas

### Ventana 1 - S01 Manuel

- **Sprint:** S01 - BKG Preview Smoke Autonomy
- **Owner:** Manuel
- **Reviewer:** Jean
- **Rama sugerida:** `Manuel/s01-preview-smoke-autonomy-2026-05-10`
- **Objetivo:** confirmar preview BKG funcional desde `Manuel/*`
- **Cierre esperado:** Manuel puede validar preview real sin depender de produccion
- **Prompt base:** `docs/07_handoffs/prompt-s01-manuel-preview-smoke-autonomy-2026-05-10.md`

### Ventana 2 - S02 Jean

- **Sprint:** S02 - Marketplace Discovery Runtime Stabilization
- **Owner:** Jean
- **Reviewer:** Manuel
- **Rama sugerida:** `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`
- **Objetivo:** resolver o clasificar el error Prisma/query de discovery
- **Cierre esperado:** `/marketplace` estable en Preview o error clasificado con stop real
- **Prompt base:** `docs/07_handoffs/prompt-s02-jean-discovery-runtime-stabilization-2026-05-10.md`

## Guardrails para la siguiente ventana

- Resolver `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json` antes de cualquier QA.
- No tocar booking, schema, env values ni produccion.
- No mezclar S01 y S02 en la misma rama.
- Si una validacion no tiene ruta canonica exacta, detener y reportar `GAP OPERATIVO`.

## Riesgos a monitorear

1. Secretos expuestos aun sin rotar.
2. Discovery runtime todavia no clasificado para release.
3. Colision en madre si no se respetan locks.

## Documentos clave

- `docs/obsidian-vault/00_CENTRAL_TURPIAL.md`
- `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md`
- `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`
- `docs/07_handoffs/session-summary-active.md`
