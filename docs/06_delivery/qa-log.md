# QA Log — Registro de Auditorías

> Utilizar este documento para registrar incidencias y validaciones previas al pase a producción.

| Fecha | Tester | Componente / Ruta | Dispositivo/OS | Estado | Observación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-03-31 | Equipo Dev | `AudioVisualizerFrequency.tsx` | Desktop Chrome | ✅ PASS | Bug de context fill corregido. WebGL fluido a 60fps. |
| 2026-03-31 | Equipo Dev | `HeroSection.tsx` | Mobile iOS Safari | ✅ PASS | Carga asíncrona perfecta. No bloquea render inicial. |
| 2026-03-31 | Equipo Dev | `styles/globals.css` | Global | ✅ PASS | `prefers-reduced-motion` respeta directrices de SO. |
| 2026-04-01 | Claude Code | `HeroSection.tsx` | Desktop/Dev | 🐛 BUG → ✅ FIX | **Navigation lock ~12s**: `vid.load()` después de `src=''` bloquea el main thread sincrónicamente en el cleanup (teardown del pipeline de media). Fix: eliminado completamente. React hace GC del elemento naturalmente. |
| 2026-04-01 | Claude Code | `HeroSection.tsx` | Desktop/Dev | 🐛 BUG → ✅ FIX | **Video no reproduce en dev**: React Strict Mode ejecuta cleanup→remount; `pause()` frena el video y `autoPlay` no re-dispara en el mismo nodo DOM. Fix: `play().catch()` explícito al inicio del efecto. |
| 2026-04-01 | Claude Code | `HeroSection.tsx` | All | ✅ PREVENTIVO | `preload="none"` → `preload="metadata"`: previene race condition entre autoPlay y carga de buffer. Metadatos cargan antes de que autoPlay intente disparar. |