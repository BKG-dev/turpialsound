# Turpial Sound — Stack Decision

> Estado: **Fase 4 — Decisiones técnicas del frente público. No incluye el ODS.**
> Última actualización: 2026-03-26
> Fuente base: `CLAUDE.md` + `sitemap-master.md` + `page-briefs.md` + `messaging-pillars.md`

---

## Leyenda de estado

- **[CONFIRMED]** — decisión técnica sólida; no requiere validación adicional
- **[SUGGESTED]** — propuesta coherente; puede ajustarse con preferencia del equipo técnico
- **[CLIENT_REQUIRED]** — depende de dato o decisión del cliente antes de confirmar

---

## A. Propósito del documento

### Para qué existe
Congela las decisiones de stack del frente público de Turpial Sound para que el equipo técnico pueda iniciar el shell sin retrabajo por cambios de herramientas a mitad del proyecto.

### Qué resuelve
- Evita que cada desarrollador elija herramientas por preferencia personal sin criterio de proyecto.
- Define el mínimo de dependencias necesarias para arrancar bien.
- Previene el stacking prematuro de librerías que luego no se usan o que complican el mantenimiento.

### Qué decisiones congela
- Framework y estrategia de render
- Lenguaje
- Sistema de estilos
- Plataforma de deploy
- Package manager
- Linting y formateo
- Estrategia de contenido inicial
- Política de motion y 3D

### Qué NO define todavía
- El CMS final (pospuesto hasta que el volumen de contenido lo justifique)
- La integración técnica con el ODS (queda para `ods-architecture.md`)
- El sistema de design tokens en su forma final (queda para Fase 3 visual: `design-tokens.md`)
- Implementación técnica del bilingüismo (queda condicionada a confirmación del cliente)
- Infraestructura de formularios o reservas online si se decide ir más allá de WhatsApp

---

## B. Stack recomendado

| Capa | Tecnología | Estado |
|------|-----------|--------|
| **Framework** | Next.js 14+ (App Router) | [CONFIRMED] |
| **Lenguaje** | TypeScript estricto (`strict: true`) | [CONFIRMED] |
| **Styling — base** | Tailwind CSS v3+ | [CONFIRMED] |
| **Styling — aislamiento fino** | CSS Modules para componentes premium y piezas de alto detalle visual | [CONFIRMED] |
| **Render strategy** | SSG por defecto; ISR para contenido que pueda actualizarse | [CONFIRMED] |
| **Deploy** | Vercel | [CONFIRMED] |
| **Package manager** | pnpm | [SUGGESTED — más eficiente que npm/yarn en monorepos y proyectos con muchas dependencias] |
| **Linting** | ESLint con config Next.js + plugin TypeScript | [CONFIRMED] |
| **Formatting** | Prettier con configuración base del equipo | [CONFIRMED] |
| **Imágenes** | `next/image` — optimización automática, lazy loading, formatos modernos | [CONFIRMED] |
| **Fuentes** | `next/font` — carga optimizada, sin layout shift | [CONFIRMED] |
| **SEO / metadata** | Metadata API de Next.js App Router | [CONFIRMED] |
| **Schema markup** | JSON-LD en Server Components | [CONFIRMED] |
| **Motion — controlado** | Framer Motion para transiciones y micro-interacciones | [SUGGESTED — ver sección E] |
| **3D / inmersivo — condicional** | React Three Fiber + Drei solo si el hero lo justifica claramente | [SUGGESTED — ver sección E] |
| **i18n** | `next-intl` si se confirma bilingüismo | [CLIENT_REQUIRED — confirmar nivel de bilingüismo] |
| **Variables de entorno** | `.env.local` para desarrollo; variables de entorno en Vercel para producción | [CONFIRMED] |
| **Control de versiones** | Git — repositorio dedicado al proyecto del frente público | [CONFIRMED] |

---

## C. Decisión principal justificada

### ¿Por qué Next.js App Router?

**SEO/AEO desde el núcleo.** El frente público de Turpial Sound depende de posicionamiento orgánico local. Next.js con App Router genera HTML en servidor (Server Components por defecto), lo que garantiza que los buscadores e interfaces de IA indexen el contenido real sin depender de JavaScript del cliente.

