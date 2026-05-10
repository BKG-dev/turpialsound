---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
fecha: 2026-05-10
---

# Roadmap de Rescate — Marketplace Turpial Sound

## Estado real activo (2026-05-10)

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD:** `525602c`
- **`/reservas`:** Congelado como zona sana.
- **`/marketplace`:** Activo en preview, no en produccion.
- **BCV:** Corregido con tasa fresca.
- **Login marketplace:** Reparado (`4f15e51`), smoke validado en preview.
- **Preview `Manuel/*`:** Resuelto con DB/JWT/Blob en BKG Vercel.

## Cerrado

- [x] Marketplace vacio por DB target incorrecta — causa raiz `P2021`, solucion: alinear DB URLs.
- [x] BCV corregido con tasa fresca.
- [x] Login marketplace reparado — busqueda deterministica, roles correctos en sesion.
- [x] Preview env `Manuel/*` funcional en BKG Vercel — DB, JWT, Blob configurados.
- [x] Credenciales QA migradas a env (`QA_*`), sin hardcodear passwords.
- [x] Blob/media public verification — listing images nuevas enrutan a Vercel Blob.
- [x] Payment proof storage sensible — comprobantes bajo proxy autenticado, no en Blob publico.
- [x] J1 Docs Control Tower.
- [x] J2 Preview Runtime Guard.
- [x] J3 Integration Gatekeeper.

## En progreso

- [ ] **S00 — Documentacion / Obsidian / Control Bus Sync** (este sprint). Owner: Manuel. Rama: `Manuel/docs-strategic-obsidian-sprints-2026-05-10`.

## Bloqueado

- [ ] **Deploy de marketplace a produccion** — Bloqueado por: falta QA matrix completa (S01-S10), secretos sin rotar, release gate de Jean requerido.
- [ ] **Migraciones Prisma nuevas** — Bloqueado hasta sprint de arquitectura con lock de Jean.

## Proximo sprint ejecutable

- [ ] **S01 — BKG Preview Smoke Autonomia.** Owner: Manuel. Confirmar preview autonomo desde `Manuel/*` con DB/JWT/Blob.

## Secuencia de sprints (S00-S10)

Ver documento completo: [[SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10]]

1. **S00** — Documentacion / Obsidian / Control Bus Sync ← EN PROGRESO
2. **S01** — BKG Preview Smoke Autonomia
3. **S02** — Marketplace Runtime Discovery Stabilization
4. **S03** — Marketplace Auth/Login QA Closure
5. **S04** — Protected Payment Proof Flow E2E
6. **S05** — Buyer/Seller Delivery & Receipt Flow
7. **S06** — Admin Seller Payout Registration & Closure
8. **S07** — Rates / Finance / Accounting Hardening
9. **S08** — Marketplace UX / Action Center / Notifications
10. **S09** — Public Marketplace SEO/AEO / Discovery Polish
11. **S10** — Launch Readiness / Security Rotation / Release Gate

## Estrategico posterior (NO ahora)

- Pasarelas automaticas Mercantil / Binance Pay
- Cron T+7 auto-release
- Webhooks de pago
- Migracion de imagenes legacy/base64

## Explicitamente "no ahora"

- Refactor mayor de arquitectura
- Reescribir booking
- Unificar DB de booking y marketplace
- Automatizar CI/CD mas alla de Vercel previews
- Dashboard analytics / BI

## Incidente clave aprendido

- Marketplace vacio en Preview no fue problema de UI/filtros.
- Causa raiz: DB target incorrecta sin tablas `mp_*`.
- Error tecnico: Prisma `P2021` (`public.mp_listings` inexistente).
- Solucion real: alinear `DATABASE_URL` (pooled) y `DIRECT_URL` (direct) al mismo proyecto Neon integrado.
- **Corolario 2026-05-09:** Intento de deploy productivo tuvo error Prisma query en discovery. Produccion fue rollbackeada. No asumir readiness desde branch head.

## Protocolo obligatorio: marketplace vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar Vercel runtime logs.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Ante Prisma `P2021`, revisar DB target y tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` vs `DIRECT_URL` con fingerprint seguro.
7. Nunca imprimir secretos.
8. Corregir env/DB en Preview solo por Jean.
9. Redeployar mismo commit.
10. Solo tocar UI si DB y query estan correctas.

## Control Bus

Ver: [[BUS_CONTROL_TURPIAL]]

## Riesgos activos

Ver: [[BUGS_CRITICOS]]
