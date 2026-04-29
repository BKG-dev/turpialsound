---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

Obsidian es la fuente de trazabilidad viva del proyecto. Este archivo refleja el estado operativo real del marketplace al 2026-04-29 y deja el checkpoint para retomar sin rearmar contexto.

## Estado actual real del marketplace (2026-04-29)

El marketplace está funcional y separado del booking. El flujo operativo vigente es manual temporal.

### Hitos completados (Sprint "Admin AI Copilot + BI/Analytics")
- **Admin AI Copilot (Read-only):** Implementado en `/marketplace/admin/copilot`. Acceso restringido a `SUPER`. Herramientas de lectura operativa y BI.
- **Instrumentación Analytics/BI:** Modelos `MpAnalyticsEvent` y `MpBlobObjectMetadata` creados. Endpoints y eventos instrumentados.
- **Seguridad:** Aislamiento total de escritura en Copilot y limpieza de metadata sensible.

### Bloqueos activos
- [ ] Ejecutar QA manual E2E buyer -> admin -> escrow -> payout seller siguiendo runbook.
- [ ] Validar Admin AI Copilot (restricciones de lectura y acceso).
- [ ] Verificar build con `git diff --check`, `tsc` y `npm run build`.

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
