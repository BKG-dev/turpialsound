# Turpial Sound — Internal Linking Logic

> Estado: **Fase 2 — Provisional. Lógica definida; algunos enlaces específicos dependen de contenido y páginas aún no creadas.**
> Última actualización: 2026-03-26
> Fuente base: `sitemap-master.md` + `url-architecture.md` + `navigation-system.md` + `docs/01_strategy/`

---

## Leyenda de estado

- **[CONFIRMED]** — patrón sólido; no requiere validación adicional
- **[SUGGESTED]** — patrón coherente; puede refinarse al escribir el contenido real
- **[CLIENT_REQUIRED]** — depende de contenido o decisiones del cliente

---

## 1. Propósito del linking interno

El sistema de enlazado interno cumple tres funciones simultáneas:

1. **Orientar al usuario** — guía el recorrido desde la entrada hasta la conversión sin que el usuario tenga que adivinar su próximo paso.
2. **Distribuir autoridad de dominio** — transfiere el peso de páginas fuertes (Home, money pages) hacia páginas que necesitan posicionamiento (recursos, FAQ, servicios complementarios).
3. **Consolidar autoridad temática** — agrupa señales de relevancia en torno a los temas que Turpial Sound quiere dominar (grabación, ensayo, producción musical en Caracas), sin crear canibalización entre páginas similares.

---

## 2. Clasificación de páginas por rol en el sistema de linking

### 2.1 Páginas hub
Son la raíz de cada clúster temático. Reciben y distribuyen links. Alta autoridad interna.

| Página | URL | Función hub |
|--------|-----|-------------|
| Home | `/` | Hub universal — punto de entrada y redistribuidor principal |
| Servicios | `/servicios` | Hub de servicios complementarios — orienta hacia subpáginas |
| Recursos | `/recursos` | Hub editorial — indexa guías y FAQ |
| Artistas | `/artistas` | Hub de prueba social — indexa testimonios y proyectos |

### 2.2 Páginas money (transaccionales)
Son el destino de conversión. Reciben links desde hubs y desde páginas de soporte. Apuntan hacia la acción de conversión.

| Página | URL |
|--------|-----|
| Salas de ensayo | `/salas-de-ensayo` |
| Estudio de grabación | `/estudio-de-grabacion` |
| Producción musical | `/produccion-musical` |
| Contacto / Reserva | `/contacto` |

### 2.3 Páginas de autoridad
Construyen confianza. Reciben links desde hubs y desde money pages. No son el destino final de conversión, pero aceleran la decisión.

| Página | URL |
|--------|-----|
| Nosotros | `/nosotros` |
| Artistas y proyectos | `/artistas` |
| Testimonios | `/artistas/testimonios` |
| Proyectos destacados | `/artistas/proyectos` |

### 2.4 Páginas de soporte SEO/AEO
Capturan tráfico informacional y transfieren autoridad temática hacia las money pages.

| Página | URL |
|--------|-----|
| Cómo prepararse para grabar | `/recursos/como-prepararse-para-grabar` |
| Qué incluye una producción musical | `/recursos/que-incluye-una-produccion-musical` |
| Grabación vs. mezcla vs. masterización | `/recursos/grabacion-mezcla-masterizacion` |
| FAQ general | `/recursos/preguntas-frecuentes` |
| FAQ de salas | `/salas-de-ensayo/preguntas-frecuentes` |
| FAQ de grabación | `/estudio-de-grabacion/preguntas-frecuentes` |
| FAQ de producción | `/produccion-musical/preguntas-frecuentes` |

---

## 3. Clústeres temáticos y su lógica de linking

Un clúster temático es un grupo de páginas que trata el mismo tema desde distintos ángulos. La página pilar absorbe la autoridad de las páginas satélite que la enlazan; las páginas satélite reciben visibilidad de búsqueda informacional y la canalizan hacia la conversión.

---

### Clúster 1 — Salas de ensayo

**Página pilar:** `/salas-de-ensayo`

