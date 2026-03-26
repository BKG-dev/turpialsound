# Turpial Sound — App Architecture

> Estado: **Fase 4 — Arquitectura técnica del frente público. Provisional hasta confirmar bilingüismo y mecanismo de contacto.**
> Última actualización: 2026-03-26
> Fuente base: `stack-decision.md` + `sitemap-master.md` + `url-architecture.md` + `navigation-system.md` + `page-briefs.md`

---

## Leyenda de estado

- **[CONFIRMED]** — decisión arquitectónica sólida
- **[SUGGESTED]** — propuesta coherente; ajustable con preferencia técnica del equipo
- **[CLIENT_REQUIRED]** — depende de dato o decisión del cliente

---

## A. Propósito del documento

### Para qué existe
Define cómo se organiza técnicamente el frente público de Turpial Sound: estructura de carpetas, separación de responsabilidades, sistema de rutas, layouts, manejo de contenido, SEO técnico y estrategia de media. Es el plano del edificio antes de poner el primer ladrillo.

### Cómo conecta estrategia → arquitectura → briefs → implementación
```
CLAUDE.md (reglas del proyecto)
    ↓
sitemap-master.md + url-architecture.md  →  rutas del App Router
    ↓
navigation-system.md  →  layouts y componentes de navegación
    ↓
page-briefs.md  →  estructura de cada página (secciones, bloques, CTA)
    ↓
messaging-pillars.md + tone-of-voice.md  →  contenido y copy
    ↓
stack-decision.md  →  tecnologías
    ↓
app-architecture.md  ←  ESTE DOCUMENTO  →  estructura del proyecto
    ↓
shell técnico → componentes base → páginas P1 → producción completa
```

---

## B. Principios de arquitectura de app

### 1. Separación por responsabilidad, no por tipo de archivo
Los componentes viven cerca de donde se usan. Los componentes globales (header, footer, CTA persistente) viven en `/components`. Los componentes específicos de una página viven en la carpeta de esa página o en `_components` dentro de su segmento de ruta.

### 2. Server-first por defecto
Todos los componentes son Server Components a menos que haya una razón explícita para ser Client Component. La razón debe estar comentada en el código.

### 3. Contenido desacoplado de la estructura
Los textos, datos de servicios y metadatos no viven hardcodeados en los componentes JSX. Viven en archivos de datos (`/content`) que pueden migrarse a un CMS futuro con el menor cambio posible en los componentes.

### 4. Estilos con intención
- Tailwind para el sistema base.
- CSS Modules solo para complejidad visual que Tailwind no puede expresar limpiamente.
- Sin `@apply` extensivo: si se usa demasiado `@apply`, probablemente el componente necesita un módulo CSS.
- Sin estilos globales que no sean reset, fuentes y variables CSS personalizadas.

### 5. i18n como capa opcional activable
La arquitectura de rutas y componentes se diseña para que el bilingüismo pueda activarse sin restructurar el proyecto. Si el cliente confirma bilingüismo, se añade `next-intl` y se envuelven las rutas bajo el segmento `[locale]`. Si no se confirma, el sitio funciona en español sin esa capa.

### 6. Escalabilidad sin inflar
No se crean abstracciones para casos que no existen. No hay un "design system completo" en V1: hay componentes funcionales bien nombrados. Si en Fase 5 se repite un patrón 3 veces, entonces se abstrae.

---

## C. Propuesta de estructura de carpetas

