---
title: "DropSocial — Brand & Marketing Master"
status: "Activo"
last_updated: "2026-05-26"
owner: "Turpial Sound"
applies_to: "/dropsocial, homepage TS, homepage Marketplace, DropSocialButton, RRSS, ads"
---

# DropSocial — Brand & Marketing Master

> Documento maestro de identidad y comunicación del programa de afiliados de Turpial Sound Marketplace. Todo el sistema visual, verbal y comercial vive aquí.

---

## 1. Concepto

**DropSocial es la red que paga.**

Cada usuario de internet ya comparte cosas: memes, canciones, links de productos. Lo hace gratis y los grandes (Meta, X, TikTok) se quedan con todo el upside. DropSocial invierte esa relación: cuando alguien comparte un link del Marketplace y otra persona compra, **el que compartió cobra**. Sin tope, sin esfuerzo extra, sin permiso.

Nosotros nos quedamos con un 5% por operar el marketplace. Tú te llevas el **10% de eso** — el equivalente a 0.5% del precio bruto de la venta. El seller no pierde nada. El comprador paga lo mismo. La red social que paga es esta.

---

## 2. Naming, motto y mensajes

| Pieza | Versión oficial |
|-------|----------------|
| Nombre | **DropSocial** (una palabra, capital D, capital S) |
| Motto principal | **comparte. suena. cobra.** |
| Motto alternativo | **la red social te dio likes. nosotros te damos el 10%.** |
| Línea de cierre | **sin tope. sin esfuerzo. sin permiso.** |
| Verbo de marca | **dropear** (acción de generar y compartir un link) |

### Mensajes clave (jerarquizados)

1. **Compartes y cobras.** Genera el link, lo mandas, alguien compra, te cae la comisión.
2. **10% de lo que ganamos en cada venta tuya.** Transparente: nuestro fee es 5%; te damos 10% de ese fee. (= 0.5% del precio de venta)
3. **Sin límite de links.** Cada listing del Marketplace genera un link único tuyo. Comparte 1, comparte 1000.
4. **Panel transparente.** Ves clicks, vistas, conversiones y dólares acumulados en tiempo real.
5. **No necesitas vender ni comprar.** Te registras solo para compartir y ganar.

### Mensajes a NO usar

- "Hazte rico". "Gana miles". "Ingreso garantizado". (no podemos prometer cifras)
- "MLM", "red de mercadeo", "construye tu red", "downline". (no es piramidal — un solo nivel)
- "Sin trabajar". (sí trabajas: compartes con criterio)
- "Negocio propio". (es una comisión por referido, no una empresa)

---

## 3. Speech de marketing

### Versión corta (10 segundos / ad / IG story)

> Comparte un link del Marketplace de Turpial Sound. Si alguien compra, cobras el 10% de lo que ganamos. Sin tope. Sin esfuerzo. Sin permiso. **DropSocial.**

### Versión media (30 segundos / hero web / video corto)

> En internet ya compartes todo gratis: canciones, memes, ofertas. Lo hace todo el mundo. Lo que no hace todo el mundo es cobrar por hacerlo.
>
> **DropSocial** es el programa de afiliados de Turpial Sound Marketplace. Generas tu link único de cualquier producto o servicio, lo compartes donde quieras, y cada vez que alguien compra a través de ese link, ganas el 10% de nuestra comisión.
>
> No tienes que vender. No tienes que comprar. No hay tope.
>
> Comparte. Suena. Cobra.

### Versión larga (página /dropsocial, sección "cómo funciona")

> Turpial Sound Marketplace cobra 5% de fee por cada venta que pasa por nuestra plataforma. Ese 5% paga el escrow, el soporte y la operación.
>
> Cuando un link tuyo trae una venta, dividimos ese fee contigo: **te llevas el 10% de nuestra comisión**, es decir, 0.5% del precio del producto. El seller cobra lo mismo. El comprador paga lo mismo. Nosotros operamos por menos. Tú cobras por compartir.
>
> Tu panel te muestra cuántos clicks ha tenido cada link, cuántos terminaron en venta, cuánto has acumulado y cuándo se paga. Todo en tiempo real, sin letra pequeña.

---

## 4. Sistema visual

### Paleta (alineada a `design-tokens.md`)

| Rol | Token TS | Hex | Uso DropSocial |
|-----|----------|-----|----------------|
| Acento principal | `accent-gold` | `#FFC107` | Motto, cifras de comisión, botón primario |
| Acento energía | `accent-cyan` | `#00AEEF` | "drop" (la onda), eyebrow "DropSocial" |
| Fondo | `brand-bg` | `#0A0A0A` | Hero, secciones principales |
| Superficie | `brand-surface` | `#111111` | Cards, panel preview |
| Texto primario | `text-primary` | `#F2F2F2` | Headings |
| Texto secundario | `text-secondary` | `#A0A0A0` | Párrafos |

**Gradiente firma DropSocial:**
```css
background: linear-gradient(135deg, #00AEEF 0%, #FFC107 100%);
```
Cyan al gold = "del compartir al cobrar". Solo se usa en hero, motto y CTA final.

### Tipografía

