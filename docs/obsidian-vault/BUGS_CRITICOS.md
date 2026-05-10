---
tags: ["#status/live-source", "#area/backend", "#area/ui", "#area/ops"]
fecha: 2026-05-10
---

# Bugs Criticos y Riesgos - Turpial Sound

## Estado real (2026-05-10)

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD base de referencia:** `525602c`
- **`/reservas`:** congelado como zona sana
- **`/marketplace`:** activo en preview, no en produccion

## P0 - Criticos abiertos

### CRIT-001: Secretos expuestos durante setup de preview

- **Severidad:** CRITICO
- **Estado:** ABIERTO
- **Descripcion:** credenciales DB/JWT/Blob y credenciales QA pudieron quedar expuestas durante la configuracion previa de preview
- **Owner:** Jean
- **Bloquea:** produccion
- **Accion requerida:** rotacion total antes de S10

### CRIT-002: Error Prisma/query en discovery durante intento de deploy productivo

- **Severidad:** CRITICO
- **Estado:** ABIERTO - requiere clasificacion
- **Descripcion:** el intento de produccion alrededor de `525602c` disparo error Prisma/query en marketplace discovery
- **Owner:** Jean (fix o clasificacion runtime) + Manuel (review)
- **Sprint asociado:** S02
- **Bloquea:** produccion

### CRIT-003: No desplegar a produccion desde branch head no verificado

- **Severidad:** CRITICO
- **Estado:** GUARDRAIL ACTIVO
- **Descripcion:** el HEAD actual no es production-ready por defecto
- **Regla:** produccion solo con preview smoke, QA final y gate explicito de Jean

## P1 - Altos

### HIGH-001: Booking `/reservas` es zona protegida

- **Severidad:** ALTO
- **Estado:** GUARDRAIL ACTIVO
- **Owner:** Jean
- **Regla:** marketplace no toca booking

### HIGH-002: `main` no es la base operativa actual

- **Severidad:** ALTO
- **Estado:** DOCUMENTADO
- **Regla:** no usar `main` como base hasta realineacion de Jean

### HIGH-003: Migraciones Prisma requieren lock de arquitectura

- **Severidad:** ALTO
- **Estado:** GUARDRAIL ACTIVO
- **Owner:** Jean + Manuel
- **Regla:** schema/Prisma/migrations solo con lock doble

### HIGH-004: Colision en madre o en zona critica por co-development sin lock

- **Severidad:** ALTO
- **Estado:** RIESGO METODOLOGICO
- **Owner:** Jean + Manuel
- **Regla:** no trabajar dos personas sobre el mismo archivo/zona critica sin lock previo

## P2 - Medios

### MED-001: Preview envs de `Manuel/*` pueden degradarse en silencio

- **Severidad:** MEDIO
- **Estado:** MONITOR
- **Sprint asociado:** S01
- **Accion:** verificar nombres de env y correr `preview-runtime-guard.ts` al inicio del sprint

### MED-002: Drift entre docs, prompts y cobertura QA canonica

- **Severidad:** MEDIO
- **Estado:** MONITOR
- **Descripcion:** algunos sprints futuros pueden requerir ruta QA exacta aun no indexada en dispatcher
- **Accion:** si falta entrada exacta, detenerse y registrar `GAP OPERATIVO`

## Confirmado como cerrado

- [x] Marketplace vacio por UI/filtros (descartado)
- [x] DB target incorrecta como causa raiz del `P2021`
- [x] BCV corregido con tasa fresca
- [x] Login marketplace corregido a nivel runtime
- [x] Preview env `Manuel/*` resuelto en BKG Vercel

## Guardrails obligatorios

- `DATABASE_URL` pooled/pooler
- `DIRECT_URL` direct/no-pooler
- ambas al mismo proyecto/base Neon
- nunca imprimir secretos
- cero deploys a produccion sin gate de Jean
- cero cambios en booking desde sprints marketplace
- cero migraciones sin lock
- cero mezcla de dos sprints en una sola rama
