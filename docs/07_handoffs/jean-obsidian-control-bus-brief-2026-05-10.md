# Jean - Brief de Control Bus y Co-development Marketplace

**Fecha:** 2026-05-10
**De:** Manuel
**Para:** Jean

## Que cambia

- Marketplace deja de operar con carril unico de desarrollo.
- Jean y Manuel pasan a ser co-desarrolladores marketplace.
- Ambos pueden pushear a la rama madre operativa:
  - `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`

## Que no cambia

- Jean sigue gateando `main`, produccion y release.
- Jean sigue siendo owner de booking `/reservas`.
- Env values, dominios, billing, DB/schema/migrations siguen bajo gate de Jean.
- No hay deploy productivo sin preview y gate explicito.

## Reglas nuevas de madre operativa

- Preferido: rama propia por sprint y luego integrar a madre.
- Push directo a madre: solo docs o hotfix minimo ya validado.
- Prohibido trabajo exploratorio directo sobre madre.
- Si el sprint toca zona critica, debe existir lock y aviso previo.

## Locks criticos

- DB/schema/Prisma/migrations -> lock Jean + Manuel
- Payment proof protegido -> lock Jean + Manuel
- Rates/finance/payouts -> lock Jean + Manuel
- Auth/session/admin/SUPER -> lock Jean + Manuel
- Booking `/reservas` -> owner Jean

## Que te queda gateado a ti

- push a `main`
- produccion
- release final
- rollback
- Vercel production
- envs criticos
- schema/migrations
- booking

## Secuencia ejecutable inmediata

1. **S01 - Manuel**
   - preview autonomy
   - prompt: `docs/07_handoffs/prompt-s01-manuel-preview-smoke-autonomy-2026-05-10.md`

2. **S02 - Jean**
   - discovery runtime stabilization
   - rama sugerida: `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`
   - prompt: `docs/07_handoffs/prompt-s02-jean-discovery-runtime-stabilization-2026-05-10.md`

## Documento central

- Bus: `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md`
- Plan segregado: `docs/obsidian-vault/SPRINTS_CODEV_MARKETPLACE_2026-05-10.md`
- Resumen ejecutivo: `docs/obsidian-vault/SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md`
