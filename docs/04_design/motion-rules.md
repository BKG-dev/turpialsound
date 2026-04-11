# Turpial Sound — Motion Rules

> Estado: **Activo — generado en sesión de refactorización visual global.**
> Última actualización: 2026-03-28

---

## 1. Principio rector

> El motion apoya la identidad. No distrae, no ralentiza, no bloquea la conversión.

Toda animación debe:
- usar exclusivamente `transform` y `opacity` (GPU-composited, sin layout thrashing);
- respetar `@media (prefers-reduced-motion: reduce)` — ya configurado en `globals.css`;
- tener propósito: orientar, confirmar o deleitar, nunca decorar sin función.

## 2. Duraciones estándar

| Variable CSS | Valor | Uso |
|--------------|-------|-----|
| `--duration-fast` | `150ms` | Feedback inmediato (focus, activo) |
| `--duration-base` | `250ms` | Hovers, transiciones de color |
| `--duration-slow` | `500ms` | Entradas de sección, settle de 3D |

## 3. Easing

| Variable CSS | Curva | Uso |
|--------------|-------|-----|
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | Slides, settle de la galería 3D, dropdowns |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Transiciones simétricas |

## 4. Reglas por contexto

### Desktop (hover: hover)
- Todos los efectos `:hover` cinematográficos están activos.
- Nav links: underline animado (`scaleX 0 → 1`) con `ease-out-expo`, `250ms`.
- Cards de servicio (home): hover `border-color` + `shadow-glow`, `350ms`.
- `Mac3DGallery`: rotación 3D CSS en `80ms linear` durante movimiento, `600ms ease-out-expo` en settle.
- `Button primary`: transición a `shadow-glow` en hover, `250ms`.

### Mobile (sin hover)
- Los `:hover` están aislados con `@media (hover: hover)` en los componentes que lo requieren.
- `Mac3DGallery` degrada a CSS Scroll Snap 2D — cero transform 3D.
- Touch targets mínimos: `44px` de área táctil.
- Menú mobile: `animate-slide-down` (`280ms ease-out-expo`).

## 5. Keyframes definidos en globals.css

| Nombre | Descripción | Uso |
|--------|-------------|-----|
| `slideDown` | `opacity 0→1` + `translateY -10px→0` | Mobile menu, dropdown nav |
| `fadeIn` | `opacity 0→1` | Entradas suaves generales |
| `pulseGlow` | `opacity 0.4↔0.8` cíclico, `3s` | Placeholder de `CinematicVideo` |

## 6. Galería 3D — detalle técnico

```
perspective: 1200px en el wrapper
transform-style: preserve-3d en la tarjeta
rotateX: máx ±6deg
rotateY: máx ±8deg
transition durante movimiento: 80ms linear (respuesta táctil inmediata)
transition en settle: 600ms cubic-bezier(0.16, 1, 0.3, 1) (spring suave)
```

## 7. Qué NO hacer

- No usar `margin`, `padding`, `height` o `width` en transiciones (fuerzan reflow).
- No animar colores de fondo con `background-color` en elementos con muchos hijos.
- No encadenar animaciones CSS sin `prefers-reduced-motion` guard.
- No agregar `will-change` indiscriminadamente (solo en `.Mac3DGallery` cards por justificación real).
- No usar librerías de animación (Framer Motion, GSAP) hasta que el caso lo justifique en Fase 5.
