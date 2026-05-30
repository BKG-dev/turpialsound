# Turpial Sound â€” RRSS Content Bot Source Sprint: Handoff

**VersiÃ³n:** v1.0
**Fecha:** 2026-05-30
**Rama:** `Manuel/rrss-content-bot-source-2026-05-29`
**Commit:** Pendiente de commit
**Estado:** DRAFT â€” Base documental completa. Contenido no publicado.

---

## QuÃ© Se Hizo

Se creÃ³ la base documental completa para el futuro RRSS Content Bot de Turpial Sound. El sprint fue **docs/content-only**: no se tocÃ³ cÃ³digo funcional, no se conectaron APIs, no se publicÃ³ contenido en redes sociales, no se usaron credenciales ni tokens.

---

## Archivos Creados

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `docs/marketing/rrss/00_rrss_strategy.md` | Estrategia completa de RRSS: objetivos, audiencia, canales, mÃ©tricas, riesgos, cadencia |
| 2 | `docs/marketing/rrss/01_brand_voice.md` | Voz de marca para RRSS: tono, palabras, claims prohibidos, CTAs, reglas de respuesta |
| 3 | `docs/marketing/rrss/02_content_pillars.md` | 6 pilares de contenido con objetivos, formatos, ejemplos y riesgos por pilar |
| 4 | `docs/marketing/rrss/03_facebook_page_source.md` | PÃ¡gina de Facebook: nombre, bio, descripciÃ³n, FAQ, posts iniciales, configuraciones |
| 5 | `docs/marketing/rrss/04_instagram_page_source.md` | Perfil de Instagram: bio, highlights, hashtags, ideas de posts/reels/stories |
| 6 | `docs/marketing/rrss/05_calendar_30_days.md` | Calendario editorial de 30 dÃ­as con 33 publicaciones planificadas |
| 7 | `docs/marketing/rrss/06_posts_batch_01.md` | 20 posts completos (copy, CTA, hashtags, assets, riesgos) |
| 8 | `docs/marketing/rrss/07_reels_stories_scripts.md` | 10 guiones de reels, 10 secuencias de stories, 5 ideas de carruseles |
| 9 | `docs/marketing/rrss/08_asset_inventory.md` | Inventario de assets en `/public`: fotos, videos, logos, brechas |
| 10 | `docs/marketing/rrss/09_meta_business_suite_manual_workflow.md` | Workflow manual seguro para Meta Business Suite |
| 11 | `docs/marketing/rrss/10_bot_workflow_spec.md` | EspecificaciÃ³n futura del bot (inputs, outputs, estados, fases v1-v3) |
| 12 | `docs/marketing/rrss/11_dropsocial_dm_automation.md` | Benchmark DropSocial DM Automation: flujos, keywords, plantillas, riesgos |
| 13 | `docs/marketing/rrss/12_council_review.md` | Consejo de Expertos: 6 especialistas revisan y corrigen el plan |
| 14 | `docs/07_handoffs/rrss-content-bot-source-2026-05-29.md` | Este handoff |
| 15 | `docs/obsidian-vault/RRSS_CONTENT_BOT.md` | Resumen para vault de Obsidian |

---

## Fuentes Revisadas

- `docs/01_strategy/brand-core.md` â€” Identidad de marca
- `docs/01_strategy/customer-profiles.md` â€” Perfiles de cliente
- `docs/03_editorial/tone-of-voice.md` â€” GuÃ­a de tono
- `docs/03_editorial/messaging-pillars.md` â€” 5 pilares de mensaje
- `docs/marketplace/` â€” Arquitectura del marketplace (21 documentos)
- `public/` â€” 262+ imÃ¡genes, 4 videos, 1 audio, logos
- `app/marketplace/` â€” Estructura de marketplace en Next.js
- `components/marketplace/` â€” Componentes del marketplace
- `package.json` â€” Stack tecnolÃ³gico (Next.js 14, Tailwind, Prisma, PostgreSQL)

---

## Assets Relevantes

- **262+ fotos** en `public/images/` (estudio, salas, producciÃ³n, artistas, instalaciones).
- **4 videos** (2 cinematic estudio, 2 verticales para RRSS).
- **1 audio ambiente** del estudio.
- **Logos en SVG, PNG y GLB** (3D).
- **Fotos de listings del marketplace** en `public/public-media/marketplace/listings/`.
- **Brechas identificadas:** portada de FB, perfil de IG optimizado, plantillas de carruseles, grÃ¡fico de operaciÃ³n protegida.

---

