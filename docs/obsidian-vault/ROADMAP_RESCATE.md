---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

Obsidian es la fuente de trazabilidad viva del proyecto. Este archivo refleja el estado operativo real del marketplace al 2026-05-03 (segunda revision) e incorpora los checkpoints P0-B y P0-C aprobados.

## Estado actual real del marketplace (2026-05-03 - segunda revision)

El marketplace ha consolidado su infraestructura visual (P0-A Shell), persistencia de tasas (DB-Rates MVP), disponibilidad por transacción activa (Sprint 3B1), sistema de mensajes con unread badge/focus/mark-as-read diferido (P0-B), y AuthBar sticky (P0-C). Se encuentra funcional bajo un flujo operativo manual validado.

### Checkpoint P0-B aprobado
- **Preview:** `https://turpialsound-6uemfhtej-cerberus77s-projects.vercel.app/marketplace`
- **Rama:** `Marketplace-P0B-chat-unread`
- **Commit:** `c75cc45` fix(marketplace): improve unread chat navigation
- **Mejoras:**
  - AuthBar unread badge navega a messages/focus unread.
  - Dashboard enfoca/abre primer thread unread.
  - TransactionChat ya no marca mensajes como leídos al montar.
  - Mark-as-read se difiere hasta interacción explícita: pointer/wheel/touch o envío.
- **Sin schema, sin pagos, sin WebGL, sin booking.**

### Checkpoint P0-C aprobado
- **Preview:** `https://turpialsound-lvihtqudi-cerberus77s-projects.vercel.app/marketplace`
- **Rama:** `Marketplace-P0C-authbar-sticky`
- **Commit:** `aefac86` fix(marketplace): keep authbar sticky on scroll
- **Fix real:**
  - No fue necesario tocar MarketplaceAuthBar (ya tenía `sticky top-0 z-[70]`).
  - Problema real: `.mp-route-shell` creaba scroll container vertical.
  - Se corrigió `overflow-y: visible; overflow-x: clip` en `styles/globals.css`.
- **QA runtime:** `AUTHBAR_RECT_AFTER_SCROLL.top = 0` — sticky confirmado.
- **Se rechazó** el primer parche con `paddingTop` por página (riesgo de black band / dead space).
- **Sin schema, sin pagos, sin WebGL, sin booking.**

### Checkpoint oficial base anterior
- **Preview oficial:** `https://turpialsound-t18pj01z8-cerberus77s-projects.vercel.app/marketplace`
- **Commits:** `e177170` / `5f00b54` (2026-05-02)

### Prototipo en observación (NO oficial)
- **Preview:** `https://turpialsound-gptrfix08-cerberus77s-projects.vercel.app/marketplace`
- **Regla:** No mezclar prototipo con línea oficial hasta aprobación explícita.

### Hitos completados
- **P0-A UI Shell/Home (Cerrado):** Shell propio del marketplace, AuthBar glassmorphism, Home balanceado y corregida la franja negra superior (MainContentShell).
- **DB-Rates MVP (Cerrado):** Persistencia de tasas BCV/Binance; MpReferenceRateSnapshot y MpBinanceRateSnapshot operativos; transacciones congelan tasa.
- **Sprint 3B1 (Cerrado):** Bloqueo de compra duplicada por transacción activa implementado. Estados bloqueantes y terminales definidos. No se marca SOLD_OUT antes de validación admin.
- **P0-B Chat Unread (Cerrado):** Badge unread, focus unread, mark-as-read diferido implementados y validados en QA manual.
- **P0-C AuthBar Sticky (Cerrado):** AuthBar sticky confirmado en runtime. Fix en `.mp-route-shell` overflow.
- **Admin AI Copilot (Read-only):** Implementado en `/marketplace/admin/copilot`. Acceso restringido a `SUPER`. Herramientas de lectura operativa y BI.
- **Instrumentación Analytics/BI:** Modelos `MpAnalyticsEvent` y `MpBlobObjectMetadata` creados. Endpoints y eventos instrumentados.

### Bloqueos activos
- [ ] **P0-B.2 System Messages:** Diseñar mensajes de sistema en el chat. **NO usar senderId = SYSTEM** porque `MpMessage.senderId` es FK obligatoria a `MpUser`. Requiere diseño: usuario sistema, schema/type, o statusHistory virtual.
- [ ] **Sprint 2 Delivery:** Implementar botones de confirmación de entrega/recepción para el flujo de fondos.
- [ ] **MpPayout Formal:** Registro y cierre de pagos a vendedores en base a tasas congeladas.

### Pendientes posteriores (Nivel 2)
- [ ] QA visual rápida de P0-C en todas las rutas marketplace.
- [ ] Decidir si crear PR desde `Marketplace-P0C-authbar-sticky`.
- [ ] Automatización de acciones de escritura (requiere confirmación UI).
- [ ] Tráfico/bandwidth real (requiere Vercel Observability).
- [ ] Módulo financiero/P&L.
- [ ] Orquestador Oreshnik.

## Reglas de oro
- No tocar `booking` ni `/reservas`.
- No implementar nuevas migraciones sin aprobación explícita.
- No tocar `paymentProofUrl` ni proxy `SUPER`.
- Si un objetivo no está en `docs/07_handoffs/qa-dispatcher.json`, reportar `GAP OPERATIVO` y no improvisar.
- No continuar WebGL wave ahora. No mezclar con otros sprints.
- No usar Gemini como ejecutor visual fino.
- Codex 5.5 reservado para DB/schema/Prisma/pagos/payouts.
