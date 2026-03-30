# Turpial Sound — Asset Requirements

> Estado: **Activo — generado en sesión de refactorización visual global.**
> Última actualización: 2026-03-28
> Todos los slots marcados como [CLIENT_REQUIRED] bloquean la versión final del contenido pero NO bloquean el desarrollo del componente.

---

## 1. Imágenes

### Implementación
Todos los assets de imagen usan `<Image />` de `next/image` con:
- `fill` + `sizes` para contenedores de altura fija (galerías, cards).
- `width` + `height` para imágenes de dimensiones conocidas.
- `priority` en imágenes above-the-fold (hero).

### Assets pendientes [CLIENT_REQUIRED]

| Asset | Componente | Dimensiones recomendadas | Formato |
|-------|------------|--------------------------|---------|
| Foto del estudio (hero o sección editorial) | `CinematicVideo` poster / sección "El estudio" | 1920×1080px | WebP |
| Galería de salas de ensayo | `Mac3DGallery` (slot `imageUrl`) | 800×600px mín. | WebP |
| Galería estudio de grabación | `Mac3DGallery` | 800×600px mín. | WebP |
| Galería producción musical | `Mac3DGallery` | 800×600px mín. | WebP |
| Foto oficial Frank Lemus | `nosotros/page.tsx` avatar | 400×400px (cuadrada) | WebP |
| Foto oficial Susej Vera | `nosotros/page.tsx` avatar | 400×400px (cuadrada) | WebP |
| Logos o fotos de artistas autorizados | `artistas/page.tsx` | 120×120px mín. | WebP / PNG |
| Logo vectorial Turpial Sound | `SiteHeader`, `SiteFooter`, favicon | SVG + PNG fallback | SVG |

### Favicon / OG Image [CLIENT_REQUIRED]
- Favicon: `app/favicon.ico` — actualmente placeholder.
- OG Image: `1200×630px` — requerido para preview en redes sociales.
- Apple Touch Icon: `180×180px`.

---

## 2. Video

### CinematicVideo
El componente `CinematicVideo` (`components/media/CinematicVideo.tsx`) está listo para recibir:

```tsx
<CinematicVideo
  src="/video/turpial-sound-studio.mp4"   // [CLIENT_REQUIRED]
  poster="/images/studio-poster.webp"     // [CLIENT_REQUIRED]
  aspect="horizontal"                     // o "vertical" para formato 9:16
  label="Turpial Sound · Caracas"
/>
```

| Asset | Especificación recomendada |
|-------|---------------------------|
| Video del estudio | MP4 (H.264), máx 30s, 1080p, < 8MB |
| Video vertical (Reels/Stories) | MP4, 9:16, 1080×1920, < 5MB |
| Poster frame | WebP, mismo aspect ratio que el video |

---

## 3. Audio

### HeroSection — control UI numinoso
El componente `HeroSection` (`components/home/HeroSection.tsx`) está listo para recibir un archivo de audio de ambiente:

```tsx
<audio ref={audioRef} loop preload="none" src="/audio/turpial-sound-ambient.mp3" />
```

| Asset | Especificación recomendada |
|-------|---------------------------|
| Pista de ambiente (loop) | MP3, 44.1 kHz, 128–192 kbps, duración 2–4 min para seamless loop, < 4 MB |
| Ubicación | `public/audio/turpial-sound-ambient.mp3` |

El control de Play/Mute ya está implementado con `Volume2`/`VolumeX` (lucide-react), animación halo `animate-pulse-glow` y glassmorphism. El audio **no se reproduce automáticamente** — requiere interacción del usuario (click en el botón).

---

## 4. Fuentes

Cargadas vía `next/font/google` — no requieren asset local:
- **Michroma** (display) — weight 400
- **Inter** (body) — variable

---

## 4. Rutas de assets en el proyecto

```
public/
├── images/          ← imágenes estáticas (fotos, og-image)
├── video/           ← archivos de video
└── icons/           ← favicon, apple-touch-icon, SVG icons
```

---

## 5. Imágenes de onda (Wave) — FluidCurveScrollImg

El componente `FluidCurveScrollImg.jsx` (archivo de referencia en la raíz del proyecto) genera animaciones de onda senoidal calibrables basadas en el scroll. Para activarlo visualmente requiere assets PNG/WebP con transparencia de onda.

| Asset | Prop | Ruta sugerida | Especificación |
|-------|------|---------------|----------------|
| Onda superior (entra por arriba) | `imageSrc` con `direction="down"` | `/assets/images/wave-down.webp` | PNG/WebP, fondo transparente, formato apaisado (~1920×200px) |
| Onda inferior (entra por abajo) | `imageSrc` con `direction="up"` | `/assets/images/wave-up.webp` | PNG/WebP, fondo transparente, mismas dimensiones |
| Variante amber/dorada | `imageSrc` alternativo | `/assets/images/wave-amber.webp` | Mismas especificaciones, tonos cálidos |

```
public/
└── assets/
    └── images/
        ├── wave-down.webp      [CLIENT_REQUIRED]
        ├── wave-up.webp        [CLIENT_REQUIRED]
        └── wave-amber.webp     [CLIENT_REQUIRED]
```

> La lógica matemática (campana senoidal `bellOverRange`) ya está extraída en `lib/bell.ts` y aplicada en `components/home/StackingSection.tsx`. Una vez provistos los assets de onda, `FluidCurveScrollImg` puede integrarse en las transiciones de sección pasando `imageSrc="/assets/images/wave-down.webp"`.

---

## 6. Checklist de assets para launch

- [ ] Logo SVG del cliente integrado en Header y Footer
- [ ] Favicon y apple-touch-icon generados desde el logo
- [ ] OG Image creada y enlazada en `lib/metadata.ts`
- [ ] Fotos del estudio (mín. 3 — sala control, sala de ensayo, área de producción)
- [ ] Fotos de Frank Lemus y Susej Vera (aprobadas por el cliente)
- [ ] Lista de artistas autorizados para publicación con sus imágenes
- [ ] Video del estudio (opcional para V1, requerido para impacto máximo)
- [ ] Todas las imágenes convertidas a WebP y optimizadas (< 200KB por imagen estática)
