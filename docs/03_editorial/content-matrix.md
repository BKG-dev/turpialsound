# Turpial Sound — Content Matrix

> Estado: **Fase 3 en apertura. Matriz operativa derivada de los page briefs.**
> Última actualización: 2026-03-26
> Fuente base: `page-briefs.md` + `docs/01_strategy/` + `docs/02_information_architecture/`

---

## Propósito

La Content Matrix traduce los briefs en una tabla operativa de bloques por página. Para cada bloque identifica:
- qué tipo de contenido necesita
- qué evidencia requiere
- su estado actual
- la nota operativa para quien lo construya

Sirve como tablero de trabajo para copywriters, diseñadores y desarrolladores: cada fila es una unidad de trabajo autónoma.

---

## Leyenda

| Estado | Significado |
|--------|-------------|
| CONFIRMED | El contenido puede escribirse o diseñarse desde la información ya disponible |
| SUGGESTED | Propuesta coherente; requiere aprobación del cliente antes de producir |
| PLACEHOLDER | El slot existe; el contenido final depende de datos pendientes del cliente |
| CLIENT_REQUIRED | No puede construirse sin información específica del cliente |

---

## HOME ( `/` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Hero | Primera impresión; posicionamiento en 5 seg | Foto editorial + headline + subheadline + CTA | Foto real del espacio [CLIENT_REQUIRED] | PLACEHOLDER | El copy del headline puede prepararse; la foto bloquea el bloque final |
| Tres servicios núcleo | Orientar al usuario hacia las money pages | Cards: nombre + descripción 1 línea + CTA | Fotos de cada servicio [CLIENT_REQUIRED] | PLACEHOLDER | Estructura y copy pueden desarrollarse; fotos pendientes |
| Prueba de autoridad | Activar confianza inmediata | Contador de artistas/proyectos + frase + logos | Dato numérico + logos autorizados [CLIENT_REQUIRED] | PLACEHOLDER | Si no hay logos, se puede usar número + frase sola |
| Por qué Turpial Sound | Diferenciadores visuales compactos | 3–4 ítems con ícono o ilustración + texto breve | Diferenciadores confirmados del intake | CONFIRMED | Puede redactarse desde el brand-core y control point ya disponibles |
| Servicios complementarios | Visibilidad de la oferta expandida | Lista o chips enlazados a /servicios | Confirmar cuáles están activos en V1 [CLIENT_REQUIRED] | PLACEHOLDER | Estructura lista; ítems activos pendientes del cliente |
| Testimonio | Prueba social emocional | Cita + nombre + proyecto + foto (opcional) | Testimonio real [CLIENT_REQUIRED] | CLIENT_REQUIRED | Sin testimonio real, este bloque no debe aparecer |
| CTA final | Conversión directa | Frase + botón primario | Mecanismo de contacto [CLIENT_REQUIRED] | PLACEHOLDER | Copy puede prepararse; enlace final depende del CTA confirmado |

---