```
turpialsound-web/
│
├── app/                          ← App Router de Next.js
│   ├── layout.tsx                ← Root layout: html, body, fuentes, providers mínimos
│   ├── page.tsx                  ← Home (/)
│   ├── not-found.tsx             ← 404 global
│   │
│   ├── nosotros/
│   │   └── page.tsx
│   │
│   ├── salas-de-ensayo/
│   │   ├── page.tsx              ← Pilar del cluster
│   │   ├── [sala]/               ← Subpáginas dinámicas por sala (cuando existan datos)
│   │   │   └── page.tsx
│   │   ├── tarifas/
│   │   │   └── page.tsx          ← CLIENT_REQUIRED: solo si cliente decide publicar precios
│   │   └── preguntas-frecuentes/
│   │       └── page.tsx
│   │
│   ├── estudio-de-grabacion/
│   │   ├── page.tsx
│   │   ├── equipamiento/
│   │   │   └── page.tsx
│   │   └── preguntas-frecuentes/
│   │       └── page.tsx
│   │
│   ├── produccion-musical/
│   │   ├── page.tsx
│   │   ├── proceso/
│   │   │   └── page.tsx
│   │   ├── portafolio/           ← CLIENT_REQUIRED: solo si hay casos publicables
│   │   │   └── page.tsx
│   │   └── preguntas-frecuentes/
│   │       └── page.tsx
│   │
│   ├── servicios/
│   │   ├── page.tsx              ← Hub de servicios complementarios
│   │   ├── mezcla-masterizacion/
│   │   │   └── page.tsx
│   │   ├── podcast-locucion/
│   │   │   └── page.tsx
│   │   ├── video-session/
│   │   │   └── page.tsx
│   │   ├── arreglos-musicales/
│   │   │   └── page.tsx
│   │   └── consultoria/
│   │       └── page.tsx
│   │
│   ├── artistas/
│   │   ├── page.tsx
│   │   ├── testimonios/
│   │   │   └── page.tsx
│   │   └── proyectos/
│   │       └── page.tsx
│   │
│   ├── recursos/
│   │   ├── page.tsx              ← Hub de recursos
│   │   ├── como-prepararse-para-grabar/
│   │   │   └── page.tsx
│   │   ├── que-incluye-una-produccion-musical/
│   │   │   └── page.tsx
│   │   ├── grabacion-mezcla-masterizacion/
│   │   │   └── page.tsx
│   │   └── preguntas-frecuentes/
│   │       └── page.tsx
│   │
│   ├── contacto/
│   │   └── page.tsx
│   │
│   ├── politica-de-privacidad/
│   │   └── page.tsx
│   │
│   └── terminos-de-servicio/
│       └── page.tsx
│
├── components/                   ← Componentes globales reutilizables
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx
│   │   └── MobileMenu.tsx
│   ├── ui/                       ← Átomos de UI: Button, Badge, Divider, etc.
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   └── ...
│   ├── sections/                 ← Bloques reutilizables entre páginas
│   │   ├── HeroSection.tsx
│   │   ├── ServiceCard.tsx
│   │   ├── TestimonialBlock.tsx
│   │   ├── CtaSection.tsx
│   │   ├── FaqAccordion.tsx
│   │   └── AuthorityBar.tsx
│   ├── seo/
│   │   ├── JsonLd.tsx            ← Componente genérico para Schema JSON-LD
│   │   └── OpenGraphImage.tsx    ← Generación de OG images si se automatiza
│   └── media/
│       ├── OptimizedImage.tsx    ← Wrapper de next/image con defaults del proyecto
│       └── VideoBackground.tsx   ← Componente de video de fondo para hero
│
├── content/                      ← Archivos de datos del sitio (sin CMS)
│   ├── services/
│   │   ├── salas-de-ensayo.ts
│   │   ├── estudio-de-grabacion.ts
│   │   ├── produccion-musical.ts
│   │   └── ...
│   ├── pages/
│   │   ├── home.ts
│   │   ├── nosotros.ts
│   │   └── ...
│   ├── artistas.ts               ← Lista curada de artistas [CLIENT_REQUIRED]
│   ├── testimonios.ts            ← Testimonios verificables [CLIENT_REQUIRED]
│   └── faq.ts                    ← Preguntas y respuestas [SUGGESTED]
│
├── lib/                          ← Utilidades y helpers
│   ├── metadata.ts               ← Generación de metadata por página
│   ├── schema.ts                 ← Generación de Schema JSON-LD
│   ├── i18n.ts                   ← Solo si se confirma bilingüismo [CLIENT_REQUIRED]
│   └── utils.ts                  ← Funciones genéricas (cn, formatters, etc.)
│
├── styles/
│   ├── globals.css               ← Solo: CSS reset, variables CSS, fuentes
│   └── modules/                  ← CSS Modules para piezas de alta complejidad visual
│       ├── hero.module.css
│       └── ...
│
├── public/
│   ├── fonts/                    ← Si se sirven fuentes locales
│   ├── images/                   ← Assets estáticos que no pasan por next/image
│   │   └── og/                   ← Imágenes Open Graph estáticas
│   └── icons/                    ← Favicon, apple-touch-icon, etc.
│
├── types/                        ← TypeScript type definitions
│   ├── service.ts
│   ├── artist.ts
│   ├── testimonial.ts
│   └── index.ts
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── package.json
```

