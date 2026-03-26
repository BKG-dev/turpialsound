# TURPIAL SOUND — SISTEMA MAESTRO UNIFICADO PARA CLAUDE CODE

> Documento maestro consolidado. Este archivo integra el replanteamiento estratégico reciente como fuente principal de gobierno y preserva, sin duplicaciones innecesarias, los avances ya logrados en la etapa inicial de Turpial Sound, especialmente el motor ODS y sus funciones operativas.

---

## 0) Jerarquía de este documento

### Regla de prioridad
1. **Este documento manda sobre cualquier versión previa fragmentada.**
2. **El replanteamiento estratégico reciente gobierna la metodología, la arquitectura, el stack, la disciplina documental y la ejecución en Claude Code.**
3. **Los avances del documento inicial se conservan como estado real del proyecto**, sobre todo en:
   - motor ODS
   - integración con ecosistema Google
   - flujo operativo de aprobación
   - visión de hero inmersivo con lenguaje visual de audio premium
4. **Cuando exista conflicto entre ambos enfoques**, priorizar:
   - claridad estratégica
   - mantenibilidad del sistema
   - escalabilidad
   - autoridad de marca y entidad
   - continuidad operativa

### Qué se conserva del documento inicial
- La visión de Turpial Sound como experiencia digital inmersiva y tecnológicamente potente.
- El avance real del sistema ODS como backend operativo y motor administrativo.
- El uso de Google Apps Script, Sheets, Drive, Calendar y Gmail como capa operativa existente.
- El potencial de efectos visuales de audio, partículas y composición futurista en el frente público.

### Qué se corrige o eleva respecto al documento inicial
- Se abandona la lógica de “landing page aislada” como definición suficiente del proyecto.
- Se evita tratar frontend, backend y operaciones como piezas sueltas.
- Se reemplaza la aproximación HTML suelto + integración puntual por una **arquitectura de sistema**.
- Se organiza el proyecto para que Claude Code opere con persistencia documental, control de tokens, checkpoints y handoffs limpios.

---

## 1) North Star unificado

Construir para **Turpial Sound** un sistema digital de autoridad compuesto por dos capas integradas:

1. **Capa pública de marca y captación**
   - posicionar a Turpial Sound como referente premium en su nicho;
   - traducir su propuesta en una web memorable, elegante y tecnológicamente impactante;
   - ordenar su presencia para SEO, AEO y motores con IA;
   - convertir visitas en contactos, reservas, oportunidades o ventas.

2. **Capa operativa interna**
   - consolidar el motor ODS como sistema de gestión real;
   - mantener trazabilidad, agenda, aprobaciones y registro documental;
   - separar claramente la operación interna del frente público;
   - preparar el terreno para evolucionar desde el ecosistema Google hacia una arquitectura más robusta cuando el negocio lo justifique.

**Turpial Sound no debe tratarse ni como una simple landing ni como un simple script.**
Debe pensarse como:

> **Brand Authority Platform + Lead Engine + ODS Operations Core**

---

## 2) Definición actual del proyecto

### 2.1 Identidad del activo
Turpial Sound (también referido como Turpial Son en materiales previos) se proyecta como una marca con aspiración:
- premium
- vanguardista
- tecnológica
- elegante
- inmersiva
- musicalmente sensible, pero estructuralmente seria

### 2.2 Naturaleza del sistema
El proyecto tiene dos frentes complementarios:

#### A. Frente público
Sitio web / activo digital de autoridad para:
- marca
- posicionamiento
- captación
- portafolio
- servicios
- prueba social
- SEO/AEO
- interacción de alto impacto visual

#### B. Frente operativo
Sistema interno de gestión ODS ya encaminado, con capacidades como:
- creación de órdenes de servicio
- validación de datos
- generación documental
- aprobaciones por correo
- agenda operativa
- registro histórico
- gestión documental dentro de Google Workspace

---

## 3) Estado consolidado del proyecto

## 3.1 Avance heredado y válido
Del documento inicial se reconoce como avance significativo que **ya existe una base conceptual y técnica importante para el motor ODS**, planteado como un sistema de gestión operativa sobre Google, con estos componentes:

- **Google Sheets** como interfaz operativa y base de datos ligera
- **Google Apps Script** como backend serverless y capa de lógica de negocio
- **Google Drive** para documentos
- **Google Calendar** para agenda
- **Gmail/MailApp** para aprobaciones y notificaciones
- **Web App** como punto de entrada externo tipo API

Además, el flujo descrito contempla:
- captura de datos
- validación
- generación de correlativo
- creación documental
- envío de correos
- creación de evento
- registro histórico
- actualización de estados mediante `doGet` / `doPost`

Esto confirma que el proyecto **ya no parte de cero**, sino desde un embrión operativo real que debe reordenarse y profesionalizarse.

## 3.2 Relectura estratégica del avance
El error no es haber avanzado en ODS. El error sería **dejar que el ODS dicte toda la arquitectura del activo digital público**.

Por eso, desde ahora:
- el **ODS se conserva como módulo operativo existente**;
- el **sitio público se diseña como sistema editorial, comercial y de autoridad**;
- la integración entre ambos se vuelve deliberada, no improvisada.

---

## 4) Decisión de arquitectura maestra

### 4.1 Arquitectura objetivo
Separar el sistema en **dos dominios coordinados**:

```txt
[ Dominio 1 ] Public Brand Platform
- Web pública
- SEO / AEO
- Landings / contenidos / portafolio / autoridad
- Captura de leads / reservas / consultas
- Experiencia visual premium

[ Dominio 2 ] Operations Core
- ODS
- Agenda
- Documentos
- Aprobaciones
- CRM ligero
- Registro histórico
```

### 4.2 Regla de separación
- **La web pública no debe depender estructuralmente de la UI de Sheets.**
- **El motor ODS no debe contaminar la arquitectura editorial y visual del front público.**
- **La integración debe hacerse mediante endpoints, servicios o capas bien delimitadas.**

### 4.3 Visión evolutiva
#### Etapa actual válida
- Mantener Google Apps Script como núcleo operativo por costo, velocidad y continuidad.

#### Etapa de madurez recomendada
- Extraer la lógica crítica hacia una arquitectura por capas y API más robusta cuando aparezca alguna de estas condiciones:
  - crecimiento de operaciones
  - múltiples usuarios concurrentes
  - necesidad de permisos finos
  - trazabilidad más estricta
  - integración con pagos, auth o dashboards más complejos

---

## 5) Stack recomendado unificado

## 5.1 Frontend público — ruta principal
Usar por defecto:
- **Next.js (App Router)**
- **TypeScript estricto**
- **Tailwind CSS** para velocidad compositiva
- **CSS Modules** o **vanilla-extract** para aislamiento fino y piezas premium
- **MDX** o fuente controlada para recursos/editorial si aplica
- **Vercel** para previews y DX
- **Cloudflare** como alternativa si se prioriza edge/coste

## 5.2 Capa visual inmersiva
La ambición visual del documento inicial sigue vigente, pero con control:
- usar **Three.js** o preferiblemente **React Three Fiber / Drei** solo cuando aporte valor real;
- concentrar el 3D o efectos avanzados en:
  - hero principal
  - fondos interactivos controlados
  - micro-escenas de alto impacto
- evitar que el sitio entero dependa de efectos pesados;
- el “wow” debe apoyar la marca, no sabotear performance, claridad o indexabilidad.

## 5.3 Backend operativo actual
Mantener por ahora:
- **Google Apps Script**
- **Google Sheets**
- **Google Drive**
- **Google Calendar**
- **Gmail / MailApp**

Pero bajo una regla nueva:
- el backend de Apps Script se trata como **módulo operativo existente**, no como excusa para improvisar la arquitectura general.

## 5.4 Backend futuro / migración prevista
Preparar desde ya la abstracción para migrar, llegado el momento, hacia:
- API REST real o BFF
- DB estructurada
- auth y permisos más sólidos
- observabilidad más seria

### 5.5 Reglas CSS
Evitar:
- `globals.css` gigantesco
- estilos sin aislamiento
- acoplamiento visual desordenado

