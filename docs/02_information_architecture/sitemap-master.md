# Turpial Sound — Sitemap Maestro (Provisional)

> Estado: **Fase 2 — Arquitectura de autoridad en apertura. Versión provisional sujeta a validación del cliente.**
> Última actualización: 2026-03-26
> Fuente base: `docs/01_strategy/` + `turpial_sound_control_point_01.md` + CLAUDE.md

---

## Leyenda de estado por sección

- **[CONFIRMED]** — estructura validada por lógica de negocio declarada y coherencia estratégica sólida
- **[SUGGESTED]** — propuesta coherente con el nicho; requiere aprobación del cliente antes de congelar
- **[CLIENT_REQUIRED]** — estructura o contenido que depende de información que solo el cliente puede proveer

---

## 1. Propósito del sitemap

### Para qué existe
Este sitemap define la arquitectura maestra de información del frente público de Turpial Sound: el conjunto de páginas, su jerarquía, su propósito comercial y su relación entre sí.

Su función es establecer **qué existe, para quién existe y por qué existe**, antes de definir URLs finales, diseñar layouts o escribir contenido.

### Qué resuelve
- Ordena la oferta de Turpial Sound en una jerarquía comprensible para usuarios, buscadores e interfaces de IA.
- Define las money pages (páginas de conversión prioritaria) y las páginas de autoridad.
- Previene el caos editorial: que el sitio crezca sin estructura, con páginas duplicadas o sin intención clara.
- Sirve como base para el mapa de URLs, los page briefs, los clusters de contenido y el sistema de linking interno.

### Qué no incluye todavía
- URLs finales (eso va en `url-map.md`).
- Arquitectura del ODS (esa capa es interna y no pertenece al sitio público).
- Diseño, layouts ni componentes.
- Contenido redactado o copy final.
- Jerarquía de navegación visual (eso va en `navigation-model.md`).

---

## 2. Principios de arquitectura

### 2.1 Claridad comercial primero
Cada página del sitio existe para resolver una intención real de un usuario real. No se crean páginas por completismo ni por estética. La estructura sigue la lógica del negocio, no la lógica del menú.

### 2.2 Jerarquía de conversión visible
Las páginas más importantes comercialmente tienen la mayor presencia en la arquitectura. El sitio debe poder convertir desde múltiples puntos de entrada, siempre con el mismo CTA dominante.

### 2.3 Separación absoluta frente público / ODS
El núcleo operativo ODS (Google Sheets, Apps Script, Drive, Calendar, Gmail) es una capa interna separada. Ninguna página del sitio público accede ni depende de la UI del ODS. Si en algún momento existe integración (por ejemplo: formulario de reservas conectado al sistema interno), se hace a través de endpoints o servicios delimitados, nunca exponiendo la operación interna.

### 2.4 Diseñado para SEO local y AEO desde la raíz
La arquitectura considera desde el inicio las búsquedas objetivo del negocio. Cada página de servicio existe también para resolver una intención de búsqueda específica. Los clústeres de contenido refuerzan la autoridad temática de la marca.

### 2.5 Control de complejidad
El sitio V1 no debe ser grande: debe ser bueno. Se privilegian pocas páginas bien construidas sobre muchas páginas mediocres. Todo lo que no es esencial para conversión o autoridad puede ir a Fase 2 de producción o a iteraciones futuras.

---

## 3. Mapa maestro — Primer nivel

Las siguientes son las secciones principales del sitio público. Cada una cumple un rol estratégico diferente.

```
TURPIAL SOUND — SITIO PÚBLICO
│
├── 01. HOME
├── 02. ESTUDIO / SOBRE NOSOTROS
├── 03. SALAS DE ENSAYO                    ← money page
├── 04. ESTUDIO DE GRABACIÓN               ← money page
├── 05. PRODUCCIÓN MUSICAL                 ← money page
├── 06. SERVICIOS COMPLEMENTARIOS
│   ├── Mezcla y masterización
│   ├── Podcast y locución
│   ├── Video studio session
│   ├── Arreglos musicales
│   └── Consultoría y clases de producción
├── 07. ARTISTAS / AUTORIDAD
├── 08. RECURSOS / FAQ
└── 09. CONTACTO / RESERVA
```

---

## 4. Segundo nivel — Definición por sección

---

### 4.1 HOME

