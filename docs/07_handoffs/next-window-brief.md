# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-10
**Frente activo:** S00 — Documentacion / Obsidian / Control Bus Sync
**Tipo de nota:** Control Tower / siguiente ventana

## Estado actual

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` (HEAD `525602c`).
- **Sprint en curso:** S00 — Documentacion estrategica.
- **Rama activa:** `Manuel/docs-strategic-obsidian-sprints-2026-05-10`.
- **`/reservas`:** Congelado como zona sana.
- **`/marketplace`:** Activo en preview, no en produccion.
- **Login marketplace:** Reparado y validado en preview (commits `4f15e51`, `8d43d53`).
- **Preview `Manuel/*`:** Funcional en BKG Vercel `turpialsound`.

## Proxima ventana recomendada: S01

**S01 — BKG Preview Smoke Autonomia**

- **Objetivo:** Confirmar que Manuel puede desplegar preview limpio desde `Manuel/*` en BKG Vercel con DB/JWT/Blob disponibles.
- **Owner:** Manuel.
- **Rama sugerida:** `Manuel/s01-preview-smoke-autonomy-2026-05-10`.
- **Base:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`.
- **Que hacer:**
  1. Crear rama desde madre.
  2. Push y esperar preview deploy en BKG Vercel.
  3. Ejecutar `npx tsx scripts/diagnostics/preview-runtime-guard.ts --base-url <preview-url>`.
  4. Smoke HTTP: `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login`, `/ops/payment-review`.
  5. Login smoke: `node scripts/qa-marketplace-login-smoke.mjs`.
  6. Verificar que `/reservas` sigue intacto.
- **Produccion:** Prohibido.
- **Stop conditions:** Preview no responde, DB/JWT/Blob ausente, `/reservas` roto.

## Sprints siguientes en secuencia

| Sprint | Nombre | Depende de |
|--------|--------|-----------|
| S02 | Discovery Stabilization | S01 |
| S03 | Auth/Login QA Closure | S01 |
| S04 | Payment Proof E2E | S01, S03 |
| S05 | Delivery & Receipt Flow | S04 |
| S06 | Admin Payout | S05 |
| S07 | Rates Hardening | S06 |
| S08 | UX / Action Center | S05, S06 |
| S09 | SEO/AEO Discovery | S02 |
| S10 | Launch Readiness | S01-S09 |

## Riesgos activos a monitorear

1. **CRIT-001:** Secretos expuestos — rotar antes de S10.
2. **CRIT-002:** Prisma query error en discovery — validar en S02 antes de produccion.
3. **CRIT-003:** No deploy productivo sin release gate.

## Guardrails

- `DATABASE_URL` pooled, `DIRECT_URL` direct, mismo proyecto Neon.
- Cero deploys a produccion sin Jean.
- Cero cambios en booking desde Manuel.
- Cero migraciones sin lock de arquitectura.
- QA scripts via dispatcher canonico (`docs/07_handoffs/qa-dispatcher.json`).

## Documentos clave para la proxima ventana

- `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` — mapa central actualizado
- `docs/obsidian-vault/ESTADO_NEGOCIO_TURPIAL_2026-05-10.md` — estado del negocio
- `docs/obsidian-vault/BUS_CONTROL_TURPIAL.md` — reglas de coordinacion
- `docs/obsidian-vault/SPRINTS_GENERADOS_DESDE_OBSIDIAN_2026-05-10.md` — plan de sprints
- `docs/07_handoffs/qa-dispatcher.json` — despacho de QA
- `docs/07_handoffs/jean-obsidian-control-bus-brief-2026-05-10.md` — brief para Jean

## Preguntas para Jean

1. Confirmar `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07` como rama madre operativa.
2. Revisar Control Bus Nivel 2 (carriles y reglas).
3. Plan para rotar secretos expuestos (CRIT-001).
4. Plan para realinear `main`.
