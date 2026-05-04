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

---

## Checkpoint Sprint 2A — Delivery/Receipt Flow Safeguards

Fecha: 2026-05-04
Rama: `Marketplace-Sprint2A-delivery-receipt`
Commit funcional: `e316152 fix(marketplace): add delivery receipt flow safeguards`
Preview validado: `https://turpialsound-96yquflue-cerberus77s-projects.vercel.app/marketplace`

### Estado

Sprint 2A queda cerrado funcionalmente como hardening mínimo del flujo delivery/receipt, sin schema migration.

### Alcance ejecutado

- `releaseEscrow()` ya no permite liberar fondos desde `IN_ESCROW`.
- `adminReleaseEscrow()` ya no permite liberar fondos desde `IN_ESCROW`.
- Admin solo puede liberar/marcar fondos cuando la transacción está en `DELIVERY_CONFIRMED`.
- Se agregó `sellerDeliver(transactionId)` sin schema migration.
  - El seller puede marcar “Ya entregué”.
  - No cambia el status principal.
  - Registra evento en `MpTransactionStatusHistory.metadata`.
- Buyer puede usar “Ya recibí el artículo”.
  - Usa el backend existente `confirmDelivery()`.
  - Al confirmar, el flujo pasa a `DELIVERY_CONFIRMED`.
- Labels operativos ajustados:
  - `IN_ESCROW` → “Esperando conformidad”.
  - `DELIVERY_CONFIRMED` → “Fondos por liberar”.
  - `RELEASED` → “Operación cerrada”.

### Archivos modificados en el commit funcional

- `actions/marketplace.ts`
- `actions/marketplace/admin.ts`
- `actions/marketplace/transactions.ts`
- `components/marketplace/admin/AdminDashboard.tsx`
- `components/marketplace/dashboard/DashboardClient.tsx`

### Validaciones pasadas antes del commit funcional

- `git diff --check`: OK, solo warnings LF/CRLF conocidos.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- Next build: 33 páginas generadas.
- Preview manual Vercel creado sin producción.

### Límites respetados

- No se tocó `main`.
- No se tocó producción.
- No se tocó `Marketplace-Pure`.
- No se tocó booking.
- No se tocó `/reservas`.
- No se tocó schema.
- No se crearon migraciones.
- No se tocó rates/BCV/Binance.
- No se tocó payout formal.
- No se tocó `paymentProofUrl` ni proxy SUPER.

### Resultado QA manual

El flujo funcional opera completo:

1. Admin valida pago → transacción queda en `IN_ESCROW` / “Esperando conformidad”.
2. Seller puede marcar “Ya entregué” sin cambiar el estado principal.
3. Buyer confirma “Ya recibí” → transacción pasa a `DELIVERY_CONFIRMED` / “Fondos por liberar”.
4. Admin puede continuar el cierre/liberación solo desde `DELIVERY_CONFIRMED`.

### Observaciones QA pendientes

Estas observaciones NO bloquean el cierre funcional de Sprint 2A, pero deben quedar en cola:

1. Los badges de mensajes indican mensajes/no leídos pero no siempre son accionables.
2. El modal de detalle de transacción en desktop sigue usando layout tipo móvil, desperdicia viewport y obliga scroll innecesario.
3. Sigue apareciendo “Pendiente de tasa de pago”; corresponde al sprint de rates/tasa.
4. La línea de estado/timeline necesita acompañamiento visual claro para mostrar paso actual, pasos completados y próximo paso.
5. La UI puede requerir refresh/cierre-reapertura para reflejar algunos cambios de estado en todos los paneles.
6. Seller “Ya entregué” no debe ser prerequisito duro para buyer “Ya recibí”; buyer confirmation es la transición importante hacia `DELIVERY_CONFIRMED`.

### Próximos sprints recomendados

1. Sprint 2A.1 — Stabilization:
   - sincronización visual inmediata después de acciones;
   - badges de mensajes accionables;
   - feedback contextual por rol;
   - evitar confusión entre seller delivery y buyer receipt.

2. Sprint UX-TX-Detail:
   - refactor desktop del modal de transacción;
   - layout amplio real;
   - timeline/stepper con jerarquía visual útil;
   - “qué pasa ahora” más claro y accionable.

3. Sprint 3 — Rates/Tasa:
   - diagnosticar y corregir “Pendiente de tasa de pago”;
   - revisar freeze rate, fallback, transacciones antiguas y cálculo visible.

### Nota para integración Jean

Integrar desde rama `Marketplace-Sprint2A-delivery-receipt`, commit funcional `e316152`, hacia la rama de integración que Jean defina. No llevar directo a producción sin QA adicional. No mezclar con booking, `/reservas`, schema, rates ni payout formal.