| Campo | Valor |
|-------|-------|
| **Objetivo** | Posicionar a Turpial Sound como hub premium de referencia. Orientar al usuario hacia la acción que más le interesa. Consolidar la primera impresión de autoridad. |
| **Usuario principal** | Cualquier visitante nuevo: artista, banda, creador de contenido, productor |
| **Intención de búsqueda** | Turpial Sound [marca], estudio de grabación Caracas, sala de ensayo Caracas |
| **Conversión esperada** | Clic a página de servicio prioritario o CTA directo de contacto/reserva |
| **Páginas hijas** | Ninguna — es la raíz |
| **Estado** | [CONFIRMED] |

**Bloques obligatorios en Home:**
- Hero con propuesta de valor central + CTA principal
- Oferta en tres ejes (ensayo / grabación / producción)
- Prueba social sintética (artistas, trayectoria, años)
- Acceso rápido a los tres servicios prioritarios
- CTA de contacto o reserva
- Señal de autoridad (número de artistas, años, proyectos)

---

### 4.2 ESTUDIO / SOBRE NOSOTROS

| Campo | Valor |
|-------|-------|
| **Objetivo** | Construir confianza y autoridad de entidad. Humanizar la marca. Responder "¿quiénes son estos y por qué debo confiarles mi proyecto?" |
| **Usuario principal** | Usuario en fase de evaluación que quiere conocer la marca antes de reservar |
| **Intención de búsqueda** | Turpial Sound estudio, quiénes somos Turpial Sound, Frank Lemus productor Caracas |
| **Conversión esperada** | Avanzar a página de servicio específico o contactar directamente |
| **Páginas hijas** | Posiblemente `Frank Lemus` y `Susej Vera` como subpáginas de experto si hay masa de contenido; evaluar en page briefs |
| **Estado** | [CONFIRMED] como sección necesaria; contenido [CLIENT_REQUIRED] |

**Bloques obligatorios:**
- Historia de la marca (2015, origen, misión)
- Frank Lemus: foto, bio, rol, credenciales
- Susej Vera: foto, bio, rol, credenciales
- Por qué Turpial Sound: diferenciadores reales con lenguaje sobrio
- Artistas que han confiado en el estudio (lista curada — [CLIENT_REQUIRED])

---

### 4.3 SALAS DE ENSAYO ← MONEY PAGE

| Campo | Valor |
|-------|-------|
| **Objetivo** | Convertir visitantes en reservas o consultas de sala de ensayo. Posicionar en búsquedas locales relacionadas. |
| **Usuario principal** | Bandas, músicos y proyectos que necesitan ensayar en espacio profesional |
| **Intención de búsqueda** | sala de ensayo Caracas, sala de ensayo profesional Caracas, donde ensayar en Caracas, sala de ensayo con equipos Caracas |
| **Conversión esperada** | Solicitar disponibilidad o reservar sala por WhatsApp |
| **Estado** | [CONFIRMED] |

**Páginas hijas sugeridas:**

| Subpágina | Propósito | Estado |
|-----------|-----------|--------|
| Sala Premium / Prioritaria | página de sala específica con detalle de capacidad, equipo y tarifa | [SUGGESTED] |
| Sala Flexible / Estándar | página de sala con tarifa accesible | [SUGGESTED] |
| Tarifas y disponibilidad | tabla de precios y condiciones de reserva | [CLIENT_REQUIRED — depende de estructura de precios real] |
| FAQ Salas de Ensayo | respuestas a preguntas específicas de ensayo | [SUGGESTED] |

**Bloques obligatorios en la página principal:**
- Qué incluye el espacio (equipos, condiciones, capacidad)
- Modalidades de tarifa (flexible, premium, prioritaria)
- Galería de fotos reales del espacio [CLIENT_REQUIRED]
- CTA de reserva / consulta de disponibilidad
- Preguntas frecuentes específicas de ensayo

---

### 4.4 ESTUDIO DE GRABACIÓN ← MONEY PAGE

| Campo | Valor |
|-------|-------|
| **Objetivo** | Convertir en sesiones de grabación. Posicionar en búsquedas de grabación profesional en Caracas. |
| **Usuario principal** | Artistas y bandas que necesitan grabar material nuevo o demo profesional |
| **Intención de búsqueda** | estudio de grabación en Caracas, grabar música profesionalmente Caracas, sesión de grabación Caracas, donde grabar en Caracas |
| **Conversión esperada** | Reservar sesión de grabación o consultar disponibilidad |
| **Estado** | [CONFIRMED] |

**Páginas hijas sugeridas:**