## Decisiones Editoriales

1. **70% valor / 30% conversiÃ³n** como balance de contenido.
2. **6 pilares de contenido:** Confianza, Comunidad, Marketplace, EducaciÃ³n Compradores, EducaciÃ³n Vendedores, Estudio y Servicios.
3. **Cadencia:** 4-5 publicaciones por semana entre IG y FB, 1-2 reels por semana, 3-4 tandas de stories.
4. **Voz de marca:** Profesional sin corporativo, tÃ©cnico sin pretencioso, humano sin informal barato.
5. **Claims prohibidos:** superlativos sin evidencia, nombres de artistas sin autorizaciÃ³n, precios exactos sin confirmaciÃ³n.
6. **CTA principal:** WhatsApp para conversiÃ³n. "Link en bio" para exploraciÃ³n.
7. **Hashtags:** 10-15 por post en IG, base fija + especÃ­ficos por tipo de contenido.
8. **DiferenciaciÃ³n FB vs. IG:** FB mÃ¡s extenso y comunitario. IG mÃ¡s visual, corto y de alto impacto.

---

## Decisiones sobre DropSocial

1. **DropSocial es una sub-marca de referidos del marketplace** (existente en cÃ³digo, no activada en producciÃ³n).
2. **DM Automation es un diseÃ±o futuro.** NADA estÃ¡ implementado ni conectado.
3. **Flujos diseÃ±ados:** comprador nuevo, vendedor nuevo, usuario desconfiado, usuario de reel, publicaciÃ³n de equipo, consulta de compra protegida.
4. **Keywords definidas:** 14 palabras clave con respuestas automÃ¡ticas sugeridas.
5. **Plantillas creadas:** 10 respuestas DM, 10 comentarios pÃºblicos, 5 seguimientos, 5 cierres, 5 derivaciones a humano.
6. **RecomendaciÃ³n:** No activar hasta que el marketplace tenga 20+ listings activos y 5+ transacciones completadas. Operar manualmente 60-90 dÃ­as antes de automatizar.
7. **Riesgos documentados:** no prometer disponibilidad, no confirmar pagos, no pedir datos sensibles por DM, siempre dejar salida a humano.

---

## Resultado del Consejo de Expertos (resumido)

**6 expertos revisaron la base documental.**

- **Brand Strategist:** APROBADO. Limitar repeticiÃ³n de "10+ aÃ±os" y alternar "hub" con lenguaje mÃ¡s accesible.
- **Growth Strategist:** APROBADO CON RESERVAS. Falta lead magnet y embudo definido.
- **Community Manager:** APROBADO CON AJUSTES. Diversificar CTAs y agregar interacciÃ³n en stories.
- **Trust & Risk Advisor:** APROBADO CON CORRECCIONES. Corregir claim de comisiones en Post #17 y documentar protocolo de disputa.
- **Contrarian Editor:** SÃ“LIDO CON PUNTOS CIEGOS. MÃ¡s contenido sobre dinero y emociones. Riesgo de tono frÃ­o.
- **Chairman:** APROBAR CON 10 CORRECCIONES OBLIGATORIAS (listadas en `12_council_review.md`).

**Veredicto final:** Base sÃ³lida. Publicable con correcciones menores. No requiere rehacer nada.

---

## MCP Exploration

### MCPs disponibles detectados
**Ninguno.** No hay servidores MCP configurados en el proyecto (`.kilo/kilo.json`) ni en el config global (`C:\Users\mvera\.config\kilo\kilo.jsonc`).

### MCPs investigados (referencia online)
Se investigÃ³ el repositorio oficial de MCP (`github.com/modelcontextprotocol/servers`):
- **Filesystem MCP:** `@modelcontextprotocol/server-filesystem` â€” Ãštil para inventario profundo de assets. No necesario: Kilo ya accede bien al repo local.
- **Fetch MCP:** `@modelcontextprotocol/server-fetch` â€” Ãštil para web scraping pÃºblico de benchmarks. No necesario en este sprint.
- **Git MCP:** `uvx mcp-server-git` â€” Ãštil para operaciones git. No necesario con el CLI de git disponible.
- **Memory MCP:** `@modelcontextprotocol/server-memory` â€” Para persistencia entre sesiones. Potencialmente Ãºtil en fase futura.

### MCPs usados
**Ninguno.** Se trabajÃ³ 100% con las herramientas nativas de Kilo (filesystem, grep, glob, bash).