### Notas sobre la estructura

**`app/` y las páginas dinámicas de sala:**
Las subpáginas de sala (`/salas-de-ensayo/[sala]`) usan rutas dinámicas. Los datos de las salas viven en `content/services/salas-de-ensayo.ts`. Cuando el cliente provea los nombres y datos reales, se actualiza el archivo de contenido — el código no cambia. [CLIENT_REQUIRED]

**`content/` como capa de abstracción:**
Esta carpeta simula un CMS sin serlo. Cada archivo exporta datos tipados que los componentes consumen. Si en el futuro se necesita un CMS, la migración consiste en reemplazar las importaciones de `/content` con llamadas a la API del CMS, sin tocar los componentes.

**`components/sections/` vs. `app/[ruta]/_components/`:**
- Los bloques que se repiten en más de una página viven en `components/sections/`.
- Los bloques exclusivos de una sola página viven en `_components/` dentro del segmento de ruta (underscore para que Next.js los excluya del routing).

---

## D. Arquitectura por dominios del sitio

### Páginas core / money pages
**Rutas:** `/`, `/salas-de-ensayo`, `/estudio-de-grabacion`, `/produccion-musical`, `/contacto`

**Características técnicas:**
- SSG — generadas en build time, sin fetch de datos en runtime
- Metadata completa: title, description, OG, Twitter Card, JSON-LD
- Schema JSON-LD: `LocalBusiness` + `Service` en páginas de servicio
- Prioridad de LCP: imagen hero con `priority={true}` en `next/image`
- CTA persistente visible sin scroll
- Prefetch desde Home hacia las tres money pages de servicio

### Páginas de autoridad
**Rutas:** `/nosotros`, `/artistas`, `/artistas/testimonios`, `/artistas/proyectos`

**Características técnicas:**
- SSG
- Schema JSON-LD: `Person` (Frank Lemus, Susej Vera), `Organization` (Turpial Sound)
- Contenido completamente dependiente de datos del cliente — viven en `content/artistas.ts` y `content/pages/nosotros.ts`
- Imágenes de artistas y equipo: `next/image` con `sizes` definido según el layout

### Páginas de soporte / FAQ / recursos
**Rutas:** `/recursos`, `/recursos/*`, FAQ por sección

**Características técnicas:**
- SSG
- Schema JSON-LD: `FAQPage` con `acceptedAnswer` para FAQ estructurada
- Contenido editorial en archivos `.ts` de `/content/` o en MDX si los recursos son extensos
- `@tailwindcss/typography` para el estilo del contenido de longread
- No hay animación pesada en estas páginas

### Navegación global
**Componentes:** `Header.tsx`, `Footer.tsx`, `Navigation.tsx`, `MobileMenu.tsx`

**Características técnicas:**
- Server Components por defecto
- `MobileMenu.tsx` como Client Component (necesita estado para abrir/cerrar)
- El CTA del header es un enlace o botón hacia `/contacto` o acción de WhatsApp — siempre visible en viewport
- El header usa `position: sticky` con z-index controlado