| Subpágina | Propósito | Estado |
|-----------|-----------|--------|
| Equipamiento del estudio | detalle de equipos, consola, micrófonos, software, monitores | [SUGGESTED — valioso para SEO técnico] |
| Cómo prepararse para una sesión de grabación | contenido editorial con valor SEO | [SUGGESTED] |
| FAQ Grabación | preguntas frecuentes específicas de grabación | [SUGGESTED] |

**Bloques obligatorios en la página principal:**
- Qué incluye la sesión de grabación
- Equipamiento disponible
- Proceso: cómo funciona desde la reserva hasta la entrega
- Artistas o proyectos grabados aquí (prueba social) [CLIENT_REQUIRED]
- Galería del estudio [CLIENT_REQUIRED]
- CTA de reserva / consulta

---

### 4.5 PRODUCCIÓN MUSICAL ← MONEY PAGE

| Campo | Valor |
|-------|-------|
| **Objetivo** | Captar proyectos de producción integral. Posicionar como referente de producción musical en Caracas. |
| **Usuario principal** | Artistas con proyecto en desarrollo que necesitan pasar de idea a material terminado |
| **Intención de búsqueda** | producción musical en Caracas, productor musical Caracas, producir una canción en Caracas, arreglos y producción musical Venezuela |
| **Conversión esperada** | Consultar sobre proyecto de producción / solicitar propuesta |
| **Estado** | [CONFIRMED] |

**Páginas hijas sugeridas:**

| Subpágina | Propósito | Estado |
|-----------|-----------|--------|
| Proceso de producción | cómo trabaja Turpial Sound en un proyecto integral | [SUGGESTED] |
| Portafolio de producción | trabajos producidos con referencias si existen | [CLIENT_REQUIRED] |
| FAQ Producción Musical | preguntas sobre alcance, tiempos, entregables | [SUGGESTED] |

**Bloques obligatorios en la página principal:**
- Qué es producción musical y qué incluye en Turpial Sound
- El proceso: desde la idea hasta el master final
- Géneros y estilos manejados [CLIENT_REQUIRED — definir cuáles confirmar]
- Portafolio o casos [CLIENT_REQUIRED]
- CTA de consulta de proyecto

---

### 4.6 SERVICIOS COMPLEMENTARIOS

| Campo | Valor |
|-------|-------|
| **Objetivo** | Ampliar la oferta visible sin saturar la navegación principal. Captar usuarios de nichos específicos (podcast, locución, video). |
| **Usuario principal** | Creadores de contenido, comunicadores, empresas, artistas con necesidades específicas |
| **Intención de búsqueda** | varias intenciones específicas por subservicio |
| **Conversión esperada** | Consulta directa o derivación al servicio relevante |
| **Estado** | [CONFIRMED] como sección; subpáginas [SUGGESTED] |

**Páginas hijas:**

| Subpágina | Búsqueda objetivo | Estado |
|-----------|------------------|--------|
| Mezcla y masterización | mezcla y masterización Caracas, masterización de audio Caracas | [SUGGESTED] |
| Podcast y locución | estudio de podcast Caracas, grabación de podcast Caracas, locución profesional Caracas | [SUGGESTED] |
| Video studio session | video session musical Caracas, grabar sesión en video Caracas | [SUGGESTED] |
| Arreglos musicales | arreglos musicales Caracas, arreglo de canción Venezuela | [SUGGESTED] |
| Consultoría y clases | consultoría de producción musical Caracas, clases de producción musical Caracas | [SUGGESTED — evaluar si hay demanda real] |

**Nota de arquitectura:** estos servicios pueden organizarse como una sección-índice que enlaza a páginas individuales (modelo hub/spoke), o como páginas independientes desde el primer nivel si el cliente confirma que son líneas activas de negocio con volumen. Definir en `page-briefs.md`.

---

### 4.7 ARTISTAS / AUTORIDAD

| Campo | Valor |
|-------|-------|
| **Objetivo** | Consolidar la prueba social de la marca. Demostrar con evidencia que artistas de nivel han confiado en Turpial Sound. |
| **Usuario principal** | Usuario en evaluación que quiere confirmar la reputación del estudio antes de contactar |
| **Intención de búsqueda** | Turpial Sound artistas, quién ha grabado en Turpial Sound, Oscar D'León estudio Caracas [si se autoriza], testimonios Turpial Sound |
| **Conversión esperada** | Aumentar confianza → derivar a servicio relevante o CTA de contacto |
| **Estado** | [SUGGESTED] — estructura clara; contenido completamente [CLIENT_REQUIRED] |