Preferir:
- tokens globales mínimos
- módulos por página o por componente
- naming explícito
- inventario de componentes y reglas de layout

---

## 6) Principios maestros del proyecto

### 6.1 No improvisar
Antes de tocar UI o código productivo, cerrar:
- brief estratégico
- categoría/nicho
- customer profiles
- sitemap
- content model
- design principles
- stack
- checkpoints

### 6.2 Todo debe persistir en `.md`
Ninguna decisión maestra puede vivir solo en el chat.

### 6.3 Un cambio, una razón
Todo cambio debe explicar:
- problema
- decisión
- impacto esperado
- archivos afectados
- riesgo asociado

### 6.4 La autoridad no se inventa
Toda afirmación de liderazgo debe apoyarse en:
- evidencia
- experiencia
- metodología
- resultados
- casos
- estructura comprensible

### 6.5 Diseño y sistema van juntos
No construir un frente público espectacular que luego no sostenga:
- SEO
- AEO
- claridad narrativa
- conversión
- mantenibilidad

### 6.6 El ODS es producto interno, no pretexto para bajar nivel visual
La existencia del motor operativo no debe “rebajar” la ambición editorial y visual de la marca pública.

---

## 7) Fases oficiales del trabajo

## Fase 1 — Intake y verdad base
Objetivo:
- entender qué es Turpial Sound;
- qué vende;
- qué categoría quiere dominar;
- qué autoridad debe proyectar;
- qué parte del negocio depende del frente público y qué parte del motor ODS.

Entregables mínimos:
- `brand-core.md`
- `market-positioning.md`
- `offers-and-economics.md`
- `customer-profiles.md`
- `authority-map.md`

No pasar a Fase 2 sin:
- categoría clara
- promesa central definida
- oferta principal clara
- geografía definida
- CTA prioritaria definida

## Fase 2 — Arquitectura de autoridad
Objetivo:
- diseñar el sistema de páginas, entidades y clústeres;
- separar web pública de sistema operativo;
- definir el rol del ODS dentro del ecosistema total.

Entregables mínimos:
- `sitemap-master.md`
- `url-map.md`
- `navigation-model.md`
- `content-clusters.md`
- `internal-linking.md`
- `page-briefs.md`

No pasar a Fase 3 sin:
- jerarquía aprobada
- money pages claras
- authority pages claras
- intención por URL definida
- integración ODS delimitada

## Fase 3 — Sistema editorial y visual
Objetivo:
- fijar la gramática de marca, la voz editorial y la experiencia visual.

Entregables mínimos:
- `messaging-pillars.md`
- `tone-of-voice.md`
- `design-principles.md`
- `design-tokens.md`
- `component-inventory.md`
- `motion-rules.md`
- `layout-rules.md`

No pasar a Fase 4 sin:
- tono aprobado
- tokens aprobados
- layouts patrón aprobados
- motion con propósito
- alcance bilingüe resuelto si aplica

## Fase 4 — Shell técnico y ODS refactor boundary
Objetivo:
- levantar base técnica limpia para el sitio público;
- documentar y encapsular el motor ODS;
- preparar la frontera entre ambos mundos.

Entregables mínimos:
- `stack-decision.md`
- `app-architecture.md`
- `seo-aeo-implementation.md`
- `analytics-and-events.md`
- `data-model.md`
- `ods-architecture.md`
- `ods-refactor-plan.md`

No pasar a Fase 5 sin:
- stack aprobado
- metadata/schema aprobados
- shell estable
- integración ODS definida
- riesgos técnicos visibles

## Fase 5 — Producción guiada
Orden recomendado:
1. shell global
2. home
3. páginas patrón
4. sistema de bloques reutilizables
5. landings de servicio/categoría
6. páginas de autoridad
7. recursos, FAQ, casos
8. superficie de integración con ODS si aplica

## Fase 6 — QA, compactación y release
Entregables:
- `qa-log.md`
- `bug-log.md`
- `launch-checklist.md`
- `session-summary-active.md`
- `next-window-brief.md`
- `compact-history.md`

---

## 8) Documentación mínima obligatoria

