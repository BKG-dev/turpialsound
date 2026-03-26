# Turpial Sound — Roadmap Master

> Documento de gobierno del progreso del proyecto. Se actualiza al cerrar cada fase o punto de control.

---

## Estado actual: **Fase 4 en progreso — Shell técnico del frente público creado**

Última actualización: 2026-03-26

> **Nota sesión 2026-03-26 (sesión 1):** Se han creado los 6 documentos estratégicos de `docs/01_strategy/`. Todos están en estado de consolidación: los datos confirmados del intake están registrados, las inferencias estratégicas están marcadas como [SUGERIDO] y los datos que solo el cliente puede proveer están marcados como [CLIENT_REQUIRED]. Fase 1 permanece abierta hasta que los bloques críticos A, B, C y D estén resueltos con datos reales del cliente.
>
> **Nota sesión 2026-03-26 (sesión 2):** Se ha creado `docs/02_information_architecture/sitemap-master.md` como sitemap maestro provisional. El trabajo puede avanzar en paralelo sobre la arquitectura mientras Fase 1 completa sus CLIENT_REQUIRED.
>
> **Nota sesión 2026-03-26 (sesión 3):** Se han creado `url-architecture.md`, `navigation-system.md` e `internal-linking-logic.md` en `docs/02_information_architecture/`. La arquitectura de información de Fase 2 está en construcción activa. Los tres documentos son provisionales; los aspectos que dependen del cliente (CTA, nombres de salas, nivel de bilingüismo, servicios activos en V1, portafolio) están marcados como [CLIENT_REQUIRED] y no bloquean el trabajo de arquitectura pero sí bloquean la versión final.
>
> **Nota sesión 2026-03-26 (sesión 4):** Se han creado `docs/03_editorial/page-briefs.md` con 10 briefs completos y `docs/03_editorial/content-matrix.md` con la matriz de bloques por página. Fase 2 se considera **provisionalmente completa** (le falta `content-clusters.md` pero la base arquitectónica está sólida). Fase 3 queda en apertura.
>
> **Nota sesión 2026-03-26 (sesión 5):** Se han creado `docs/03_editorial/messaging-pillars.md` con 5 pilares completos y `docs/03_editorial/tone-of-voice.md` con el sistema de tono completo. **Fase 3 queda cerrada provisionalmente.** El sistema editorial está operativo.
>
> **Nota sesión 2026-03-26 (sesión 6):** Se han creado `docs/05_technical/stack-decision.md` y `docs/05_technical/app-architecture.md`. **Fase 4 queda abierta formalmente.** La arquitectura técnica del frente público está documentada: stack confirmado (Next.js 14+ App Router + TypeScript + Tailwind + Vercel), estructura de carpetas definida, ruta de implementación en 10 pasos, SEO/AEO técnico especificado, estrategia de media y motion definida. El siguiente paso es crear los documentos de sistema visual (design tokens, motion rules, layout rules) y luego iniciar el shell técnico.
>
> **Nota sesión 2026-03-26 (sesión 8):** **Shell técnico del frente público creado.** 40+ archivos generados: configuración raíz (next.config, tailwind.config, tsconfig, eslint, prettier), tipos TypeScript, capa lib (metadata factory, schema generators, utils), capa content (site config, navigation, services, faq, artists), estilos globales con CSS variables y design tokens provisionales [SUGGESTED], componentes P1 (Button, SiteHeader, SiteFooter, MobileMenu, PageHero, SectionShell, CTASection, FAQList, ContactBlock), app layout con Syne + Inter fonts, y shells para todas las rutas: Home, Nosotros, Salas de ensayo, Estudio de grabación, Producción musical, Servicios (hub + 4 satélites), Artistas, Recursos, FAQ, Contacto, Política de privacidad. JSON-LD schema en cada página relevante. sitemap.ts y robots.ts generados. Pending: `npm install` + `npm run build` para validar.

---

## Fases y estado

| Fase | Nombre | Estado | Bloqueantes |
|------|--------|--------|-------------|
| 1 | Intake y verdad base | EN PROGRESO | Ver sección de huecos críticos |
| 2 | Arquitectura de autoridad | PENDIENTE | Requiere cierre de Fase 1 |
| 3 | Sistema editorial y visual | PENDIENTE | Requiere cierre de Fase 2 |
| 4 | Shell técnico y ODS refactor boundary | PENDIENTE | Requiere cierre de Fase 3 |
| 5 | Producción guiada | PENDIENTE | Requiere cierre de Fase 4 |
| 6 | QA, compactación y release | PENDIENTE | Requiere cierre de Fase 5 |

---

## Lo que está firme (acumulado hasta hoy)

### Identidad base
- **Nombre oficial:** Turpial Sound
- **Año de inicio:** 2015
- **Voceros:** Frank Lemus y Susej Vera
- **Tono matriz:** artístico, premium y disruptivo
- **Percepción deseada:** mejor experiencia en instalaciones, equipamiento y criterio técnico para ensayos, grabación y producción en Caracas

### Negocio
- **Oferta núcleo:** salas de ensayo, estudios de grabación, producción musical
- **Oferta expandida:** mezcla, masterización, arreglos, grabación de instrumentos, podcast, locución, video studio session, consultoría
- **Ticket promedio:** 100 USD
- **Modelo:** B2B y B2C

### Posicionamiento
- **Nicho:** estudios de grabación / música
- **Subnicho:** producción musical
- **Categoría a dominar:** hub premium de ensayo, grabación y producción musical en Caracas
- **Mercado:** Caracas, Venezuela
- **Idioma principal:** español / sitio bilingüe

