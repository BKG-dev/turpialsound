# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S00D - Fix Control Bus S02 Unblock
**Tipo de nota:** control tower / siguiente ventana

## Estado actual

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD documental de referencia:** `7e8c40a`
- **Rama documental activa:** `Manuel/docs-control-bus-s02-unblock-2026-05-10`
- **Bus de Control:** hotfix en curso para desbloquear S02 sin prompts manuales ni cierres falsos
- **`/reservas`:** congelado como zona sana
- **`/marketplace`:** preview only

## Proximas ventanas recomendadas

### Ventana 1 - Push del hotfix documental S00D

- **Objetivo:** dejar runner, dispatcher y runbook sincronizados para S02
- **Cierre esperado:** el Bus ya reconoce `S02_MARKETPLACE_DISCOVERY_RUNTIME_STABILIZATION`, exige worktree limpio y Preview BKG valido
- **Resultado requerido:** S02 queda formalmente desbloqueado para reintento

### Ventana 2 - Reintento S02 Jean

- **Sprint:** S02 - Marketplace Discovery Runtime Stabilization
- **Owner:** Jean
- **Reviewer:** Manuel
- **Rama sugerida:** `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`
- **Objetivo:** resolver o clasificar el error Prisma/query de discovery
- **Cierre esperado:** `/marketplace` estable en Preview BKG o error clasificado en `OK | DB_MISSING | QUERY_ERROR | ZERO_ACTIVE | FILTERED_EMPTY | UNKNOWN`
- **Prompt base:** `docs/07_handoffs/prompt-s02-jean-discovery-runtime-stabilization-2026-05-10.md`

## Guardrails para la siguiente ventana

- Resolver `task_id=S02_MARKETPLACE_DISCOVERY_RUNTIME_STABILIZATION` en `docs/07_handoffs/qa-dispatcher.json` antes de cualquier QA de S02.
- Si el workspace original esta sucio, ejecutar S02 en worktree limpio. Un `?? var/` aislado no bloquea por si solo.
- Ejecutar `vercel whoami` y verificar `.vercel/project.json` antes de cualquier Preview.
- Aceptar solo Preview bajo `bkgs-projects-829c67c1`.
- Rechazar cualquier URL con `cerberus77s-projects`.
- No tocar booking, schema, env values ni produccion.

## Riesgos a monitorear

1. Secretos expuestos aun sin rotar.
2. Discovery runtime todavia no clasificado para release.
3. Cierre falso si alguien intenta usar un Preview historico fuera de BKG.

## Documentos clave

- `docs/07_handoffs/AGENT_CONTROL_BUS_RUNNER.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/session-summary-active.md`
- `docs/obsidian-vault/BUGS_CRITICOS.md`
- `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`
