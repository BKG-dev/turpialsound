# Turpial Sound — Navigation System

> Estado: **Fase 2 — Provisional. Estructura de navegación definida; nombres de ítems y CTA pendientes de validación del cliente.**
> Última actualización: 2026-03-26
> Fuente base: `sitemap-master.md` + `url-architecture.md` + `docs/01_strategy/`

---

## Leyenda de estado

- **[CONFIRMED]** — estructura sólida; no requiere validación adicional del cliente
- **[SUGGESTED]** — propuesta coherente; puede refinarse con preferencia del cliente
- **[CLIENT_REQUIRED]** — depende de decisión o información del cliente

---

## 1. Principios de navegación

### 1.1 La navegación sirve a la conversión, no al ego de la marca
El menú principal no es un índice del sitio. Es un sistema de orientación que dirige al usuario hacia la acción más valiosa lo antes posible. Páginas internas, legales o de bajo tráfico no deben competir por espacio en el menú principal.

### 1.2 Menos ítems, más claridad
El menú principal no debe superar 6–7 ítems visibles en desktop. Cada ítem adicional diluye la atención y complica la experiencia en móvil.

### 1.3 El CTA persiste en todas las páginas
El call to action principal (reservar / contactar) debe estar siempre visible y accesible, independientemente de en qué página se encuentre el usuario. No puede quedar enterrado en el footer ni solo en la página de contacto.

### 1.4 Mobile-first en jerarquía de contenidos
La navegación móvil define la jerarquía real. Si algo no cabe limpiamente en un menú de hamburguesa con 6–7 ítems, no pertenece al menú principal.

### 1.5 Los servicios con múltiples subpáginas usan dropdown controlado
Las secciones con más de 3 subpáginas (Salas, Estudio, Producción, Servicios) pueden usar dropdowns en desktop. En móvil se despliegan en el menú de hamburguesa como ítems anidados de un solo nivel.

---

## 2. Navegación principal (Header)

### 2.1 Estructura propuesta

```
[Logo Turpial Sound]    Salas de ensayo    Estudio de grabación    Producción    Servicios    Artistas    Recursos    [RESERVAR →]
```

| Ítem | URL | Tipo | Estado |
|------|-----|------|--------|
| Logo | `/` | Siempre enlaza a Home | [CONFIRMED] |
| Salas de ensayo | `/salas-de-ensayo` | Money page | [CONFIRMED] |
| Estudio de grabación | `/estudio-de-grabacion` | Money page | [CONFIRMED] |
| Producción | `/produccion-musical` | Money page | [CONFIRMED] |
| Servicios | `/servicios` | Hub con dropdown | [CONFIRMED] |
| Artistas | `/artistas` | Autoridad | [SUGGESTED — puede omitirse del menú principal hasta tener contenido real] |
| Recursos | `/recursos` | SEO/AEO | [SUGGESTED] |
| CTA: Reservar | `/contacto` o acción directa WhatsApp | Botón diferenciado | [SUGGESTED — nombre y mecanismo pendiente del cliente] |

### 2.2 Regla sobre "Nosotros / Estudio"
La página de About no aparece en el menú principal de primer nivel. Se accede desde el footer y desde bloques contextuales dentro del Home y páginas de servicio. Razón: el menú principal es para conversión y orientación de servicio; la página de autoridad la descubre el usuario en su propio recorrido, no se le fuerza.

**Excepción:** si el cliente considera que la bio de Frank Lemus o la historia del estudio son diferenciales críticos de venta (por ejemplo, el nombre del fundador es conocido en el medio), puede justificarse incluir "Nosotros" o "El estudio" en el menú. **[CLIENT_REQUIRED — decisión del cliente]**

### 2.3 Dropdown de Servicios (desktop)

Cuando el usuario hace hover sobre "Servicios":

```
Servicios
├── Mezcla y masterización       → /servicios/mezcla-masterizacion
├── Podcast y locución           → /servicios/podcast-locucion
├── Video studio session         → /servicios/video-session
├── Arreglos musicales           → /servicios/arreglos-musicales
└── Consultoría                  → /servicios/consultoria
```

**Consideración de UX:** los servicios de mayor demanda independiente (podcast/locución, video session) pueden justificar su propio ítem de primer nivel en el menú si el cliente confirma que generan volumen de búsquedas o consultas relevante. En V1, se agrupan bajo "Servicios" para mantener el menú limpio. **[SUGGESTED — revisar con el cliente al inicio de Fase 3]**

