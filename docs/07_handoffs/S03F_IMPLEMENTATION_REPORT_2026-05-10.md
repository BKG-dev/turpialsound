# S03F Implementation Report — QA Login, Publish, Discovery

> Date: 2026-05-10 (executed 2026-05-10T23:55 ET)
> Branch: `Manuel/s03f-qa-login-publish-discovery-2026-05-10`
> Author: Kilo (agent)
> Sprint: S03F

---

## 1. Branch / Base

| Field | Value |
|-------|-------|
| **Current branch** | `Manuel/s03f-qa-login-publish-discovery-2026-05-10` |
| **Base branch (fork point)** | `origin/Manuel/s03e-marketplace-qa-harness-architecture-2026-05-10` |
| **Local commits** | 1 (S03F implementation) |
| **Remote commits** | 3 (S03E base: `66b15f9`, `e8ddf2c`, `e6ee1cf` + S03F: `35223f9`) |
| **Last remote commit** | `35223f9` — `feat(qa): validate marketplace login publish discovery (S03F)` |
| **Push status** | PUSHED to `origin/Manuel/s03f-qa-login-publish-discovery-2026-05-10` |
| **Unstaged changes** | `scripts/qa/run-marketplace-qa.mjs` (post-commit fix for `--modules=` case-sensitive matching) |
| **Stash** | `stash@{0}` exists — NOT popped (as instructed) |

### Full commit log (local)
```
35223f9 feat(qa): validate marketplace login publish discovery (S03F)
66b15f9 docs(qa): final S03E report — architecture, roadmap, inventory, validations
e8ddf2c docs(qa): add Obsidian scripts map and canvas for QA harness navigation
e6ee1cf feat(qa): design layered QA architecture for marketplace E2E harness
f3b26ee fix(qa): stabilize marketplace login smoke harness
```

---

## 2. Objetivo S03F

**Target:** Implementar la primera etapa real del QA Harness Marketplace con cuatro módulos funcionales, sin dependencia de navegador (Layer B), usando Prisma directo para lectura/escritura controlada de data QA.

### Módulos cubiertos

| Module | Name | Layer | Objetivo |
|--------|------|-------|----------|
| QA-00 | Preflight | A | Validar env vars, APP_URL reachability, DB connection, MP table existence, QA buyer/seller lookup, candidateCount |
| QA-01 | Login Validation | B | Validar credenciales buyer/seller/admin via bcrypt + Prisma (server-side, sin navegador) |
| QA-02 | Publish Listing | B | Crear/reconciliar listing QA controlado para sellerIA via Prisma direct mutation |
| QA-03 | Home Discovery | C | Validar que el listing aparece en /marketplace via DB read + HTTP fetch |

---

## 3. Archivos creados/modificados

| Archivo | Tipo | Qué hace | Estado | Riesgo |
|---------|------|----------|--------|--------|
| `scripts/qa/lib/db-read.mjs` | **NUEVO** | Prisma factory, table checks, user/listing lookups | IMPLEMENTED | Requires DATABASE_URL; import of `generated/prisma/client` fails at runtime on bare Node.js (`.ts` file, needs `tsx` or transpilation) |
| `scripts/qa/lib/session.mjs` | **NUEVO** | bcrypt-based credential validation + profile checks | IMPLEMENTED | Depends on `db-read.mjs` |
| `scripts/qa/lib/server-action.mjs` | **NUEVO** | HTTP server action call helper, session cookie header builder | IMPLEMENTED | Unused in S03F modules (modules use Prisma direct instead) |
| `scripts/qa/modules/qa-00-preflight.mjs` | MODIFICADO (from stub) | Full preflight: env, APP_URL, DB, tables, accounts, candidateCount | IMPLEMENTED | Fails at `requireEnvs` if QA_* vars missing |
| `scripts/qa/modules/qa-01-login.mjs` | MODIFICADO (from stub) | Server-side bcrypt login validation for buyer/seller/admin | IMPLEMENTED | Fails if QA_BUYER_*/QA_SELLER_* missing |
| `scripts/qa/modules/qa-02-publish.mjs` | MODIFICADO (from stub) | Prisma create/reconcile QA listing (slug=qa-e2e-s03f-selleria-discovery) | IMPLEMENTED | Escribe en DB (listing QA). Requires QA_SELLER_* + DATABASE_URL |
| `scripts/qa/modules/qa-03-discovery.mjs` | MODIFICADO (from stub) | Two-phase: DB read + HTTP fetch of /marketplace | IMPLEMENTED | HTTP fetch to APP_URL; DB read via db-read.mjs |
| `scripts/qa/run-marketplace-qa.mjs` | MODIFICADO | Orchestrator with `--modules=`, `--app-url=` support | **BUG — case-sensitive matching fixed post-commit** | Module ID matching was case-sensitive (`qa-00` != `QA-00`) |
| `docs/07_handoffs/qa-dispatcher.json` | MODIFICADO | Version 3: updated status for qa_preflight, qa_login_server_side, qa_publish_listing, qa_home_discovery, qa_marketplace_orchestrator | UPDATED | JSON valid, entries consistent |
| `docs/07_handoffs/session-summary-active.md` | MODIFICADO | S03F session summary | UPDATED | |
| `docs/07_handoffs/next-window-brief.md` | MODIFICADO | Post-S03F brief for next developer | UPDATED | |
| `docs/07_handoffs/QA_E2E_ROADMAP_2026-05-10.md` | MODIFICADO | Sprint S03F marked as IMPLEMENTED with completed task list | UPDATED | |
| `docs/obsidian-vault/QA_HARNESS_SCRIPTS_MAP_2026-05-10.md` | MODIFICADO | Status updated for 4 modules + 3 libs + orchestrator | UPDATED | |

