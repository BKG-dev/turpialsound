# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-03 (segunda revision)
**Frente activo:** Marketplace (P0-B.2 System Messages / Sprint 2 Delivery)
**Tipo de nota:** Checkpoint operativo para siguiente ventana
**Estado de sincronización:** P0-A Shell/Home, DB-Rates MVP, Sprint 3B1, P0-B Chat Unread, P0-C AuthBar Sticky — TODOS CERRADOS.

---

## Checkpoint oficial vigente

**Preview P0-B aprobado:** `https://turpialsound-6uemfhtej-cerberus77s-projects.vercel.app/marketplace`
- Commit: `c75cc45` fix(marketplace): improve unread chat navigation (rama `Marketplace-P0B-chat-unread`)
- Estado: unread badge, focus unread, mark-as-read diferido aprobados en QA manual.

**Preview P0-C aprobado:** `https://turpialsound-lvihtqudi-cerberus77s-projects.vercel.app/marketplace`
- Commit: `aefac86` fix(marketplace): keep authbar sticky on scroll (rama `Marketplace-P0C-authbar-sticky`)
- Estado: AuthBar sticky confirmado en runtime (`top = 0` después de scroll).
- Causa real: `.mp-route-shell` creaba scroll container vertical. Fix: `overflow-y: visible; overflow-x: clip` en `styles/globals.css`.

**Checkpoint base anterior:**
- `e177170` / `5f00b54` (2026-05-02) — AuthBar, Home, StatBar, badges compactos, toggle alineado.

**Prototipo en observación (NO oficial):** `https://turpialsound-gptrfix08-cerberus77s-projects.vercel.app/marketplace`
- Preservado como candidato visual, no como base principal.
- No mezclar con línea oficial hasta aprobación explícita.

## Estado resumido

Se ha consolidado el Shell propio del marketplace, la persistencia de tasas (BCV/Binance), la disponibilidad por transacción activa (Sprint 3B1), el sistema de mensajes con unread badge/focus/mark-as-read diferido (P0-B), y el AuthBar sticky (P0-C). El marketplace es visualmente consistente en dark/light mode y funcionalmente estable.

## Bloqueos activos
- Pendiente: Sprint P0-B.2 system messages — requiere diseño porque `MpMessage.senderId` es FK obligatoria a `MpUser`. No usar `senderId = SYSTEM`.
- Alto: Falta flujo de confirmación de entrega ("Ya recibí" / "Ya entregué") para liberar fondos (Sprint 2 Delivery).
- Pendiente: Diagnóstico de transacciones legacy con tasas pendientes.
- Pendiente: Formalización de MpPayout y cierre contable final.

## Resuelto (Hitos clave)
- **UI Shell P0-A:** Marketplace tiene navegación propia; navbar global oculto; MainContentShell corregido.
- **DB-Rates MVP:** Snapshots de tasas persistidos; transacciones congelan tasa al crear.
- **Sprint 3B1:** Bloqueo de compra duplicada por transacción activa implementado.
- **P0-B Chat Unread:** Badge unread, focus unread, mark-as-read diferido implementados y validados.
- **P0-C AuthBar Sticky:** AuthBar sticky confirmado en runtime. Fix en `.mp-route-shell` overflow.
- **Polish Visual:** AuthBar glassmorphism; avatar asistente contrastado; hero balanceado.
- **Validaciones:** Build y TSC limpios.

## Reglas metodológicas reforzadas
- No continuar WebGL wave ahora. No mezclar con otros sprints.
- No usar Gemini como ejecutor visual fino.
- Codex 5.5 reservado para DB/schema/Prisma/pagos/payouts.
- Para docs/auditoría usar Gemini Flash, DeepSeek V4 Flash o KAT.
- Para UI/código moderado usar KAT-Coder-Pro V2 antes que Codex.
- No producción, no booking, no /reservas, no schema sin sprint explícito.

## Siguiente accion exacta

### Paso 1 (inmediato): QA visual rápida de P0-C
Verificar AuthBar sticky en:
- `/marketplace`
- `/marketplace/[slug]`
- `/marketplace/dashboard`
- `/marketplace/admin`
- mobile
- checkout/chat/modals

### Paso 2: Decidir si crear PR desde `Marketplace-P0C-authbar-sticky`

### Paso 3 (diseño): Sprint P0-B.2 System Messages
- NO usar `senderId = SYSTEM` porque `MpMessage.senderId` es FK obligatoria a `MpUser`.
- Requiere diseño: usuario sistema, schema/type, o statusHistory virtual.
- No implementar sin diseño previo.

### Paso 4 (posterior): Sprint 2 Delivery
- Botones "Ya entregué" (Seller) y "Ya recibí" (Buyer).
- Estado "Esperando conformidad" después de pago validado.
- "Fondos por liberar" cuando buyer confirma recepción.
- Admin solo ejecuta/registra pago al vendedor.

### Paso 5 (high-risk separado): Rates/Payout/Closure
Codex-only. No mezclar con sprints normales.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/obsidian-vault/ROADMAP_RESCATE.md

Confirma el cierre de P0-A, DB-Rates, Sprint 3B1, P0-B y P0-C.
Confirma los checkpoints P0-B (turpialsound-6uemfhtej) y P0-C (turpialsound-lvihtqudi).
Inicia QA visual rápida de P0-C en todas las rutas marketplace.
Decide si crear PR desde Marketplace-P0C-authbar-sticky.
No toques booking ni /reservas.
No toques schema sin autorización explícita.
```

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
