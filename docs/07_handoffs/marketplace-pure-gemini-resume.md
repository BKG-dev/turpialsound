# Marketplace-Pure - Gemini Resume Handoff

**Fecha:** 2026-04-28
**Rama actual:** `Marketplace-Pure`
**Objetivo:** Retomar el trabajo tras el cierre de Codex, manteniendo el foco en Marketplace-Pure.

## Contexto de Rama y Commits
Rama creada desde `UI-UX-finalV3`. Commits cerrados y pusheados:
1. `18c5eec` style(marketplace): improve responsive public UX
2. `deef9f4` feat(marketplace): add scoped dark light theme
3. `70045a6` fix(marketplace): repair payout method and admin note editing

## Qué quedó completado
- **UX Pública Responsive:** Contraste mejorado, Q&A legible, cajas de preguntas móviles/desktop optimizadas, dropdown de bancos compacto, formato 12h AM/PM.
- **Dark/Light Mode Scoped:** `MarketplaceThemeProvider` aplicado a todo `/marketplace`. Toggle deslizante con labels dinámicos ("Modo oscuro"/"Modo claro"). Persistencia en `localStorage` (`turpial-marketplace-theme`). Corrección de banda negra superior en `app/layout.tsx`.
- **Sprint 2 Fixes:** Guardar método de cobro corregido. Banco como select (`VENEZUELAN_BANK_OPTIONS`). Teléfono venezolano normalizado (`04XXXXXXXXX`). Nota interna admin estable (sin pérdida de foco).

## Hallazgos Diagnóstico Sprint 3A (Pendiente Implementación)
### A. Mensajes/badges intra-sesión
- Necesidad de fuente única `getMessageSummary()` para unreadCount total y por thread.
- Polling liviano (30s general, 10-15s en chat abierto).
- Callbacks desde `TransactionChat` hacia `DashboardClient` al enviar/leer.

### B. Disponibilidad de listing por transacción activa
- Bloquear `initiatePurchase()` si existe transacción activa (PENDING_PAYMENT, PAYMENT_RECEIVED, etc.).
- Regla: NO marcar `SOLD_OUT` antes de validación real por admin.
- Copy recomendado por estado (Reservado temporalmente, Pago en revisión, Venta en proceso, etc.).

## Próximo Sprint Recomendado
**Sprint 3B: Implementación de Mensajes/Badges y Disponibilidad por Transacción Activa.**

## Límites Operativos
- NO tocar `booking`.
- NO tocar `/reservas`.
- NO tocar `main` ni producción.
- NO usar `stashes`.
- NO tocar `schema` ni `migrations`.
- NO implementar carrito, tasas, finanzas ni conformidad de fondos.
- NO tocar `paymentProofUrl` ni proxy `SUPER`.

## QA GAP OPERATIVO
Tasks propuestos (no registrar rutas falsas):
- `marketplace_messages_badges_session_refresh`
- `marketplace_listing_availability_active_transaction`

---
*Este documento sincroniza el estado real para Gemini CLI.*
