# Session Summary - Activa

> Fecha de ultima actualizacion: 2026-05-03 (segunda revision)
> Tipo de nota: Checkpoint documental con P0-B y P0-C aprobados
> Fuente principal: `docs/99_prompts/marketplace-docs-p0b-p0c-checkpoint.md`

---

## Checkpoint oficial vigente

**Preview oficial/confiable aprobado:**
https://turpialsound-6uemfhtej-cerberus77s-projects.vercel.app/marketplace (P0-B)

https://turpialsound-lvihtqudi-cerberus77s-projects.vercel.app/marketplace (P0-C)

- Deployment P0-B: `turpialsound-6uemfhtej-cerberus77s-projects.vercel.app`
- Deployment P0-C: `turpialsound-lvihtqudi-cerberus77s-projects.vercel.app`
- Target: preview
- Status: Ready

Commits del checkpoint P0-B:
- `c75cc45` fix(marketplace): improve unread chat navigation (rama `Marketplace-P0B-chat-unread`)

Commits del checkpoint P0-C:
- `aefac86` fix(marketplace): keep authbar sticky on scroll (rama `Marketplace-P0C-authbar-sticky`)

Checkpoint base anterior:
- `e177170` docs(marketplace): record authbar shell polish checkpoint (2026-05-02)
- `5f00b54` fix(marketplace): refine authbar and home shell polish (2026-05-02)

### Estado visual/funcional P0-B aprobado
- AuthBar unread badge navega a messages/focus unread.
- Dashboard enfoca/abre primer thread unread automáticamente con `focus=unread`.
- TransactionChat ya no marca mensajes como leídos al montar (mark-as-read diferido).
- Mark-as-read se dispara solo con interacción explícita: pointer/wheel/touch o envío de mensaje.
- Sin schema, sin pagos, sin WebGL, sin booking.

### Estado visual/funcional P0-C aprobado
- AuthBar queda sticky arriba durante scroll en todas las rutas marketplace.
- El problema real no era MarketplaceAuthBar (ya tenía `sticky top-0 z-[70]`).
- Causa real: `.mp-route-shell` generaba scroll container vertical (`overflowX hidden` / `overflowY auto`).
- Fix aplicado en `styles/globals.css`: `overflow-y: visible; overflow-x: clip` en `.mp-route-shell`.
- QA runtime confirma `AUTHBAR_RECT_AFTER_SCROLL.top = 0` después de scroll.
- Se rechazó el primer parche con `paddingTop` por página porque podía recrear black band / dead space.
- Sin schema, sin pagos, sin WebGL, sin booking.

## Prototipo en observación

Existe un preview/prototipo NO oficial:
https://turpialsound-gptrfix08-cerberus77s-projects.vercel.app/marketplace

**Regla documental:**
- NO tratar `gptrfix08` como oficial.
- NO mezclarlo con el checkpoint oficial.
- Queda documentado como prototipo visual en observación.
- Si existe stash asociado, debe conservarse como candidato, no como base principal.

**Mensaje operativo:**
"El estado oficial sigue siendo `t18pj01z8`. El prototipo `gptrfix08` queda preservado/en observación y no debe contaminar la línea oficial hasta aprobación explícita."

## Regla crítica sobre WebGL wave

La exploración de la onda WebGL fue problemática y generó loop.

**Regla:**
- No continuar la onda ahora.
- No mezclar WebGL wave con otros sprints.
- Si se retoma, debe ser sprint visual separado.
- Primero debe haber captura/base clara y aprobación visual.
- No usar Gemini como ejecutor visual fino.
- Preferir script manual controlado por GPT o KAT-Coder-Pro V2 si se necesita agente.
- Codex solo si el bloqueo visual es importante y otros fallan.

## Estado real actual del proyecto (2026-05-03 - segunda revision)

El marketplace ha consolidado su shell propio, persistencia de tasas, bloqueo de compra duplicada, el sistema de mensajes con unread badge/focus/mark-as-read diferido, y el AuthBar sticky. Los checkpoints P0-B y P0-C están implementados, pusheados y validados en preview.

