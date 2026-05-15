# Next Window Brief — S11 Complete → S12 Ready

> Date: 2026-05-11
> Mother: `RAMA MADRE` @ `48e4479`

## Current state: S11 CLOSED — 3/3 PASS, MERGED TO MOTHER

Playwright + Chromium instalado en rama madre. Helpers y spec S11 funcionando.

## What to read first

1. `docs/obsidian-vault/NEXT_PHASE_PLAN_S11_S20.md` — Plan S11-S20
2. `docs/07_handoffs/session-summary-active.md` — Resumen S11
3. `scripts/qa/playwright/login.mjs` — Helper de login Playwright (reusable para S12+)

## Credenciales QA

| Rol | Identificador | Env var |
|-----|--------------|---------|
| Buyer | buyerIA | QA_BUYER_IDENTIFIER, QA_BUYER_PASSWORD |
| Seller | sellerIA | QA_SELLER_IDENTIFIER, QA_SELLER_PASSWORD |
| Admin | mvera | QA_ADMIN_IDENTIFIER, QA_ADMIN_PASSWORD |

## Plan Maestro vigente

> 📋 **Leer antes de ejecutar:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
> 5 tracks, 27 sprints totales. Marketplace + Booking + Crecimiento + Admin-Legal + UI/UX.

## S12 — Próximo sprint (Jean)

- **Owner:** 👤 Jean
- **Branch:** `jean/s12-purchase-flow-browser-2026-05-12`
- **Base:** `RAMA MADRE` (Playwright ya disponible)
- **Tareas:** Navegar listing QA → click "Comprar" → Pago Móvil → Confirmar → Screenshots
- **Reutilizar:** `scripts/qa/playwright/login.mjs` para login buyer

## Acciones inmediatas adicionales

- **Jean:** Push de cambios locales pendientes al repo
- **Jean:** Configurar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Vercel
- **Manuel:** Verificar estado legal de la entidad
- **Manuel:** Preparar deploy CDA (viernes 15 mayo 2026, 11AM VET)

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
