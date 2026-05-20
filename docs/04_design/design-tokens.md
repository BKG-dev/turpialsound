# Turpial Sound — Design Tokens

> Estado: **Activo — generado en sesión de refactorización visual global.**
> Última actualización: 2026-03-28
> Fuente: `tailwind.config.ts` + `styles/globals.css`

---

## 1. Colores confirmados por el cliente

| Token | Hex | Uso principal |
|-------|-----|---------------|
| `accent-gold` | `#FFC107` | CTAs primarios, hovers, accent lines, gradientes |
| `accent-gold-light` | `#FFD54F` | Estado hover del botón primario |
| `accent-gold-dark` | `#E6A800` | Variante oscura (reserved) |
| `accent-cyan` | `#00AEEF` | Animaciones, energía, variante glow-cyan, eyebrows alternativos |
| `accent-cyan-light` | `#29BCFF` | Variante clara (reserved) |
| `accent-cyan-dark` | `#0090C8` | Variante oscura (reserved) |

## 2. Superficies base (Dark Mode Premium)

| Token | Hex | Rol |
|-------|-----|-----|
| `brand-bg` | `#0A0A0A` | Fondo raíz del sitio |
| `brand-surface` | `#111111` | Superficies elevadas (cards, header, footer) |
| `brand-border` | `#1E1E1E` | Bordes sutiles entre elementos |
| `brand-muted` | `#2A2A2A` | Elementos apagados, placeholders |

## 3. Texto

| Token | Hex | Rol |
|-------|-----|-----|
| `text-primary` | `#F2F2F2` | Headings, texto prominente |
| `text-secondary` | `#A0A0A0` | Párrafos, descripciones |
| `text-muted` | `#5A5A5A` | Labels, eyebrows, metadatos |

## 4. Tipografía

| Rol | Fuente | Variable CSS | Pesos |
|-----|--------|--------------|-------|
| Display / Headings | Michroma (Google Fonts) | `--font-michroma` | 400 (único disponible) |
| Body / Prosa | Inter (Google Fonts) | `--font-inter` | 400, variable |

**Escala tipográfica fluida (clamp):**

| Token Tailwind | Valor | Uso |
|----------------|-------|-----|
| `text-display-xl` | `clamp(2.5rem, 6vw, 5rem)` | Hero H1 |
| `text-display-lg` | `clamp(2rem, 4.5vw, 3.75rem)` | Page hero H1 |
| `text-display-md` | `clamp(1.5rem, 3vw, 2.5rem)` | Section H2, CTA heading |
| `text-body-lg` | `1.125rem` | Subtítulos hero, subheadings |
| `text-body-base` | `1rem` | Párrafos estándar |
| `text-body-sm` | `0.875rem` | Notas, metas |

**Letter-spacing en headings Michroma:** `0.02em` (positivo — el font lo requiere para legibilidad).

## 5. Glassmorphism

| Variable CSS | Valor | Aplicación |
|--------------|-------|------------|
| `--glass-bg` | `rgba(17,17,17,0.65)` | Fondo de panels glass |
| `--glass-border` | `rgba(255,255,255,0.06)` | Borde de panels glass |
| `--glass-blur` | `12px` | `backdrop-filter: blur()` |

Clase utilitaria: `.glass-surface` (definida en `globals.css`)

## 6. Sombras / Glows

| Token Tailwind | Valor | Uso |
|----------------|-------|-----|
| `shadow-glow` | `0 0 50px rgba(255,193,7,0.18)` | Hover en cards/botones gold |
| `shadow-glow-sm` | `0 0 24px rgba(255,193,7,0.12)` | Play button en CinematicVideo |
| `shadow-glow-cyan` | `0 0 50px rgba(0,174,239,0.18)` | Cards activas en galería cyan |
| `shadow-glow-cyan-sm` | `0 0 24px rgba(0,174,239,0.12)` | Dropdown nav hover |

## 7. Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `rounded-sm` | `4px` | Elementos pequeños |
| `rounded` | `8px` | Base |
| `rounded-lg` | `12px` | Inputs, tags |
| `rounded-xl` | `20px` | Botones lg, elementos medianos |
| `rounded-2xl` | `28px` | Cards principales, galerías |

## 8. Gradientes de marca

| Clase | Descripción |
|-------|-------------|
| `.text-gradient-gold` | Gradiente `#FFC107 → #FFD54F` en texto |
| `.text-gradient-dual` | Gradiente `#FFC107 → #00AEEF` en texto (hero) |

## 9. Spacing global

| Token | Valor |
|-------|-------|
| `section-padding` | `clamp(4rem, 8vw, 8rem)` — secciones principales |
| `section-padding-sm` | `clamp(2rem, 4vw, 4rem)` — secciones secundarias |
| `container-max` | `1200px` |
| `container-px` | `clamp(1rem, 5vw, 3rem)` |