```
/recursos/como-prepararse-para-grabar          → enlaza a /salas-de-ensayo
/salas-de-ensayo/preguntas-frecuentes          → enlaza a /salas-de-ensayo
/salas-de-ensayo/sala-[nombre]                 → enlaza a /salas-de-ensayo (breadcrumb + CTA)
/salas-de-ensayo/tarifas                       → enlaza a /salas-de-ensayo y /contacto
/artistas/proyectos                            → enlaza a /salas-de-ensayo si algún proyecto usó sala de ensayo
/nosotros                                      → enlaza a /salas-de-ensayo como parte de la oferta
/                                              → enlaza a /salas-de-ensayo desde bloque de servicios en Home
```

**Texto de ancla sugerido para enlaces hacia esta página:**
- "salas de ensayo en Caracas"
- "reservar sala de ensayo"
- "nuestras salas de ensayo"
- "ensayar en Turpial Sound"

---

### Clúster 2 — Estudio de grabación

**Página pilar:** `/estudio-de-grabacion`

```
/recursos/como-prepararse-para-grabar          → enlaza a /estudio-de-grabacion
/recursos/grabacion-mezcla-masterizacion       → enlaza a /estudio-de-grabacion
/estudio-de-grabacion/preguntas-frecuentes     → enlaza a /estudio-de-grabacion
/estudio-de-grabacion/equipamiento             → enlaza a /estudio-de-grabacion (breadcrumb)
/artistas/proyectos                            → enlaza a /estudio-de-grabacion si el proyecto fue grabación
/produccion-musical                            → enlaza a /estudio-de-grabacion como parte del proceso de producción
/nosotros                                      → enlaza a /estudio-de-grabacion como parte de la oferta
/                                              → enlaza a /estudio-de-grabacion desde bloque de servicios
```

**Texto de ancla sugerido:**
- "estudio de grabación en Caracas"
- "grabar en Turpial Sound"
- "sesión de grabación profesional"
- "nuestro estudio"

---

### Clúster 3 — Producción musical

**Página pilar:** `/produccion-musical`

```
/recursos/que-incluye-una-produccion-musical   → enlaza a /produccion-musical
/recursos/grabacion-mezcla-masterizacion       → enlaza a /produccion-musical
/produccion-musical/proceso                    → enlaza a /produccion-musical (breadcrumb)
/produccion-musical/portafolio                 → enlaza a /produccion-musical (breadcrumb)
/produccion-musical/preguntas-frecuentes       → enlaza a /produccion-musical
/estudio-de-grabacion                          → enlaza a /produccion-musical como upsell ("¿Buscas algo más completo?")
/servicios/arreglos-musicales                  → enlaza a /produccion-musical como servicio relacionado
/nosotros                                      → enlaza a /produccion-musical
/                                              → enlaza a /produccion-musical desde bloque de servicios
```

**Texto de ancla sugerido:**
- "producción musical en Caracas"
- "producir tu música con nosotros"
- "proceso de producción musical"
- "producción integral"

---

### Clúster 4 — Podcast y locución

**Página pilar:** `/servicios/podcast-locucion`

```
/recursos/como-grabar-un-podcast-profesional   → enlaza a /servicios/podcast-locucion  [Fase 2]
/servicios                                     → enlaza a /servicios/podcast-locucion
/                                              → puede enlazar si se decide incluir podcast en el Home
/estudio-de-grabacion                          → enlaza como "También grabamos podcast y locución"
```

**Texto de ancla sugerido:**
- "grabación de podcast en Caracas"
- "locución profesional en Caracas"
- "estudio para podcast"

---

## 4. Flujo de usuario desde contenido informativo hasta conversión

El siguiente patrón describe cómo un usuario que llega por búsqueda informacional debe poder llegar a la conversión sin fricciones:

```
Búsqueda informacional (Google)
      ↓
Página de recurso o FAQ (/recursos/*)
      ↓
Bloque contextual al final del recurso:
"¿Quieres [resultado del recurso]? En Turpial Sound podemos ayudarte."
  → CTA: [enlace a la money page relevante]
      ↓
Página de servicio (/salas-de-ensayo, /estudio-de-grabacion, /produccion-musical)
      ↓
Bloque de prueba social en la página de servicio
  → enlace opcional a /artistas o /artistas/testimonios
      ↓
CTA final de la página de servicio
  → WhatsApp / formulario / /contacto
      ↓
Conversión
```

**Regla:** ninguna página de recurso o FAQ debe ser un callejón sin salida. Toda página de soporte SEO termina con un camino hacia la conversión.

---

## 5. Cómo se transfiere autoridad temática sin canibalización

### 5.1 Definición del riesgo
La canibalización ocurre cuando dos páginas del mismo sitio compiten por el mismo término de búsqueda, dividiendo la autoridad y confundiendo al buscador sobre cuál página debe rankear.

### 5.2 Mapa de intenciones — ninguna URL duplica la intención de otra

| Término objetivo | Página única que lo resuelve | Otras páginas que apoyan sin competir |
|-----------------|------------------------------|--------------------------------------|
| "salas de ensayo Caracas" | `/salas-de-ensayo` | `/salas-de-ensayo/sala-[nombre]` (detalle específico), `/recursos/como-prepararse-para-grabar` (informacional) |
| "estudio de grabación Caracas" | `/estudio-de-grabacion` | `/estudio-de-grabacion/equipamiento` (detalle técnico), recursos de grabación (informacional) |
| "producción musical Caracas" | `/produccion-musical` | `/produccion-musical/proceso` (metodología), `/recursos/que-incluye-una-produccion-musical` (informacional) |
| "podcast studio Caracas" | `/servicios/podcast-locucion` | Recurso de podcast en `/recursos/` si se crea |
| "mezcla masterización Caracas" | `/servicios/mezcla-masterizacion` | Recurso explicativo en `/recursos/grabacion-mezcla-masterizacion` (informacional, no transaccional) |

### 5.3 Regla de diferenciación

| Tipo de página | Intención que resuelve |
|---------------|----------------------|
| Money page | Transaccional: el usuario quiere reservar o contratar |
| Subpágina de detalle | Informacional específica: el usuario quiere entender el servicio antes de decidir |
| Recurso / guía | Informacional general: el usuario investiga antes de llegar a la marca |
| FAQ por sección | Objeciones: el usuario tiene dudas específicas sobre ese servicio |

Mientras cada página resuelva una intención distinta, no hay canibalización aunque usen términos similares.

---

## 6. Tabla de enlaces internos obligatorios

Estos son los enlaces que deben existir sí o sí en el sitio. Son la columna vertebral del sistema de linking:

| Página origen | Enlaza a | Texto de ancla orientativo | Prioridad |
|--------------|----------|--------------------------|-----------|
| `/` (Home) | `/salas-de-ensayo` | "Salas de ensayo" | Crítica |
| `/` (Home) | `/estudio-de-grabacion` | "Estudio de grabación" | Crítica |
| `/` (Home) | `/produccion-musical` | "Producción musical" | Crítica |
| `/` (Home) | `/artistas` | "Artistas que confían en nosotros" | Alta |
| `/` (Home) | `/contacto` | "Reservar" / CTA principal | Crítica |
| `/salas-de-ensayo` | `/contacto` | CTA de reserva | Crítica |
| `/estudio-de-grabacion` | `/contacto` | CTA de reserva | Crítica |
| `/produccion-musical` | `/contacto` | "Hablar sobre tu proyecto" | Crítica |
| `/salas-de-ensayo` | `/estudio-de-grabacion` | "¿Necesitas grabar?" (upsell) | Alta |
| `/estudio-de-grabacion` | `/produccion-musical` | "¿Quieres producción integral?" (upsell) | Alta |
| `/nosotros` | `/salas-de-ensayo` | "Conoce nuestras salas" | Media |
| `/nosotros` | `/estudio-de-grabacion` | "Nuestro estudio" | Media |
| `/nosotros` | `/produccion-musical` | "Producción musical" | Media |
| `/recursos/*` (cada guía) | Money page relevante | Varía por tema | Alta |
| `/recursos/preguntas-frecuentes` | `/contacto` | "Contáctanos directamente" | Alta |
| `/artistas` | `/contacto` | "¿Quieres ser parte de esto?" | Media |
| `/servicios/mezcla-masterizacion` | `/produccion-musical` | "O lleva tu proyecto más lejos" | Media |
| `/servicios/podcast-locucion` | `/contacto` | CTA de reserva de sesión | Alta |
| Toda FAQ específica | Money page de su sección | Varía | Alta |