```txt
/docs
  /00_governance
    project-vision.md
    operating-rules.md
    roadmap-master.md
    checkpoints.md
  /01_strategy
    brand-core.md
    market-positioning.md
    offers-and-economics.md
    customer-profiles.md
    competitors-and-gaps.md
    authority-map.md
  /02_information_architecture
    sitemap-master.md
    url-map.md
    navigation-model.md
    content-clusters.md
    internal-linking.md
  /03_editorial
    messaging-pillars.md
    tone-of-voice.md
    page-briefs.md
    content-matrix.md
    entity-bios.md
    faq-bank.md
  /04_design
    design-principles.md
    design-tokens.md
    component-inventory.md
    motion-rules.md
    layout-rules.md
  /05_technical
    stack-decision.md
    app-architecture.md
    data-model.md
    seo-aeo-implementation.md
    analytics-and-events.md
    ods-architecture.md
    ods-refactor-plan.md
    api-contracts.md
  /06_delivery
    release-plan.md
    qa-log.md
    bug-log.md
    launch-checklist.md
  /07_handoffs
    session-summary-active.md
    next-window-brief.md
    compact-history.md
```

---

## 9) ODS — integración del avance existente

## 9.1 Definición consolidada del ODS
El motor ODS debe entenderse como:

> **Workflow Engine + CRM ligero + Gestor documental + Sistema de agenda**

Su implementación actual dentro de Google es válida como capa operativa inicial.

## 9.2 Componentes heredados
### Google Sheets
- hoja `ODS` como formulario activo
- hoja `Motor` como base de clientes/autocompletado
- hoja `RegistroODS` como historial maestro

### Apps Script
Responsabilidades:
- UI operativa
- lógica de negocio
- API externa
- integraciones con Google

### Drive
- almacenamiento documental
- correlativos
- trazabilidad

### Calendar
- agenda
- detección de conflictos futura
- sincronización operativa

### Gmail / MailApp
- aprobaciones
- notificaciones
- disparadores humanos

## 9.3 Flujo actual válido
1. usuario llena formulario
2. se validan datos
3. se genera ID único
4. se crea documento
5. se envían correos
6. se agenda evento
7. se registra operación
8. aprobador responde
9. sistema actualiza estado

## 9.4 Funciones heredadas relevantes
Se reconoce como base ya conceptualizada o iniciada:
- `onOpen()`
- `gestionarEdicionCliente(e)`
- `agregarCliente(datos)`
- `iniciarProcesoDeAprobacion()`
- `obtenerCorrelativoDesdeDrive()`
- `generarIdODS()`
- `crearDocumentoODS()`
- `enviarCorreosAprobacion()`
- `crearEventoCalendario()`
- `limpiarFormulario()`
- `doPost(e)`
- `doGet(e)`

## 9.5 Limitaciones reconocidas del estado actual
El propio avance inicial ya revela límites importantes:
- seguridad básica
- UI limitada
- dependencia total de Google
- control de concurrencia insuficiente
- acoplamiento entre UI, lógica e integraciones
- observabilidad escasa

## 9.6 Dirección correcta a partir de ahora
Claude Code debe:
1. preservar funcionalidad existente;
2. documentar el sistema real antes de reescribirlo;
3. refactorizar por capas;
4. separar dominio, servicios, repositorios e integraciones;
5. preparar contratos de API;
6. endurecer validaciones, logs y manejo de errores;
7. diseñar la ruta de migración sin romper la operación actual.

---

## 10) Modelo arquitectónico recomendado para el ODS

## 10.1 Arquitectura por capas
```txt
/UI Layer
- menús Sheets
- diálogos
- formularios / endpoints de entrada

/Application Layer
- casos de uso
- orquestación
- reglas de flujo

/Domain Layer
- entidades
- reglas de negocio
- estados ODS
- validaciones centrales

/Infrastructure Layer
- Sheets repository
- Drive service
- Calendar service
- Mail service
- Web app handlers
- logging
```

## 10.2 Objetivos del refactor
- reducir acoplamiento
- hacer testeable la lógica
- mejorar trazabilidad
- clarificar contratos
- preparar migración futura

