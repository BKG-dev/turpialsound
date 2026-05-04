# Sprint 2A — Delivery/Receipt Flow Safeguards
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