**Metadata API nativa.** El sistema de `generateMetadata` por ruta permite definir `<title>`, `<description>`, Open Graph y Schema JSON-LD por página de forma precisa, sin librerías externas. Esto es crítico para las money pages con intenciones de búsqueda específicas.

**Performance sin configuración.** `next/image` para imágenes optimizadas (WebP/AVIF, lazy loading, prioridad de LCP), `next/font` para carga de tipografías sin layout shift, y SSG/ISR para páginas que no cambian frecuentemente. Todo esto sin trabajo adicional del desarrollador.

**Arquitectura escalable y predecible.** App Router introduce colocation de componentes, layouts por segmento de ruta, loading/error states granulares y una separación clara entre Server y Client Components. Esto reduce el riesgo de llenar de JavaScript el cliente innecesariamente.

**Vercel como plataforma natural.** La integración Vercel + Next.js ofrece: preview deployments automáticos por branch, analytics básicos sin configuración, Edge Network, rollbacks simples y cero fricción de CI/CD.

### ¿Por qué TypeScript estricto?
Un sitio premium no puede tener errores de runtime en producción. TypeScript estricto obliga a declarar tipos correctamente, captura errores antes del deploy y hace el código más mantenible a largo plazo, especialmente cuando el equipo crece o el proyecto se retoma después de meses.

### ¿Por qué Tailwind + CSS Modules juntos?
- **Tailwind** para velocidad de composición en la mayoría de los componentes: spacing, colores del sistema, tipografía utilitaria, responsive.
- **CSS Modules** para las piezas de mayor complejidad visual: el hero inmersivo, animaciones de partículas o luz, componentes donde los selectores de Tailwind se vuelven ilegibles o donde se necesita precisión de capas CSS.

La combinación no es contradictoria: Tailwind maneja el sistema; CSS Modules maneja las excepciones de alta complejidad. Evita el `globals.css` gigantesco.

---

## D. Decisiones descartadas

### CMS complejo en V1
**Descartado.** El volumen de contenido de V1 no justifica la fricción de integrar un headless CMS (Contentful, Sanity, Prismic) desde el arranque. El contenido inicial vivirá en archivos de datos (`/content` o `/data` en el proyecto). Si el sitio escala a un blog activo o si el cliente quiere editar contenido sin tocar código, se migra al CMS apropiado con una interfaz de abstracción ya preparada.

### Three.js / R3F en todas las páginas
**Descartado.** El documento maestro CLAUDE.md es explícito: el efecto visual de alto impacto se concentra en 1–2 momentos del sitio (hero principalmente). Saturar el sitio de WebGL destruiría el LCP, complicaría el mantenimiento y podría ser incompatible con el posicionamiento premium sobrio. Si se decide usar R3F, se aísla en un componente lazy-loaded específico del hero.

### Animaciones pesadas con GSAP o librerías completas de scroll
**Descartado para V1.** Framer Motion con uso controlado es suficiente para las transiciones que el sitio necesita. GSAP tiene una API poderosa pero una curva de aprendizaje y un peso que no se justifican en esta etapa. Si en la producción final se requiere scroll storytelling avanzado, se evalúa en ese momento.

### Backend custom / API propia para el frente público
**Descartado.** El frente público en V1 no necesita un backend propio. Los formularios de contacto se manejan con un servicio ligero (Resend, Formspree o similar) o directamente vía WhatsApp. La integración con el ODS, si llega a existir, se hace a través de los endpoints de Apps Script ya definidos, no a través de un backend custom.

### Acoplamiento directo con el ODS en el frente público
**Descartado explícitamente.** CLAUDE.md lo prohíbe y la arquitectura del proyecto lo refuerza. El frente público nunca debe depender de la disponibilidad del sistema Google Workspace para servir sus páginas. Si hay alguna integración (formulario que crea una ODS), pasa por un endpoint externo, es asíncrona y nunca bloquea la renderización del sitio.