---

## 3. Navegación secundaria

La navegación secundaria no existe como elemento visual propio en el header. Se expresa como:

### 3.1 Breadcrumbs (dentro de páginas de segundo y tercer nivel)
- Aparecen en todas las páginas con profundidad ≥ 2.
- Formato: `Home / Salas de ensayo / Sala Premium`
- Función: orientación + señal de estructura para buscadores (Schema BreadcrumbList).

### 3.2 Navegación contextual dentro de la sección
En páginas de servicio principal (Salas, Estudio, Producción), se propone un bloque de navegación lateral o superior que enlaza a las subpáginas de esa sección:

```
Salas de ensayo
├── Sala Premium
├── Sala Estándar
├── Tarifas
└── Preguntas frecuentes
```

Este bloque no va en el header global: vive solo dentro de la sección. Función: orientar al usuario que ya entró a la sección sin forzarlo a volver al menú principal.

---

## 4. Footer navigation

El footer completa la navegación sin sobrecargar el header. Incluye páginas de orientación, acceso a About, legales y señales de entidad.

### 4.1 Estructura propuesta del footer

```
TURPIAL SOUND
[tagline breve de posicionamiento]            [logo alternativo o wordmark]

SERVICIOS                ESTUDIO               RECURSOS             LEGAL
Salas de ensayo          Sobre nosotros         Recursos / Guías     Política de privacidad
Estudio de grabación     Artistas               FAQ                  Términos de servicio
Producción musical       [Frank Lemus]
Mezcla y masterización
Podcast y locución
Video session
Arreglos musicales

CONTACTO
[dirección]                                    [redes sociales]
[horario de atención]
[WhatsApp]
[correo]
```

| Elemento | Estado |
|----------|--------|
| Dirección física | [CLIENT_REQUIRED] |
| Horario de atención | [CLIENT_REQUIRED] |
| Número de WhatsApp | [CLIENT_REQUIRED] |
| Correo de contacto | [CLIENT_REQUIRED] |
| URLs de redes sociales | [CLIENT_REQUIRED] |
| Tagline del footer | [SUGGESTED] |
| Frank Lemus como ítem del footer | [SUGGESTED — si la bio individual tiene página propia] |

---

## 5. CTA persistente

### 5.1 Principio
El CTA principal debe estar siempre visible. En ningún punto del sitio el usuario debe preguntarse "¿cómo reservo?" o "¿cómo los contacto?". La fricción entre la intención y la acción debe ser mínima.

### 5.2 Ubicaciones del CTA

| Ubicación | Tipo de CTA | Comportamiento |
|-----------|-------------|---------------|
| Header (extremo derecho) | Botón primario destacado | Siempre visible en desktop. En móvil: icono o texto breve en el header fijo. |
| Hero de Home | Botón primario grande | Principal punto de conversión de la entrada. |
| Al final de cada página de servicio | Botón primario + texto de soporte | "¿Listo para reservar? Escríbenos" |
| Botón flotante móvil | Icono de WhatsApp o "Reservar" | [SUGGESTED — solo si el cliente confirma WhatsApp como canal principal] |
| Footer | Link de texto o botón secundario | Para usuarios que llegan al final de la página |

### 5.3 Texto del CTA

El nombre del botón depende del mecanismo de conversión confirmado:

| Escenario | Texto sugerido del CTA |
|-----------|----------------------|
| WhatsApp como canal principal | "Reservar por WhatsApp" |
| Formulario de contacto | "Solicitar disponibilidad" |
| Combinación | "Reservar" → WhatsApp + formulario como opciones |

**Estado:** **[CLIENT_REQUIRED]** — el cliente debe confirmar cuál es el mecanismo de conversión principal antes de redactar el CTA.

---

## 6. Language switcher (versión bilingüe)

> Aplica solo si el cliente confirma que el sitio tendrá versión en inglés. **[CLIENT_REQUIRED]**

### 6.1 Principio
El switcher de idioma debe ser discreto pero accesible. No debe competir visualmente con el CTA ni con el logo. Se ubica en el extremo superior del header o dentro del menú de hamburguesa en móvil.

### 6.2 Propuesta