### Layout base (root layout)
**Archivo:** `app/layout.tsx`

Responsabilidades del root layout:
- Declarar `<html lang="es">` (o con gestión dinámica si hay i18n)
- Cargar fuentes con `next/font`
- Incluir `<Header>` y `<Footer>`
- Incluir proveedores mínimos (solo si hay estado global necesario)
- Definir los metadatos base que todas las páginas heredan y pueden sobrescribir

### Assets
- Imágenes: `next/image` con dimensiones siempre declaradas. Fuentes de imágenes: `/public/images/` para assets estáticos; URLs externas para assets de CDN si aplica.
- Fuentes: `next/font/google` o `next/font/local` según decisión del cliente sobre tipografía de marca. [CLIENT_REQUIRED — confirmar fuentes del manual de marca si existe]
- Videos: `<video>` nativo. No `<iframe>` de plataformas externas en el hero.

### Utilidades SEO
**Archivos:** `lib/metadata.ts`, `lib/schema.ts`

`lib/metadata.ts` exporta una función `generatePageMetadata()` que recibe los datos de cada página y devuelve el objeto `Metadata` de Next.js. Evita repetir la misma estructura en cada `generateMetadata()` de cada ruta.

`lib/schema.ts` exporta funciones para generar JSON-LD tipado:
- `generateLocalBusinessSchema()`
- `generateServiceSchema(serviceName, description, url)`
- `generatePersonSchema(name, jobTitle, url)`
- `generateFAQSchema(questions[])`
- `generateOrganizationSchema()`

### Componentes de media
`components/media/OptimizedImage.tsx` — wrapper de `next/image` con defaults del proyecto: calidad, formato, placeholder blur, sizes responsivos predefinidos por breakpoint.

`components/media/VideoBackground.tsx` — componente Client para video de fondo de hero con: `autoPlay muted loop playsInline`, fallback a imagen estática si el video no carga, respeto al sistema de reducción de movimiento del OS (`prefers-reduced-motion`).

### Componentes de CTA
`components/ui/Button.tsx` — variantes: `primary`, `secondary`, `ghost`. El CTA de WhatsApp es una variante `whatsapp` con el ícono correspondiente. Tipado para `href` (enlace) o `onClick` (acción).

`components/sections/CtaSection.tsx` — bloque de cierre de página: headline + subheadline + Button. Se reutiliza al final de todas las money pages.

---

## E. Sistema de contenido

### Enfoque V1: archivos de datos tipados

El contenido del sitio en V1 vive en archivos TypeScript en `/content/`. Cada archivo exporta datos que los Server Components consumen directamente.

**Ejemplo de estructura:**
```typescript
// content/services/salas-de-ensayo.ts
export const salasDeEnsayoData = {
  title: "Salas de ensayo en Caracas",
  headline: "Salas equipadas para el trabajo real",
  description: "...",
  salas: [
    {
      id: "sala-premium",
      name: "[CLIENT_REQUIRED — nombre real de la sala]",
      capacity: "[CLIENT_REQUIRED]",
      equipment: ["[CLIENT_REQUIRED]"],
      tarifa: "[CLIENT_REQUIRED]",
    }
  ],
  faq: [
    { q: "¿Qué equipo está incluido?", a: "[CLIENT_REQUIRED]" }
  ]
}
```

Los componentes no saben si el contenido viene de un archivo local o de una API. Solo consumen el tipo `SalasDeEnsayoData`. Si en el futuro hay un CMS, solo cambia el `import` en el componente.

### Migración futura a CMS
Si el volumen de contenido crece o el cliente necesita editar sin tocar código, la migración es:
1. Elegir CMS (Sanity, Contentful, o solución más simple como Notion API).
2. Crear funciones `getData()` en `lib/` que consuman la API del CMS.
3. Reemplazar los imports de `/content/` en los Server Components por las llamadas a `getData()`.
4. Los componentes no cambian.