### Emotion o styled-components
**Descartados.** Añaden complejidad de runtime y conflictos con el modelo de Server Components de Next.js App Router. Tailwind + CSS Modules cubre todos los casos de uso de este proyecto con menor fricción y mejor performance.

---

## E. Reglas de implementación

### Server Components vs. Client Components
- **Por defecto:** todos los componentes son Server Components. Solo se agrega `'use client'` cuando el componente necesita estado local, eventos del navegador, hooks de React o acceso al DOM.
- **Regla práctica:** si el componente solo renderiza HTML y no tiene interactividad, es Server Component. Si tiene `useState`, `useEffect`, listeners de eventos o animaciones de Framer Motion, es Client Component.
- **Evitar:** hacer Client Component un árbol entero de componentes solo porque uno de ellos necesita estado. Aislar el estado en el componente más pequeño posible.

### Cuándo usar motion
- **Sí:** hero principal (entrada de elementos, ambient motion de fondo, transición de scroll suave).
- **Sí:** transiciones de página ligeras (fade-in de contenido al cargar).
- **Sí:** micro-interacciones de UI (hover en cards de servicio, apertura de dropdown de navegación).
- **No:** animaciones decorativas que distraigan del contenido o CTA.
- **No:** scroll-triggered animations pesadas en páginas de servicio transaccionales.
- **No:** loading animations que retrasen la percepción de carga del contenido principal.

**Regla de oro:** si quitar la animación hace que la página funcione igualmente bien, la animación no debe existir.

### Cuándo evitar motion
- En cualquier componente que sea crítico para el LCP (Largest Contentful Paint).
- En la navegación principal (debe ser instantánea).
- En CTAs (la fricción de una animación puede reducir conversiones).
- En páginas de FAQ y recursos (el usuario está leyendo, no consumiendo experiencia visual).

### Cómo tratar imágenes y video
- Todas las imágenes pasan por `next/image` con `priority={true}` en las imágenes above the fold.
- Los formatos de origen deben ser JPG/PNG de alta calidad; `next/image` convierte a WebP/AVIF automáticamente.
- El video del hero (si existe) se maneja con `<video>` nativo con `autoplay muted loop playsInline` y sin audio. No usar `<iframe>` de YouTube en el hero.
- Las imágenes de las salas y del estudio son CLIENT_REQUIRED; el desarrollo puede avanzar con placeholders SVG de dimensiones reales para no romper los layouts.

### Cómo tratar contenidos placeholders
- Los textos en `[PLACEHOLDER]` van como strings literales con el marcador visible en desarrollo: `"[Descripción de la sala - pendiente del cliente]"`.
- Las imágenes placeholder usan dimensiones reales del slot con un color de fondo y texto de descripción.
- Los datos numéricos pendientes (número de artistas, años) se extienden de forma que el layout no se rompa cuando llegue el dato real.
- Ningún placeholder debe llegar a producción: el proceso de QA verifica que todos los marcadores estén resueltos antes del lanzamiento.

### Cómo proteger performance
- LCP target: < 2.5 segundos en conexión 3G lenta.
- No cargar librerías de animación en páginas donde no hay animación.
- Lazy loading de componentes pesados (R3F si se usa, carruseles, mapas).
- Prefetch de rutas de las money pages desde Home.
- No bloquear el render con peticiones de datos innecesarias; las páginas son estáticas por defecto.

### Cómo proteger maintainability
- Naming explícito en todos los archivos: preferir `HeroSection.tsx` sobre `Hero.tsx`; `ServiceCard.tsx` sobre `Card.tsx`.
- No crear abstracciones prematuras: si un componente se usa una sola vez, no necesita ser genérico.
- Los tokens de diseño (colores, tipografía, spacing) viven en `tailwind.config.ts`, no dispersos en clases arbitrarias.
- Los textos de UI que son strings estáticos viven en archivos de constantes o datos, no hardcodeados en el JSX.

---

## F. Dependencias técnicas mínimas para el shell

Lista solo las dependencias necesarias para iniciar el shell con buen criterio. Se añadirán otras cuando sean estrictamente necesarias.

### Core
```
next@14+
react@18+
react-dom@18+
typescript
```

