---
type: session-starter
project: "Turpial Sound"
fecha: 2026-05-16
actualizado: "2026-05-18T00:22:28.467Z"
para: "Jean Arteaga y Manuel Vera — proxima sesion Kilo"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
mother_branch: "MADRE/v4-oreshnik-docs-sync-2026-05-18"
mother_head: "PENDIENTE_PUSH"
---

# 🟢 INSTRUCCION DE APERTURA DE SESION — AMBOS OPERADORES

> **LEER PRIMERO:** [[00_CENTRAL_TURPIAL]] — Fuente unica de verdad.
> **Metodologia:** [[METODOLOGIA_ORESHNIK]]
> **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🚨 SITUACION ACTUAL (2026-05-15 12:40 VET)

**TRACK 5 UI/UX COMPLETADO.** S-UX-01 y S-UX-02 CERRADOS. Docs migrados a nueva rama madre.

| Rama | HEAD | Estado |
|------|------|--------|
| **Madre** `RAMA MADRE` | `25fdca6` | ✅ Actualizada con docs |
| `Manuel/s-adm-01-legal-entity-2026-05-15` | — | 🟡 Siguiente sprint |

### Sprints cerrados — Manuel

| Sprint | Descripcion | Fecha |
|--------|-------------|-------|
| S-UX-01 | Plan tecnico UI Inmersiva | 2026-05-15 |
| S-UX-02 | Implementacion UI Inmersiva + Refac Global | 2026-05-15 |
| S-MK-01 | Analisis de mercado y competencia | 2026-05-14 |
| S-MK-02 | KPI dashboard inteligente | 2026-05-14 |
| S-MK-04/05/06 | RRSS + Marketing | 2026-05-14 |
| S-REV-01 | Ratings, reviews + Full E2E | 2026-05-14 |
| S-DS-01 | DropSocial referral | 2026-05-14 |
| S-OPT-01 | Optimizaciones (loc, inv, search, lang) | 2026-05-14 |
| S12-S20 | Marketplace sprints (excepto S17, S19) | 2026-05-14/15 |

### Pendiente Jean

| Sprint | Descripcion |
|--------|-------------|
| S-JB-01 a 04 | Booking fixes + dashboard + tasas + Google reviews |
| S17 | Seller dashboard browser |
| S19 | Performance/load (parcial) |
| S21 | Production release gate |
| S-MK-03 | SEO/AEO full + Academia (parcial) |

### Pendiente Manuel

| Sprint | Descripcion |
|--------|-------------|
| S-ADM-01 | Verificar estado legal de la entidad |
| S-ADM-03 | Modelos comerciales/juridicos |
| S-ADM-04 | Deploy + capacitacion CDA |

---

## 👤 JEAN — TUS INSTRUCCIONES

```
1. Sincronizate con la madre usando preflight:
   node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean --desc "lo-que-vas-a-hacer"

   Ejemplo para S17:
   node scripts/oreshnik/preflight.mjs --sprint S17 --operator Jean --desc "seller-dashboard"

   ESTO CREA AUTOMATICAMENTE: Jean/S17-seller-dashboard-2026-05-15

2. El preflight v3.0 gestiona todo automaticamente:
   - Si estas en madre → crea rama hija Jean/SXX-descripcion-fecha
   - Si la rama ya existe → hace checkout
   - Si estas en rama hija de otro sprint → te avisa
   - No necesitas hacer git checkout -b manual

3. Docs: editalos en tu rama hija. Se mergean a madre junto con tu codigo al cerrar sprint.
   El sync YA NO revierte cambios intencionales en el vault.

4. Zona exclusiva tuya: /reservas, components/bookings/, lib/bookings/

5. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   SI FALLA → no pushear, corregir primero

6. Al cerrar el sprint, actualiza los docs y mergea a madre.
```

---

## 👤 MANUEL — TUS INSTRUCCIONES

