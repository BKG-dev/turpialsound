# Session Summary - Activa

## S00 — Documentacion / Obsidian / Control Bus Sync — 2026-05-10

- **Sprint:** S00 — Documentacion estrategica, Obsidian vault, Control Bus, plan de sprints.
- **Owner:** Manuel.
- **Rama:** `Manuel/docs-strategic-obsidian-sprints-2026-05-10`.
- **Base:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` (HEAD `525602c`).
- **Objetivo:** Dejar el repositorio con documentacion coherente como fuente de verdad estrategica. Cero cambios de codigo producto.

## Estado real integrado — 2026-05-10

- **Rama madre operativa real:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`.
- **HEAD base de referencia:** `525602c`.
- **Rama madre anterior (obsoleta):** `integration/today-reservas-marketplace-stable-2026-05-07` (commit `c01ec60`).
- **`/reservas`:** Congelado como zona sana. Owner: Jean.
- **`/marketplace`:** Activo en preview, no en produccion. Owner: Manuel.
- **BCV:** Corregido y respondiendo con tasa fresca en produccion.
- **Login marketplace:** Reparado (commit `4f15e51`), smoke validado en preview (`buyerIA` OK, `sellerIA` OK).
- **Preview env `Manuel/*`:** Resuelto en BKG Vercel `turpialsound` — DATABASE_URL, DIRECT_URL, MP_JWT_SECRET, Blob/payment proof envs presentes.
- **`main` y produccion:** No tocados. `main` no es la base operativa actual.

## Incidentes aprendidos

### Marketplace vacio en Preview (2026-05-07)
- Sintoma: `/marketplace` vacio en Preview.
- Causa real: Preview apuntando a DB incorrecta sin tablas `mp_*`.
- Evidencia: Prisma `P2021` por ausencia de `public.mp_listings`.
- Solucion: corregir `DATABASE_URL` y `DIRECT_URL` al mismo proyecto/base Neon integrada.

### Intento de deploy productivo con error Prisma query (2026-05-09)
- Sintoma: Error de Prisma query en marketplace discovery durante intento de deploy productivo.
- Produccion fue rollbackeada/recuperada.
- **Regla:** No asumir produccion-ready desde branch head. Preview smoke + runtime logs obligatorios antes de cualquier deploy productivo.

## Regla obligatoria de conexiones DB

- `DATABASE_URL` debe ser pooled/pooler.
- `DIRECT_URL` debe ser direct/no-pooler.
- Ambas deben apuntar al mismo proyecto/base Neon integrada.
- Nunca imprimir secretos.

## Metodologia Oreshnik-Codex 2.0

- 1 rama madre estable.
- N worktrees separados.
- N agentes Codex.
- 1 owner por lock.
- 1 commit/push por sprint cerrado.
- 0 trabajo directo sobre madre.
- 0 `main`.
- 0 produccion sin release gate.
- 0 cambios en zonas sanas fuera de scope.

## Roles operativos

- **Jean:** Integracion, merges, Vercel/envs, DB/Prisma/schema/migrations, rama madre, preview integrado, produccion, booking/reservas.
- **Manuel:** Marketplace producto, buyer/seller/admin flow, QA operacional, rates, payout, estados, copy/UX operativo, docs de negocio.

## Control Bus — Nivel 2

Dos carriles con ownership claro. Ver `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md`.

## Sprints generados (S00-S10)

Ver `docs/obsidian-vault/SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md`.

Secuencia priorizada:
1. **S00** — Documentacion / Obsidian / Control Bus Sync ← ESTE SPRINT
2. **S01** — BKG Preview Smoke Autonomia ← PROXIMO
3. **S02** — Marketplace Runtime Discovery Stabilization
4. **S03** — Marketplace Auth/Login QA Closure
5. **S04** — Protected Payment Proof Flow E2E
6. **S05** — Buyer/Seller Delivery & Receipt Flow
7. **S06** — Admin Seller Payout Registration & Closure
8. **S07** — Rates / Finance / Accounting Hardening
9. **S08** — Marketplace UX / Action Center / Notifications
10. **S09** — Public Marketplace SEO/AEO / Discovery Polish
11. **S10** — Launch Readiness / Security Rotation / Release Gate

## Lo que Manuel puede hacer solo

- Crear ramas `Manuel/*` desde madre operativa.
- Crear previews en BKG Vercel `turpialsound`.
- Ejecutar QA scripts canonicos desde `docs/07_handoffs/qa-dispatcher.json`.
- Desarrollar y probar marketplace runtime en preview.
- Actualizar docs en `docs/obsidian-vault/`, `docs/07_handoffs/`, `docs/marketplace/`.

## Lo que requiere Jean

- Merge a rama madre/integracion.
- Deploy a produccion.
- Modificar Vercel envs.
- Ejecutar migraciones Prisma.
- Modificar schema DB.
- Rotar credenciales/secrets en produccion.
- Tocar booking/reservas.

## Documentos actualizados/creados en S00

- `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` — actualizado
- `docs/obsidian-vault/ESTADO_NEGOCIO_TURPIAL_2026-05-10.md` — nuevo
- `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` — nuevo
- `docs/obsidian-vault/ROADMAP_RESCATE.md` — actualizado
- `docs/obsidian-vault/BUGS_CRITICOS.md` — actualizado
- `docs/obsidian-vault/SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md` — nuevo
- `docs/07_handoffs/session-summary-active.md` — actualizado
- `docs/07_handoffs/next-window-brief.md` — actualizado
- `docs/07_handoffs/jean-obsidian-control-bus-brief-2026-05-10.md` — nuevo