### MDX para contenido editorial (recursos/guías)
Si los recursos de `/recursos/*` son piezas de longread (artículos de 600–1200 palabras), se usa MDX con `@next/mdx` o `next-mdx-remote`. Los archivos `.mdx` viven en `/content/recursos/`. Si son cortos, un archivo `.ts` con el contenido como string es suficiente.

---

## F. SEO/AEO técnico

### Metadata por página

Next.js App Router maneja metadata a través de `generateMetadata()` en cada `page.tsx` o a través del objeto `metadata` exportado. La función `generatePageMetadata()` en `lib/metadata.ts` produce:

```
title:          "[Término de búsqueda] — Turpial Sound"
description:    Texto descriptivo único de 140–160 caracteres con intención y entidad
openGraph:      title, description, url, siteName, images, locale, type
twitter:        card "summary_large_image", title, description, images
alternates:     canonical (misma URL por defecto); hreflang si hay bilingüismo
robots:         index, follow (por defecto); noindex en páginas legales si aplica
```

### Schema JSON-LD por tipo de página

| Tipo de página | Schema principal | Schema secundario |
|---------------|-----------------|-------------------|
| Home | `Organization` + `LocalBusiness` | `WebSite` con sitelinks searchbox |
| Salas de ensayo | `LocalBusiness` + `Service` | `FAQPage` si hay FAQ inline |
| Estudio de grabación | `LocalBusiness` + `Service` | `FAQPage` |
| Producción musical | `LocalBusiness` + `Service` | — |
| Nosotros | `Organization` | `Person` (Frank Lemus + Susej Vera) |
| Artistas | `Organization` | — |
| Recursos / guías | `Article` | — |
| FAQ | `FAQPage` | — |
| Contacto | `LocalBusiness` (con address, telephone, openingHours) | — |

El Schema de `LocalBusiness` en la página de Contacto requiere: `name`, `address`, `telephone`, `openingHoursSpecification`, `url`. **[CLIENT_REQUIRED — todos estos datos]**

### Sitemap y robots
- `sitemap.xml` generado automáticamente por Next.js App Router desde `app/sitemap.ts`. Se configura para incluir todas las páginas públicas y excluir las páginas de placeholder que aún no tienen contenido real.
- `robots.txt` generado desde `app/robots.ts`. En desarrollo: `Disallow: /`. En producción: `Allow: /` con exclusiones de `/api/` si aplica.

### Rendimiento en páginas de entrada orgánica
Las páginas que se espera que reciban tráfico orgánico primero son las money pages. Requisitos técnicos mínimos:
- LCP < 2.5s: imagen hero con `priority={true}`, `sizes` optimizado
- CLS < 0.1: dimensiones declaradas en todas las imágenes, fuentes cargadas con `next/font`
- FID / INP < 200ms: mínimo JavaScript en el cliente; interactividad solo donde se necesita
- Core Web Vitals verificados en Vercel Analytics o Google Search Console antes del lanzamiento

### hreflang (solo si hay bilingüismo)
Si el cliente confirma versión en inglés, cada página en español tiene un `<link rel="alternate" hreflang="en" href="/en/...">` y viceversa. La URL canónica es siempre la del idioma principal de la página (ES para las ES, EN para las EN). Esto se implementa en la función `generatePageMetadata()`. **[CLIENT_REQUIRED — nivel de bilingüismo]**

---

## G. Media strategy

### Imágenes
- Formato origen: JPG o PNG de alta calidad (mínimo 1600px de ancho para imágenes hero).
- Formato de salida: `next/image` convierte automáticamente a WebP/AVIF según soporte del navegador.
- Siempre declarar `width` y `height` o usar `fill` con un contenedor de dimensiones explícitas.
- `priority={true}` en la imagen LCP de cada página (el hero, la foto principal de la sala o el estudio).
- `sizes` optimizado para el breakpoint real del componente: no usar `100vw` en imágenes que ocupan el 50% del viewport en desktop.
- Imágenes de artistas y testimonios: circular o con aspect ratio fijo (1:1 o 4:3) para consistencia visual.

