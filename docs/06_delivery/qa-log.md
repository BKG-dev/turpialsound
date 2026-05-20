# QA Log — Registro de Auditorías

> Utilizar este documento para registrar incidencias y validaciones previas al pase a producción de Turpial Sound.

| Fecha | Tester | Componente / Ruta | Dispositivo/OS | Estado | Observación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-03-31 | Equipo Dev | `AudioVisualizerFrequency.tsx` | Desktop Chrome | ✅ PASS | Bug de context fill corregido. WebGL fluido a 60fps. |
| 2026-03-31 | Equipo Dev | `HeroSection.tsx` | Mobile iOS Safari | ✅ PASS | Carga asíncrona perfecta. No bloquea render inicial. |
| 2026-03-31 | Equipo Dev | `styles/globals.css` | Global | ✅ PASS | `prefers-reduced-motion` respeta directrices de SO. |
| 2026-04-03 | Equipo Dev | `PricingPreview.tsx` | Desktop & Mobile | ✅ PASS | Carrusel fluido con CSS nativo. Alineación estricta lograda. Botones numinosos sin colisión. |
| - | - | - | - | ⏳ PENDIENTE | Revisión de carga de imágenes ODL, DQ, DL, FK en `/artistas`. |
| - | - | - | - | ⏳ PENDIENTE | Validación de comisión 5% en flujo de Escrow (Marketplace). |