### Prueba de autoridad disponible
- Lista amplia de artistas reconocidos (Oscar D'León, Domingo Quiñones, Dimensión Latina, entre muchos otros)
- 30 años de experiencia acumulada del equipo

---

## Huecos críticos que bloquean Fase 1

Los siguientes ítems están **PENDIENTES DE VALIDACIÓN** y bloquean el avance a Fase 2:

### Bloque A — Conversión y objetivos del sitio (CRÍTICO)
- [ ] CTA principal definitivo (¿WhatsApp / reservar / consultar disponibilidad?)
- [ ] Conversión de mayor valor priorizada (¿renta de sala o producción integral?)
- [ ] Objetivo principal del sitio en una frase aprobada
- [ ] Métricas de éxito a 90 días acordadas

### Bloque B — Ecosistema digital (CRÍTICO)
- [ ] Dominio actual o dominio deseado
- [ ] Sitio web existente (URL si existe)
- [ ] Redes activas y URLs
- [ ] Google Business Profile: ¿existe?
- [ ] Canal que más convierte hoy

### Bloque C — Entidad y autoridad (CRÍTICO)
- [ ] Biografía oficial de Frank Lemus (cargo, trayectoria verificable)
- [ ] Biografía oficial de Susej Vera (cargo, trayectoria)
- [ ] Artistas/casos autorizados para publicar públicamente
- [ ] Perfiles externos verificables (LinkedIn, Spotify, medios, etc.)

### Bloque D — Competidores y referentes (CRÍTICO)
- [ ] 5–10 competidores directos con enlaces
- [ ] 5 referentes aspiracionales con enlaces
- [ ] Vacío de mercado que Turpial Sound puede adueñarse

### Bloque E — Dirección creativa (IMPORTANTE)
- [ ] Referencias visuales aprobadas (sitios, marcas, campañas)
- [ ] Colores confirmados (¿existe manual de marca?)
- [ ] Fotografías y videos reales del espacio disponibles

### Bloque F — Operación y accesos (IMPORTANTE)
- [ ] Decisor final del proyecto (nombre)
- [ ] Revisor de textos y diseño (nombre)
- [ ] Canal oficial de feedback y aprobaciones
- [ ] Accesos técnicos: dominio/DNS, hosting, Analytics, Search Console, Git, Drive

---

## Criterio de cierre de Fase 1

Fase 1 se considera cerrada cuando estén resueltos los Bloques A, B, C y D (críticos).
Los bloques E y F pueden resolverse al inicio de Fase 2.

Al cerrar Fase 1, se crean:
- `docs/01_strategy/brand-core.md`
- `docs/01_strategy/market-positioning.md`
- `docs/01_strategy/offers-and-economics.md`
- `docs/01_strategy/customer-profiles.md`
- `docs/01_strategy/authority-map.md`
- `docs/01_strategy/competitors-and-gaps.md`

---

## Documentos activos del proyecto

| Documento | Carpeta | Estado |
|-----------|---------|--------|
| `roadmap-master.md` | `00_governance/` | Activo |
| `cuestionario_maestro_cliente_turpial_song.md` | `intake/` | Parcialmente respondido |
| `turpial_sound_control_point_01.md` | `control-points/` | Completo con inferencias |
| `session-summary-active.md` | `07_handoffs/` | Activo |
| `next-window-brief.md` | `07_handoffs/` | Activo |
| `brand-core.md` | `01_strategy/` | En consolidación — CLIENT_REQUIRED pendientes |
| `market-positioning.md` | `01_strategy/` | En consolidación — CLIENT_REQUIRED pendientes |
| `offers-and-economics.md` | `01_strategy/` | En consolidación — CLIENT_REQUIRED pendientes |
| `customer-profiles.md` | `01_strategy/` | En consolidación — CLIENT_REQUIRED pendientes |
| `authority-map.md` | `01_strategy/` | En consolidación — CLIENT_REQUIRED pendientes |
| `competitors-and-gaps.md` | `01_strategy/` | En consolidación — CLIENT_REQUIRED pendientes |
| `sitemap-master.md` | `02_information_architecture/` | Provisional — requiere validación del cliente para versión final |
| `url-architecture.md` | `02_information_architecture/` | Provisional — slugs ES definidos; bilingüismo y subpáginas de sala pendientes |
| `navigation-system.md` | `02_information_architecture/` | Provisional — estructura definida; CTA y bilingüismo pendientes del cliente |
| `internal-linking-logic.md` | `02_information_architecture/` | Provisional — lógica definida; depende de qué páginas existen en V1 |
| `page-briefs.md` | `03_editorial/` | Operativo — 10 briefs completos; bloques con CLIENT_REQUIRED identificados |
| `content-matrix.md` | `03_editorial/` | Operativo — matriz de bloques por página con estado y nota operativa |
| `messaging-pillars.md` | `03_editorial/` | Operativo — 5 pilares completos con evidencia, riesgos y mapa de aplicación |
| `tone-of-voice.md` | `03_editorial/` | Operativo — sistema de tono completo con ejemplos antes/después |
| `stack-decision.md` | `05_technical/` | Confirmado — Next.js 14+ App Router + TypeScript + Tailwind + Vercel |
| `app-architecture.md` | `05_technical/` | Operativo — estructura de carpetas, dominios, SEO, media, motion, ruta de implementación |