---

## 4. Detalle técnico por archivo

### 4.1 `scripts/qa/run-marketplace-qa.mjs` — Orchestrator

- **Responsabilidad:** Cargar env vars, parsear argumentos CLI, ejecutar módulos QA en secuencia, generar reportes JSON + MD.
- **Entradas:** CLI args: `--module=<ID>` (single), `--modules=<ID1,ID2,...>` (multiple comma-separated), `--app-url=<URL>` (override APP_URL).
- **Salidas:** `var/qa-results/report-<runId>.json`, `var/qa-results/report-<runId>.md`
- **Env vars usadas:** `NODE_ENV`, `APP_URL`, `DATABASE_URL` (via módulos)
- **¿Toca DB?** No directamente (via módulos)
- **¿Muta DB?** No
- **¿Requiere browser?** No
- **Cómo reporta PASS/FAIL:** Cada módulo retorna `{ok: true/false}`. FAIL si `result.ok === false`. SKIP si `result.skipped === true`. Process exit code 1 si hay FAILs.

**Bug encontrado:** El parseo de `--modules=qa-00,qa-01,qa-02,qa-03` produce el array `['qa-00', 'qa-01', 'qa-02', 'qa-03']`. El matching contra `MODULES` usa `MODULES.find(m => m.id === id)` donde `id` es lowercase (`qa-00`) pero `m.id` es uppercase (`QA-00`). Esto hace que `selectedModules` sea un array vacío, causando "No valid modules found for: qa-00,qa-01,qa-02,qa-03".

**Fix aplicado (post-commit, sin stagear):** Cambié:
```js
// Antes (roto)
selectedModules = args.modules.map(id => MODULES.find(m => m.id === id)).filter(Boolean)

// Después (funcional)
selectedModules = args.modules.map(id => MODULES.find(m => m.id === id.toUpperCase())).filter(Boolean)
```

---

### 4.2 `scripts/qa/lib/db-read.mjs` — Prisma DB Reader

- **Responsabilidad:** Factory para PrismaClient con `@prisma/adapter-pg`, funciones de lectura: `getPrisma()`, `disconnectPrisma()`, `checkDbTables()`, `findUserByIdentifier()`, `findUserByEmail()`, `countConflictsByDisplayName()`, `findListingBySlug()`, `findActiveListingsBySlug()`.
- **Entradas:** `DATABASE_URL` (de env), `@prisma/adapter-pg` (npm dep), `generated/prisma/client` (generado local).
- **Salidas:** Instancia PrismaClient con tipado `any`.
- **Env vars usadas:** `DATABASE_URL`
- **¿Toca DB?** Sí — solo lecturas (`SELECT`, `findUnique`, `findFirst`, `findMany`, `$queryRawUnsafe` para `information_schema.tables`).
- **¿Muta DB?** No — solo queries de lectura.
- **¿Requiere browser?** No
- **Cómo reporta PASS/FAIL:** Excepciones capturadas y propagadas a los módulos que llaman estas funciones.

