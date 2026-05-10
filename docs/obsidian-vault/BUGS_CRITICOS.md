---
tags: ["#status/live-source", "#area/backend", "#area/ui", "#area/ops"]
fecha: 2026-05-10
---

# Bugs Criticos y Riesgos — Turpial Sound

## Estado real (2026-05-10)

- **Rama madre operativa:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD:** `525602c`
- **`/reservas`:** Congelado como zona sana.
- **`/marketplace`:** Activo en preview, no en produccion.

---

## P0 — Criticos abiertos

### CRIT-001: Secretos expuestos durante setup de preview
- **Severidad:** CRITICO
- **Estado:** ABIERTO
- **Descripcion:** DB credentials y secretos (Neon, JWT, Blob) quedaron expuestos durante la configuracion del preview env para `Manuel/*`.
- **Accion requerida:** Rotar credenciales Neon expuestas y cualquier credencial QA/admin expuesta. Actualizar Vercel envs.
- **Owner:** Jean
- **Deadline:** Antes de inauguracion / launch publico (S10)
- **Bloquea:** Produccion

### CRIT-002: Marketplace discovery Prisma query/runtime error en intento de deploy productivo
- **Severidad:** CRITICO
- **Estado:** ABIERTO — requiere validacion
- **Descripcion:** Intento de deploy productivo alrededor del commit `525602c` tuvo error de Prisma query en marketplace discovery. Produccion fue rollbackeada/recuperada.
- **Evidencia:** Runtime logs del deploy fallido.
- **Accion requerida:** Validar en preview con smoke y runtime logs antes de cualquier futuro deploy productivo.
- **Owner:** Manuel (diagnostico) + Jean (release gate)
- **Sprint asociado:** S02
- **Bloquea:** Produccion

### CRIT-003: No desplegar a produccion desde branch head no verificado
- **Severidad:** CRITICO
- **Estado:** Guardrail operativo
- **Descripcion:** El branch head actual (`525602c`) no debe asumirse como production-ready sin pasar por preview smoke y QA matrix.
- **Regla:** Produccion solo desde release gate de Jean con preview smoke + QA matrix pasando.

---

## P1 — Altos

### HIGH-001: Booking `/reservas` es zona protegida
- **Severidad:** ALTO
- **Estado:** Guardrail activo
- **Descripcion:** Cualquier cambio en booking runtime, `/reservas`, o modelos de booking compromete produccion.
- **Owner:** Jean
- **Regla:** Solo Jean toca booking. Marketplace ramas no incluyen cambios en booking.

### HIGH-002: `main` no es la base operativa actual
- **Severidad:** ALTO
- **Estado:** Documentado
- **Descripcion:** `main` no refleja el estado operativo actual. La rama madre real es `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`.
- **Regla:** No usar `main` como base para nuevos desarrollos hasta que Jean lo realinee.

### HIGH-003: Migraciones Prisma requieren lock de arquitectura
- **Severidad:** ALTO
- **Estado:** Guardrail activo
- **Descripcion:** Cambios de schema/Prisma/migraciones requieren sprint de arquitectura con lock de Jean. No se ejecutan desde ramas de Manuel sin coordinacion.
- **Owner:** Jean

---

## P2 — Medios

### MED-001: Preview envs de `Manuel/*` requieren verificacion periodica
- **Severidad:** MEDIO
- **Estado:** Monitor
- **Descripcion:** Aunque los envs de preview para `Manuel/*` estan resueltos (`DATABASE_URL`, `DIRECT_URL`, `MP_JWT_SECRET`, Blob/payment proof), degradaciones silenciosas son posibles.
- **Accion:** Verificar con `preview-runtime-guard.ts` al inicio de cada sprint.
- **Sprint asociado:** S01

### MED-002: Posible drift entre rama madre documentada y HEAD real
- **Severidad:** MEDIO
- **Estado:** Mitigado por S00
- **Descripcion:** Los docs anteriores referenciaban `integration/today-reservas-marketplace-stable-2026-05-07` como madre, pero la operativa real es `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`.
- **Accion:** S00 actualiza todos los docs. Mantener `00_CENTRAL_TURPIAL.md` como fuente de verdad de la rama madre activa.

---

## P0 cerrados previamente

- [x] Marketplace vacio por UI/filtros (descartado).
- [x] Causa raiz real identificada: DB target de Preview sin tablas `mp_*`.
- [x] Prisma `P2021` asociado a `public.mp_listings` inexistente.
- [x] BCV corregido con tasa fresca.
- [x] Login marketplace reparado — busqueda deterministica, roles correctos.
- [x] Preview env `Manuel/*` sin DB/JWT — resuelto en BKG Vercel.

---

## Guardrails operativos (obligatorios)

- `DATABASE_URL` pooled/pooler.
- `DIRECT_URL` direct/no-pooler.
- Ambas al mismo proyecto/base Neon integrada.
- Nunca imprimir secretos.
- Correccion env/DB Preview solo por Jean.
- Cero deploys a produccion sin release gate de Jean.
- Cero cambios en booking desde ramas de Manuel.
- Cero migraciones sin lock de arquitectura.

## Protocolo obligatorio si marketplace carga vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar Vercel runtime logs.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Si aparece Prisma `P2021`, revisar DB target y tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` y `DIRECT_URL` con fingerprint seguro.
7. Nunca imprimir secretos.
8. Corregir env/DB en Preview solo por Jean.
9. Redeployar mismo commit.
10. Solo tocar UI si DB y query estan correctas.
