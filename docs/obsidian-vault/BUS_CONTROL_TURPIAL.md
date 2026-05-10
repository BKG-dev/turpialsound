---
tags: ["#central", "#control-bus", "#governance", "#status/live-source"]
fecha: 2026-05-10
---

# Bus de Control — Turpial Sound

Modelo de coordinacion operativa para desarrollo, integracion y release del proyecto.

---

## Nivel 2 — Bus operativo actual

Dos carriles primarios con ownership claro.

### Carril 1: Jean — Integracion / Release / Booking

| Atributo | Valor |
|----------|-------|
| **Owner** | Jean |
| **Proposito** | Gatekeeper de integracion, release a produccion, control de infraestructura, booking |
| **Cambios permitidos** | Merges a rama madre, deploys a produccion, Vercel envs, Prisma schema/migraciones, booking runtime, rotacion de secretos, rollback |
| **Cambios prohibidos** | Marketplace runtime sin revision de Manuel, booking desde ramas de Manuel |
| **Patron de rama** | `Jean/*`, `integration/*`, `integration-prep/*`, `deploy/*` |
| **Docs que actualiza** | `docs/07_handoffs/`, `docs/obsidian-vault/` (cambios de infra) |
| **Criterio de aceptacion** | Preview smoke + runtime logs limpios + approval de Manuel para marketplace |
| **Escalacion** | Si marketplace falla en preview, Manuel diagnóstica. Si infra falla, Jean corrige. |
| **Release gate** | Solo Jean aprueba deploy a produccion |

### Carril 2: Manuel — Marketplace Producto / Operaciones

| Atributo | Valor |
|----------|-------|
| **Owner** | Manuel |
| **Proposito** | Producto marketplace, QA operacional, flujos buyer/seller/admin, tasas, payout, UX, docs de negocio |
| **Cambios permitidos** | Marketplace runtime (`actions/marketplace/*`, `components/marketplace/*`, `app/marketplace/*`), docs (`docs/obsidian-vault/`, `docs/07_handoffs/`, `docs/marketplace/`), QA scripts |
| **Cambios prohibidos** | Booking runtime, Prisma schema/migraciones, Vercel envs, produccion, `main`, secretos en docs |
| **Patron de rama** | `Manuel/*` |
| **Docs que actualiza** | `docs/obsidian-vault/`, `docs/07_handoffs/`, `docs/marketplace/` |
| **Criterio de aceptacion** | Preview smoke pasa + QA dispatcher scripts canonicos pasan |
| **Escalacion** | Si requiere cambio de schema/env/infra, escala a Jean |
| **Release gate** | No hace deploy a produccion. Entrega rama lista para revision de Jean. |

### Reglas compartidas

- **Cero commits directos sobre rama madre** sin aprobacion explicita.
- **Un owner por carril critico.** Si dos personas necesitan tocar lo mismo, coordinar antes.
- **Ramas de marketplace parten de la madre operativa.**
- **Jean revisa/mergea a integracion/mother.**
- **Manuel puede crear previews BKG desde `Manuel/*`.**
- **Deploy a produccion requiere release gate explicito de Jean.**
- **Cambios de DB/schema requieren sprint de arquitectura y lock de owner.**
- **Cambios de envs/secrets deben documentarse sin imprimir valores.**

---

## Nivel 4 — Bus escalable (futuro)

Expansion a cuatro carriles cuando el volumen o la complejidad lo requieran.

### Carril 1: Integracion / Release / Repo Bus

| Atributo | Valor |
|----------|-------|
| **Owner** | Jean o release manager asignado |
| **Proposito** | Ramas, merges, CI, Vercel, produccion, rollback, control de calidad transversal |
| **Patron de rama** | `integration/*`, `release/*`, `hotfix/*` |
| **Release gate** | CI verde + smoke preview + approval de product owners |

### Carril 2: Marketplace Producto / Operaciones Bus

| Atributo | Valor |
|----------|-------|
| **Owner** | Manuel |
| **Proposito** | UX de marketplace, flujos buyer/seller/admin, QA operacional, admin ops |
| **Patron de rama** | `Manuel/marketplace/*`, `feature/marketplace/*` |
| **Release gate** | Preview smoke + QA matriz + approval de Manuel |

### Carril 3: Booking / Core Business Bus

| Atributo | Valor |
|----------|-------|
| **Owner** | Jean |
| **Proposito** | `/reservas`, pagos de booking, admin de booking, QA de booking |
| **Patron de rama** | `Jean/booking/*`, `feature/booking/*` |
| **Release gate** | Preview smoke + QA de booking + approval de Jean |

### Carril 4: Plataforma / Finanzas / Compliance / Data Bus

| Atributo | Valor |
|----------|-------|
| **Owner** | Asignar posteriormente |
| **Proposito** | Tasas, payouts, contabilidad, media protegido, logs, observabilidad, seguridad, compliance legal/contable |
| **Patron de rama** | `platform/*`, `finance/*`, `compliance/*` |
| **Release gate** | Auditoria de tasas + verificacion contable + security review |

---

## Reglas de escalacion entre carriles

| Situacion | Escala a | Accion |
|-----------|----------|--------|
| Marketplace necesita cambio de schema | Jean (Carril 1) | Sprint de arquitectura con lock |
| Marketplace necesita nuevo env en Vercel | Jean (Carril 1) | Jean agrega env, Manuel documenta sin valor |
| Booking necesita cambio que afecta DB compartida | Jean + Manuel | Coordinacion previa, no mezclar migraciones |
| Se detecta regresion en preview | Owner del carril afectado | Diagnostico antes de culpar otro carril |
| Conflicto de merge | Jean (Carril 1) | Jean resuelve, owner del carril valida |
| Incidente de seguridad | Jean (Carril 1) + futuro Carril 4 | Rotacion inmediata, postmortem |