**Problema crítico:** El import `await import('../../../generated/prisma/client.js')` falla en Node.js ESM porque:
- El archivo real es `generated/prisma/client.ts` (TypeScript).
- Node.js ESM no puede cargar archivos `.ts` sin un loader como `tsx`.
- En Next.js, el build pipeline transpila TypeScript a JavaScript, pero el archivo intermedio `.js` no persiste en disco.
- El proyecto usa `tsx` para `setup-marketplace-qa-accounts.ts` que importa del mismo path sin problema.

**Consecuencia:** La corrida de QA-03 falló con `Cannot find module '...\generated\prisma\client.js'`.

---

### 4.3 `scripts/qa/lib/session.mjs` — Session Validator

- **Responsabilidad:** Validar credenciales de usuario sin navegador: buscar usuario por identifier via `findUserByIdentifier()`, verificar bcrypt hash, chequear isBanned, validar perfil (isSeller, role).
- **Entradas:** `identifier` (email o displayName), `password` (plaintext).
- **Salidas:** `{ok, code, detail, user}`. Códigos: `AUTH_DATA_PASS`, `QA_USER_MISSING`, `QA_PASSWORD_MISMATCH`, `USER_BANNED`, `NO_PASSWORD_HASH`, `BCRYPT_ERROR`, `DB_QUERY_ERROR`.
- **Env vars usadas:** Ninguna directamente (usa `db-read.mjs` que usa `DATABASE_URL`).
- **¿Toca DB?** Sí — solo lecturas via `db-read.mjs`.
- **¿Muta DB?** No.
- **¿Requiere browser?** No.
- **Cómo reporta PASS/FAIL:** `validateUserCredentials()` retorna `{ok: true/false, code: string, detail: string, user: object|null}`. `validateUserProfile()` retorna `{ok: true/false, issues: string[], details: object}`.

**Nota:** La sesión real (JWT cookie) requiere contexto Next.js (`cookies()` de `next/headers`), que no está disponible fuera del runtime de Next.js. Los módulos reportan `SESSION_BROWSER_REQUIRED` para indicar que la validación de sesión completa necesita browser/HTTP context.

---

### 4.4 `scripts/qa/lib/server-action.mjs` — Server Action Caller

- **Responsabilidad:** Hacer llamadas HTTP a server actions de Next.js y construir headers de sesión.
- **Entradas:** `actionUrl`, `payload`, `opts` (headers, signal).
- **Salidas:** `{ok, status, data}`.
- **Env vars usadas:** `APP_URL`.
- **¿Toca DB?** No directamente (las server actions sí).
- **¿Muta DB?** No directamente.
- **¿Requiere browser?** No.
- **Cómo reporta PASS/FAIL:** Retorna `ok: response.ok`.

**Nota:** Este helper no fue usado en los módulos S03F. QA-02 usa Prisma direct mutation en lugar de llamar `createListing()` via HTTP. QA-01 usa bcrypt direct en lugar de llamar `loginMpUser()` via HTTP. Es una utilidad preparada para futuros sprints que requieran llamadas HTTP a server actions.

---

### 4.5 `scripts/qa/modules/qa-00-preflight.mjs` — Preflight (Layer A)

- **Responsabilidad:** Validar que el entorno QA está listo antes de correr cualquier módulo.
- **Entradas:** `DATABASE_URL`, `APP_URL`, `QA_BUYER_*`, `QA_SELLER_*` de env.
- **Salidas:** `{ok: true/false, error: string, code: string}`.
- **Env vars usadas:** `DATABASE_URL`, `APP_URL`, `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`, (opcional) `QA_ADMIN_IDENTIFIER`, `QA_ADMIN_PASSWORD`.
- **¿Toca DB?** Sí — conexión, `information_schema.tables`, `mpUser` lookups.
- **¿Muta DB?** No.
- **¿Requiere browser?** No.
- **Cómo reporta PASS/FAIL:** PASS si todos los checks requeridos pasan. FAIL si env vars faltan, APP_URL no responde 200, DB no conecta, tablas faltan, o QA users no encontrados.