**Páginas hijas sugeridas:**

| Subpágina | Propósito | Estado |
|-----------|-----------|--------|
| Artistas y proyectos | lista curada de artistas con imagen y nota | [CLIENT_REQUIRED — lista autorizada] |
| Testimonios | citas de artistas o clientes con nombre | [CLIENT_REQUIRED] |
| Casos / proyectos destacados | caso breve: artista + proyecto + qué se hizo + resultado | [CLIENT_REQUIRED] |

**Nota crítica:** esta sección no puede construirse sin la lista curada y autorizada de artistas. No usar ningún nombre sin autorización explícita.

---

### 4.8 RECURSOS / FAQ

| Campo | Valor |
|-------|-------|
| **Objetivo** | Captar tráfico de búsqueda informacional. Posicionar a Turpial Sound como referente editorial en su nicho. Responder preguntas del mercado antes de que el usuario las haga. |
| **Usuario principal** | Usuario en fase de investigación; artista nuevo que no sabe qué necesita; buscador en Google de terms informativos |
| **Intención de búsqueda** | cómo prepararse para grabar, qué necesita una banda para grabar, diferencia entre mezcla y masterización, cuánto cuesta un estudio de grabación, cómo reservar un estudio |
| **Conversión esperada** | Capturar atención → construir confianza → derivar a servicio o contacto |
| **Estado** | [SUGGESTED] como sección; contenidos específicos a definir |

**Páginas hijas sugeridas:**

| Pieza | Tipo | Valor SEO/AEO | Estado |
|-------|------|---------------|--------|
| FAQ general (preguntas frecuentes del estudio) | FAQ estructurada | Alto — AEO directo | [SUGGESTED] |
| Cómo prepararse para una sesión de grabación | guía | Alto — long tail | [SUGGESTED] |
| Diferencias entre ensayo, grabación, mezcla y producción | explicación educativa | Alto — queries informacionales | [SUGGESTED] |
| Qué incluye una producción musical completa | guía de servicio | Alto | [SUGGESTED] |
| Cómo grabar un podcast de calidad profesional | guía nicho podcast | Medio | [SUGGESTED] |
| Checklist para bandas antes de entrar al estudio | recurso descargable o en página | Alto — engagement | [SUGGESTED] |
| Glosario básico de producción musical | glosario | Medio — autoridad de entidad | [SUGGESTED — Fase 2 de producción] |

**Nota:** no todos estos recursos van en V1. Priorizar FAQ general + 2–3 guías core para el lanzamiento.

---

### 4.9 CONTACTO / RESERVA

| Campo | Valor |
|-------|-------|
| **Objetivo** | Capturar la conversión final. Facilitar el primer contacto sin fricción. |
| **Usuario principal** | Usuario listo para reservar, consultar o cotizar |
| **Intención de búsqueda** | contactar Turpial Sound, reservar sala de ensayo Caracas, reservar estudio de grabación Caracas |
| **Conversión esperada** | Mensaje por WhatsApp / formulario de consulta / llamada directa |
| **Estado** | [CONFIRMED] |

**Contenido obligatorio:**
- CTA de WhatsApp como acción principal [SUGGESTED — pendiente confirmación del cliente]
- Formulario de contacto básico (nombre, servicio de interés, mensaje)
- Horarios de atención [CLIENT_REQUIRED]
- Dirección y mapa [CLIENT_REQUIRED]
- Correo de contacto [CLIENT_REQUIRED]
- Redes sociales enlazadas [CLIENT_REQUIRED]

---

## 5. Money pages — V1 prioritarias

Estas páginas son las que deben existir sí o sí en el lanzamiento inicial y deben tener el mayor nivel de calidad editorial, técnica y visual:

| Prioridad | Página | Razón |
|-----------|--------|-------|
| 1 | Home | Puerta de entrada universal; posiciona la marca y orienta |
| 2 | Salas de ensayo | Mayor volumen de demanda probable; búsquedas locales directas |
| 3 | Estudio de grabación | Servicio más identificable del nicho; búsquedas de alto valor |
| 4 | Producción musical | Servicio de mayor ticket y mayor complejidad; captura proyectos serios |
| 5 | Contacto / Reserva | Cierra la conversión desde cualquier otro punto del sitio |

---

## 6. Páginas de autoridad

Estas páginas construyen confianza, entidad y señales para buscadores e interfaces de IA. No son necesariamente de alta conversión directa, pero son críticas para que el resto del sitio funcione mejor.

