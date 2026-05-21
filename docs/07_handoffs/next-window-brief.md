# Next Window Brief — UI/UX Redesign → Dashboard Live Audit

> Date: 2026-05-20
> Branch: `Manuel/uiux-dashboard-mobile-redesign-2026-05-19`
> Base: `MADRE/v8-s-mp-08-csv-tasas-neto-drop-social-2026-05-19` @ `e4ad725`

## Current state: UI/UX changes applied, pending commit/push

Message grouping, dashboard mobile-first, modals full-height implementados en 3 archivos. TypeScript y build pasan limpios. 0/12 viewports con overflow horizontal.

## What to read first

1. `docs/07_handoffs/uiux-dashboard-mobile-redesign-2026-05-19.md` — Reporte completo de cambios
2. `docs/07_handoffs/session-summary-active.md` — Resumen sesion activa
3. `scripts/qa/playwright/login.mjs` — Helper de login Playwright

## Credenciales QA

| Rol | Identificador | Env var |
|-----|--------------|---------|
| Buyer | buyerIA | QA_BUYER_IDENTIFIER, QA_BUYER_PASSWORD |
| Seller | sellerIA | QA_SELLER_IDENTIFIER, QA_SELLER_PASSWORD |
| Admin | mvera (pass: 13894619) | QA_ADMIN_IDENTIFIER, QA_ADMIN_PASSWORD |

## Siguiente paso — Dashboard Live Audit

- **Owner:** 👤 Manuel
- **Branch:** `Manuel/uiux-dashboard-mobile-redesign-2026-05-19` (misma rama)
- **Tareas:**
  1. Commit + push cambios actuales
  2. Login con credenciales QA (admin: mvera/13894619)
  3. Auditar dashboard comprador/vendedor/admin en vivo con Playwright
  4. Verificar agrupacion de mensajes con datos reales
  5. Medir contraste WCAG en light/dark mode
  6. PR a rama madre

## Previous: S11-S12 (historical)

S11 (CLOSED): Playwright setup + login smoke 3/3 PASS. Merged to mother @ `48e4479`.
S12 (Jean): Purchase flow browser E2E.

## Canonical commands

```bash
# Bootstrap credenciales QA
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1

# Doctor env
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs

# S11 login smoke
npx tsx scripts/qa/playwright/s11-login-smoke.spec.mjs
```

## DO NOT

- No tocar booking/reservas
- No deploy a produccion
- No tocar main
- No commitear .env.local o secretos
