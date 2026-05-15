---
type: session-starter
project: "Turpial Sound"
fecha: 2026-05-14
actualizado: "2026-05-14T13:46-04:00"
para: "Jean Arteaga y Manuel Vera — proxima sesion Kilo"
metodologia: "Oreshnik + Bus de Control Nivel 2.5"
mother_branch: "integration/today-reservas-marketplace-stable-2026-05-07"
mother_head: "84e15d4"
---

# 🟢 INSTRUCCION DE APERTURA DE SESION — AMBOS OPERADORES

> **LEER PRIMERO:** [[00_CENTRAL_TURPIAL]] — Fuente unica de verdad.
> **Metodologia:** [[METODOLOGIA_ORESHNIK_ANEXO]]
> **Canvas:** [[FLUJO_PROTOCOLO_TRABAJO]]

---

## 🚨 SITUACION ACTUAL (2026-05-14 13:46 VET)

**RECONCILIACION COMPLETADA.** Madre y ramas hijas sincronizadas.

| Rama | HEAD | Estado |
|------|------|--------|
| **Madre** `integration/today-reservas-marketplace-stable-2026-05-07` | `84e15d4` | ✅ Actualizada |
| `Manuel/s-rev-01-reviews-ratings-full-e2e` | `84e15d4` | ✅ Sincronizada con madre |

### Sprints cerrados hoy por Manuel

| Sprint | Descripcion | Rama |
|--------|-------------|------|
| S15 | Location filters + listing modal + inventory | `Manuel/s15-location-filters-2026-05-14` |
| S16 | Notifications + chat + system messages | `Manuel/s16-notifications-chat-2026-05-14` |
| S18 | Full regression browser (25 PASS, 0 FAIL) | `Manuel/s18-full-regression-browser-2026-05-14` |
| S20 | SEO/AEO audit (10 paginas) | `Manuel/s20-seo-aeo-audit-2026-05-14` |
| S-MK-02 | KPI dashboard (8 metricas) | `Manuel/s-mk-02-kpi-dashboard-2026-05-14` |
| S-MK-04/05/06 | RRSS + Marketing (APIs + calendario + plan) | `Manuel/s-mk-04-05-06-rrss-marketing-2026-05-14` |
| S-REV-01 | Ratings, reviews + Full E2E + payout export | `Manuel/s-rev-01-reviews-ratings-full-e2e-2026-05-14` |

### Pendiente Jean

| Sprint | Descripcion |
|--------|-------------|
| S-JB-01 | Booking fixes (multiple, cantidad, WhatsApp) |
| S-JB-02 | Dashboard de reservas |
| S-JB-03 | Tasas horarias, sitemap, Vercel docs |
| S21 | Production release gate |

---

## 👤 JEAN — TUS INSTRUCCIONES

```
1. Sincronizate con la madre:
   git fetch origin --prune
   git checkout integration/today-reservas-marketplace-stable-2026-05-07
   git pull origin integration/today-reservas-marketplace-stable-2026-05-07

2. Verifica el estado:
   Abri docs/obsidian-vault/00_CENTRAL_TURPIAL.md → last_updated: 2026-05-14T13:46
   Abri docs/obsidian-vault/INSTRUCCION_APERTURA_SESION.md → este archivo

3. Crea tu rama para S-JB-01:
   git checkout -b Jean/s-jb-01-booking-fixes-2026-05-14

4. S-JB-01 tareas:
   - Seleccion multiple de servicios en /reservas
   - Campo cantidad de temas en produccion musical
   - Eliminar cargos inaplicables (tecnico de sonido, backline)
   - WhatsApp: fecha y hora en confirmacion

5. Zona exclusiva tuya: /reservas, components/bookings/, lib/bookings/

6. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   SI FALLA → no pushear, corregir primero

7. Al cerrar el sprint, avisame para hacer merge a madre.
```

---

## 👤 MANUEL — TUS INSTRUCCIONES

```
1. Estas en la rama correcta. Verifica:
   git branch --show-current
   # Debe mostrar: Manuel/s-rev-01-reviews-ratings-full-e2e-2026-05-14
   # O: integration/today-reservas-marketplace-stable-2026-05-07

2. Estado actual: S-REV-01 cerrado. Madre actualizada.
   Proximo sprint disponible: S-UX-01 (UI/UX) o esperar a Jean.

3. ANTES DE CADA PUSH:
   npx tsc --noEmit && pnpm run build
   git diff --check
   git diff --name-only HEAD~1..HEAD | grep ".env" && echo "SECRETS!" && return

4. Verificar Vercel preview despues de push:
   npx vercel list | head -3

5. Tareas fisicas pendientes:
   - S-ADM-01: Verificar estado legal
   - S-ADM-04: Plan de despliegue CDA (viernes 15 mayo 11AM)
```

---

## 🤝 SINCRONIZACION — REGLA DE ORO

**Al abrir sesion, AMBOS ejecutan:**

```bash
git fetch origin --prune
git checkout integration/today-reservas-marketplace-stable-2026-05-07
git pull origin integration/today-reservas-marketplace-stable-2026-05-07
```

**Verificar que ambos ven lo mismo:**

```bash
git log origin/integration/today-reservas-marketplace-stable-2026-05-07 --oneline -3
Select-String "last_updated" docs/obsidian-vault/00_CENTRAL_TURPIAL.md
```

**⚠️ OBSIDIAN: Cerrar con la X antes de git checkout/pull/push. Si no se cierra, Obsidian sobreescribe los archivos con su versión cacheada. Al reabrir, Ctrl+R para refrescar. El preflight restaura automáticamente si detecta sobreescritura.**

```bash
git checkout HEAD -- docs/obsidian-vault/
```

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

**Viernes 15 mayo 2026 — 11:00 AM VET** — Despliegue en La Casa del Artista:
- Manuel: prepara guia de usuario y plan de despliegue
- Capacitacion equipo CDA
- Configurar dispositivos (Gmail, calendario, notificaciones)
- Actualizar Instagram (@turpialsound, BIO de Fran)
- WhatsApp Business: actualizar tienda/store

---

> **Fuente de verdad:** [[00_CENTRAL_TURPIAL]] | **Metodologia:** [[METODOLOGIA_ORESHNIK_ANEXO]]
