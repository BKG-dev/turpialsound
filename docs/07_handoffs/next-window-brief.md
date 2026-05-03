# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-03
**Frente activo:** Marketplace (P0-B Chat / Sprint 2 Delivery)
**Tipo de nota:** Checkpoint operativo para siguiente ventana
**Estado de sincronización:** P0-A Shell/Home, DB-Rates MVP y Sprint 3B1 CERRADOS.

---

## Checkpoint oficial vigente

**Preview oficial aprobado:** `https://turpialsound-t18pj01z8-cerberus77s-projects.vercel.app/marketplace`
- Commits: `e177170` / `5f00b54` (2026-05-02)
- Estado: AuthBar, Home, StatBar, badges compactos, toggle alineado, duplicidad de toggle en admin resuelta.

**Prototipo en observación (NO oficial):** `https://turpialsound-gptrfix08-cerberus77s-projects.vercel.app/marketplace`
- Preservado como candidato visual, no como base principal.
- No mezclar con línea oficial hasta aprobación explícita.

## Estado resumido

Se ha consolidado el Shell propio del marketplace (independiente del navbar global), la persistencia de tasas (BCV/Binance) para transacciones, y la disponibilidad por transacción activa (Sprint 3B1). El marketplace es visualmente consistente en dark/light mode y funcionalmente estable en su flujo manual. El checkpoint oficial `t18pj01z8` refleja el estado aprobado.

## Bloqueos activos
- Crítico: El sistema de mensajes (P0-B) requiere timestamps, real-time y badges clickeables.
- Alto: Falta flujo de confirmación de entrega ("Ya recibí" / "Ya entregué") para liberar fondos.
- Pendiente: Diagnóstico de transacciones legacy con tasas pendientes.
- Pendiente: Formalización de MpPayout y cierre contable final.

## Resuelto (Hitos clave)
- **UI Shell P0-A:** Marketplace tiene navegación propia; navbar global oculto; MainContentShell corregido.
- **DB-Rates MVP:** Snapshots de tasas persistidos; transacciones congelan tasa al crear.
- **Sprint 3B1:** Bloqueo de compra duplicada por transacción activa implementado.
- **Polish Visual:** AuthBar glassmorphism; avatar asistente contrastado; hero balanceado.
- **Validaciones:** Build y TSC limpios.

## Reglas metodológicas reforzadas
- No continuar WebGL wave ahora. No mezclar con P0-B.
- No usar Gemini como ejecutor visual fino.
- Codex 5.5 reservado para DB/schema/Prisma/pagos/payouts.
- Para docs/auditoría usar Gemini Flash, DeepSeek V4 Flash o KAT.
- Para UI/código moderado usar KAT-Coder-Pro V2 antes que Codex.
- No producción, no booking, no /reservas, no schema sin sprint explícito.

## Siguiente accion exacta

### Paso 1 (inmediato): P0-B Read-only audit
Auditar archivos sin implementar:
- `components/marketplace/TransactionChat.tsx`
- `components/marketplace/dashboard/DashboardClient.tsx`
- `components/marketplace/MarketplaceAuthBar.tsx`
- `actions/marketplace/chat.ts`
- `actions/marketplace/transactions.ts`
- `actions/marketplace/questions.ts`
- `prisma/schema.prisma` solo lectura

Mapear: unread, read receipts, mark as read, polling/refetch, status history, system messages.

### Paso 2 (si audit lo permite): Implementación P0-B mínima
- timestamps visibles
- polling/refetch razonable
- unread chip clickeable
- foco/scroll al mensaje/thread
- system messages si ya existe infraestructura

Si requiere schema: parar y reportar.

### Paso 3 (posterior): Sprint 2 Delivery
- Botones "Ya entregué" (Seller) y "Ya recibí" (Buyer).
- Estado "Esperando conformidad" después de pago validado.
- "Fondos por liberar" cuando buyer confirma recepción.
- Admin solo ejecuta/registra pago al vendedor.

### Paso 4 (high-risk separado): Rates/Payout/Closure
Codex-only. No mezclar con sprints normales.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/obsidian-vault/ROADMAP_RESCATE.md

Confirma el cierre de P0-A, DB-Rates y Sprint 3B1.
Confirma el checkpoint oficial t18pj01z8 y el prototipo gptrfix08 en observación.
Inicia el P0-B Read-only audit de Chat/Mensajes/Notificaciones.
No implementes todavía. Solo mapea archivos, funciones, gaps.
Si el audit indica bajo riesgo, procede con implementación P0-B mínima.
No toques booking ni /reservas.
No toques schema sin autorización explícita.
```
