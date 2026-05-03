# Session Summary - Activa

> Fecha de ultima actualizacion: 2026-05-03
> Tipo de nota: Checkpoint documental y replan Pareto 80/20
> Fuente principal: `docs/99_prompts/marketplace-docs-pareto-update.md`

---

## Checkpoint oficial vigente

**Preview oficial/confiable aprobado:**
https://turpialsound-t18pj01z8-cerberus77s-projects.vercel.app/marketplace

- Deployment: `turpialsound-t18pj01z8-cerberus77s-projects.vercel.app`
- Target: preview
- Status: Ready
- Created: Sat May 02 2026 14:46:19 GMT-0400

Commits del checkpoint oficial:
- `e177170` docs(marketplace): record authbar shell polish checkpoint (2026-05-02)
- `5f00b54` fix(marketplace): refine authbar and home shell polish (2026-05-02)

Estado visual/funcional aprobado en ese punto:
- Marketplace shell/AuthBar/Home aprobado.
- AuthBar correcto.
- Global navbar oculto dentro de marketplace.
- StatBar alineado abajo en primer viewport.
- Ticker del AuthBar corregido para no invadir controles.
- Logo Turpial Sound con fondo claro como escape visual/home.
- Badges compactos.
- Toggle alineado.
- Duplicidad de toggle en admin resuelta.
- No producción.

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
- No mezclar WebGL wave con P0-B.
- Si se retoma, debe ser sprint visual separado.
- Primero debe haber captura/base clara y aprobación visual.
- No usar Gemini como ejecutor visual fino.
- Preferir script manual controlado por GPT o KAT-Coder-Pro V2 si se necesita agente.
- Codex solo si el bloqueo visual es importante y otros fallan.

## Estado real actual del proyecto (2026-05-03)

El marketplace ha consolidado su shell propio y la persistencia de tasas para transacciones. Se ha cerrado el polish visual inicial del Home. El checkpoint oficial `t18pj01z8` refleja el estado aprobado con AuthBar, Home, StatBar y badges compactos funcionales.

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

## Pendientes consolidados (herederados)

### P0-B — Chat / Mensajes / Notificaciones
Siguiente sprint recomendado por Pareto.

Pendientes:
1. Chat público y seller chat deben mostrar hora/timestamp.
2. Mensajes deben refrescar casi en tiempo real sin refresh manual.
3. Chip "1 mensaje sin leer" debe ser clickeable.
4. Click en unread debe llevar al thread/mensaje correcto.
5. Cambios de estado deben generar mensajes/notificaciones de sistema.
6. Usuario debe ver próximas acciones pendientes en compras/ventas.
7. CTAs deben navegar exactamente al lugar de acción.
8. Auditar infraestructura existente:
   - unread
   - read receipts
   - mark as read
   - polling/refetch
   - status history
   - system messages

**Primera tarea P0-B debe ser auditoría read-only, no implementación.**

Archivos probables a auditar:
- `components/marketplace/TransactionChat.tsx`
- `components/marketplace/dashboard/DashboardClient.tsx`
- `components/marketplace/MarketplaceAuthBar.tsx`
- `actions/marketplace/chat.ts`
- `actions/marketplace/transactions.ts`
- `actions/marketplace/questions.ts`
- `prisma/schema.prisma` solo lectura

### Sprint 2 — Entrega / Recepción
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
1. Persistencia integral BCV/Binance.
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

## Replanteamiento Pareto 80/20 para hoy

### Sprint de hoy 1 — Cierre documental / limpieza de verdad operativa
**Objetivo:** Dejar docs alineadas con checkpoint oficial, prototipo en observación y próximos sprints.
**Resultado esperado:** Docs/handoff/Obsidian actualizados.

### Sprint de hoy 2 — P0-B Read-only audit de Chat/Mensajes/Notificaciones
**Objetivo:** Mapear estado real antes de implementar.
**Resultado esperado:** Lista exacta de archivos, funciones existentes, gaps y plan quirúrgico.
**No implementar todavía.**

### Sprint de hoy 3 — Implementación P0-B mínima viable (si auditoría lo permite)
Solo si el audit indica bajo riesgo/no schema:
- timestamps visibles
- polling/refetch razonable
- unread chip clickeable
- foco/scroll al mensaje/thread
- system messages si ya existe infraestructura

Si requiere schema o arquitectura: parar y reportar.

### Sprint posterior — Entrega/Recepción
Solo después de P0-B o si se decide cambiar prioridad por bloqueo de flujo.

### Sprint high-risk separado — Rates/Payout/Closure
Codex-only. No mezclar con sprints normales.

## Hallazgos funcionales activos del marketplace

- El tab de mensajes no refleja bien los 3 mensajes sin leer ni su ubicación real.
  Impacto: mitigado por la nueva separación entre chats por atender y todos los chats; falta QA real.
  Prioridad: alta (objetivo P0-B).
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

- Checkpoint oficial documentado con commit hash y URL de preview.
- Prototipo `gptrfix08` documentado como "en observación", no como oficial.
- Regla WebGL wave documentada y cerrada para este sprint.
- Pendientes consolidados en una sola lista jerárquica.
- Plan Pareto 80/20 estructurado para hoy.
- Metodología obligatoria reforzada.

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

## Checkpoint para reanudar mañana

- Estado marketplace: funcional, separado del booking y con foco en estabilización operativa.
- Checkpoint oficial: `t18pj01z8`. Prototipo `gptrfix08` en observación.
- Proximo paso: P0-B read-only audit antes de implementar.
- WebGL wave: no continuar ahora.
- No producción, no booking, no schema sin sprint explícito.
