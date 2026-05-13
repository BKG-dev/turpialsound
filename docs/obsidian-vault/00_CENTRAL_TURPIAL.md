We need to apply the suggested edit to the original code. The original code is a markdown file with YAML front matter and content. The suggested edit shows changes: update date, add production branch info, sitemap hotfix section, etc. We need to output the complete modified file, preserving all unchanged parts, and only output code.

We'll compare original and suggested edit. The suggested edit replaces the entire content after the YAML front matter? Actually, the original starts with "---\ntags: ..." then etc. The suggested edit shows a full new version with changes. We need to output that new version as the result.

Thus, output the suggested edit exactly as given.```
---
tags: ["#central", "#map", "#status/live-source"]
---

# Mapa de Contenido Principal

## Estado canonico activo (2026-05-11)

- Rama de produccion real: `prod/current-www-turpialsound-2026-05-08`.
- HEAD produccion actual: `92fd6a3` (`fix(seo): restrict sitemap to approved public urls`).
- Rama madre estable integracion: `integration/today-reservas-marketplace-stable-2026-05-07`.
- Commit estable integracion: `c01ec60`.
- `/reservas` congelado como zona sana.
- `/marketplace` activo.
- BCV corregido con tasa fresca.
- Sitemap produccion: restringido a 9 URLs publicas aprobadas (ver [[#Sitemap Hotfix Produccion]]).

## Principio central

Codigo correcto + DB incorrecta = UI vacia.

## Reglas de conexion DB

- `DATABASE_URL` pooled/pooler.
- `DIRECT_URL` direct/no-pooler.
- Mismo proyecto/base Neon integrada para ambas.
- Nunca imprimir secretos.

## Metodologia Oreshnik-Codex 2.0

- 1 rama madre estable.
- N worktrees separados.
- N agentes Codex.
- 1 owner por lock.
- 1 commit/push por sprint cerrado.
- 0 trabajo directo sobre madre.
- 0 main.
- 0 produccion.
- 0 zonas sanas tocadas.

## Roles

- Jean: integracion, Vercel/envs, DB/Prisma/schema/migrations, booking/reservas, rama madre, merges, preview integrado.
- Manuel: marketplace producto, buyer/seller/admin flow, QA operacional, rates, payout, estados, copy/UX operativo.

## Ola 1

- J1 Docs Control Tower.
- J2 Preview Runtime Guard.
- M1 Marketplace Protected Flow E2E.
- M2 Marketplace QA Harness.

## Sitemap Hotfix Produccion

- Hotfix aplicado: `92fd6a3 fix(seo): restrict sitemap to approved public urls`.
- Rama hotfix: `hotfix/prod-sitemap-public-only-2026-05-11`.
- Rama hotfix origen (desde preview): `hotfix/sitemap-public-only-from-20be7a2-2026-05-11`.
- Commit origen: `11eb23e` (cherry-picked a produccion).
- Fecha: 2026-05-11.
- Objetivo: sitemap limpio para Google Search Console sin DB, slugs dinamicos ni rutas privadas.
- Base: `https://www.turpialsound.com`.

### URLs aprobadas en sitemap

1. `https://www.turpialsound.com/`
2. `https://www.turpialsound.com/reservas`
3. `https://www.turpialsound.com/salas-de-ensayo`
4. `https://www.turpialsound.com/estudio-de-grabacion`
5. `https://www.turpialsound.com/servicios`
6. `https://www.turpialsound.com/contacto`
7. `https://www.turpialsound.com/recursos`
8. `https://www.turpialsound.com/recursos/preguntas-frecuentes`
9. `https://www.turpialsound.com/marketplace`

### Exclusiones explícitas

- `/admin`, `/ops`, `/api`, `/payment-proofs`, `/marketplace/admin`, `/marketplace/dashboard`, `/lab`.
- Listings individuales del marketplace (`/marketplace/{slug}`).
- Slugs dinamicos, query params, usuarios, perfiles, vendedores, filtros.
- URLs preview Vercel, localhost.

### Archivo modificado

- Unico archivo: `app/sitemap.ts`.
- Sin consulta DB, sin `getDb()`, sin Prisma, sin `siteConfig`.
- Sin tocar `lib/bookings/google-calendar.ts`, `content/site.ts`, `reservas`, `marketplace` funcional, pagos, DB, schema, migrations, `package.json`, `pnpm-lock.yaml`, `.env` ni secretos.

## Enlaces relacionados

- [[ROADMAP_RESCATE]]
- [[BUGS_CRITICOS]]
- [[SPRINTS_MARKETPLACE_PARALELO]]
- [[QA_MARKETPLACE_INTEGRADO]]
- [[ARQUITECTURA_TASAS]]