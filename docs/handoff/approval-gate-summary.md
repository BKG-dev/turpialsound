# Approval Gate Summary - Core

## Decision Table

| Frente | Estado | Bloqueo | Proximo paso |
| :--- | :--- | :--- | :--- |
| Env/Ops | Aprobado | Ninguno tecnico detectado | Usar `env-readiness-check.mjs` en Preview/Production antes de operar |
| Expiracion | Aprobado | Scheduler externo aun no configurado | Configurar Vercel Cron o scheduler externo como P1 |
| Atomicidad | Aprobada tecnicamente con condicion | Falta smoke/QA concurrente en DB local/test segura o Neon test explicito | Ejecutar smoke/QA concurrente contra entorno seguro, nunca produccion |
| Marketplace | Fuera de scope Core | Responsabilidad de Manuel | No mezclar con este approval gate |

## Operating Rules

- Jean controla produccion, `main`, merge de DB, integracion UI/UX y marketplace.
- No usar secrets en prompts, issues, PRs, docs o logs.
- No tocar `main` desde agentes.
- No usar DB de produccion para QA.
- No tocar `marketplace`, modelos `Mp*`, `generated/prisma`, migraciones ni `.env*` dentro de este gate.

## Recommended Closure Order

1. Mantener Env/Ops y Expiracion como bloques aprobados.
2. Ejecutar smoke/QA concurrente de Atomicidad cuando exista DB local/test o Neon test explicito.
3. Configurar scheduler externo para Expiracion como P1.
4. Hacer cierre pre-commit despues de validar que no hay cambios fuera de alcance.

## Current Risk Summary

- Atomicidad tiene aprobacion tecnica, pero no validacion concurrente ejecutada en DB segura.
- Expiracion esta aprobada; queda pendiente la operacion recurrente mediante scheduler externo.
- Env/Ops esta aprobado; el script no toca servicios externos y solo valida presencia de env vars sin imprimir secretos.
