---
tags: ["#central", "#status/live-source", "#negocio"]
fecha: 2026-05-10
---

# Estado Actual del Negocio — Turpial Sound

## Resumen ejecutivo

Turpial Sound es una plataforma dual: **booking de salas de ensayo** y **marketplace de compra/venta de equipos y servicios musicales**. Opera sobre Next.js + Vercel + Neon PostgreSQL, con dominio `turpialsound.com`.

Dos areas de negocio coexisten en el mismo repo pero deben mantenerse aisladas operativamente.

---

## Que esta en produccion

| Area | Estado | Responsable |
|------|--------|-------------|
| Booking (`/reservas`) | **Activo en produccion** | Jean |
| Marketplace (`/marketplace`) | **No en produccion** — solo preview | Manuel |
| Vercel project BKG `turpialsound` | **Configurado** — aliases `www.turpialsound.com`, `turpialsound.com`, `turpialsound.vercel.app` | Jean |
| Preview env para `Manuel/*` | **Resuelto** — DATABASE_URL, DIRECT_URL, MP_JWT_SECRET, Blob/payment proof envs presentes | Jean / Manuel |
| BCV / tasas | **Produccion devuelve tasa fresca** | Jean (infra) / Manuel (marketplace rates) |

---

## Que NO esta en produccion

| Area | Estado | Bloqueante |
|------|--------|------------|
| Marketplace runtime completo | Solo preview | Falta QA integral, release gate de Jean |
| Payout automático a sellers | No implementado | Requiere sprint S06 |
| Pasarelas Mercantil / Binance Pay | Diferido | Pendiente de credenciales y decision |
| Rotacion de secretos expuestos | **Pendiente** | Debe ejecutarse antes de inauguracion |
| Discovery / SEO publico marketplace | Parcial | Sprint S09 |

---

## Areas de negocio

### 1. Booking / Reservas

- **Owner:** Jean
- **Zona:** `/reservas`, todo el sistema de booking, pagos de reservas, admin de salas
- **Estado:** Produccion activa, congelado como zona sana
- **Regla:** Marketplace no toca booking. Booking no toca marketplace.
- **Modelos DB:** Propios del sistema de reservas, sin prefijo `Mp`/`mp_`

### 2. Marketplace

- **Owner:** Manuel
- **Zona:** `/marketplace`, `Mp*` / `mp_*` en schema y DB
- **Estado:** Preview funcional, no en produccion
- **Flujo de negocio:**
  1. Seller publica listing con fotos, precio, metodos de pago
  2. Buyer descubre listings, contacta via chat/Q&A, inicia compra
  3. Buyer reporta pago manual con comprobante
  4. Admin revisa comprobante en `/ops/payment-review`
  5. Admin aprueba → listing pasa a `SOLD_OUT`, transaccion a `IN_ESCROW`
  6. Seller entrega → buyer confirma recepcion → fondos liberables
  7. Admin ejecuta payout al seller (manual por ahora)
- **Modelos DB:** Todos prefijados `Mp`/`mp_` para evitar colision con booking

---

## Infraestructura actual

### Vercel

- **Proyecto BKG:** `turpialsound` (team `bkgs-projects-829c67c1`)
- **Aliases produccion:** `www.turpialsound.com`, `turpialsound.com`, `turpialsound.vercel.app`
- **Preview envs para `Manuel/*`:** Resueltos — DB, JWT, Blob funcionales
- **Regla:** Solo Jean modifica Vercel envs. Manuel puede crear previews desde sus ramas.

### Base de datos

- **Proveedor:** Neon PostgreSQL
- **Regla de conexion:**
  - `DATABASE_URL`: pooled/pooler
  - `DIRECT_URL`: direct/no-pooler
  - Ambas al mismo proyecto/base
- **Modelos marketplace:** Prefijo `Mp`/`mp_` en schema y tablas
- **Migraciones:** Solo Jean ejecuta migraciones

---

## Estrategia de ramas actual

### Rama madre operativa

- **Branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **HEAD:** `525602c`
- **Base anterior:** `integration/today-reservas-marketplace-stable-2026-05-07` (commit `c01ec60`) — **obsoleta**

### Flujo de trabajo

1. `Manuel/*` ramas parten de la madre operativa
2. Manuel desarrolla, QA en preview, commitea
3. Jean revisa y mergea a integracion/mother
4. Jean controla release a produccion
5. Nadie commitea directo sobre la madre

### Metodologia activa

- **Oreshnik-Codex 2.0:** 1 rama madre, N worktrees, N agentes, 1 owner por lock, 1 commit/push por sprint cerrado
- Cero trabajo directo sobre madre
- Cero `main`
- Cero produccion sin release gate

---

## Riesgos activos

| Riesgo | Severidad | Estado |
|--------|-----------|--------|
| Secretos expuestos durante setup de preview | **CRITICO** | Rotar antes de inauguracion |
| Marketplace discovery Prisma query en deploy productivo | **ALTO** | Validar en preview antes de cualquier release |
| Deploy productivo desde branch no verificado | **ALTO** | Prohibido sin release gate de Jean |
| Booking `/reservas` modificado accidentalmente | **ALTO** | Zona congelada, solo Jean |
| Preview DB/JWT degradacion silenciosa | **MEDIO** | Verificar periodicamente |
| `main` desincronizado de rama madre operativa | **MEDIO** | Documentado, no usar `main` como base |

---

## Que necesita QA antes de launch

1. **Smoke de preview autonomo** (S01): Manuel despliega preview limpio desde `Manuel/*` con DB/JWT/Blob
2. **Discovery stabilization** (S02): Eliminar riesgo Prisma query en marketplace discovery
3. **Auth/Login QA closure** (S03): Roles buyerIA/sellerIA/admin correctos en preview
4. **Protected payment proof E2E** (S04): Comprobantes sensibles protegidos, accesibles solo por SUPER
5. **Buyer/seller delivery flow** (S05): Confirmacion de entrega/recepcion
6. **Admin payout** (S06): Registro formal de pago a vendedor
7. **Rates hardening** (S07): Tasas, calculos, comisiones verificados
8. **UX / Action Center** (S08): Dashboards con acciones claras
9. **SEO/AEO publico** (S09): Discoverability, filtros, sitemap
10. **Launch readiness / security rotation** (S10): Rotar secretos, release checklist, gate de Jean

---

## Lo que NO se toca

- `/reservas` y todo el runtime de booking
- `main` como base de trabajo
- Produccion sin release gate explicito
- Schema/Prisma/migraciones sin sprint de arquitectura y lock de Jean
- Secretos en texto plano en docs
- Envs de Vercel sin Jean

---

## Lo que Manuel puede hacer solo

- Crear ramas `Manuel/*` desde la madre operativa
- Crear previews en BKG Vercel
- Ejecutar QA scripts canonicos desde `docs/07_handoffs/qa-dispatcher.json`
- Desarrollar y probar marketplace runtime en preview
- Actualizar docs en `docs/obsidian-vault/`, `docs/07_handoffs/`, `docs/marketplace/`

## Lo que requiere Jean

- Merge a rama madre/integracion
- Deploy a produccion
- Modificar Vercel envs
- Ejecutar migraciones Prisma
- Modificar schema DB
- Rotar credenciales/secrets en produccion
- Tocar booking/reservas