```
1. Crear rama para S-ADM-01 con preflight v3.0:
   node scripts/oreshnik/preflight.mjs --sprint S-ADM-01 --operator Manuel --desc "legal-entity"

2. Estado actual: Track 5 CERRADO. S-UX-01 y S-UX-02 completados.
   Proximo sprint: S-ADM-01 (verificacion legal).

3. Preflight v3.0 — usar SIEMPRE con --sprint y --desc.
   El operador se detecta automaticamente via git config user.name.

4. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   git diff --check

5. Tareas fisicas pendientes:
   - S-ADM-01: Verificar estado legal
   - S-ADM-04: Deploy + capacitacion CDA
```

---

## 🤝 SINCRONIZACION — REGLA DE ORO

**Al abrir sesion, CORRER PREFLIGHT:**

Actualizacion S-MP-01 2026-05-17:
- `scripts/oreshnik/preflight.mjs` fue reparado para cerrar correctamente el bloque de sync de docs.
- El preflight ahora lee JSON operativos con `readJsonFile()` y tolera BOM/cache invalida con fallback seguro.
- Si vuelve a fallar preflight por JSON operativo, revisar primero cache en `scripts/oreshnik/runs/` antes de tocar codigo de producto.

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

**El preflight v3.0 ejecuta automaticamente:**
1. Sync de docs con origin
2. Verificacion de salud de contexto
3. Gestion de ramas (crea hija desde madre si aplica)
4. Zone check de colisiones
5. Verificacion de .env.local
6. Verificacion de Vercel deploy
7. Bus de control (10 stop conditions)
8. Resiliencia (reasignacion de carga)

**⚠️ OBSIDIAN: El sync ahora SOLO revierte config de Obsidian (.obsidian/). Los cambios en docs/obsidian-vault/ se respetan.**

---

## ✅ PRE-PUSH CHECKLIST

| # | Check | Comando |
|---|-------|---------|
| 1 | TypeScript | `npx tsc --noEmit` |
| 2 | Build | `pnpm run build` |
| 3 | Whitespace | `git diff --check` |
| 4 | No secrets | `git diff --name-only \| grep "\.env"` |
| 5 | No /reservas | Si es sprint marketplace |
| 6 | Vercel preview | `npx vercel list \| head -3` |

---

## 📅 PROXIMO HITO

**S-ADM-01** — Verificacion de estatus legal de Turpial Sound (Manuel).
**S17** — Seller dashboard browser (Jean).

---

> **Fuente de verdad:** [[00_CENTRAL_TURPIAL]] | **Metodologia:** [[METODOLOGIA_ORESHNIK]]
﻿---
type: session-starter
project: "Turpial Sound"
fecha: 2026-05-16
actualizado: "2026-05-18T13:09:54.458Z"
para: "Jean Arteaga y Manuel Vera — proxima sesion Kilo"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
mother_branch: "MADRE/v5-s-mp-02-busqueda-fuzzy-filtros-ubicacion-2026-05-18"
mother_head: "PENDIENTE_PUSH"
---

# 🟢 INSTRUCCION DE APERTURA DE SESION — AMBOS OPERADORES

> **LEER PRIMERO:** [[00_CENTRAL_TURPIAL]] — Fuente unica de verdad.
> **Metodologia:** [[METODOLOGIA_ORESHNIK]]
> **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🚨 SITUACION ACTUAL (2026-05-15 12:40 VET)

**TRACK 5 UI/UX COMPLETADO.** S-UX-01 y S-UX-02 CERRADOS. Docs migrados a nueva rama madre.

| Rama | HEAD | Estado |
|------|------|--------|
| **Madre** `RAMA MADRE` | `25fdca6` | ✅ Actualizada con docs |
| `Manuel/s-adm-01-legal-entity-2026-05-15` | — | 🟡 Siguiente sprint |

### Sprints cerrados — Manuel

