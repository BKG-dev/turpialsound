---
type: session-starter
project: "Turpial Sound"
fecha: 2026-05-14
para: "Jean Arteaga y Manuel Vera — proxima sesion Kilo"
metodologia: "Oreshnik + Bus de Control Nivel 2.5"
mother_branch: "integration/today-reservas-marketplace-stable-2026-05-07"
---

# 🟢 INSTRUCCION DE APERTURA DE SESION — AMBOS OPERADORES

> **LEE PRIMERO:** [[00_CENTRAL_TURPIAL]] — Estado actual completo.
> **SI HAY CONFLICTO:** Este documento manda sobre cualquier otro.

---

## 🚨 SITUACION ACTUAL (2026-05-14 00:02 VET)

HAY DOS RAMAS DE INTEGRACION DIVERGENTES QUE DEBEN UNIFICARSE ANTES DE CUALQUIER OTRA COSA.

| Rama | Operador | Contiene |
|------|----------|----------|
| `Manuel/integration-s12-s14b-marketplace-closure-2026-05-13` | Manuel | S12, S13, S14, S14B, BCV, metodologia, QA |
| `integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13` | Jean | Booking fixes, performance, a11y, AEO, WhatsApp lab |
| **RAMA MADRE** | — | `integration/today-reservas-marketplace-stable-2026-05-07` |

**⚠️ NADIE hace nada hasta que las ramas esten unificadas en la rama madre.**

---

# 👤 JEAN — TUS INSTRUCCIONES

Copia y pega esto al abrir tu sesion:

```
SOY JEAN (BKG-dev). Mi tarea es reconciliar las ramas de integracion.

1. Haz fetch de todo:
   git fetch origin --prune

2. Verifica que existen estas ramas:
   git branch -r | grep "Manuel/integration-s12-s14b"
   git branch -r | grep "integration/preserve-dashboard-cwv-aeo-reservas"

3. Crea la rama unificada desde la madre:
   git checkout integration/today-reservas-marketplace-stable-2026-05-07
   git checkout -b integration/unified-2026-05-14

4. Mergea el trabajo de Manuel:
   git merge origin/Manuel/integration-s12-s14b-marketplace-closure-2026-05-13

5. Mergea mi trabajo:
   git merge origin/integration/preserve-dashboard-cwv-aeo-reservas-2026-05-13

6. SI HAY CONFLICTOS:
   - actions/marketplace/auth.ts → conservar auth de marketplace de Manuel + cambios de booking
   - app/admin/page.tsx → conservar admin dashboard de Jean + no romper rutas marketplace
   - .env.example → merge manual, NO exponer secrets
   - next.config.mjs → conservar config de build de ambos
   - docs/ → aceptar ambos (no deberian tener conflictos reales)

7. Resuelve conflictos, COMMITEA el merge.

8. VALIDACION PRE-MERGE (NO SALTAR):
   git diff --check
   npx tsc --noEmit
   pnpm build

9. SI LAS TRES PASAN → mergea a madre:
   git checkout integration/today-reservas-marketplace-stable-2026-05-07
   git merge integration/unified-2026-05-14
   git push origin integration/today-reservas-marketplace-stable-2026-05-07

10. NOTIFICA A MANUEL que la rama madre esta lista para smoke.

11. Smoke rapido en Preview de Vercel:
    - / → carga
    - /marketplace → listings visibles
    - /reservas → funcional
    - /api/bcv-rate → JSON valido

12. SI ALGO FALLA → NO mergear a main. Reportar el fallo exacto.
    SI TODO PASA → esperar confirmacion de Manuel antes de merge a main.
```

---

# 👤 MANUEL — TUS INSTRUCCIONES

Copia y pega esto al abrir tu sesion:

```
SOY MANUEL (Manuel Vera). Mi tarea es validar el marketplace despues de la reconciliacion.

1. REVISA si Jean ya hizo el merge de reconciliacion:
   git fetch origin
   git log origin/integration/today-reservas-marketplace-stable-2026-05-07 --oneline -5

2. SI JEAN NO HA MERGEADO → espera. No toques nada.
   Puedes avanzar S-ADM-01 (verificar estado legal, tarea fisica) mientras tanto.

3. SI JEAN YA MERGEO → pull de la madre unificada:
   git checkout integration/today-reservas-marketplace-stable-2026-05-07
   git pull origin integration/today-reservas-marketplace-stable-2026-05-07

4. EJECUTA VALIDACION DE MARKETPLACE (en este orden):
   # Preflight
   npx tsx scripts/qa/run-marketplace-qa.mjs --module=QA-00
   
   # Login server-side
   npx tsx scripts/qa/run-marketplace-qa.mjs --module=QA-01
   
   # Discovery publico
   npx tsx scripts/qa/run-marketplace-qa.mjs --module=QA-03
   
   # Login UI smoke (Playwright)
   npx tsx scripts/qa/playwright/s11-login-smoke.spec.mjs
   
   # Purchase flow
   npx tsx scripts/qa/playwright/s12-purchase-flow.spec.mjs
   
   # Proof upload
   npx tsx scripts/qa/playwright/s13-proof-upload.spec.mjs

5. SI TODO PASA → notifica a Jean: "MARKETPLACE OK, puedes mergear a main".
   SI ALGO FALLA → reporta el FAIL exacto a Jean. NO mergear a main.

6. DESPUES DE MERGE A MAIN → ejecuta smoke post-produccion:
   Verifica en turpialsound.com: /marketplace, login, compra.

7. LUEGO continua con:
   - S-ADM-04: preparar plan de despliegue CDA (viernes 15 mayo 11AM)
   - S-ADM-01: verificar estado legal de la entidad
```

