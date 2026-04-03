# Turpial Sound — Inventario de Componentes UI

> Estado: **Aplicado en Producción (V1)**
> Rutas: `components/ui/`, `components/media/`, `components/fx/`

## 1. Interacción Base (`ui/`)
* **`Button.tsx`**: Componente polimórfico (`as="link" | as="button"`). Variantes principales:
    * `primary` (Aplica `.btn-silky-primary` con gradiente Cyan animado y halo).
    * `glow-cyan` (Aplica outline con brillo).
    * `whatsapp` (Verde distintivo).
* **`WhatsAppButton.tsx`**: Botón flotante persistente con animación de pulso numinoso (`animate-pulse-glow`).

## 2. Componentes Cinematográficos (`media/`)
* **`CinematicVideo.tsx`**: Reproductor de video de fondo optimizado con superposición de gradientes y fallback a imagen estática.
* **`AudioVisualizerFrequency.tsx` / `Waterfall3D`**: Canvas WebGL que renderiza el espectro de audio (Winamp-style) en tiempo real. Usa `requestAnimationFrame` y suspende el contexto en `idle`.
* **`LogoGlb.tsx`**: Render 3D del logo interactivo (rotación, drag y material metálico `roughness: 0.12`). Integrado en el navbar y footer.
* **`Mac3DGallery.tsx`**: Galería de imágenes con efecto de inclinación 3D en desktop y CSS Snap en mobile.

## 3. Efectos Visuales (`fx/`)
* **`ParticleCanvas.tsx`**: Sistema de partículas (bokeh/polvo iluminado) que reacciona levemente al movimiento, utilizado como capa profunda en los Hero sections.