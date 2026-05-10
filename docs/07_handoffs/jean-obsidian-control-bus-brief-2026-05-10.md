# Jean — Brief: Obsidian, Control Bus y Sprints

**Fecha:** 2026-05-10
**De:** Manuel
**Para:** Jean

---

## Por que Obsidian

Obsidian es el vault de documentacion estrategica del proyecto. No reemplaza los docs tecnicos del repo — los complementa como capa de coordinacion y estado vivo del negocio.

- **Docs del repo** (`docs/marketplace/`, `docs/07_handoffs/`): referencia tecnica, QA runbooks, arquitectura.
- **Obsidian** (`docs/obsidian-vault/`): mapa central, estado del negocio, roadmap, bugs criticos, sprints, control bus.

Ambos viven en el repo y son visibles en GitHub. Los links `[[wiki-style]]` de Obsidian son compatibles con Markdown.

---

## Control Bus — Nivel 2 (ahora)

Dos carriles con ownership claro:

| Carril | Owner | Que controla |
|--------|-------|-------------|
| Integracion / Release / Booking | **Jean** | Merges, produccion, Vercel/envs, DB/schema/migraciones, booking |
| Marketplace Producto / Operaciones | **Manuel** | Marketplace runtime, QA, flujos buyer/seller/admin, tasas, payout, docs |

**Reglas compartidas:**
- Cero commits directos sobre rama madre.
- Marketplace branches parten de madre operativa.
- Jean revisa/mergea. Manuel no mergea a madre.
- Manuel puede crear previews BKG desde `Manuel/*`.
- Produccion solo con release gate de Jean.

---

## Control Bus — Nivel 4 (futuro)

Cuando el proyecto escale, cuatro carriles:

1. **Integracion / Release / Repo** — Jean (o release manager)
2. **Marketplace Producto / Operaciones** — Manuel
3. **Booking / Core Business** — Jean
4. **Plataforma / Finanzas / Compliance / Data** — a designar

---

## Que necesita tu revision

1. **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` — confirmar si esta es la madre correcta o si prefieres otra base.
2. **Control Bus:** Revisar que los carriles y reglas reflejen como quieres operar.
3. **Sprints S01-S10:** Secuencia propuesta para cerrar marketplace hasta launch. Ver `docs/obsidian-vault/SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md`.
4. **Secretos expuestos:** CRIT-001 — rotar credenciales Neon y QA/admin antes de inauguracion.
5. **`main`:** Confirmar si planeas realinear `main` con la madre operativa o si mantenemos `integration-prep/*` como base.

---

## Que Manuel puede hacer solo (ya confirmado)

- Crear ramas `Manuel/*` desde madre operativa
- Crear previews en BKG Vercel `turpialsound`
- Ejecutar QA scripts canonicos
- Desarrollar y probar marketplace en preview
- Actualizar docs

## Que sigue requiriendote a ti

- Merges a integracion/madre
- Deploy a produccion
- Vercel envs
- Migraciones Prisma
- Rotacion de secretos
- Booking/reservas

---

## Proximo paso recomendado

S01 — BKG Preview Smoke Autonomia: Manuel despliega preview limpio desde `Manuel/*`, valida que todo funcione (DB, JWT, Blob, `/marketplace`, `/reservas` intacto). Sin cambios de codigo. Solo smoke.

Esto confirmaria que el pipeline de preview de Manuel es completamente autonomo y desbloquea todos los sprints siguientes.

---

## Donde esta todo

- **Mapa central:** `docs/obsidian-vault/00_CENTRAL_TURPIAL.md`
- **Estado del negocio:** `docs/obsidian-vault/ESTADO_NEGOCIO_TURPIAL_2026-05-10.md`
- **Control Bus:** `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md`
- **Sprints:** `docs/obsidian-vault/SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md`
- **Roadmap:** `docs/obsidian-vault/ROADMAP_RESCATE.md`
- **Bugs:** `docs/obsidian-vault/BUGS_CRITICOS.md`
- **Handoff activo:** `docs/07_handoffs/session-summary-active.md`