```
[Header]  ...  Recursos    [EN / ES]    [RESERVAR →]
```

- Ítem activo: idioma actual en texto completo o abreviatura (ES / EN)
- Ítem alternativo: enlace al equivalente de la página actual en el otro idioma
- Si la página no tiene versión en el otro idioma (contenido solo en español), el switcher puede ocultar la opción o llevar a la Home del idioma alternativo

### 6.3 Implementación técnica
A definir en Fase 4. Opciones: i18n en Next.js App Router con rutas localizadas bajo `/en/`; `next-intl` o `react-i18next`. El mecanismo técnico no afecta la decisión de navegación, pero sí debe considerarse al definir la estructura de rutas.

---

## 7. Jerarquía móvil

### 7.1 Header móvil
```
[Logo]                                [Reservar]    [☰ Menú]
```

- Logo: siempre visible, enlaza a Home
- Botón de CTA: visible en el header móvil sin necesidad de abrir el menú
- Ícono de hamburguesa: abre el menú completo

### 7.2 Menú de hamburguesa — estructura

```
✕ Cerrar

Salas de ensayo
  └── Sala Premium
  └── Sala Estándar
  └── Tarifas
Estudio de grabación
Producción musical
Servicios
  └── Mezcla y masterización
  └── Podcast y locución
  └── Video session
  └── Arreglos musicales
Artistas
Recursos
Sobre nosotros

─────────────────────
[Reservar por WhatsApp]   ← CTA principal visible al final del menú
─────────────────────
[ES / EN]                 ← si bilingüe
```

### 7.3 Regla móvil
Ningún ítem de submenú tiene más de un nivel de anidamiento en móvil. Si existe una tercera capa de navegación (subpáginas de subpáginas), no aparece en el menú móvil: el usuario llega a ella a través de la página padre.

---

## 8. Relaciones de navegación clave

### 8.1 Home → Money pages
El Home debe tener acceso directo y prominente a las tres money pages (Salas, Estudio, Producción). No solo desde el menú: desde el propio cuerpo de la página, mediante cards de servicio o bloques visuales con CTA individual.

### 8.2 Páginas de servicio → Autoridad
Cada money page debe tener al menos un bloque que enlace o muestre prueba social (artistas, testimonios, trayectoria). El usuario que evalúa un servicio necesita evidencia dentro de la misma página, o un acceso claro a `/artistas`.

### 8.3 Recursos → Money pages
Cada recurso o guía de `/recursos` termina con un bloque que deriva al usuario hacia el servicio relevante. Un artículo sobre "cómo prepararse para grabar" enlaza a `/estudio-de-grabacion`. Un artículo sobre "qué incluye una producción musical" enlaza a `/produccion-musical`.

### 8.4 FAQ → Contacto
La página de preguntas frecuentes tiene un bloque final del tipo: "¿No encontraste lo que buscabas? Contáctanos directamente." con CTA hacia `/contacto` o WhatsApp.

---

## 9. Elementos fuera del menú principal

Los siguientes no deben ocupar espacio en el header ni en la navegación primaria:

| Elemento | Dónde va |
|----------|----------|
| Política de privacidad | Solo en footer |
| Términos de servicio | Solo en footer |
| Nosotros / Sobre el estudio | Footer + enlaces contextuales en Home y páginas de servicio |
| Frank Lemus / Susej Vera (bios individuales) | Desde `/nosotros` y en bloques de autoridad en otras páginas |
| Artistas individuales | Dentro de `/artistas`, no en menú |
| Subpáginas de FAQ | Desde sus páginas padre, no en menú global |
| Recursos individuales | Desde el hub `/recursos` |

---

## 10. Criterios pendientes para congelar el sistema de navegación

- [ ] Mecanismo de conversión principal confirmado (WhatsApp / formulario / otro) → define texto del CTA
- [ ] Decisión sobre si "Nosotros" entra en el menú principal
- [ ] Nivel de bilingüismo definido → define si existe el language switcher
- [ ] Nombre real de las salas → define ítems de submenú de Salas de ensayo
- [ ] Servicios activos en V1 → define cuáles ítems aparecen en el dropdown de Servicios
- [ ] Dirección, horario, WhatsApp y correo → completan el footer
- [ ] Decisión sobre botón flotante de WhatsApp en móvil