### Sprint "P0-A UI Shell/Home" - CERRADO
- **Shell Propio:** El marketplace ahora oculta el navbar global de Turpial Sound.
- **MainContentShell:** Implementado para manejar paddings route-aware (marketplace usa `pt-0`).
- **AuthBar Glassmorphism:** Barra persistente con transparencia, backdrop-blur y altura optimizada.
- **Home Polish:** StatBar visible en primer viewport, Hero balanceado con Turpial Wave y navegación corregida.
- **Asistente Avatar:** Corregido contraste del avatar en modo oscuro (fondo claro).

### Sprint "DB-Rates MVP" - CERRADO
- **Persistencia:** Implementados `MpReferenceRateSnapshot` (BCV) y `MpBinanceRateSnapshot`.
- **Congelación de Tasas:** Las nuevas transacciones congelan la tasa real al momento de la compra.
- **Legacy Cleanup:** `USD_REFERENCE_RATE = 1` queda solo para compatibilidad legacy/export.
- **Validación:** Migraciones aplicadas en neondb y schema actualizado.

### Sprint 3B1 - Disponibilidad por transacción activa - CERRADO
- Bloqueo de compra duplicada por transacción activa implementado.
- `initiatePurchase` rechaza nuevas compras si existe `activeTx`.
- Estados bloqueantes y terminales definidos.
- No se marca `SOLD_OUT` antes de validación admin.

### Sprint P0-B — Chat Unread / Badge / Focus - CERRADO
- Rama `Marketplace-P0B-chat-unread`, commit `c75cc45`.
- Preview validado: `https://turpialsound-6uemfhtej-cerberus77s-projects.vercel.app/marketplace`.
- AuthBar unread badge navega a messages con `focus=unread`.
- Dashboard abre primer thread unread automáticamente.
- TransactionChat no marca leídos al montar.
- Mark-as-read diferido hasta interacción explícita (pointer/wheel/touch/envío).
- Sin schema, sin pagos, sin WebGL, sin booking.

### Sprint P0-C — AuthBar Sticky - CERRADO
- Rama `Marketplace-P0C-authbar-sticky`, commit `aefac86`.
- Preview validado: `https://turpialsound-lvihtqudi-cerberus77s-projects.vercel.app/marketplace`.
- AuthBar sticky confirmado en runtime (`top = 0` después de scroll).
- Causa real: `.mp-route-shell` creaba scroll container vertical.
- Fix: `overflow-y: visible; overflow-x: clip` en `styles/globals.css`.
- Se rechazó parche con paddingTop manual (riesgo de black band).
- Sin schema, sin pagos, sin WebGL, sin booking.

## Metodología obligatoria (reforzada)

- Un paso a la vez.
- No dar el siguiente paso hasta recibir output.
- No loops.
- No git add .
- No stash sin inspección/autorización.
- No reset/force push.
- No main.
- No producción.
- No booking.
- No /reservas.
- No Prisma/schema/DB/env salvo sprint explícito high-risk.
- Codex 5.5 reservado para DB/schema/Prisma/migraciones/pagos/payouts/estados financieros/unblockers críticos.
- Para docs/auditoría/read-only usar Gemini Flash, DeepSeek V4 Flash o KAT.
- Para UI/código moderado usar KAT-Coder-Pro V2 antes que Codex.
- Gemini no usar como ejecutor visual fino en este proyecto.

## Pendientes consolidados (actualizados post P0-B/P0-C)

### Sprint P0-B.2 — System Messages (diseño pendiente)
- Siguiente mejora de mensajes: mensajes de sistema en el chat.
- **NO usar senderId = SYSTEM** porque `MpMessage.senderId` es FK obligatoria a `MpUser`.
- Requiere diseño: usuario sistema, schema/type, o statusHistory virtual.
- No implementar sin diseño previo.

### Sprint 2 — Delivery / Receipt
Pendientes:
1. Seller "Ya entregué".
2. Buyer "Ya recibí".
3. Buyer confirmation ya existe parcialmente backend con `buyerConfirmedAt`/`DELIVERY_CONFIRMED`.
4. `SellerDeliveredAt`/action falta.
5. Estado después de pago validado debe ser "Esperando conformidad".
6. Cuando buyer confirma recepción y no hay disputa, pasar a "Fondos por liberar".
7. Admin no debe marcar manualmente "listo para pagar".
8. Admin solo ejecuta/registra pago al vendedor.