---

## 🛑 QUE HACER SI ALGO SALE MAL

| Problema | Accion |
|----------|--------|
| `git merge` tiene conflictos que no se resuelven | Jean y Manuel coordinan por telefono/chat. NO improvisar. |
| `npx tsc --noEmit` falla | Arreglar tipos ANTES de merge a madre. No seguir sin esto. |
| `pnpm build` falla | Arreglar build ANTES de merge. Puede ser dependencia o import roto. |
| Smoke de `/marketplace` da vacio | Verificar DB target. Ejecutar `npx tsx scripts/qa/modules/qa-02-publish.mjs` para asegurar listings ACTIVE. |
| Smoke de `/reservas` falla | PARAR. Jean revisa. No mergear a main. |
| `CRON_SECRET` falta en Vercel | Jean configura en Vercel dashboard: `CRON_SECRET` + `BCV_FALLBACK_RATE`. |
| Deploy a main rompe algo | Rollback: `git checkout main && git reset --hard <commit-anterior> && git push --force origin main`. Luego redeploy en Vercel. |

---

## 📋 METODOLOGIA COMPROMETIDA — REGLAS QUE AMBOS DEBEN SEGUIR

1. **UNA rama madre:** `integration/today-reservas-marketplace-stable-2026-05-07`. No se crean otras.
2. **Merge a madre SOLO por Jean.** Manuel valida, Jean mergea.
3. **NADIE despliega directo a produccion.** Todo va madre → validacion → main → Vercel.
4. **Schema/prisma = lock doble.** Los dos deben acordar antes de tocar `schema.prisma`.
5. **/reservas = zona exclusiva Jean.** Manuel no toca.
6. **Prefijo de sprint en cada commit:** `qa(s12):`, `feat(s14b):`, `fix(s-jb-01):`.
7. **00_CENTRAL_TURPIAL.md se actualiza al cerrar cada sprint.** Es la fuente unica de verdad.
8. **INSTRUCCION_APERTURA_SESION.md se lee al inicio de CADA sesion.** Sin excepcion.

---

## 🚀 VERIFICACION DE DEPLOY EN VERCEL (AMBOS)

Al pushear cualquier rama `Manuel/*` o `Jean/*`, Vercel auto-despliega a Preview. PERO GitHub puede mostrar "Deployment failed" aunque el deploy este OK (problema de integracion GitHub↔Vercel). Para NO depender de GitHub:

```bash
# Ver los ultimos 10 deploys y su estado
npx vercel list

# Inspeccionar el deploy mas reciente (build log)
npx vercel inspect <url-del-deploy> --logs

# Ver logs en tiempo real
npx vercel logs <url-del-deploy>
```

**Si un deploy falla REALMENTE, Jean debe:**
1. Ir a Vercel Dashboard → Settings → Notifications → agregar email de ambos
2. O agregar Slack/Discord webhook para alertas instantaneas
3. Verificar que `vercel.json` no tenga errores de config

**Sobre el cron job (`/api/cron/refresh-bcv-rate`):**
- Corre cada 30 min en Vercel (requiere plan Pro o superior)
- No requiere `CRON_SECRET` para funcionar (es opcional)
- Si esta en plan Hobby, el cron simplemente no se ejecuta (no rompe nada)
- Para habilitar: Jean configura `CRON_SECRET` en Vercel env vars

---

## 📅 PROXIMO HITO: Viernes 15 mayo 2026 — 11:00 AM VET

**Deploy de la plataforma en La Casa del Artista (S-ADM-04):**
- Manuel prepara guia de usuario y plan de despliegue
- Capacitacion del equipo de CDA
- Configuracion de dispositivos (Gmail, calendario, notificaciones)
- Actualizar Instagram (@turpialsound, BIO de Fran)
- WhatsApp Business: actualizar tienda/store

---

> **Fuente de verdad:** [[00_CENTRAL_TURPIAL]] | **Plan:** [[PLAN_MAESTRO_SPRINTS_2026-05-12]]
