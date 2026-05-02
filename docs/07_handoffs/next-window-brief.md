# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-05-01
**Frente activo:** Marketplace (P0-B Chat / Sprint 2 Delivery)
**Tipo de nota:** Checkpoint operativo para siguiente ventana
**Estado de sincronización:** P0-A Shell/Home y DB-Rates MVP CERRADOS.

---

## Estado resumido

Se ha consolidado el Shell propio del marketplace (independiente del navbar global) y la persistencia de tasas (BCV/Binance) para transacciones. El marketplace es visualmente consistente en dark/light mode y funcionalmente estable en su flujo manual.

## Bloqueos activos
- Crítico: El sistema de mensajes (P0-B) requiere timestamps, real-time y badges clickeables.
- Alto: Falta flujo de confirmación de entrega ("Ya recibí" / "Ya entregué") para liberar fondos.
- Pendiente: Diagnóstico de transacciones legacy con tasas pendientes.

## Resuelto (Hitos clave)
- **UI Shell P0-A:** Marketplace tiene navegación propia; navbar global oculto; MainContentShell corregido.
- **DB-Rates MVP:** Snapshots de tasas persistidos; transacciones congelan tasa al crear.
- **Polish Visual:** AuthBar glassmorphism; avatar asistente contrastado; hero balanceado.
- **Validaciones:** Build y TSC limpios.

## Siguiente accion exacta

1. **P0-B / Chat + mensajes:**
   - Implementar timestamps en chat público y seller chat.
   - Asegurar que badges de "sin leer" lleven al chat correcto.
   - Notificaciones de sistema para avances de estado.
2. **Sprint 2 / Delivery:**
   - Implementar botones "Ya entregué" (Seller) y "Ya recibí" (Buyer).
   - El estado "Ya recibí" debe habilitar la liberación de fondos (escrow -> released).
3. **QA:** Validar flujos de mensajes tras cada cambio.
4. NO tocar booking ni `/reservas`.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/obsidian-vault/ROADMAP_RESCATE.md

Confirma el cierre de P0-A y DB-Rates.
Inicia el Sprint P0-B (Chat + mensajes) implementando timestamps y real-time aproximado.
Luego inicia el Sprint 2 (Delivery) para implementar confirmaciones de recepción de artículos.
No toques booking ni /reservas.
```