| Sprint | Descripcion | Fecha |
|--------|-------------|-------|
| S-UX-01 | Plan tecnico UI Inmersiva | 2026-05-15 |
| S-UX-02 | Implementacion UI Inmersiva + Refac Global | 2026-05-15 |
| S-MK-01 | Analisis de mercado y competencia | 2026-05-14 |
| S-MK-02 | KPI dashboard inteligente | 2026-05-14 |
| S-MK-04/05/06 | RRSS + Marketing | 2026-05-14 |
| S-REV-01 | Ratings, reviews + Full E2E | 2026-05-14 |
| S-DS-01 | DropSocial referral | 2026-05-14 |
| S-OPT-01 | Optimizaciones (loc, inv, search, lang) | 2026-05-14 |
| S12-S20 | Marketplace sprints (excepto S17, S19) | 2026-05-14/15 |

### Pendiente Jean

| Sprint | Descripcion |
|--------|-------------|
| S-JB-01 a 04 | Booking fixes + dashboard + tasas + Google reviews |
| S17 | Seller dashboard browser |
| S19 | Performance/load (parcial) |
| S21 | Production release gate |
| S-MK-03 | SEO/AEO full + Academia (parcial) |

### Pendiente Manuel

| Sprint | Descripcion |
|--------|-------------|
| S-ADM-01 | Verificar estado legal de la entidad |
| S-ADM-03 | Modelos comerciales/juridicos |
| S-ADM-04 | Deploy + capacitacion CDA |

---

## 👤 JEAN — TUS INSTRUCCIONES

```
1. Sincronizate con la madre usando preflight:
   node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean --desc "lo-que-vas-a-hacer"

   Ejemplo para S17:
   node scripts/oreshnik/preflight.mjs --sprint S17 --operator Jean --desc "seller-dashboard"

   ESTO CREA AUTOMATICAMENTE: Jean/S17-seller-dashboard-2026-05-15

2. El preflight v3.0 gestiona todo automaticamente:
   - Si estas en madre → crea rama hija Jean/SXX-descripcion-fecha
   - Si la rama ya existe → hace checkout
   - Si estas en rama hija de otro sprint → te avisa
   - No necesitas hacer git checkout -b manual

3. Docs: editalos en tu rama hija. Se mergean a madre junto con tu codigo al cerrar sprint.
   El sync YA NO revierte cambios intencionales en el vault.

4. Zona exclusiva tuya: /reservas, components/bookings/, lib/bookings/

5. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   SI FALLA → no pushear, corregir primero

6. Al cerrar el sprint, actualiza los docs y mergea a madre.
```

---

## 👤 MANUEL — TUS INSTRUCCIONES

```
1. Crear rama para S-ADM-01 con preflight v3.0:
   node scripts/oreshnik/preflight.mjs --sprint S-ADM-01 --operator Manuel --desc "legal-entity"

2. Estado actual: Track 5 CERRADO. S-UX-01 y S-UX-02 completados.
   Proximo sprint: S-ADM-01 (verificacion legal).

3. Preflight v3.0 — usar SIEMPRE con --sprint y --desc.
   El operador se detecta automaticamente via git config user.name.

4. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   git diff --check

5. Tareas fisicas pendientes:
   - S-ADM-01: Verificar estado legal
   - S-ADM-04: Deploy + capacitacion CDA
```

---

## 🤝 SINCRONIZACION — REGLA DE ORO

**Al abrir sesion, CORRER PREFLIGHT:**

Actualizacion S-MP-01 2026-05-17:
- `scripts/oreshnik/preflight.mjs` fue reparado para cerrar correctamente el bloque de sync de docs.
- El preflight ahora lee JSON operativos con `readJsonFile()` y tolera BOM/cache invalida con fallback seguro.
- Si vuelve a fallar preflight por JSON operativo, revisar primero cache en `scripts/oreshnik/runs/` antes de tocar codigo de producto.

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

**El preflight v3.0 ejecuta automaticamente:**
1. Sync de docs con origin
2. Verificacion de salud de contexto
3. Gestion de ramas (crea hija desde madre si aplica)
4. Zone check de colisiones
5. Verificacion de .env.local
6. Verificacion de Vercel deploy
7. Bus de control (10 stop conditions)
8. Resiliencia (reasignacion de carga)