## 10.3 Estados mínimos del ODS
Mantener al menos:
- `PENDIENTE`
- `APROBADA`
- `DENEGADA`

Y dejar preparado el modelo para futuros estados como:
- `BORRADOR`
- `PROGRAMADA`
- `EJECUTADA`
- `CANCELADA`
- `ARCHIVADA`

---

## 11) Arquitectura del sitio público

## 11.1 Objetivo
Construir un activo que combine:
- impacto visual
- autoridad narrativa
- estructura SEO/AEO
- claridad de oferta
- captación
- continuidad con la operación interna

## 11.2 Pilares del frente público
- Home
- Sobre la marca / estudio
- Servicios
- Equipos / instalaciones / experiencia
- Portafolio / trabajos / muestras
- Autoridad / testimonios / casos
- Recursos / insights / FAQ
- Contacto / reserva / cotización

## 11.3 Dirección visual heredada y refinada
Del documento inicial se preserva la intención de:
- hero potente
- consola de grabación o universo sonoro premium
- luces diagonales controladas
- reflejos y energía audiovisual
- partículas / ondas / respuesta musical

Pero con nuevas reglas:
- no sobrediseñar por encima del mensaje;
- no degradar performance por espectáculo;
- el motion debe sostener la identidad, no distraer;
- la escena hero debe ser memorable y técnicamente racional.

---

## 12) SEO, AEO y autoridad de entidad

## 12.1 Meta real
No solo posicionar por keywords, sino construir:
- entidad de marca clara
- señales consistentes
- páginas money bien definidas
- clústeres temáticos
- FAQs útiles
- bios y contexto de autoridad
- linking interno lógico

## 12.2 Reglas
- cada URL debe resolver una intención;
- cada bloque debe aportar a usuario y máquina;
- evitar relleno y adjetivo hueco;
- estructurar la información para humanos, buscadores e interfaces de IA.

## 12.3 Activos clave
- `authority-map.md`
- `content-clusters.md`
- `page-briefs.md`
- `entity-bios.md`
- `faq-bank.md`
- `seo-aeo-implementation.md`

---

## 13) Asignación de modelos por etapa

## Modelo alto
Usar para:
- arquitectura de información
- posicionamiento de marca
- taxonomía y clústeres
- diseño de sistema
- refactors complejos
- diagnóstico ambiguo
- redacción de documentos maestros

## Modelo medio
Usar para:
- implementación diaria
- construcción de componentes
- desarrollo de páginas a partir de briefs cerrados
- metadata/schema
- QA técnico recurrente
- desarrollo iterativo controlado

## Modelo ligero
Usar para:
- transforms repetitivos
- limpieza de formatos
- scaffolds
- renombrados
- tareas de bajo riesgo
- consistencia menor

## Regla de enrutado
- **alto** para pensar y decidir;
- **medio** para construir;
- **ligero** para mantenimiento utilitario.

---

## 14) Optimización de tokens y gestión de contexto

## 14.1 Regla base
La ventana activa no es archivo histórico. El historial se compacta y se persiste en `.md`.

## 14.2 Qué meter en contexto activo
Solo:
- objetivo inmediato
- archivos directamente relevantes
- restricciones activas
- decisiones maestras vigentes
- último resumen operativo

## 14.3 Qué sacar del contexto activo
Excluir:
- discusiones cerradas
- logs largos
- archivos irrelevantes
- MCP que no aporten
- versiones antiguas sin vigencia

## 14.4 Cuándo compactar
Compactar cuando:
- se cerró una fase importante;
- se mezclaron demasiados frentes;
- el contexto ya perdió eficiencia;
- el costo dejó de justificarse.

## 14.5 Qué debe dejar cada compactación
Siempre actualizar:
- `session-summary-active.md`
- `next-window-brief.md`
- `roadmap-master.md`
- `compact-history.md`

---

## 15) Regla de cambio de ventana de contexto

Abrir una nueva ventana solo cuando exista handoff limpio.

### Antes de cerrar una sesión
Actualizar como mínimo:

#### `session-summary-active.md`
Debe incluir:
- objetivo de la sesión
- decisiones tomadas
- archivos modificados
- pendientes críticos
- riesgos abiertos
- estado de build/test

#### `next-window-brief.md`
Debe incluir:
- siguiente meta
- archivos a abrir primero
- qué no volver a discutir
- checkpoints de continuidad
- prompt inicial sugerido

### Plantilla mínima
```md
# Session Summary
- Objetivo:
- Decisiones cerradas:
- Archivos tocados:
- Problemas pendientes:
- Estado del build:
- Estado del QA:
- Riesgos:

# Next Window Brief
- Siguiente meta:
- Abrir primero:
- No reabrir:
- Validar:
- Primer prompt sugerido:
```

---

## 16) Puntos de control obligatorios

### Gate 1 — Estrategia
Validar:
- categoría
- promesa
- audiencia
- oferta
- diferenciación
- conversión principal

### Gate 2 — Arquitectura
Validar:
- sitemap
- money pages
- authority pages
- linking interno
- FAQ y recursos
- rol del ODS

### Gate 3 — Sistema visual/editorial
Validar:
- tono
- tokens
- componentes patrón
- motion
- responsive intent
- jerarquía narrativa

### Gate 4 — Shell técnico
Validar:
- rutas
- layouts
- metadata base
- schema base
- analítica base
- frontera ODS / front público

### Gate 5 — Producción
Validar:
- calidad por página
- consistencia entre páginas
- performance razonable
- accesibilidad base
- integridad visual

### Gate 6 — Release
Validar:
- build limpio
- links verificados
- titles/descriptions correctos
- schema válido
- conversiones funcionando
- documentación actualizada

---

## 17) Test points

### Técnica
- typecheck
- lint
- build
- rutas sin error
- metadata por página
- schema por plantilla
- imágenes/video correctos
- integración ODS estable

### Visual
- desktop grande
- laptop
- tablet
- mobile
- contraste
- jerarquía
- consistencia modular

### Editorial
- headline con valor real
- tono consistente
- sin relleno genérico
- intención clara por página
- CTA coherente

### SEO / AEO
- intención resuelta por URL
- entidad clara
- headings limpios
- FAQ útiles
- linking lógico
- contenido legible por máquina y humano

### ODS
- creación de orden
- correlativo correcto
- generación documental
- notificación correcta
- creación de evento
- transición de estados
- registro histórico consistente
- respuesta segura de endpoints

---

## 18) Reglas de debugging

Cuando aparezca un bug, responder en este orden:
1. síntoma visible
2. hipótesis principal
3. archivos sospechosos
4. fix mínimo propuesto
5. riesgo secundario
6. test para confirmar

### Evitar
- cambios masivos a ciegas
- mezclar refactor con hotfix urgente sin control
- meter complejidad innecesaria

### Registrar en `bug-log.md`
- fecha
- bug
- causa raíz
- fix
- validación
- lección aprendida

---

## 19) Skills recomendadas

Crear skills específicas para reducir costo y estandarizar calidad:
- `project-intake`
- `authority-architecture`
- `content-matrix-builder`
- `page-brief-generator`
- `design-system-guard`
- `seo-aeo-implementer`
- `ods-refactor-guard`
- `qa-sweep`
- `session-handoff`

### Cada skill debe contener
- propósito
- inputs
- outputs
- pasos
- checklist
- red flags
- ejemplos mínimos

---

## 20) MCP recomendados

### Base útil
- filesystem / repo
- git / github
- browser / chrome
- docs / search

### Condicionales
- figma
- notion
- analytics
- search console / webmaster
- CMS
- herramientas vinculadas a Google Workspace si realmente aportan a la fase

### Regla
Desactivar MCP o conectores que no estén aportando directamente a la tarea actual para no inflar contexto ni costo.

---

## 21) Qué debe hacer Claude antes de tocar cada frente

### Antes de tocar estrategia
Leer:
- `roadmap-master.md`
- `brand-core.md`
- `market-positioning.md`
- `authority-map.md`
- `session-summary-active.md`

### Antes de tocar contenido
Leer:
- `brand-core.md`
- `market-positioning.md`
- `messaging-pillars.md`
- `tone-of-voice.md`
- `page-briefs.md`