- **Display / Headings**: Michroma 400 (`--font-michroma`), letter-spacing `0.02em`.
- **Body**: Inter (`--font-inter`).
- **Motto**: Michroma, lowercase forzado, letter-spacing `0.06em`. Las tres palabras separadas por punto y espacio: `comparte. suena. cobra.`

### Icono "drop"

El icono evoluciona del `Gift` actual de lucide (regalo) hacia un símbolo propio: una **gota con onda sonora** — la metáfora visual es "el drop musical que se propaga".

Composición:
- Círculo central pequeño (la gota / nota).
- Tres arcos concéntricos saliendo hacia la derecha (la onda / la propagación).
- Color: gradiente cyan → gold.

Versiones requeridas (a generar con IA externa, ver §8):
- `dropsocial-icon-mono.svg` — sólido, 24×24, monocolor (uso UI).
- `dropsocial-icon-gradient.svg` — con gradiente firma, 64×64 (hero, branding).
- `dropsocial-logotype.svg` — icono + wordmark "DropSocial" en Michroma.

Mientras tanto, el componente UI sigue usando `Gift` de lucide-react sin penalidad estética — encaja con el sistema.

### Estilo de imagen

- **Mood**: nocturno, denso, premium. No "startup tech feliz", no "casino brillante".
- **Acabado**: glassmorphism sobre dark — coincide con el resto del sitio.
- **Luz**: spots dorados puntuales + halo cyan ambiental.
- **Composición**: cinemática, focales largas, contraste alto.
- **Nada de**: stock photos de gente sonriendo con laptop. Cero.

---

## 5. CTAs canónicos

| Contexto | CTA primario | CTA secundario |
|----------|--------------|----------------|
| Hero /dropsocial | **Empezar a ganar →** | Ver cómo funciona |
| Bloque en home TS | **Compartir y ganar →** | — |
| Bloque en home Marketplace | **Quiero mi link →** | — |
| DropSocialButton (sin sesión) | **Iniciar sesión para ganar** | — |
| DropSocialButton (con sesión) | **Copiar mi link** | Compartir por WhatsApp |
| Panel (cero ventas aún) | **Comparte tu primer link →** | — |

Todos los CTAs en Michroma, peso 600, lowercase es opcional pero preferido en los principales para mantener el aire del motto.

---

## 6. Estructura de la página /dropsocial

```
1. HERO
   - Eyebrow: "DropSocial"
   - H1: "comparte. suena. cobra."
   - Sub: "La red social te dio likes. Nosotros te damos el 10%."
   - CTA primario + secundario (scroll a "cómo funciona")
   - Visual: gradient orb cyan → gold, ondas

2. CÓMO FUNCIONA (3 pasos)
   01. Crea tu link  → entras al marketplace, eliges un producto, click en el botón regalo
   02. Compártelo    → WhatsApp, IG, X, donde quieras, sin límite
   03. Cobras el 10% → cuando alguien compra, te cae 10% de nuestra comisión

3. CUÁNTO PUEDES GANAR (calculadora)
   - Slider: precio promedio del producto ($ 50 → $ 5000)
   - Slider: ventas al mes (1 → 100)
   - Output: "$X al mes" en gold gigante
   - Disclaimer: "Estimación con 0.5% efectivo. Tus ganancias dependen de lo que compartas."

4. PANEL TRANSPARENTE (preview)
   - Mockup del dashboard con clicks, vistas, conversiones, $ acumulado
   - Texto: "Todo en tiempo real. Sin letra pequeña."

5. SIN LÍMITES (beneficios)
   - 4 cards:
     · Sin tope de ganancia
     · Sin límite de links
     · Pago directo, sin filtros
     · No tienes que comprar ni vender

6. FAQ
   - ¿Cuánto gano exactamente?
   - ¿Cuándo me pagan?
   - ¿Cómo cobro?
   - ¿Puedo compartir mis propios productos?
   - ¿Hay tope mensual?
   - ¿Qué pasa si el comprador pide reembolso?

7. CTA FINAL
   - "Comparte. Suena. Cobra."
   - Botón "Crear cuenta y empezar →"
```

---

## 7. Integración en homepages

### Turpial Sound (`/`)

Insertar **después** de "WHY US" y **antes** de "NUESTRAS INSTALACIONES" (StackingSection con índice intermedio). Bloque corto, no compite con la propuesta principal (estudio de grabación).

Contenido:
- Eyebrow: "DropSocial" (cyan animado)
- H2: "Comparte cualquier link del Marketplace. Cobra el 10%."
- Sub: "Sin tope. Sin esfuerzo. Sin permiso."
- CTA: "Empezar a ganar →" (link a `/dropsocial`)

### Marketplace (`/marketplace`)

Insertar como banner persistente arriba del grid de listings (después del filtro), o como sección sticky-stacking encima del primer fold. Más prominente que en TS — el público del Marketplace está más cerca de la conversión.

Contenido idéntico de mensaje, con CTA "Quiero mi link →".

---

## 8. Prompts para herramientas externas

> Estos prompts están listos para ejecutar en Sora, Midjourney v6, Nano Banana, Flux 1.1 Pro o Google Imagen 3. Producen los assets visuales que vamos a integrar al sitio.