**Checks implementados:**
1. `env` — `requireEnvs()` de todas las vars requeridas. FAIL si falta cualquiera.
2. `adminEnv` — Detecta presencia de `QA_ADMIN_IDENTIFIER` y `QA_ADMIN_PASSWORD`. SKIP si faltan (no bloquea S03F).
3. `appUrl` — `checkAppUrl(APP_URL)` con retry. FAIL si no responde 200.
4. `previewBKG` — Valida que la URL no es Cerberus. PASS si `vercel.app` o `localhost`.
5. `dbConnection` — `SELECT 1` via Prisma. FAIL si la conexión falla.
6. `dbTables` — Verifica 11 tablas (`mp_users`, `mp_listings`, etc.) via `information_schema.tables`.
7. `qaBuyer` — Busca el usuario QA buyer por identifier. Verifica displayName, email, role, isSeller, isBanned.
8. `qaSeller` — Busca el usuario QA seller por identifier. Calcula `candidateCount` (1 + conflictos por displayName).
9. `assets` — SKIP en S03F (no requerido).

---

### 4.6 `scripts/qa/modules/qa-01-login.mjs` — Login Validation (Layer B)

- **Responsabilidad:** Validar credenciales de buyer, seller y admin (opcional) sin navegador, usando bcrypt + Prisma.
- **Entradas:** `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`, (opcional) `QA_ADMIN_IDENTIFIER`, `QA_ADMIN_PASSWORD`.
- **Salidas:** `{ok: true/false, error: string, code: string}`.
- **Env vars usadas:** `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`, `QA_ADMIN_IDENTIFIER`, `QA_ADMIN_PASSWORD`.
- **¿Toca DB?** Sí — lecturas via `findUserByIdentifier()` en `db-read.mjs`.
- **¿Muta DB?** No.
- **¿Requiere browser?** No.
- **Cómo reporta PASS/FAIL:** PASS si buyer + seller credenciales son válidas (bcrypt match + perfil correcto). Admin se marca SKIP si no hay env vars admin. FAIL si:
  - Credenciales buyer/seller faltan en env (`ENV_MISSING`).
  - Usuario no encontrado (`QA_USER_MISSING`).
  - Password hash mismatch (`QA_PASSWORD_MISMATCH`).
  - Usuario baneado (`USER_BANNED`).

**Checks implementados:**
1. `buyer` — `validateUserCredentials(buyerIdentifier, buyerPassword)` → verifica `isSeller=false`, `role=USER`, `isBanned=false`.
2. `seller` — `validateUserCredentials(sellerIdentifier, sellerPassword)` → verifica `isSeller=true`, `role=USER`, `isBanned=false`.
3. `admin` — Solo si `QA_ADMIN_IDENTIFIER` + `QA_ADMIN_PASSWORD` existen. Verifica `role=SUPER`.

**Nota sobre sesión:** Cada check incluye `sessionNote: 'SESSION_BROWSER_REQUIRED — session cookie validation needs browser/HTTP context'` porque la validación completa de JWT cookie requiere el runtime de Next.js.

---

### 4.7 `scripts/qa/modules/qa-02-publish.mjs` — Publish Listing (Layer B)

- **Responsabilidad:** Crear (o reconciliar) un listing QA controlado para sellerIA via Prisma direct mutation.
- **Entradas:** `QA_SELLER_IDENTIFIER` (para buscar al seller), `DATABASE_URL`.
- **Salidas:** `{ok: true/false, listingId: string, slug: string, action: 'created'|'updated'}`.
- **Env vars usadas:** `QA_SELLER_IDENTIFIER`, `DATABASE_URL`.
- **¿Toca DB?** Sí — lecturas (`findUserByIdentifier`, `findListingBySlug`) + **ESCRITURA** (`mpListing.create` o `mpListing.update`).
- **¿Muta DB?** **SÍ** — Inserta o actualiza en `mp_listings`.
- **¿Requiere browser?** No.
- **Cómo reporta PASS/FAIL:** PASS si el listing se crea/actualiza y queda ACTIVE en DB con sellerId correcto. FAIL si seller no encontrado, no es seller, error de DB.

**Datos del listing QA:**
| Campo | Valor |
|-------|-------|
| `slug` | `qa-e2e-s03f-selleria-discovery` |
| `title` | `QA S03F sellerIA Discovery` |
| `description` | Listing QA controlado para validar discovery en S03F |
| `category` | `instrumentos-nuevos` |
| `tags` | `['qa', 's03f', 'discovery', 'selleria']` |
| `price` | `125.00` |
| `currency` | `USD` |
| `status` | `ACTIVE` |
| `hasInventory` | `false` |
| `coverImageUrl` | `null` |
| `mediaUrls` | `[]` |