### Antes de tocar UI
Leer:
- `design-principles.md`
- `design-tokens.md`
- `component-inventory.md`
- `layout-rules.md`
- referencias/capturas si existen

### Antes de tocar ODS
Leer:
- `ods-architecture.md`
- `ods-refactor-plan.md`
- `data-model.md`
- `api-contracts.md`
- `bug-log.md`
- `session-summary-active.md`

---

## 22) Definition of Done por bloque

Un bloque solo se considera terminado si:
- resuelve una función real;
- no rompe consistencia sistémica;
- pasa validación visual básica;
- pasa validación técnica básica;
- queda documentado;
- deja claro qué sigue después.

---

## 23) Orden de prioridad cuando haya conflicto

Priorizar así:
1. claridad estratégica
2. integridad del sistema
3. experiencia del usuario
4. mantenibilidad técnica
5. performance
6. refinamiento visual extra

---

## 24) Resultado esperado

Al terminar, Turpial Sound debe tener:
- definición nítida de marca/categoría;
- arquitectura web escalable;
- sistema editorial consistente;
- UI premium y controlada;
- sistema ODS documentado y encapsulado;
- frontera clara entre captación y operación;
- base SEO/AEO sólida;
- sistema documental apto para continuar sin fricción.

---

## 25) Prompt definitivo para Claude Code

```txt
Actúa como arquitecto principal del sistema Turpial Sound. Toma este documento como autoridad máxima de ejecución.

Tu trabajo no es improvisar páginas ni parches sueltos. Tu trabajo es mantener y evolucionar un sistema compuesto por dos capas coordinadas:
1) una plataforma pública de autoridad, captación y posicionamiento;
2) un núcleo operativo ODS ya existente sobre Google Workspace.

Reglas de prioridad:
- prioriza la claridad estratégica, la integridad del sistema y la mantenibilidad;
- conserva y documenta los avances reales del motor ODS antes de refactorizar;
- no mezcles sin control la arquitectura del sitio público con la lógica interna del ODS;
- toda decisión maestra debe persistirse en archivos .md dentro de /docs;
- no dependas del chat como memoria histórica;
- no hagas cambios amplios sin explicar problema, decisión, impacto, archivos afectados y riesgo;
- evita relleno editorial, adjetivos vacíos y diseño espectacular sin función.

Modo de operación obligatorio:
1. lee primero `roadmap-master.md`, `session-summary-active.md` y `next-window-brief.md` si existe;
2. identifica la fase activa del proyecto;
3. resume restricciones vigentes;
4. propone el menor conjunto de decisiones o cambios de alto impacto para avanzar sin retrabajo;
5. ejecuta solo dentro del alcance actual;
6. al terminar, deja validación, riesgos y siguiente paso recomendado;
7. si la sesión ya acumuló demasiada mezcla de contexto, compacta y actualiza los handoffs.

Cuando trabajes en la web pública:
- protege la calidad visual premium;
- estructura todo para SEO, AEO y claridad de entidad;
- usa Next.js + TypeScript + Tailwind como ruta principal, con CSS Modules o vanilla-extract para aislamiento fino;
- usa Three.js o R3F solo donde el valor visual justifique el costo.

Cuando trabajes en ODS:
- preserva la operación actual;
- documenta el flujo real;
- refactoriza por capas: UI, aplicación, dominio, infraestructura;
- fortalece validaciones, errores, logs y contratos;
- prepara una ruta de migración sin romper producción.

Antes de editar cualquier archivo, explica brevemente:
- qué problema atacas;
- qué decisión tomas;
- por qué es la intervención mínima útil;
- cómo vas a validar el resultado.

Entregable mínimo de cada intervención:
- cambio útil y controlado;
- checklist de validación;
- riesgos o deuda detectada;
- actualización documental si la decisión afecta el sistema.

Piensa como arquitecto del sistema, no como generador de parches.
```

---

## 26) Instrucción final

Cada intervención debe acercar Turpial Sound a una posición de autoridad verificable, elegante, escalable y operativamente sólida.
