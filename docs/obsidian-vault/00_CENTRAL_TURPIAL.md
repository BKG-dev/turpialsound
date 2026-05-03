---
tags: ["#central", "#map"]
---

# Mapa de Contenido Principal

## Áreas del Proyecto
- [[ARQUITECTURA_TASAS]]
- [[BUGS_CRITICOS]]
- [[ROADMAP_RESCATE]]

## Enlaces Relacionados
- [[MEMORY]]
- [[docs/marketplace/00_IMPLEMENTATION_SUMMARY]]
- [[docs/marketplace/01_ROADMAP_AND_STATUS]]
- [[docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX]]

## Checkpoint Activo - 2026-05-03 (segunda revision)

### Checkpoints oficiales vigentes
- **P0-B:** `https://turpialsound-6uemfhtej-cerberus77s-projects.vercel.app/marketplace` — commit `c75cc45` (rama `Marketplace-P0B-chat-unread`)
- **P0-C:** `https://turpialsound-lvihtqudi-cerberus77s-projects.vercel.app/marketplace` — commit `aefac86` (rama `Marketplace-P0C-authbar-sticky`)
- **Base anterior:** `https://turpialsound-t18pj01z8-cerberus77s-projects.vercel.app/marketplace` — commits `e177170` / `5f00b54` (2026-05-02)
- **Prototipo en observación (NO oficial):** `https://turpialsound-gptrfix08-cerberus77s-projects.vercel.app/marketplace`

### Hitos cerrados
- **P0-A UI Shell/Home:** Shell propio, AuthBar glassmorphism, Home balanceado, franja negra corregida.
- **DB-Rates MVP:** Persistencia BCV/Binance, transacciones congelan tasa.
- **Sprint 3B1:** Bloqueo de compra duplicada por transacción activa.
- **P0-B Chat Unread:** Badge unread, focus unread, mark-as-read diferido implementados y validados.
- **P0-C AuthBar Sticky:** AuthBar sticky confirmado en runtime (fix en `.mp-route-shell` overflow).
- **Dark/Light mode:** Implementado scoped a `/marketplace`.
- **Admin AI Copilot:** Read-only en `/marketplace/admin/copilot`.
- **Seller Cobros UX:** Refactorizado con glosario UX.
- **Admin Dashboard UX:** Alineado con glosario UX.
- **SEO/AEO público:** Implementado en `/marketplace` y `/marketplace/[slug]`.

### Próximo frente
- **P0-B.2 System Messages:** Diseñar mensajes de sistema en el chat (NO senderId=SYSTEM, requiere diseño).
- **Sprint 2 Delivery:** Confirmación de entrega/recepción.
- **MpPayout Formal:** Codex-only, no tocar sin diseño.

### Reglas activas
- No tocar booking ni `/reservas`.
- No WebGL wave ahora.
- No Gemini como ejecutor visual fino.
- Codex reservado para DB/schema/pagos.
- Detalle completo en [[ROADMAP_RESCATE]] y [[BUGS_CRITICOS]].