| Página | Propósito principal |
|--------|---------------------|
| Estudio / Sobre nosotros | Entidad de marca; bios de voceros; historia |
| Artistas / Autoridad | Prueba social verificable; portafolio de relaciones |
| Casos / Proyectos | Evidencia de resultado; storytelling de autoridad |
| FAQ general | Responde preguntas del mercado; AEO directo |

---

## 7. Páginas de soporte SEO/AEO

Estas piezas refuerzan la autoridad temática de Turpial Sound en su nicho y captan tráfico de búsqueda informacional:

| Pieza | Intención de búsqueda objetivo | Fase de producción |
|-------|-------------------------------|-------------------|
| Cómo prepararse para una sesión de grabación | "qué necesito para grabar", "cómo preparar mi banda para el estudio" | V1 |
| Qué incluye una producción musical completa | "producción musical qué es", "qué hace un productor musical" | V1 |
| Diferencias entre grabación, mezcla y masterización | "diferencia mezcla masterización", "fases de producción musical" | V1 |
| FAQ específica de salas de ensayo | "preguntas salas de ensayo", "qué llevar al ensayo" | V1 |
| FAQ específica de grabación | "preguntas estudio de grabación", "cuánto dura una sesión de grabación" | V1 |
| Cómo grabar un podcast profesionalmente | "podcast studio Caracas", "cómo grabar podcast calidad" | Fase 2 |
| Glosario de producción musical | "qué es el mastering", "qué es un mix" | Fase 2 |
| Checklist para bandas antes de entrar al estudio | "checklist grabación estudio", "qué llevar al estudio de grabación" | Fase 2 |

---

## 8. Jerarquía de conversión

### CTA principal (sugerido — pendiente validación del cliente)
> **Reservar por WhatsApp** — presente en todas las páginas de servicio y en el hero de Home.

### CTA secundarios
| CTA | Contexto de aparición |
|-----|-----------------------|
| Consultar disponibilidad | Páginas de salas y estudio de grabación |
| Solicitar propuesta de producción | Página de producción musical |
| Cotizar servicio | Páginas de servicios complementarios |
| Ver artistas / Ver trabajos | Desde Home y páginas de servicio hacia sección de autoridad |
| Leer guía / Ver FAQ | Desde Home y servicios hacia recursos |

### Páginas de entrada orgánica esperadas
Las búsquedas de mayor volumen llevarán tráfico a:
1. Home → búsqueda de marca
2. Salas de ensayo → "sala de ensayo Caracas"
3. Estudio de grabación → "estudio de grabación Caracas"
4. Producción musical → "producción musical Caracas"
5. Podcast y locución → "podcast studio Caracas", "locución profesional Caracas"
6. Guías y FAQ → long tail informacional

### Páginas de cierre comercial
Las páginas donde se espera que ocurra la conversión final:
- Salas de ensayo (→ WhatsApp)
- Estudio de grabación (→ WhatsApp)
- Producción musical (→ WhatsApp o formulario)
- Contacto / Reserva (→ WhatsApp / formulario / llamada)

### Flujo de conversión sugerido

```
Entrada orgánica (búsqueda / redes / recomendación)
      ↓
Home o página de servicio específica
      ↓
Prueba social / Sobre nosotros / Artistas (si el usuario evalúa)
      ↓
Página de servicio con detalle + CTA
      ↓
WhatsApp / Formulario / Teléfono
      ↓
Reserva confirmada o solicitud calificada
```

---

## 9. Dependencias antes de congelar el sitemap definitivo

Los siguientes puntos dependen exclusivamente del cliente y bloquean la versión final de la arquitectura:

| Dependencia | Impacto si no se resuelve | Estado |
|-------------|--------------------------|--------|
| CTA principal confirmado (WhatsApp / otro) | Cambia la mecánica de conversión de todo el sitio | [CLIENT_REQUIRED] |
| Estructura de precios (¿se publican tarifas o no?) | Define si hay página de "Tarifas" o se oculta detrás de CTA | [CLIENT_REQUIRED] |
| Lista de salas disponibles y sus nombres | Define si hay subpáginas por sala o una sola página | [CLIENT_REQUIRED] |
| Lista autorizada de artistas | Define si existe la sección de Artistas/Autoridad y con qué contenido | [CLIENT_REQUIRED] |
| Dominio y estructura de URL | Define si el sitio es español, inglés o bilingüe desde /en/ o subdominios | [CLIENT_REQUIRED] |
| Nivel de bilingüismo decidido | Define si se duplican páginas en inglés o se usa i18n en JS | [CLIENT_REQUIRED] |
| Servicios activos confirmados | Define cuáles subpáginas de Servicios Complementarios se crean en V1 | [CLIENT_REQUIRED] |
| Existencia de portafolio / casos publicables | Define si existe sección de casos en V1 o se pospone | [CLIENT_REQUIRED] |