---

## 7. Patrones de linking que deben evitarse

| Patrón a evitar | Por qué |
|----------------|---------|
| Dos páginas con texto de ancla idéntico apuntando a URLs diferentes | Confunde al buscador sobre qué página resuelve esa intención |
| Dos páginas compitiendo por el mismo término transaccional | Canibalización de autoridad SEO |
| Enlazar a la Home desde texto de ancla genérico en el cuerpo del texto | La Home ya tiene suficiente autoridad; ese enlace no aporta |
| Páginas huérfanas (páginas sin ningún enlace entrante desde el sitio) | El buscador no las encuentra; la autoridad no fluye hacia ellas |
| Cadenas de links circulares sin propósito editorial | A → B → C → A sin que ninguno añada valor al usuario |
| Overload de links internos en un mismo párrafo | Diluye la señal de importancia de cada enlace |
| Texto de ancla genérico ("haz clic aquí", "ver más") | No aporta señal temática; no describe el destino |
| Subpáginas de detalle enlazando directamente a `/contacto` sin pasar por la página pilar | Saltarse el pilar debilita su autoridad acumulada |

---

## 8. Reglas de texto de ancla

| Tipo de página destino | Texto de ancla recomendado |
|-----------------------|--------------------------|
| Money page desde recurso | Término de búsqueda natural: "salas de ensayo en Caracas", "estudio de grabación Caracas" |
| Money page desde otra money page | Descripción orientada a beneficio: "producción integral", "grabar en nuestro estudio" |
| Autoridad desde servicio | Orientado a prueba: "artistas que confían en nosotros", "ver proyectos" |
| CTA de conversión | Orientado a acción: "Reservar por WhatsApp", "Solicitar disponibilidad", "Hablar sobre tu proyecto" |
| Subpáginas desde pilar | Descriptivo: "ver equipamiento", "consultar tarifas", "preguntas frecuentes" |
| Recursos desde servicio | Orientado a valor educativo: "Cómo prepararte para tu sesión", "Qué incluye una producción" |

---

## 9. Consideraciones para bilingüismo

Si el sitio tiene versión en inglés, las siguientes reglas aplican al linking interno:

- Los enlaces entre versiones del mismo idioma no cruzan idioma (una página en ES no enlaza a una página en EN a menos que sea el switcher).
- Las páginas EN tienen su propio sistema de linking interno espejo: `/en/recording-studio` enlaza a `/en/music-production`, no a `/produccion-musical`.
- `hreflang` en el `<head>` maneja la relación canónica entre idiomas; el linking interno no duplica esa función.

**Estado:** **[CLIENT_REQUIRED]** — el nivel de bilingüismo no está definido. Esta sección se activa cuando el cliente confirme.

---

## 10. Criterios pendientes para cerrar la lógica de linking

- [ ] Confirmar qué páginas existen en V1 (define qué enlaces son posibles vs. futuros)
- [ ] Confirmar si existe `/artistas` con contenido real en V1 (define si los enlaces desde servicios apuntan ahí ya)
- [ ] Confirmar si existe portafolio en V1 (define los enlaces desde producción hacia casos)
- [ ] Confirmar CTA principal (define el texto de ancla de los CTAs en toda la red)
- [ ] Confirmar nombres reales de las salas (definen slugs y anclas de subpáginas)
- [ ] Confirmar nivel de bilingüismo (activa o descarta el sistema de linking EN)