**⚠️ OBSIDIAN: El sync ahora SOLO revierte config de Obsidian (.obsidian/). Los cambios en docs/obsidian-vault/ se respetan.**

---

## ✅ PRE-PUSH CHECKLIST

| # | Check | Comando |
|---|-------|---------|
| 1 | TypeScript | `npx tsc --noEmit` |
| 2 | Build | `pnpm run build` |
| 3 | Whitespace | `git diff --check` |
| 4 | No secrets | `git diff --name-only \| grep "\.env"` |
| 5 | No /reservas | Si es sprint marketplace |
| 6 | Vercel preview | `npx vercel list \| head -3` |

---

## 📅 PROXIMO HITO

**S-ADM-01** — Verificacion de estatus legal de Turpial Sound (Manuel).
**S17** — Seller dashboard browser (Jean).

---

> **Fuente de verdad:** [[00_CENTRAL_TURPIAL]] | **Metodologia:** [[METODOLOGIA_ORESHNIK]]
﻿---
type: session-starter
project: "Turpial Sound"
fecha: 2026-05-16
actualizado: "2026-05-18T13:10:47.520Z"
para: "Jean Arteaga y Manuel Vera — proxima sesion Kilo"
metodologia: "Oreshnik v4.0 + Madre Dinamica + Cierre Automatizado"
mother_branch: "MADRE/v6-s-mp-06-drop-social-referidos-dashboard-2026-05-18"
mother_head: "PENDIENTE_PUSH"
---

# 🟢 INSTRUCCION DE APERTURA DE SESION — AMBOS OPERADORES

> **LEER PRIMERO:** [[00_CENTRAL_TURPIAL]] — Fuente unica de verdad.
> **Metodologia:** [[METODOLOGIA_ORESHNIK]]
> **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🚨 SITUACION ACTUAL (2026-05-15 12:40 VET)

**TRACK 5 UI/UX COMPLETADO.** S-UX-01 y S-UX-02 CERRADOS. Docs migrados a nueva rama madre.

| Rama | HEAD | Estado |
|------|------|--------|
| **Madre** `RAMA MADRE` | `25fdca6` | ✅ Actualizada con docs |
| `Manuel/s-adm-01-legal-entity-2026-05-15` | — | 🟡 Siguiente sprint |

### Sprints cerrados — Manuel

| Sprint | Descripcion | Fecha |
|--------|-------------|-------|
| S-UX-01 | Plan tecnico UI Inmersiva | 2026-05-15 |
| S-UX-02 | Implementacion UI Inmersiva + Refac Global | 2026-05-15 |
| S-MK-01 | Analisis de mercado y competencia | 2026-05-14 |
| S-MK-02 | KPI dashboard inteligente | 2026-05-14 |
| S-MK-04/05/06 | RRSS + Marketing | 2026-05-14 |
| S-REV-01 | Ratings, reviews + Full E2E | 2026-05-14 |
| S-DS-01 | DropSocial referral | 2026-05-14 |
| S-OPT-01 | Optimizaciones (loc, inv, search, lang) | 2026-05-14 |
| S12-S20 | Marketplace sprints (excepto S17, S19) | 2026-05-14/15 |

### Pendiente Jean

| Sprint | Descripcion |
|--------|-------------|
| S-JB-01 a 04 | Booking fixes + dashboard + tasas + Google reviews |
| S17 | Seller dashboard browser |
| S19 | Performance/load (parcial) |
| S21 | Production release gate |
| S-MK-03 | SEO/AEO full + Academia (parcial) |

### Pendiente Manuel

| Sprint | Descripcion |
|--------|-------------|
| S-ADM-01 | Verificar estado legal de la entidad |
| S-ADM-03 | Modelos comerciales/juridicos |
| S-ADM-04 | Deploy + capacitacion CDA |

