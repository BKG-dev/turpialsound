# Turpial Sound — SOLICITUD DE MATERIAL INMEDIATA

**Versión:** v1.0 — MVP Sprint  
**Fecha:** 2026-05-30  
**Prioridad:** CRÍTICA — Sin estos assets, varias publicaciones quedan en `needs_review` y no pasan a producción.

---

## Instrucciones para Manuel

1. Revisa la tabla abajo.
2. Coloca los archivos en `data/rrss/inbox/` según la carpeta indicada.
3. Ejecuta `node scripts/rrss/rrss-cli.mjs index-assets` para reindexar.
4. Los assets con fallback en `/public` ya están indexados y se usarán automáticamente mientras tanto.
5. Los assets marcados como **OBLIGATORIO** bloquean la publicación de ciertos posts. Los **FALLBACK** permiten publicar con assets existentes.

---

## Tabla de Assets Requeridos

| # | Prioridad | Asset Requerido | Uso | Formato | Cant | Ejemplo Concreto | Carpeta | Oblig/Fallback |
|---|-----------|-----------------|-----|---------|------|------------------|---------|----------------|
| F1 | P1 | Logo/avatar cuadrado 1:1 | Perfil FB + IG | PNG o JPG, 360x360px min | 1 | Logo de Turpial Sound en fondo sólido, legible en miniatura | `brand/` | OBLIGATORIO |
| F2 | P1 | Portada horizontal FB | Cabecera de página Facebook | PNG o JPG, 851x315px | 1 | Foto del estudio con logo superpuesto o diseño gráfico profesional | `facebook/` | OBLIGATORIO |
| F3 | P1 | 5 fotos del estudio o espacios | Posts de presentación, carruseles | JPG, 1080x1350px ideal | 5 | Sala de grabación con equipos visibles, luz natural, sin personas si no hay permiso | `facebook/` | FALLBACK: `/public` tiene 25+ |
| F4 | P2 | 3 fotos de personas usando estudio | Posts de comunidad, humanización | JPG, 1080x1350px | 3 | Músico tocando en la sala, ingeniero en consola, banda ensayando CON PERMISO ESCRITO | `facebook/` | FALLBACK: usar `artista.jpg` |
| F5 | P2 | 3 fotos de instrumentos/equipos | Posts educativos, marketplace | JPG, 1080x1350px | 3 | Close-up de consola, micrófono en pedestal, guitarra en sala | `facebook/` | FALLBACK: `/public` tiene |
| F6 | P1 | 1 video vertical corto 9:16 del estudio | Reel de presentación | MP4, 15-30s, 1080x1920 | 1 | Paneo lento del estudio con equipos encendidos, sin audio o con música ambiente | `reels/` | FALLBACK: `videoRRSS.webm` |
| F7 | P2 | 1 video vertical de equipo/instrumento | Reel educativo/marketplace | MP4, 15-30s, 1080x1920 | 1 | Close-up de consola moviendo faders, o guitarra siendo tocada | `reels/` | OBLIGATORIO |
| F8 | P2 | 1 imagen o video para post fijado | Post anclado en página FB | JPG o MP4 | 1 | Foto amplia del estudio con texto "Bienvenidos a Turpial Sound" (se puede diseñar) | `facebook/` | FALLBACK: `estudio-grabacion.jpg` |

### Instagram

| # | Prioridad | Asset Requerido | Uso | Formato | Cant | Ejemplo Concreto | Carpeta | Oblig/Fallback |
|---|-----------|-----------------|-----|---------|------|------------------|---------|----------------|
| I1 | P1 | 9 imágenes cuadradas/verticales para grid | Primer grid de Instagram | JPG, 1080x1080 o 1080x1350 | 9 | 3 de estudio, 2 de salas, 2 de equipos, 2 de comunidad/ambiente | `instagram/` | FALLBACK parcial: `/public` tiene material |
| I2 | P1 | 3 videos verticales 9:16 para reels | Reels de IG | MP4, 15-60s, 1080x1920 | 3 | Tour del estudio, antes/después mezcla, timelapse de sesión | `reels/` | FALLBACK: `videoRRSS` ya es vertical |
| I3 | P2 | 5 fondos o fotos para stories | Stories diarias | JPG, 1080x1920 | 5 | Foto nocturna del estudio, detalle de equipo, sala vacía con luz, close-up logo, exterior | `stories/` | FALLBACK: `/public` tiene |
| I4 | P2 | 3 assets para carruseles educativos | Carruseles (posts #8, #9, #13) | JPG, 1080x1080 | 3+ | Gráficos con texto, íconos, comparativas. Se pueden diseñar. | `instagram/` | OBLIGATORIO (diseñar) |
| I5 | P1 | Logo/ícono para highlights | Portadas de highlights IG | PNG, 1080x1920 ideal | 5 | Uno por categoría: Estudio, Salas, Marketplace, Comunidad, FAQ | `brand/` | OBLIGATORIO (diseñar) |

### Marketplace

| # | Prioridad | Asset Requerido | Uso | Formato | Cant | Ejemplo Concreto | Carpeta | Oblig/Fallback |
|---|-----------|-----------------|-----|---------|------|------------------|---------|----------------|
| M1 | P2 | 3 fotos reales o demo de equipos | Posts de marketplace | JPG, 1080x1350 | 3 | Instrumentos/equipos del marketplace con buena iluminación | `marketplace/` | FALLBACK: `/public` tiene |
| M2 | P1 | 1 imagen "operación protegida" | Carrusel y post fijado | PNG/JPG, 1080x1080 | 1 | Gráfico con íconos explicando los 3 pasos de la operación protegida | `marketplace/` | OBLIGATORIO (diseñar) |
| M3 | P3 | 1 imagen o video para vendedores | Post "cómo vender" | JPG o MP4 | 1 | Infografía o video corto con tips de listing | `marketplace/` | FALLBACK |

---

## Instrucciones por carpeta

```
data/rrss/inbox/
├── facebook/    ← Portada FB, fotos estudio, personas, instrumentos, post fijado
├── instagram/   ← Grid IG, carruseles educativos
├── reels/       ← Videos verticales 9:16 para IG Reels y FB Reels
├── stories/     ← Fondos y fotos verticales para historias
├── marketplace/ ← Fotos de equipos, gráfico operación protegida
└── brand/       ← Logo avatar, highlights icons, branding en general
```

---

## Reglas

1. **NO se requieren contraseñas ni tokens.**
2. Los assets de `/public` ya están indexados como fallback. El bot los usa automáticamente.
3. Mientras falten assets **OBLIGATORIO**, los posts correspondientes quedan en `needs_review`.
4. Puedes meter los archivos progresivamente. Cada vez que agregues, ejecuta `node scripts/rrss/rrss-cli.mjs index-assets`.
5. Los assets de artistas (ODL, DQ, DL, FQ) requieren autorización escrita. No los uses sin permiso.
6. Los comprobantes de pago en `/public/uploads/marketplace/payment-proofs/` no se usarán NUNCA en RRSS.

---

**Resumen rápido:** 5 OBLIGATORIO, el resto tiene fallback. Prioriza F1 (logo), F2 (portada FB), F6 (video estudio), I1 (grid IG), I2 (reels), M2 (gráfico op. protegida), I5 (highlights).
