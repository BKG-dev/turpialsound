---
type: sprint-index
project: "Turpial Sound Marketplace"
area: "Discovery Runtime"
sprint: S02
status: closed
result: "Error clasificado — QUERY_ERROR — runtime estable"
owner: Jean
mother_branch: "integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07"
final_branch: "jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10"
final_commit: "4c3908e"
closed_at: "2026-05-11"
tags:
  - turpial
  - marketplace
  - discovery
  - sprint/s02
  - status/closed
  - result/classified
  - layer/diagnostics
  - no-cdp
  - docs/source-of-truth
  - mother-sync
  - handoff
---

# Sprint 2 — Marketplace Discovery Runtime Stabilization

## A. Estado ejecutivo

Sprint 2 del Marketplace Discovery Runtime esta **CERRADO**.

- **Error Prisma/query clasificado como `QUERY_ERROR`.**
- Runtime estable en Preview BKG: 6/6 rutas core smoke HTTP en `200`.
- **Estrategia:** Diagnostico runtime con `preview-runtime-guard.ts` + smoke HTTP sobre Preview BKG, sin tocar codigo producto.
- **Sin CDP.** Sin browser. Sin cambios en booking, schema, envs ni produccion.
- **Preview usado:** `https://turpialsound-nukiu73zg-bkgs-projects-829c67c1.vercel.app` (BKG Vercel).
- **Credenciales QA:** `buyerIA`, `sellerIA` validadas via smoke login.
- **Login marketplace reparado:** commit `4f15e51` (`fix(marketplace): repair marketplace user login`).

## B. Tabla de modulos

| Modulo | Nombre | Estado | Metodo | Commit |
|--------|--------|--------|--------|--------|
| S02-DIAG | Preview Runtime Guard | PASS | `npx tsx scripts/diagnostics/preview-runtime-guard.ts` | `4c3908e` |
| S02-SMOKE | Smoke HTTP rutas core | PASS (6/6) | HTTP smoke 200 en `/`, `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login`, `/ops/payment-review` | `4c3908e` |
| S02-CLASS | Clasificacion discovery | QUERY_ERROR | Guard reporta `DATABASE_URL missing` local | `4c3908e` |
| S02-LOGIN | Login marketplace QA | PASS | `buyerIA` + `sellerIA` smoke OK | `4f15e51` |
| S02-LISTINGS | Discovery listings | PASS | Listings publicos visibles en Preview | `43d97c4` |

## C. Mapa de ramas y commits

| Commit | Mensaje | Tipo |
|--------|---------|------|
| `43d97c4` | fix(marketplace): refresh public discovery listings | fix |
| `4f15e51` | fix(marketplace): repair marketplace user login | fix |
| `8d43d53` | fix(qa): load marketplace credentials from env | fix |
| `525602c` | docs(qa): record marketplace login hotfix scope | docs |
| `4c3908e` | docs(control-bus): execute s02 discovery runtime on bkg preview | docs |

## D. Relaciones Obsidian / Backlinks

- [[00_CENTRAL_TURPIAL]] — Mapa central del proyecto
- [[ROADMAP_RESCATE]] — Roadmap de rescate + incidente aprendido
- [[BUGS_CRITICOS]] — Bugs criticos (Prisma P2021 cerrado)
- [[S02_FINAL_DISCOVERY_RUNTIME_CLOSURE_2026-05-11]] — Cierre consolidado S02
- [[session-summary-active]] — Ultimo resumen de sesion
- [[next-window-brief]] — Brief para proximo agente

## E. Dependencias y limites

- **Depende de:** Preview BKG Vercel `turpialsound` funcional.
- **Depende de:** `vercel whoami` = `jcarlosleon81-1948`.
- **No depende de:** CDP, Chrome, navegador, Playwright.
- **No depende de:** Schema/migrations, booking, produccion.
- **No tocar:** booking, /reservas, produccion, main, envs, schema.

## F. Decisiones importantes

1. **Discovery clasificado como `QUERY_ERROR`** con smoke BKG estable. No requiere fix de codigo.
2. **El error Prisma `P2021` raiz** (DB target incorrecta sin tablas `mp_*`) ya estaba cerrado en `BUGS_CRITICOS.md` — S02 consolida ese cierre con evidencia trazable.
3. **Login marketplace reparado** en `4f15e51` como hotfix colateral necesario para smoke.
4. **Credenciales QA leidas desde env**, nunca hardcodeadas ni commiteadas.
5. **Preview rechazado para cierre:** cualquier URL `cerberus77s-projects` (no es BKG).

## G. Proximo paso real

**Recomendacion tecnica:** S03 — Auth/Login QA Closure (Manuel owner, Jean reviewer).
S03 ya fue ejecutado y cerrado por Manuel con 12/12 PASS en QA Harness completo.

Razones:
- S02 clasifico el error y estabilizo el runtime.
- S03 completo la validacion QA formal de login + publish + discovery + flujo transaccional.
- Base recomendada: `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`.

## H. Estado de documentacion

- **Rama final S02:** `jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10` — contiene 5 commits + docs consolidados.
- **Fuentes de verdad:** `qa-dispatcher.json`, `S02_DISCOVERY_RUNTIME_INDEX.md` (este archivo), `S02_FINAL_DISCOVERY_RUNTIME_CLOSURE_2026-05-11.md`.

## I. Regla permanente de cierre de sprint

Un sprint no se considera cerrado sin:
1. Validacion funcional (diagnostico + smoke PASS)
2. Commit con mensaje descriptivo
3. Push a origin
4. Documentacion actualizada (handoffs, Obsidian, dispatcher, roadmap)
5. Siguiente paso real registrado