## SALAS DE ENSAYO ( `/salas-de-ensayo` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Hero de sección | Capturar atención + CTA inmediato | Foto de sala + headline + CTA | Foto real de sala [CLIENT_REQUIRED] | PLACEHOLDER | Sin foto real, el bloque no puede finalizarse |
| Diferenciadores de las salas | Justificar el valor frente a alternativas informales | Lista 3–4 puntos: equipamiento / comodidad / personal | Diferenciadores declarados en intake | CONFIRMED | Puede redactarse desde lo ya disponible |
| Ficha de cada sala | Permitir comparación y decisión | Cards: nombre + capacidad + equipo + tarifa + CTA | Datos reales de cada sala [CLIENT_REQUIRED] | CLIENT_REQUIRED | Bloquea parcialmente la página; puede diseñarse el template sin el contenido |
| Tarifas | Eliminar fricción de precio | Tabla de modalidades | Estructura de precios + decisión de publicar [CLIENT_REQUIRED] | CLIENT_REQUIRED | Si el cliente decide no publicar, este bloque se reemplaza por CTA de consulta |
| Testimonio de banda | Prueba social del servicio | Cita + nombre + proyecto | Testimonio real [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| FAQ de salas | Eliminar objeciones antes del CTA | Acordeón 4–5 preguntas + respuestas | Preguntas reales del negocio [SUGGESTED — pueden inferirse] | SUGGESTED | Preguntas pueden prepararse desde control_point_01 sección 4.3 |
| Upsell a grabación | Capturar el siguiente paso del usuario | Bloque de enlace contextual | Ninguna adicional | CONFIRMED | Puede construirse ahora |
| CTA final | Conversión directa | Frase + botón | Mecanismo de contacto [CLIENT_REQUIRED] | PLACEHOLDER | |

---

## ESTUDIO DE GRABACIÓN ( `/estudio-de-grabacion` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Hero de sección | Capturar atención + CTA inmediato | Foto consola/booth + headline + CTA | Foto real del estudio [CLIENT_REQUIRED] | PLACEHOLDER | |
| El estudio en detalle | Descripción del espacio | Texto descriptivo + datos técnicos de la sala | Datos acústicos, dimensiones, condiciones [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| Equipamiento | Validar calidad técnica ante el usuario exigente | Lista o tabla: consola / micrófonos / software / monitores | Inventario técnico real [CLIENT_REQUIRED] | CLIENT_REQUIRED | Bloque crítico para usuarios técnicos |
| Artistas que han grabado aquí | Prueba social de nivel | Logos / nombres / frase breve | Lista curada autorizada [CLIENT_REQUIRED] | CLIENT_REQUIRED | Sin lista autorizada, usar solo "más de N artistas" con número real |
| Cómo funciona una sesión | Eliminar incertidumbre del proceso | Pasos: reserva / sesión / entrega | Proceso real del estudio [CLIENT_REQUIRED] | SUGGESTED | Puede inferirse; requiere validación del equipo |
| Testimonio de artista | Prueba social | Cita + nombre + proyecto | Testimonio real [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| FAQ de grabación | Eliminar objeciones | Acordeón 4–5 preguntas | Preguntas reales del negocio | SUGGESTED | Pueden inferirse desde control_point_01 |
| Upsell a producción | Capturar proyectos más complejos | Bloque contextual con CTA | Ninguna adicional | CONFIRMED | |
| CTA final | Conversión | Frase + botón | Mecanismo de contacto [CLIENT_REQUIRED] | PLACEHOLDER | |

---

## PRODUCCIÓN MUSICAL ( `/produccion-musical` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Hero de sección | Posicionar producción integral | Foto en producción + headline + CTA | Foto real [CLIENT_REQUIRED] | PLACEHOLDER | |
| Qué incluye la producción | Definir el servicio con claridad | Texto explicativo: arreglos / grabación / mezcla / master | Oferta confirmada | CONFIRMED | Puede redactarse desde la oferta ya documentada |
| El proceso en pasos | Construir confianza en la metodología | Diagrama de pasos o sección visual | Proceso real del estudio [CLIENT_REQUIRED] | CLIENT_REQUIRED | Si no hay proceso documentado, usar 4–5 pasos inferidos como SUGGESTED |
| Portafolio | Evidencia de resultado | Cards: artista + proyecto + descripción + escucha | Casos publicables [CLIENT_REQUIRED] | CLIENT_REQUIRED | Bloquea la página de forma relevante; sin portafolio, la money page pierde peso |
| Géneros y estilos | Demostrar versatilidad y experiencia específica | Lista o descripción narrativa | Géneros con experiencia real [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| Testimonio de proyecto integral | Validar el servicio end-to-end | Cita + nombre + proceso | Testimonio real [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| FAQ de producción | Eliminar objeciones de proyecto largo | Acordeón 4–5 preguntas | Preguntas reales del proceso | SUGGESTED | |
| CTA final | Consulta de proyecto | "Cuéntanos tu proyecto" + formulario/WhatsApp | Mecanismo de contacto [CLIENT_REQUIRED] | PLACEHOLDER | |

---

## PODCAST Y LOCUCIÓN ( `/servicios/podcast-locucion` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Hero de sección | Capturar audiencia no musical | Foto micrófono de voz / locutor + headline | Foto real del espacio para voz [CLIENT_REQUIRED] | PLACEHOLDER | |
| Para quién es este servicio | Segmentar la audiencia | Lista: podcasters / locutores / marcas / productoras | Oferta confirmada | CONFIRMED | |
| Qué incluye la sesión | Definir el servicio | Texto: espacio / equipo / ingeniería / tiempos | Equipo específico para este servicio [CLIENT_REQUIRED] | PLACEHOLDER | |
| Casos o clientes | Prueba social | Referencia a proyectos realizados | Casos reales [CLIENT_REQUIRED] | CLIENT_REQUIRED | Si no hay casos, omitir el bloque en V1 |
| FAQ | Eliminar objeciones del no-músico | Acordeón 3–4 preguntas específicas de locución/podcast | Preguntas del cliente tipo | SUGGESTED | |
| CTA final | Reserva de sesión | Frase + botón | Mecanismo de contacto [CLIENT_REQUIRED] | PLACEHOLDER | |

---

## VIDEO STUDIO SESSION ( `/servicios/video-session` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Hero de sección | Capturar artistas con necesidades audiovisuales | Frame de sesión de video + headline | Ejemplo real de sesión en video [CLIENT_REQUIRED] | CLIENT_REQUIRED | Si no hay ejemplo, usar foto del espacio con contexto visual |
| Para qué sirve | Definir casos de uso | Lista: Instagram / YouTube / TikTok / portafolio / EPK | Oferta declarada | CONFIRMED | |
| Qué incluye | Detallar el servicio | Espacio / iluminación / equipo / audio sincronizado | Equipo real disponible [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| Ejemplos de sesiones | Evidencia visual del resultado | Galería o video embebido | Ejemplos autorizados [CLIENT_REQUIRED] | CLIENT_REQUIRED | Sin ejemplos, la página pierde casi todo su valor |
| CTA final | Reserva de sesión | Frase + botón | Mecanismo de contacto [CLIENT_REQUIRED] | PLACEHOLDER | |

---

## ARTISTAS / AUTORIDAD ( `/artistas` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Headline de autoridad | Impactar con el peso de la trayectoria | Número de artistas/proyectos + frase | Dato cuantificable real [CLIENT_REQUIRED] | PLACEHOLDER | |
| Galería de artistas | Evidencia visual de la lista de clientes | Logos o fotos + nombres | Lista curada autorizada [CLIENT_REQUIRED] | CLIENT_REQUIRED | BLOQUEA LA PÁGINA COMPLETA |
| Casos destacados | Storytelling de autoridad | 3–5 cards: artista + qué se hizo + resultado | Casos publicables con permiso [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| Testimonios | Prueba social cualitativa | Citas con nombre + proyecto + foto | Testimonios verificables [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| Referencia al equipo | Conectar autoridad externa con equipo interno | Párrafo breve + enlace a /nosotros | Ninguna adicional | CONFIRMED | |
| CTA final | Derivar hacia conversión | "¿Quieres ser parte de esto?" + /contacto | Ninguna adicional | CONFIRMED | |

---

## RECURSOS / FAQ ( `/recursos` y `/recursos/preguntas-frecuentes` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Headline + descripción del hub | Orientar al usuario | Texto breve | Ninguna adicional | CONFIRMED | |
| Grid de recursos disponibles | Indexar el contenido | Cards: título / categoría / descripción breve | Recursos individuales redactados | SUGGESTED | Cards pueden prepararse con estructura; copy de cada recurso a desarrollar en Fase 5 |
| FAQ general (acordeón) | AEO directo + eliminar objeciones | Lista de preguntas con respuestas | Preguntas más frecuentes del negocio real [SUGGESTED] | SUGGESTED | Pueden inferirse desde control_point_01 secciones 4.3 y 6.3 |
| CTA final del hub | Derivar al contacto | "¿Tu pregunta no está aquí? Escríbenos" | Mecanismo de contacto [CLIENT_REQUIRED] | PLACEHOLDER | |

---

## CONTACTO / RESERVA ( `/contacto` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Headline | Tono cálido de bienvenida | 1 frase | Ninguna | CONFIRMED | |
| Opciones de contacto | Eliminar fricción | Botón WhatsApp / formulario / email / teléfono | Datos de contacto [CLIENT_REQUIRED] | CLIENT_REQUIRED | BLOQUEA LA PÁGINA |
| Selector de servicio | Filtrar consultas por tipo | Dropdown o radio buttons | Servicios activos confirmados [CLIENT_REQUIRED] | PLACEHOLDER | Opcional pero útil para filtrar leads |
| Mapa y ubicación | Facilitar llegada en persona | Iframe de Google Maps + instrucciones | Dirección exacta [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| Horarios | Gestionar expectativas | Tabla de días/horas | Horario real [CLIENT_REQUIRED] | CLIENT_REQUIRED | |
| Tiempo de respuesta | Generar confianza | 1 línea de texto | SLA de respuesta que el cliente puede comprometer [CLIENT_REQUIRED] | CLIENT_REQUIRED | |

---

## LA MARCA / NOSOTROS ( `/nosotros` )

| Bloque | Objetivo | Tipo de contenido | Evidencia necesaria | Estado | Nota operativa |
|--------|----------|------------------|---------------------|--------|---------------|
| Historia de Turpial Sound | Construir identidad emocional | Párrafo narrativo: 2015, origen, misión | Historia aprobada por el cliente [CLIENT_REQUIRED] | PLACEHOLDER | Puede prepararse un borrador desde el intake como base |
| Frank Lemus | Humanizar la marca con su referente técnico | Foto + cargo + bio 100–150 palabras + perfiles externos | Bio oficial [CLIENT_REQUIRED] | CLIENT_REQUIRED | BLOQUEA EL BLOQUE |
| Susej Vera | Ampliar la entidad institucional | Foto + cargo + bio 100–150 palabras + perfiles externos | Bio oficial [CLIENT_REQUIRED] | CLIENT_REQUIRED | BLOQUEA EL BLOQUE |
| Lo que nos diferencia | Diferenciadores reales en formato compacto | Lista 3–4 puntos | Diferenciadores del intake | CONFIRMED | Puede construirse desde brand-core y control point |
| Misión en una frase | Ancla la propuesta de valor | 1 frase aprobada | Aprobación del cliente [CLIENT_REQUIRED] | PLACEHOLDER | Puede proponerse como SUGGESTED |
| Referencia a artistas | Conectar con /artistas | 1 párrafo breve + CTA | Lista autorizada [CLIENT_REQUIRED] | PLACEHOLDER | Si lista no está lista, usar referencia genérica |
| CTA final | Derivar hacia servicio | "Conoce nuestros servicios" + links | Ninguna adicional | CONFIRMED | |

---

## Resumen de bloques por estado

| Estado | Cantidad estimada | Implicación |
|--------|-----------------|-------------|
| CONFIRMED | ~18 bloques | Pueden desarrollarse ahora mismo |
| SUGGESTED | ~22 bloques | Pueden desarrollarse con aprobación del cliente |
| PLACEHOLDER | ~20 bloques | Estructura lista; copy/asset pendiente del cliente |
| CLIENT_REQUIRED | ~25 bloques | No pueden finalizarse sin datos del cliente |

**Conclusión operativa:** aproximadamente el 40% del sitio puede construirse en estructura y copy sin datos adicionales del cliente. El 60% restante tiene estructura definida pero necesita assets o aprobaciones específicas.