### Rates / DB / Finanzas (high-risk, Codex-only)
1. Persistencia integral BCV/Binance (completado en DB-Rates MVP).
2. Transaction creation no debe usar `USD_REFERENCE_RATE = 1`.
3. Payout en Bs debe guardar: USD base, exchange rate, fecha valor, amount Bs, bank fee 0.03%, final Bs amount.
4. USDT payout: 5% comisión plataforma, 0.06 USDT operational/platform charge.
5. Separar dashboards: volumen total, revenue Turpial 5%, fees externos/costos, fondos a liberar.

### Admin seller payout closure
- `MpPayout` existe pero no está integrado formalmente.
- `adminReleaseEscrow` es insuficiente.
- `RELEASED` es ambiguo.
- Falta registro formal de: método payout, fecha, referencia/hash, monto, fee breakdown, adminId, proof, notificación seller, cierre operación.
- No tocar sin diseño de arquitectura.

### Listing reservation/state
- Listing no siempre queda reservado/no disponible tras compra/pago.
- Revisar estado de listing durante PENDING/VALIDATING/IN_ESCROW.

### Seller listing/payout data
Al publicar venta, seller debe proveer:
- ubicación real del ítem
- métodos de cobro/payout
- datos necesarios para pago vendedor

## Hallazgos funcionales activos del marketplace

- Totales y comisiones requieren QA con operaciones reales tras el fix de tasas.
  Impacto: posible ajuste residual en métricas operativas.
  Prioridad: alta.
- Desajuste transversal entre métricas, tabs y flujo real del dashboard.
  Impacto: queda como validación/pulido de segunda pasada.
  Prioridad: alta.

## Archivos referenciados en VSCode que NO existen en disco

Los siguientes archivos aparecen en el listado de "Open Tabs" de VSCode pero no existen en el sistema de archivos:
- `docs/07_handoffs/GEMINI_RECOVERY_PROMPT.md` — NO EXISTE
- `docs/07_handoffs/GEMINI_SPRINT_3B1_PROMPT.md` — NO EXISTE
- `docs/07_handoffs/verificacion_3B1` — NO EXISTE
- `docs/07_handoffs/3B1_A.md` — NO EXISTE
- `docs/obsidian-vault/ESTADO_OPERATIVO_HOY.md` — NO EXISTE

Estos parecen ser referencias de sesiones anteriores que no se materializaron como archivos. No representan un riesgo operativo.

## Resuelto en esta ventana

- Checkpoint P0-B documentado con commit `c75cc45`, preview y QA manual.
- Checkpoint P0-C documentado con commit `aefac86`, preview y QA runtime.
- Causa real del sticky fix documentada: `.mp-route-shell` scroll container.
- Pendientes actualizados: P0-B.2 system messages, Sprint 2 Delivery.
- Plan Pareto actualizado post P0-B/P0-C.

## Resuelto y no reabrir

- Marketplace separado del booking.
- Prefijo `MP_` como regla de separación en Prisma.
- Checkout manual temporal operativo.
- Conciliación manual reflejada en código y dashboard.
- Aprobación admin restringida para no aprobar desde `PENDING_PAYMENT`.
- `SOLD_OUT` solo después de pago validado y entrada a escrow.
- Imágenes y comprobantes fuera del flujo productivo de base64.
- Persistencia actual de media por URL/asset externo temporal desacoplado.
- DB activa correcta confirmada: Neon `neondb`.
- `paymentSenderBank`, `paymentPaidAt` e índices ya aplicados en `mp_transactions`.
- `npm run build` limpio.
- `npx tsc --noEmit` limpio.
- P0-B Chat Unread / Badge / Focus completado y validado.
- P0-C AuthBar Sticky completado y validado con QA runtime.

## Checkpoint para reanudar mañana

- Estado marketplace: funcional, separado del booking, con P0-B (chat unread/focus) y P0-C (authbar sticky) aprobados.
- Checkpoint P0-B: `turpialsound-6uemfhtej-cerberus77s-projects.vercel.app`
- Checkpoint P0-C: `turpialsound-lvihtqudi-cerberus77s-projects.vercel.app`
- Próximo paso: QA visual rápida de P0-C en todas las rutas, decidir si crear PR desde `Marketplace-P0C-authbar-sticky`.
- Proximo frente: Sprint P0-B.2 system messages (requiere diseño) o Sprint 2 Delivery/Receipt.
- WebGL wave: no continuar ahora.
- No producción, no booking, no schema sin sprint explícito.

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