### A. Hero visual (Midjourney / Imagen 3 / Flux)

```
Cinematic dark studio background, deep matte black with subtle film grain. A glowing
amber-gold orb (#FFC107) on the left releasing concentric sound-wave rings in cyan
(#00AEEF) flowing toward the right, fading into darkness. Premium audio aesthetic,
moody, high contrast, no people, no text, no logos. Ultra-detailed, 16:9 cinematic
ratio, octane render quality, depth of field, soft volumetric light.
--ar 16:9 --style raw --v 6
```

### B. Icono "drop" estilo lucide (Midjourney / Flux + cleanup en vector)

```
A minimal flat vector icon: single droplet shape, with three concentric arcs radiating
to the right like sound waves emanating from the droplet. Pure line art, 2px stroke
weight, monochrome, white on transparent background, rounded line caps, symmetric,
24x24 pixel grid aligned, lucide-react icon style, geometric, clean.
--ar 1:1 --no shadow --no fill --v 6
```

Luego vectorizar el resultado (Adobe Illustrator Image Trace o vectorizer.ai) y guardar como `dropsocial-icon-mono.svg`.

### C. Hero video loop (Sora / Runway Gen-3 / Kling)

```
A slow cinematic loop, 6 seconds, seamless. Camera locked. Dark void background.
A single golden drop falls from top center, hits an invisible surface, and releases
expanding cyan sound rings that propagate outward and dissolve into the dark edges.
The drop reforms at the top and falls again. Premium audio brand aesthetic, no
people, no text, no logos. Deep blacks, golden highlights, cyan edge glow.
24fps, 1920x1080.
```

### D. Reel de RRSS — IG / TikTok 9:16 (Sora / Runway)

```
9:16 vertical video, 12 seconds, three vignettes connected by golden-cyan dissolves:

Scene 1 (0-3s): close-up of a phone screen, dark mode UI, finger taps a gold "share"
icon, a glowing link slides up and out of frame.

Scene 2 (3-7s): the link multiplies into many copies traveling through abstract dark
space, like signals propagating; small cyan ripples follow each one.

Scene 3 (7-12s): close-up of a notification on the phone screen: "+$24.50 — DropSocial"
in gold text on black, with the DropSocial wordmark fading in below.

Mood: premium fintech meets music studio. Deep blacks, gold #FFC107 highlights, cyan
#00AEEF accents. No people. No background music (will add separately).
```

### E. Foto de prensa / OG image (Midjourney / Imagen 3)

```
Top-down minimal flat lay on matte black surface: a smartphone showing a glowing
"share" button in gold, surrounded by abstract gold and cyan light streaks emanating
outward like a star burst. Premium dark editorial style, like an Apple keynote
product shot. No text, no logos. Centered composition, dramatic rim light.
--ar 1.91:1 --style raw --v 6
```

Guardar como `/public/images/dropsocial-og.jpg` (1200×630) — para Open Graph y Twitter cards.

### F. Wordmark "DropSocial" en Michroma (Figma / Illustrator manual)

No requiere IA. Recrear en vector:

```
Texto: "DROPSOCIAL"
Fuente: Michroma 400
Tracking: +60 (letter-spacing 0.06em)
Tamaño: variable
Color: gradiente lineal 135° de #00AEEF (0%) a #FFC107 (100%)
Espaciado: la palabra "DROP" en cyan puro, "SOCIAL" en gold puro,
           y el separador del gradiente justo entre P y S.
```

Exportar como `dropsocial-logotype.svg` y `dropsocial-logotype-white.svg` (versión monocromática para fondos saturados).

---

## 9. Métricas que la marca debe sostener

| Métrica | Target inicial | Cómo se mide |
|---------|----------------|--------------|
| % visitantes /dropsocial que se registran | 8% | analytics_event `referral_signup` / pageview |
| Links generados por afiliado activo | ≥3 en 30 días | `MpReferralLink.count by referrerId` |
| Click-through de links compartidos | ≥10% del total compartido | `MpReferralLink.clicks` |
| Conversión click → venta | 1.5–3% | `MpReferralLink.conversions / clicks` |
| Pago efectivo a afiliado (mensual) | >0 para ≥40% de afiliados activos | tabla payouts (TODO) |

Todas estas se reflejan en el panel del afiliado para mantener la promesa de transparencia.

---

## 10. Reglas de no-violación

- **Nunca prometer cifras absolutas** ("gana $1000 al mes"). Solo lógica porcentual.
- **Nunca esconder el 10% sobre 5%** (= 0.5% efectivo). Explicar de frente.
- **Nunca tono MLM/piramidal**. Es un solo nivel: tú compartes, tú cobras.
- **Nunca usar el motto fuera del sistema visual** (Michroma + paleta). El motto sin su tipografía pierde marca.
- **Nunca contaminar con DropSocial el lenguaje del estudio de grabación**. Son dos productos, una sola casa.

---

*DropSocial vive como sub-marca del Marketplace. Coherente con Turpial Sound, autónoma en su comunicación, transparente en su economía.*