### Video
- Video del hero: `<VideoBackground>` con `autoPlay muted loop playsInline`. Archivo `.mp4` con codec H.264 (máxima compatibilidad) + `.webm` como alternativa.
- Peso máximo del video de hero: 5–8 MB. Si el original pesa más, comprimir con `ffmpeg` antes de subir.
- Fallback: si el video no carga o si `prefers-reduced-motion: reduce` está activo, mostrar imagen estática de alta calidad.
- Videos de portafolio o demostraciones: `<iframe>` de YouTube/Vimeo (lazy loaded) o archivos `.mp4` alojados en CDN. No almacenar videos pesados en Vercel.

### Placeholders de imágenes
Durante el desarrollo, antes de que lleguen las fotos reales del cliente:
- Usar `placeholder="blur"` en `next/image` con un `blurDataURL` generado desde una imagen de baja resolución.
- Si no hay imagen real, usar un placeholder SVG con las dimensiones reales del slot y un color de fondo que no rompa el layout.
- **Nunca subir a producción con placeholder visible.** El proceso de QA verifica que todas las imágenes de placeholder estén reemplazadas.

### Prioridades de LCP
Por página, el elemento LCP esperado y su tratamiento:

| Página | LCP element esperado | Tratamiento |
|--------|---------------------|-------------|
| Home | Imagen del hero | `priority={true}` + `sizes="100vw"` |
| Salas de ensayo | Foto de sala en el hero | `priority={true}` + `sizes` según layout |
| Estudio de grabación | Foto de consola/booth | `priority={true}` |
| Producción musical | Foto del estudio en contexto | `priority={true}` |
| Nosotros | Foto de Frank Lemus o del espacio | `priority={true}` |
| Artistas | Texto o primer elemento visual (si hay galería, no es LCP crítico) | Lazy para galería |

---

## H. Motion / immersive layer

### Dónde sí podría existir motion o experiencia inmersiva

**Hero del Home — prioridad máxima:**
El único lugar donde la inversión en motion avanzado está justificada. Opciones (a evaluar al diseñar el sistema visual):
- Video de fondo con efectos de iluminación del espacio real
- Canvas con partículas de audio (ondas sonoras, puntos que responden a música) usando `React Three Fiber`
- Animación de luz con CSS/canvas puro (más liviana)
- Motion sutil de elementos de texto al cargar (Framer Motion, solo los titulares)

**Micro-interacciones de UI:**
- Hover en cards de servicio: elevación, borde sutil
- Transición de apertura del menú móvil
- Fade-in de contenido en páginas (solo above the fold inicial, con `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`)
- Transición suave entre páginas si se implementa page transition

**Acordeones FAQ:**
- Apertura/cierre con animación de altura fluida (Framer Motion `AnimatePresence`)

### Dónde no
- Páginas de FAQ y recursos (usuario está leyendo, no consumiendo visual)
- En los CTAs (no animar el botón de conversión principal)
- En la navegación (debe ser instantánea)
- En elementos del footer
- En páginas transaccionales de servicio más allá del hero de sección

### Cómo aislarlo técnicamente

**Componente del hero inmersivo:**
```
app/
└── page.tsx
    └── Suspense fallback={<HeroFallback />}  ← imagen estática
        └── HeroImmersive.tsx  ← 'use client', carga React Three Fiber si aplica
```

El hero inmersivo es un Client Component lazy-loaded envuelto en `Suspense`. Si R3F no carga (usuario con hardware limitado, error de WebGL), el fallback es una imagen estática de alta calidad. El resto del sitio no sabe que existe R3F.

**Regla de aislamiento:** ninguna dependencia de motion (`framer-motion`) o 3D (`@react-three/fiber`) debe ser importada en Server Components ni en el root layout. Solo los Client Components que los necesitan los importan.