### MCPs recomendados para futuro
- **Brave Search MCP** (oficial): Para benchmark de competencia, tendencias de RRSS, investigaciÃ³n de mercado.
- **Puppeteer MCP** (archivado, requiere evaluaciÃ³n): Para capturar screenshots del marketplace o verificar links. Solo en entorno controlado, sin credenciales.
- **Filesystem MCP** si el repo crece a un tamaÃ±o donde Kilo necesite ayuda indexando.

### MCPs descartados
- GitHub MCP: no necesario (repo local tiene suficiente contexto).
- PostgreSQL MCP: prohibido (tocarÃ­a DB).
- Google Drive MCP: no necesario (assets en repo).
- Figma MCP: no hay brand kit en Figma.
- Obsidian MCP: vault dentro del repo, se edita Markdown directo.

### Riesgos de seguridad
**Cero.** No se conectÃ³ ningÃºn MCP. No se instalÃ³ ningÃºn MCP nuevo. No se usaron tokens, APIs, ni servicios externos.

---

## Riesgos

1. **Assets faltantes:** Portada de FB, perfil IG optimizado, plantillas de carruseles y grÃ¡fico de operaciÃ³n protegida no existen. Deben producirse antes de publicar.
2. **Datos CLIENT_REQUIRED:** DirecciÃ³n exacta, horarios, bios, ficha tÃ©cnica, precios reales. Sin estos datos, varios posts no pueden publicarse tal cual.
3. **Permisos de artistas:** Fotos de Oscar D'LeÃ³n, Domingo QuiÃ±ones, DimensiÃ³n Latina y Frank Quintero existen en el repo pero requieren autorizaciÃ³n escrita para RRSS.
4. **ComisiÃ³n del marketplace:** El 5% mencionado en posts debe ser confirmado por el cliente como vigente.
5. **Sin pÃ¡gina de Facebook creada:** La base documental asume que la pÃ¡gina se crearÃ¡. Si ya existe, los datos deben validarse contra la pÃ¡gina real.
6. **Sin cuenta de Instagram business:** Si existe cuenta personal, debe migrarse o crear una nueva.

---

## Pendientes

1. Aplicar las 10 correcciones del Consejo de Expertos (`12_council_review.md`).
2. Producir assets faltantes (`08_asset_inventory.md`).
3. Crear pÃ¡gina de Facebook siguiendo `03_facebook_page_source.md`.
4. Optimizar perfil de Instagram siguiendo `04_instagram_page_source.md`.
5. Validar copy de los 20 posts con el cliente.
6. Obtener permisos para fotos de artistas.
7. Confirmar comisiÃ³n del 5% del marketplace.
8. Producir primeros 3 reels segÃºn guiones.
9. Iniciar publicaciÃ³n manual siguiendo el calendario.
10. Mantener bitÃ¡cora de aprendizaje de posts.

---

## PrÃ³ximo Sprint Recomendado

**Sprint de ProducciÃ³n de Contenido RRSS:**
1. Aplicar correcciones del Consejo de Expertos.
2. Producir assets grÃ¡ficos y audiovisuales.
3. Grabar reels iniciales.
4. Iniciar publicaciÃ³n manual.
5. Revisar resultados de los primeros 15 dÃ­as.
6. Ajustar estrategia segÃºn datos reales.

---

## QuÃ© NO Se Hizo (por diseÃ±o)

- No se publicÃ³ nada en redes sociales.
- No se conectaron APIs de Meta, Instagram, Facebook, DropSocial.
- No se usaron credenciales, tokens ni secrets.
- No se instalaron MCPs nuevos.
- No se tocÃ³ cÃ³digo funcional (app/, components/, lib/, actions/, prisma/).
- No se tocÃ³ base de datos.
- No se tocaron migraciones ni schema.
- No se tocÃ³ producciÃ³n.
- No se hizo `git add .` ni merge a main.

---

## QuÃ© Queda Prohibido Hasta AutorizaciÃ³n Futura

- Conectar Meta Graph API, Instagram API o Facebook API.
- Activar DM automation real.
- Publicar contenido automÃ¡ticamente sin revisiÃ³n humana.
- Usar nombres de artistas sin autorizaciÃ³n escrita.
- Publicar precios exactos sin confirmaciÃ³n del cliente.
- Configurar Meta Ads sin aprobaciÃ³n.
- Instalar MCPs con login, cookies, tokens o permisos de publicaciÃ³n.

---

**Handoff completado.**
**Rama:** `Manuel/rrss-content-bot-source-2026-05-29`
**Base documental lista para revisiÃ³n y producciÃ³n.**