---

## 10. Documentos derivados del sitemap

Una vez aprobado el sitemap maestro (o su versión provisional), los siguientes documentos deben generarse en este orden:

| Orden | Documento | Contenido | Carpeta |
|-------|-----------|-----------|---------|
| 1 | `url-map.md` | URL definitiva de cada página (español + inglés si aplica) | `02_information_architecture/` |
| 2 | `navigation-model.md` | Menú principal, menú footer, breadcrumbs, CTAs fijos | `02_information_architecture/` |
| 3 | `content-clusters.md` | Clústers temáticos: página pilar + páginas satélite + FAQ | `02_information_architecture/` |
| 4 | `internal-linking.md` | Qué páginas se enlazan entre sí y con qué texto de ancla | `02_information_architecture/` |
| 5 | `page-briefs.md` | Brief individual por página: objetivo, usuario, secciones, copy guide, CTA | `03_editorial/` |

---

## 11. Vista consolidada — Árbol completo V1 propuesto

```
TURPIAL SOUND (sitio público)
│
├── / (Home)
│
├── /nosotros (o /estudio)                         [autoridad de entidad]
│   ├── Frank Lemus — inline o subpágina
│   └── Susej Vera — inline o subpágina
│
├── /salas-de-ensayo                               [money page]
│   ├── /salas-de-ensayo/sala-premium              [SUGGESTED]
│   ├── /salas-de-ensayo/sala-estandar             [SUGGESTED]
│   ├── /salas-de-ensayo/tarifas                   [CLIENT_REQUIRED]
│   └── /salas-de-ensayo/faq                       [SUGGESTED]
│
├── /estudio-de-grabacion                          [money page]
│   ├── /estudio-de-grabacion/equipamiento         [SUGGESTED]
│   └── /estudio-de-grabacion/faq                  [SUGGESTED]
│
├── /produccion-musical                            [money page]
│   ├── /produccion-musical/proceso                [SUGGESTED]
│   ├── /produccion-musical/portafolio             [CLIENT_REQUIRED]
│   └── /produccion-musical/faq                   [SUGGESTED]
│
├── /servicios
│   ├── /servicios/mezcla-masterizacion            [SUGGESTED]
│   ├── /servicios/podcast-locucion                [SUGGESTED]
│   ├── /servicios/video-studio-session            [SUGGESTED]
│   ├── /servicios/arreglos-musicales              [SUGGESTED]
│   └── /servicios/consultoria                     [SUGGESTED — evaluar demanda]
│
├── /artistas                                      [autoridad — CLIENT_REQUIRED]
│   ├── /artistas/testimonios                      [CLIENT_REQUIRED]
│   └── /artistas/proyectos                        [CLIENT_REQUIRED]
│
├── /recursos
│   ├── /recursos/como-prepararse-para-grabar      [SUGGESTED — V1]
│   ├── /recursos/que-incluye-produccion-musical   [SUGGESTED — V1]
│   ├── /recursos/grabacion-mezcla-masterizacion   [SUGGESTED — V1]
│   ├── /recursos/faq                              [SUGGESTED — V1]
│   └── /recursos/checklist-antes-del-estudio      [SUGGESTED — Fase 2]
│
└── /contacto                                      [conversión final]

─── PÁGINAS ESTÁTICAS (footer / legal)
├── /politica-de-privacidad
└── /terminos-de-servicio
```

**Nota sobre inglés:** si el sitio es bilingüe total, se replica la estructura bajo `/en/`. Si es bilingüe parcial, solo las páginas core tienen versión en inglés. Definir en `url-map.md` una vez el cliente confirme el nivel de bilingüismo.

---

## 12. Criterios para declarar este sitemap como versión final

- [ ] CTA principal del sitio confirmado por el cliente
- [ ] Estructura de precios decidida (¿se publica o no?)
- [ ] Lista y nombres de salas confirmados
- [ ] Lista de artistas autorizados para la sección de autoridad
- [ ] Nivel de bilingüismo del sitio definido
- [ ] Servicios activos en V1 confirmados (cuáles sí, cuáles van a Fase 2)
- [ ] Portafolio publicable: ¿existe para V1 o se pospone?
