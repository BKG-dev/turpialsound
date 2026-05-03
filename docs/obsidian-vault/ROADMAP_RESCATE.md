---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

Obsidian es la fuente de trazabilidad viva del proyecto. Este archivo refleja el estado operativo real del marketplace al 2026-05-03 y deja el checkpoint para retomar sin rearmar contexto.

## Estado actual real del marketplace (2026-05-03)

El marketplace ha consolidado su infraestructura visual (P0-A Shell), su persistencia de tasas (DB-Rates MVP) y la disponibilidad por transacción activa (Sprint 3B1). Se encuentra funcional bajo un flujo operativo manual validado.

### Checkpoint oficial vigente
- **Preview oficial:** `https://turpialsound-t18pj01z8-cerberus77s-projects.vercel.app/marketplace`
- **Commits:** `e177170` / `5f00b54` (2026-05-02)
- **Prototipo en observación (NO oficial):** `https://turpialsound-gptrfix08-cerberus77s-projects.vercel.app/marketplace`
- **Regla:** No mezclar prototipo con línea oficial hasta aprobación explícita.

### Hitos completados
- **P0-A UI Shell/Home (Cerrado):** Shell propio del marketplace, AuthBar glassmorphism, Home balanceado y corregida la franja negra superior (MainContentShell).
- **DB-Rates MVP (Cerrado):** Persistencia de tasas BCV/Binance; MpReferenceRateSnapshot y MpBinanceRateSnapshot operativos; transacciones congelan tasa.
- **Sprint 3B1 (Cerrado):** Bloqueo de compra duplicada por transacción activa implementado. Estados bloqueantes y terminales definidos. No se marca SOLD_OUT antes de validación admin.
- **Admin AI Copilot (Read-only):** Implementado en `/marketplace/admin/copilot`. Acceso restringido a `SUPER`. Herramientas de lectura operativa y BI.
- **Instrumentación Analytics/BI:** Modelos `MpAnalyticsEvent` y `MpBlobObjectMetadata` creados. Endpoints y eventos instrumentados.

### Bloqueos activos
- [ ] **P0-B Chat:** Mejorar sistema de mensajes (timestamps, badges, real-time). **Primero: auditoría read-only, no implementación.**
- [ ] **Sprint 2 Delivery:** Implementar botones de confirmación de entrega/recepción para el flujo de fondos.
- [ ] **MpPayout Formal:** Registro y cierre de pagos a vendedores en base a tasas congeladas.

### Pendientes posteriores (Nivel 2)
- [ ] Automatización de acciones de escritura (requiere confirmación UI).
- [ ] Tráfico/bandwidth real (requiere Vercel Observability).
- [ ] Módulo financiero/P&L.
- [ ] Orquestador Oreshnik.

## Reglas de oro
- No tocar `booking` ni `/reservas`.
- No implementar nuevas migraciones sin aprobación explícita.
- No tocar `paymentProofUrl` ni proxy `SUPER`.
- Si un objetivo no está en `docs/07_handoffs/qa-dispatcher.json`, reportar `GAP OPERATIVO` y no improvisar.
- No continuar WebGL wave ahora. No mezclar con P0-B.
- No usar Gemini como ejecutor visual fino.
- Codex 5.5 reservado para DB/schema/Prisma/pagos/payouts.
