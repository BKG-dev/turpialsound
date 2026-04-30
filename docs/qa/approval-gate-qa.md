# Matriz QA: Approval Gate Core

## Resumen de bloques

| Bloque | Estado | Accion requerida |
| :--- | :--- | :--- |
| Env/Ops | Aprobado | Usar checklist en el entorno objetivo |
| Expiracion | Aprobada | Configurar scheduler/Vercel Cron como P1 |
| Atomicidad | Aprobada tecnicamente con condicion | Ejecutar smoke/QA concurrente cuando exista DB local/test o Neon test explicito |

## Bloque A: Env/Ops

- **Documentacion:** `docs/qa/env-readiness-qa.md`, `docs/ops/env-readiness.md`, `docs/ops/production-readiness-checklist.md`.
- **Script:** `scripts/checks/env-readiness-check.mjs`.
- **Casos:** `--help`, ejecucion normal, `--strict`, `--json`, no impresion de secretos.
- **Estado:** aprobado sin cambios adicionales de codigo.

## Bloque B: Expiracion

- **Documentacion:** `docs/qa/payment-flow-qa.md`, `docs/qa/admin-ops-qa.md`, `docs/qa/calendar-email-qa.md`, `docs/security/core-red-team.md`.
- **Superficie:** `/admin`, `POST /api/bookings/expire`, `lib/bookings/operations.ts`, checker read-only.
- **Casos:** expiracion de `pending_payment`, exclusion de `payment_reported`, exclusion de `PaymentProof.isActive = true`, seguridad bearer, auditoria y sync Calendar/email.
- **Estado:** aprobado. Queda pendiente la operacion recurrente mediante scheduler externo/Vercel Cron.

## Bloque C: Atomicidad

- **Documentacion:** `docs/qa/core-booking-qa.md`.
- **Superficie:** `lib/bookings/actions.ts`, `lib/bookings/availability.ts`, `scripts/checks/booking-concurrency-smoke.mjs`.
- **Casos:** doble submit, dos navegadores/usuarios contra el mismo recurso/slot, verificacion en `/admin`.
- **Estado:** aprobado tecnicamente. Queda pendiente solo el smoke/QA concurrente automatico en entorno DB local/test o Neon test explicito.

## Formato de reporte para Jean

- **Nombre del bloque:**
- **Fecha de ejecucion:**
- **Casos probados:**
- **Resultado:** Pasa / Falla / No probado
- **Observaciones:**
- **Responsable:**