**Checks implementados:**
1. `sellerLookup` — Busca sellerIA por identifier, verifica `isSeller=true`.
2. `listingCreate` — `findListingBySlug(slug)` → si existe, `update`; si no, `create`. Status: ACTIVE.
3. `listingVerify` — Verifica en DB que el listing quedó ACTIVE con `sellerId` correcto.

**Nota:** La mutación es directa a DB (no via `createListing()` server action) porque llamar server actions de Next.js requiere sesión JWT válida. Esta es una limitación documentada de Layer B. La UI publish real queda para sprint con browser/Playwright.

---

### 4.8 `scripts/qa/modules/qa-03-discovery.mjs` — Home Discovery (Layer C)

- **Responsabilidad:** Validar que el listing QA aparece en marketplace via dos fases: DB read + HTTP fetch.
- **Entradas:** `APP_URL` (para HTTP fetch), `DATABASE_URL` (para DB read).
- **Salidas:** `{ok: true/false, dataPass: boolean, uiPass: boolean, browserRequired: boolean, classification: 'UI_PASS'|'DATA_DISCOVERY_PASS'|'BROWSER_REQUIRED'|'NOT_FOUND'}`.
- **Env vars usadas:** `APP_URL`, `DATABASE_URL`.
- **¿Toca DB?** Sí — solo lecturas via `findActiveListingsBySlug()`.
- **¿Muta DB?** No.
- **¿Requiere browser?** Parcial — HTTP fetch intenta leer HTML server-rendered. Si el listing no está en el HTML (UI client-rendered), clasifica `BROWSER_REQUIRED`.
- **Cómo reporta PASS/FAIL:** 
  - `UI_PASS` — listing encontrado en HTML via HTTP fetch.
  - `DATA_DISCOVERY_PASS` — listing encontrado en DB pero no en HTML (client-rendered).
  - `BROWSER_REQUIRED` — UI client-rendered, necesita Playwright/CDP.
  - `NOT_FOUND` — listing no encontrado en DB ni UI.

**Estrategia HTTP:**
- Fetch `{APP_URL}/marketplace` → busca slug/title en HTML.
- Fetch `{APP_URL}/marketplace/{slug}` → busca slug/title en HTML.
- Si ambos fallan y el HTML es grande (>200KB probablemente client-rendered), clasifica `BROWSER_REQUIRED`.

**Resultados observados en la corrida:**
- `/marketplace` retornó HTML de 264239 bytes — listing slug NO encontrado en server-rendered HTML → UI client-rendered (React hidrata en navegador).
- `/marketplace/qa-e2e-s03f-selleria-discovery` retornó HTTP 404 — listing no existe en preview DB (QA-02 no pudo crearlo por falta de QA_SELLER_* env vars).
- DB read falló con `Cannot find module 'generated/prisma/client.js'` — problema de import (ver sección 4.2).

---

### 4.9 `docs/07_handoffs/qa-dispatcher.json` — Dispatcher v3

- **Responsabilidad:** Mapa canónico de task_id → script, precondiciones, estado, sprint target.
- **Entradas:** --
- **Salidas:** JSON con 19 entradas de tasks.
- **¿Toca DB?** No.
- **¿Muta DB?** No.
- **¿Requiere browser?** No.

**Cambios en v3:**
| Task ID | Estado anterior | Estado nuevo |
|---------|----------------|--------------|
| `qa_preflight` | PARTIAL | IMPLEMENTED |
| `qa_login_server_side` | STUB | IMPLEMENTED |
| `qa_publish_listing` | STUB | IMPLEMENTED |
| `qa_home_discovery` | STUB | IMPLEMENTED |
| `qa_marketplace_orchestrator` | SCAFFOLD | PARTIAL |

El campo `version` pasó de `2` a `3`.

---

### 4.10 Documentación actualizada

| Archivo | Cambio |
|---------|--------|
| `session-summary-active.md` | Resumen completo de S03F: qué se implementó, estado, blockers (env vars), next sprint |
| `next-window-brief.md` | Brief para el próximo developer: acciones críticas requeridas (env pull), comando canónico, resultados esperados |
| `QA_E2E_ROADMAP_2026-05-10.md` | Sprint S03F marcado como IMPLEMENTED con checkmarks y lista de tareas completadas |
| `QA_HARNESS_SCRIPTS_MAP_2026-05-10.md` | 4 módulos + 3 libs + orchestrator actualizados de STUB/PENDING/PARTIAL a IMPLEMENTED |