**`prefers-reduced-motion`:**
Todos los componentes con motion respetan la preferencia del sistema operativo. En `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## I. Ruta de implementación

El orden correcto para construir el frente público sin retrabajo:

```
1. DISEÑO DE SISTEMA VISUAL (Fase 3 visual — antes del código)
   ├── design-principles.md
   ├── design-tokens.md (colores, tipografía, spacing, sombras, radio)
   ├── motion-rules.md
   └── layout-rules.md

2. CONFIGURACIÓN BASE DEL PROYECTO
   ├── Inicializar proyecto Next.js con TypeScript
   ├── Configurar Tailwind con tokens de diseño
   ├── Configurar ESLint + Prettier
   └── Configurar estructura de carpetas

3. SHELL GLOBAL (sin contenido real)
   ├── Root layout (html, body, fuentes)
   ├── Header (desktop + mobile)
   ├── Footer
   ├── CTA persistente
   └── Utilities: metadata.ts, schema.ts, utils.ts

4. COMPONENTES BASE
   ├── Button (variantes: primary, secondary, whatsapp)
   ├── OptimizedImage (wrapper de next/image)
   ├── JsonLd (Schema JSON-LD)
   ├── HeroSection (estructura base, sin motion todavía)
   ├── ServiceCard
   ├── CtaSection (cierre de página)
   └── FaqAccordion

5. PÁGINAS P1 (money pages prioritarias)
   ├── Home
   ├── Salas de ensayo
   ├── Estudio de grabación
   ├── Producción musical
   └── Contacto

6. SEO / SCHEMA BASE
   ├── generateMetadata() por cada página P1
   ├── Schema JSON-LD por cada página P1
   ├── sitemap.ts
   └── robots.ts

7. MOTION / HERO INMERSIVO
   ├── Diseñar y validar hero con cliente
   └── Implementar VideoBackground o HeroImmersive con R3F si aplica

8. PÁGINAS P2
   ├── Nosotros
   ├── Artistas (cuando haya lista autorizada)
   ├── Servicios complementarios
   └── Recursos y FAQ

9. REFINAMIENTO Y QA
   ├── Core Web Vitals
   ├── Accesibilidad básica
   ├── Revisión de placeholders pendientes
   └── SEO/schema validation

10. DEPLOY Y LANZAMIENTO
```

---

## J. Riesgos y vacíos

### Qué sigue dependiendo del cliente y no bloquea el shell

| Vacío | Impacto si no se resuelve | Bloquea el shell |
|-------|--------------------------|-----------------|
| Fotos del espacio | Las páginas de servicio tienen placeholders | No |
| Lista de artistas | La sección de artistas tiene placeholders | No |
| Ficha técnica del estudio | La página de equipamiento tiene placeholders | No |
| Bios del equipo | La página "Nosotros" tiene placeholders | No |
| Tarifas | No existe la página de tarifas hasta decidir | No |
| Dominio real | Las canónicas usan placeholder | No — se configura antes del deploy |

### Qué sí bloquearía la producción final (no el shell)

| Bloqueo | Qué bloquea |
|---------|-------------|
| Sin fotos reales del espacio | Las páginas transaccionales no pueden lanzarse sin imagen real |
| Sin lista de artistas autorizada | La sección `/artistas` no puede publicarse |
| Sin datos de contacto (WhatsApp, dirección) | La página `/contacto` no puede lanzarse |
| Sin decisión de bilingüismo | La arquitectura de i18n no puede confirmarse |
| Sin mecanismo de contacto definido | El CTA principal de todo el sitio no puede finalizarse |

### Qué no bloquea el inicio del trabajo técnico
- Todos los CLIENT_REQUIRED editoriales
- La decisión de motion del hero (se resuelve en el paso 7)
- El CMS (no existe en V1)
- La integración con el ODS (queda para `ods-architecture.md` y para cuando sea relevante)