### Styling
```
tailwindcss
postcss
autoprefixer
@tailwindcss/typography    ← para páginas de recursos/FAQ/blog si aplica
```

### Development
```
eslint
eslint-config-next
@typescript-eslint/eslint-plugin
@typescript-eslint/parser
prettier
prettier-plugin-tailwindcss  ← ordena clases de Tailwind automáticamente
```

### Motion (añadir cuando se diseñe el hero, no antes)
```
framer-motion
```

### 3D / inmersivo (añadir solo si se decide usar en el hero, evaluación posterior)
```
@react-three/fiber
@react-three/drei
three
@types/three
```

### i18n (añadir solo cuando se confirme bilingüismo)
```
next-intl
```

### Formularios (añadir cuando se defina el mecanismo de contacto)
```
react-hook-form + zod    ← si hay formulario nativo
```
O bien: integración directa con Resend, Formspree o similar según decisión del cliente.

**Regla:** no instalar dependencias con antelación. Solo se añade lo que se va a usar en la iteración actual.

---

## G. Riesgos técnicos a evitar

| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| **Stacking prematuro** | Instalar librerías "por si acaso" que luego inflan el bundle y nadie usa | Instalar dependencias solo cuando se van a usar en esa iteración |
| **Client Components en exceso** | Convertir en `'use client'` componentes que no lo necesitan, perdiendo los beneficios del SSR | Revisar cada `'use client'` en PR: ¿es realmente necesario? |
| **globals.css gigantesco** | Acumular estilos globales sin estructura, creando especificidad caótica | Tokens en `tailwind.config.ts`; CSS Modules para piezas específicas; `globals.css` solo para resets y fuentes |
| **Hero con R3F mal aislado** | WebGL que bloquea el hilo principal, destroza el LCP y es imposible de desactivar en móvil | Aislar en componente lazy-loaded con fallback estático; `Suspense` con imagen estática como placeholder |
| **Animaciones que bloquean LCP** | Motion que retrasa la percepción del contenido principal | Nunca animar el LCP element; usar `initial={{ opacity: 0 }}` solo en elementos below the fold |
| **Acoplamiento temprano con ODS** | Importar lógica del ODS en el frente público o compartir código | Frontera explícita: el sitio público solo hace fetch a endpoints externos; nunca importa módulos del ODS |
| **Estructura de carpetas caótica** | Archivos sin categoría, nombres genéricos, rutas mezcladas con componentes de UI | Estructura definida desde el día 1 en `app-architecture.md` |
| **Deuda TypeScript** | Usar `any` como escape hatch, perdiendo los beneficios del tipado | ESLint rule: `no-explicit-any`; si no sabes el tipo, investigar antes de usar `any` |
| **Imágenes sin dimensiones** | `<img>` sin `width`/`height` que produce layout shift (CLS alto) | Usar siempre `next/image` con dimensiones declaradas |

---

## H. Estado de confirmación por decisión

| Decisión | Estado |
|----------|--------|
| Next.js 14+ App Router | [CONFIRMED] |
| TypeScript estricto | [CONFIRMED] |
| Tailwind CSS | [CONFIRMED] |
| CSS Modules para piezas premium | [CONFIRMED] |
| SSG por defecto + ISR | [CONFIRMED] |
| Vercel para deploy | [CONFIRMED] |
| pnpm como package manager | [SUGGESTED] |
| ESLint + Prettier | [CONFIRMED] |
| next/image + next/font | [CONFIRMED] |
| Metadata API para SEO | [CONFIRMED] |
| JSON-LD en Server Components | [CONFIRMED] |
| Framer Motion para motion controlado | [SUGGESTED — confirmar al diseñar hero] |
| React Three Fiber para hero 3D | [SUGGESTED — evaluar en diseño del hero] |
| next-intl para i18n | [CLIENT_REQUIRED — confirmar bilingüismo] |
| react-hook-form + zod para formulario | [CLIENT_REQUIRED — confirmar mecanismo de contacto] |
| No CMS en V1 | [CONFIRMED] |
| No acoplamiento directo con ODS | [CONFIRMED] |