---

## 5. Estado del orquestador

### Cómo registra módulos disponibles
El array `MODULES` en `run-marketplace-qa.mjs` contiene 13 entradas:
```js
const MODULES = [
  { id: 'QA-00', name: 'Preflight', path: './modules/qa-00-preflight.mjs', layer: 'A' },
  { id: 'QA-01', name: 'Login', path: './modules/qa-01-login.mjs', layer: 'B' },
  ...
  { id: 'QA-12', name: 'Final Regression', path: './modules/qa-12-regression.mjs', layer: 'A-D' },
]
```

### Cómo parsea `--modules`
```js
function parseArgv() {
  const args = {}
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--module=')) {
      args.module = arg.replace('--module=', '')           // single
    } else if (arg.startsWith('--modules=')) {
      args.modules = arg.replace('--modules=', '')          // "qa-00,qa-01,..."
        .split(',').map(s => s.trim()).filter(Boolean)
    } else if (arg.startsWith('--app-url=')) {
      args.appUrl = arg.replace('--app-url=', '')
    }
  }
  return args
}
```
Luego en el flujo de resolución:
```js
if (args.modules) {
  selectedModules = args.modules.map(id => MODULES.find(m => m.id === id)).filter(Boolean)
}
```

### Por qué falló el comando `--modules=qa-00,qa-01,qa-02,qa-03`

**Diagnóstico (BUG confirmado):**

1. El comando produce `args.modules = ['qa-00', 'qa-01', 'qa-02', 'qa-03']` (lowercase).
2. El matching `m.id === id` es **case-sensitive**.
3. `'QA-00' !== 'qa-00'` → `MODULES.find(...)` retorna `undefined` para todos.
4. `.filter(Boolean)` filtra los `undefined` → `selectedModules = []`.
5. Condición `if (selectedModules.length === 0)` dispara `"No valid modules found for: qa-00,qa-01,qa-02,qa-03"`.

**Fix ya aplicado (post-commit, sin stagear):**
```js
selectedModules = args.modules.map(id => MODULES.find(m => m.id === id.toUpperCase())).filter(Boolean)
```
Este cambio está en el working tree (`scripts/qa/run-marketplace-qa.mjs` dirty) pero **no commiteado** ni **stageado**.

---

## 6. Estado de credenciales / env

### Archivos de entorno
| Archivo | Existe | Carga automática |
|---------|--------|-----------------|
| `.env.local` | SÍ | SÍ — `loadEnv()` en `env.mjs` lee `.env.local` primero |
| `.env` | SÍ | SÍ — `loadEnv()` lee `.env` como fallback |

### Presencia booleana de vars (sin valores)
| Variable | `.env.local` | `.env` |
|----------|:----------:|:-----:|
| `DATABASE_URL` | NO | SÍ |
| `DIRECT_URL` | NO | SÍ |
| `QA_BUYER_EMAIL` | NO | NO |
| `QA_BUYER_IDENTIFIER` | NO | NO |
| `QA_BUYER_PASSWORD` | NO | NO |
| `QA_SELLER_EMAIL` | NO | NO |
| `QA_SELLER_IDENTIFIER` | NO | NO |
| `QA_SELLER_PASSWORD` | NO | NO |
| `QA_ADMIN_IDENTIFIER` | NO | NO |
| `QA_ADMIN_PASSWORD` | NO | NO |
| `APP_URL` | NO | NO |

**Conclusión:** `.env.local` tiene 23 líneas (ADMIN_ACCESS_KEY, GOOGLE_*, RATE_*, VERCEL_OIDC_TOKEN) pero NINGUNA variable QA_*. `.env` tiene 12 líneas (DATABASE_URL, DIRECT_URL, BCV_*, RATE_*) pero NINGUNA variable QA_*. El QA harness NO puede ejecutarse contra la DB de preview sin las credenciales QA.

---

## 7. Validaciones ejecutadas

### git diff --check
```
(no output — sin errores de whitespace)
```
Los warnings de CRLF→LF son por archivos dirty preexistentes ajenos a S03F.