---

## 👤 JEAN — TUS INSTRUCCIONES

```
1. Sincronizate con la madre usando preflight:
   node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean --desc "lo-que-vas-a-hacer"

   Ejemplo para S17:
   node scripts/oreshnik/preflight.mjs --sprint S17 --operator Jean --desc "seller-dashboard"

   ESTO CREA AUTOMATICAMENTE: Jean/S17-seller-dashboard-2026-05-15

2. El preflight v3.0 gestiona todo automaticamente:
   - Si estas en madre → crea rama hija Jean/SXX-descripcion-fecha
   - Si la rama ya existe → hace checkout
   - Si estas en rama hija de otro sprint → te avisa
   - No necesitas hacer git checkout -b manual

3. Docs: editalos en tu rama hija. Se mergean a madre junto con tu codigo al cerrar sprint.
   El sync YA NO revierte cambios intencionales en el vault.

4. Zona exclusiva tuya: /reservas, components/bookings/, lib/bookings/

5. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   SI FALLA → no pushear, corregir primero

6. Al cerrar el sprint, actualiza los docs y mergea a madre.
```

---

## 👤 MANUEL — TUS INSTRUCCIONES

```
1. Crear rama para S-ADM-01 con preflight v3.0:
   node scripts/oreshnik/preflight.mjs --sprint S-ADM-01 --operator Manuel --desc "legal-entity"

2. Estado actual: Track 5 CERRADO. S-UX-01 y S-UX-02 completados.
   Proximo sprint: S-ADM-01 (verificacion legal).

3. Preflight v3.0 — usar SIEMPRE con --sprint y --desc.
   El operador se detecta automaticamente via git config user.name.

4. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   git diff --check

5. Tareas fisicas pendientes:
   - S-ADM-01: Verificar estado legal
   - S-ADM-04: Deploy + capacitacion CDA
```

---

## 🤝 SINCRONIZACION — REGLA DE ORO

**Al abrir sesion, CORRER PREFLIGHT:**

Actualizacion S-MP-01 2026-05-17:
- `scripts/oreshnik/preflight.mjs` fue reparado para cerrar correctamente el bloque de sync de docs.
- El preflight ahora lee JSON operativos con `readJsonFile()` y tolera BOM/cache invalida con fallback seguro.
- Si vuelve a fallar preflight por JSON operativo, revisar primero cache en `scripts/oreshnik/runs/` antes de tocar codigo de producto.

```bash
node scripts/oreshnik/preflight.mjs --sprint SXX --operator Jean|Manuel --desc "descripcion"
```

**El preflight v3.0 ejecuta automaticamente:**
1. Sync de docs con origin
2. Verificacion de salud de contexto
3. Gestion de ramas (crea hija desde madre si aplica)
4. Zone check de colisiones
5. Verificacion de .env.local
6. Verificacion de Vercel deploy
7. Bus de control (10 stop conditions)
8. Resiliencia (reasignacion de carga)

**⚠️ OBSIDIAN: El sync ahora SOLO revierte config de Obsidian (.obsidian/). Los cambios en docs/obsidian-vault/ se respetan.**

---

## ✅ PRE-PUSH CHECKLIST

| # | Check | Comando |
|---|-------|---------|
| 1 | TypeScript | `npx tsc --noEmit` |
| 2 | Build | `pnpm run build` |
| 3 | Whitespace | `git diff --check` |
| 4 | No secrets | `git diff --name-only \| grep "\.env"` |
| 5 | No /reservas | Si es sprint marketplace |
| 6 | Vercel preview | `npx vercel list \| head -3` |

---

## 📅 PROXIMO HITO

**S-ADM-01** — Verificacion de estatus legal de Turpial Sound (Manuel).
**S17** — Seller dashboard browser (Jean).

---

> **Fuente de verdad:** [[00_CENTRAL_TURPIAL]] | **Metodologia:** [[METODOLOGIA_ORESHNIK]]