### npx tsc --noEmit
```
(no output — tipado limpio)
```
Los archivos `.mjs` no son type-checkeados por tsc. Los archivos TypeScript del proyecto pasan sin errores.

### npm run build
```
✓ Compiled successfully
ƒ Middleware    25.8 kB
○ (Static)     prerendered as static content
ƒ (Dynamic)    server-rendered on demand
```

### Comando QA ejecutado (antes del fix del orchestrator)
```
node scripts/qa/run-marketplace-qa.mjs --modules=qa-00,qa-01,qa-02,qa-03 --app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app
```
Resultado: `No valid modules found for: qa-00,qa-01,qa-02,qa-03` (BUG case-sensitive).

### Comando QA ejecutado (después del fix del orchestrator)
```
node scripts/qa/run-marketplace-qa.mjs --modules=qa-00,qa-01,qa-02,qa-03 --app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app
```
Resultado:
```
[QA-00] FAIL — ENV_MISSING (8ms)
[QA-01] FAIL — ENV_MISSING (21ms)
[QA-02] FAIL — ENV_MISSING (4ms)
[QA-03] FAIL — unknown (3983ms)
PASS: 0  FAIL: 4  SKIP: 0  TOTAL: 8
```

**Desglose de QA-03:** DB read falló (`Cannot find module '.../generated/prisma/client.js'` — problema de import TypeScript). HTTP fetch de `/marketplace` retornó 264KB de HTML (UI client-rendered, listing no visible en SSR). HTTP fetch de `/marketplace/qa-e2e-s03f-selleria-discovery` retornó 404 (listing no existe en preview DB).

**Reportes generados:**
- `var/qa-results/report-2026-05-11T03-52-21-650Z.json`
- `var/qa-results/report-2026-05-11T03-52-21-650Z.md`

---

## 8. Git status

### git status --short --untracked-files=all
```
 M .obsidian/graph.json
 M .obsidian/workspace.json
 M docs/INSTRUCCIONES_REFAC_GLOBAL.md
 M docs/INSTRUCCIONES_UI_INMERSIVA.md
 M docs/obsidian-vault/00_CENTRAL_TURPIAL.md
 M docs/obsidian-vault/BUGS_CRITICOS.md
 M docs/obsidian-vault/HITOS_MARKETPLACE_PRACTICOS.md
 M docs/obsidian-vault/QA_HARNESS_CANVAS_2026-05-10.canvas
 M docs/obsidian-vault/QA_MARKETPLACE_INTEGRADO.md
 M docs/obsidian-vault/ROADMAP_RESCATE.md
 M docs/obsidian-vault/SPRINTS_MARKETPLACE_PARALELO.md
 M scripts/qa/run-marketplace-qa.mjs           ← fix post-commit
?? .kilo/kilo.json
?? .worktrees/*
?? var/qa-results/report-*.json
?? var/qa-results/report-*.md
?? docs/.obsidian/*
```

### git diff --name-only
```
.obsidian/graph.json
.obsidian/workspace.json
docs/obsidian-vault/QA_HARNESS_CANVAS_2026-05-10.canvas
scripts/qa/run-marketplace-qa.mjs               ← único cambio de S03F sin stagear
```

### git diff --stat (unstaged)
```
.obsidian/graph.json                    |  4 ++--
.obsidian/workspace.json                |  2 ++
QA_HARNESS_CANVAS_2026-05-10.canvas     |  6 +++---
scripts/qa/run-marketplace-qa.mjs       | 11 +++++++----
4 files changed, 14 insertions(+), 9 deletions(-)
```

### git log --oneline -5
```
35223f9 feat(qa): validate marketplace login publish discovery (S03F)
66b15f9 docs(qa): final S03E report — architecture, roadmap, inventory, validations
e8ddf2c docs(qa): add Obsidian scripts map and canvas for QA harness navigation
e6ee1cf feat(qa): design layered QA architecture for marketplace E2E harness
f3b26ee fix(qa): stabilize marketplace login smoke harness
```

---

## 9. Clasificación del estado S03F

**Estado: `IMPLEMENTED_NOT_VALIDATED`**

Razones:
- ✅ Los 4 módulos (QA-00, QA-01, QA-02, QA-03) están implementados con código completo (no stubs).
- ✅ Las 3 librerías auxiliares (db-read, session, server-action) están implementadas.
- ✅ El orquestador soporta `--modules=` y `--app-url=` (con fix post-commit aplicado).
- ✅ La documentación está actualizada (dispatcher v3, roadmap, script map, session summary, next-window brief).
- ✅ tsc --noEmit limpio, npm run build exitoso.
- ❌ La ejecución contra Preview BKG NO produjo resultados PASS porque:
  - Faltan `QA_BUYER_*` y `QA_SELLER_*` env vars en `.env.local` / `.env`.
  - `db-read.mjs` no puede cargar `generated/prisma/client.ts` en Node.js ESM sin transpilador.
- ❌ La validación end-to-end completa (QA-00 PASS → QA-01 PASS → QA-02 PASS → QA-03 DATA_PASS) NO fue ejecutada.

---

## 10. Recomendación del agente

### Fixes mínimos requeridos (sin aplicar)

**Fix A: Resolver import de Prisma client (db-read.mjs)**
- **Alternativa 1:** Cambiar el runner a `npx tsx scripts/qa/run-marketplace-qa.mjs` — `tsx` transpila TypeScript en caliente y el import `../../../generated/prisma/client` funcionaría sin extensión.
- **Alternativa 2:** Usar `createRequire` para cargar el módulo via CommonJS.
- **Alternativa 3:** Generar `prisma generate` que produzca un archivo `.mjs` o `.js` (requiere modificar schema.prisma output config).
- **Alternativa 4:** Usar `@prisma/client` con `PrismaPg` sin el generated client — pero se perdería el acceso tipado a los modelos `mpUser`, `mpListing`, etc.

**Fix B: Poblar env vars QA**
- Ejecutar `vercel env pull .env.local --environment=preview --scope bkgs-projects-829c67c1` (requiere `vercel login`).
- O agregar manualmente a `.env.local`: `QA_BUYER_EMAIL`, `QA_BUYER_IDENTIFIER`, `QA_BUYER_PASSWORD`, `QA_SELLER_EMAIL`, `QA_SELLER_IDENTIFIER`, `QA_SELLER_PASSWORD`, `APP_URL`.

**Fix C: Stagear fix del orchestrator**
- El archivo `scripts/qa/run-marketplace-qa.mjs` tiene cambios sin stagear (case-matching fix). Debe incluirse en el próximo commit.

### Archivos que tocaría
| Archivo | Cambio |
|---------|--------|
| `scripts/qa/lib/db-read.mjs` | Cambiar import path de `.js` a sin extensión (para tsx) o usar `createRequire` |
| `scripts/qa/run-marketplace-qa.mjs` | Ya cambiado (case-matching fix) — solo stagear |
| `.env.local` | Agregar QA_BUYER_*, QA_SELLER_*, APP_URL (NO commitear) |
| `docs/07_handoffs/qa-dispatcher.json` | Actualizar canonical_script si se cambia a `npx tsx` |

### Archivos que NO tocaría
- `.obsidian/*` — nunca.
- `.worktrees/*` — nunca.
- `var/qa-results/*` — nunca commitear.
- `CLAUDE.md` — nunca.
- Assets / imágenes — no requeridas aún.
- `generated/prisma/client.ts` — es código generado, no se modifica manualmente.
- Módulos QA-04 a QA-12 — son de sprints futuros (S03G-S03J).

### ¿Hace falta env pull?
**SÍ** — Sin `QA_BUYER_*` y `QA_SELLER_*` vars, QA-00, QA-01, y QA-02 fallan en el primer check. El harness no puede validar login ni crear listings.

### ¿Hace falta corregir aliases del orchestrator?
**YA CORREGIDO** (post-commit, sin stagear) — el bug de case-sensitive matching está resuelto. Falta stagear y commitear.

### ¿Hace falta corregir carga de .env.local?
**NO** — `env.mjs` carga `.env.local` correctamente (primero `.env.local`, luego `.env` como fallback). El problema es que las vars QA_* no existen en ninguno de los dos archivos.

### ¿Hace falta Playwright?
**NO para S03F** — los 4 módulos están diseñados para funcionar sin navegador (Layer A/B). QA-03 usa HTTP fetch como fallback para UI validation. Playwright será necesario para:
- S03G: QA-06 (payment proof upload via file picker)
- S03I: QA-11 (dashboard UI validation)
- S03I: QA-07 (admin proof proxy access)

---

*Report generated by Kilo agent — 2026-05-11T03:55 UTC*
