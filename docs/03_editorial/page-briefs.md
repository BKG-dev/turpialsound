# Turpial Sound — Page Briefs Maestros

> Estado: **Fase 3 en apertura. Briefs operativos provisionales. Construidos desde strategy, arquitectura y control point.**
> Última actualización: 2026-03-26
> Fuente base: `docs/01_strategy/` + `docs/02_information_architecture/` + `turpial_sound_control_point_01.md`
>
> **Nota:** `messaging-pillars.md` y `tone-of-voice.md` aún no existen. Los mensajes clave y el tono de estos briefs están inferidos desde `brand-core.md`, `market-positioning.md` y `control_point_01.md`. Deben revisarse cuando esos documentos se creen.

---

## Leyenda de estado

- **[CONFIRMED]** — dato validado por el cliente en el intake
- **[SUGGESTED]** — propuesta coherente con el negocio; requiere aprobación
- **[PLACEHOLDER]** — contenido estructuralmente necesario; debe redactarse cuando haya brief de copy aprobado
- **[CLIENT_REQUIRED]** — solo el cliente puede proveer este dato

---

## 1. Propósito del documento

### Para qué existe
Traducir la estrategia y la arquitectura en instrucciones operativas por página. Cada brief es el contrato entre estrategia, contenido, UX y desarrollo: define qué debe lograr cada página, para quién, con qué mensajes, con qué evidencias y con qué restricciones.

### Qué resuelve
- Evita que cada página se construya desde cero sin criterio.
- Previene que se escriba copy genérico desconectado de la oferta real.
- Garantiza coherencia entre todas las páginas del sitio.
- Permite que copywriters, diseñadores y desarrolladores trabajen desde el mismo contrato.

### Por qué puede construirse ahora
La base estratégica y de arquitectura es suficientemente sólida. Los datos del cliente pendientes (artistas autorizados, bios, tarifas) afectan el contenido específico de algunas páginas, pero no impiden definir la estructura, los mensajes, la promesa y los bloques de ninguna página. Los vacíos se marcan como [CLIENT_REQUIRED] y se completan cuando el cliente los provea.

---

## 2. Reglas globales para todos los briefs

### Jerarquía de conversión
Toda página del sitio tiene un único objetivo principal. El CTA de cada página apunta a ese objetivo. Los CTAs secundarios existen solo cuando sirven al usuario en una etapa diferente del funnel, nunca para dispersar la atención.

**Orden jerárquico:**
1. Reservar / solicitar disponibilidad (acción inmediata)
2. Consultar / contactar (acción de primer paso)
3. Descubrir más del servicio (retención interna)
4. Conocer la marca (construcción de confianza)

### CTA principal y secundarios
- El CTA principal siempre es el más visible y el primero en jerarquía visual.
- El texto del CTA principal está en [SUGGESTED] mientras el cliente no confirme el mecanismo de conversión (WhatsApp vs. formulario vs. otro).
- Los CTAs secundarios son enlaces de texto o botones de menor jerarquía visual.
- Nunca más de 2 CTAs de igual peso en la misma sección.

### Cómo tratar autoridad sin exagerar
- Toda afirmación de liderazgo debe ir acompañada de evidencia verificable.
- "El mejor estudio de Caracas" sin respaldo → prohibido.
- "Más de 10 años trabajando con artistas de la industria venezolana" → aceptable si es verificable.
- Los nombres de artistas solo aparecen en la lista curada y autorizada por el cliente. [CLIENT_REQUIRED]
- La trayectoria del equipo (declarada como ~30 años acumulados) puede usarse con moderación y precisión.

### Cómo tratar placeholders
- [PLACEHOLDER] = texto estructuralmente necesario que aún no tiene su versión final. Se escribe con corchetes en el copy: `[Nombre del artista]`, `[Descripción de la sala]`.
- Los placeholders no bloquean el desarrollo del componente: el slot existe aunque el texto no esté finalizado.
- Los placeholders de fotografía, video o testimonios tampoco bloquean el desarrollo: se usa asset temporal hasta que llegue el real.

### Qué evitar en páginas transaccionales
- Texto largo antes del primer CTA
- Listas interminables de beneficios sin jerarquía
- Afirmaciones de precio sin aclarar que varía por proyecto (si no se publica tarifa)
- Prueba social falsa o sin permiso
- Múltiples servicios mezclados sin separación clara
- Efectos visuales que retrasen el acceso al CTA

### Qué evitar en páginas de autoridad
- Bios vacías o genéricas ("apasionado por la música desde pequeño")
- Listas de artistas sin contexto de qué se hizo con ellos
- Testimonios sin nombre, cargo o empresa
- Fotos de stock como sustituto de fotos reales del espacio

### Cómo prevenir canibalización
- Cada página tiene un término de búsqueda transaccional que es suyo y solo suyo.
- Las páginas de recursos usan términos informativos, no transaccionales.
- Dos páginas nunca deben tener el mismo `<title>` ni el mismo meta description temático.
- Si dos páginas tratan un tema similar, una es la autoridad (pilar) y la otra es el satélite: el satélite enlaza al pilar, no compite con él.

---

## 3. Índice maestro de páginas

| # | Página | URL | Tipo | Estado | Intención dominante | CTA principal | Prioridad |
|---|--------|-----|------|--------|-------------------|--------------|-----------|
| 1 | Home | `/` | HUB + MONEY | CONFIRMED | Comercial / marca / local | Reservar | P1 |
| 2 | Salas de ensayo | `/salas-de-ensayo` | MONEY | CONFIRMED | Transaccional local | Reservar sala | P1 |
| 3 | Estudio de grabación | `/estudio-de-grabacion` | MONEY | CONFIRMED | Transaccional local | Reservar sesión | P1 |
| 4 | Producción musical | `/produccion-musical` | MONEY | CONFIRMED | Transaccional / proyecto | Hablar sobre mi proyecto | P1 |
| 5 | Podcast y locución | `/servicios/podcast-locucion` | MONEY | SUGGESTED | Transaccional / nicho | Reservar sesión | P2 |
| 6 | Video studio session | `/servicios/video-session` | MONEY | SUGGESTED | Transaccional / nicho | Reservar sesión | P2 |
| 7 | Artistas / autoridad | `/artistas` | AUTHORITY | CONFIRMED estructura / CLIENT_REQUIRED contenido | Reputacional | Ver proyectos → Contactar | P2 |
| 8 | Recursos / FAQ | `/recursos` + `/recursos/preguntas-frecuentes` | SUPPORT | SUGGESTED | Informacional / AEO | Ir al servicio relevante | P2 |
| 9 | Contacto / reserva | `/contacto` | MONEY (cierre) | CONFIRMED | Transaccional final | Enviar mensaje | P1 |
| 10 | La marca / nosotros | `/nosotros` | AUTHORITY | CONFIRMED estructura / CLIENT_REQUIRED contenido | Reputacional / confianza | Conocer los servicios | P2 |

---

## 4. Briefs maestros por página

---

### BRIEF 01 — HOME

#### A. Rol de la página
La Home es la puerta de entrada universal de Turpial Sound. No es una página de servicio: es una página de posicionamiento y orientación rápida. Su trabajo es responder en segundos "¿qué es esto, para quién es y qué hago ahora?" y distribuir al usuario hacia la acción más relevante para él.

La Home también es la página con mayor autoridad de dominio y el punto de partida del sistema de linking interno. Todo lo que ocurra bien aquí amplifica el resto del sitio.

#### B. Tipo
`HUB` + `MONEY` — orienta y también convierte directamente

#### C. Estado
`CONFIRMED` — estructura y mensajes clave claros; algunos bloques de contenido quedan en `CLIENT_REQUIRED`

#### D. Objetivo principal
Que el usuario entienda en menos de 5 segundos que Turpial Sound es el hub de referencia para ensayo, grabación y producción musical en Caracas, y tome la acción más relevante para su situación.

#### E. Objetivos secundarios
1. Derivar hacia las tres money pages (salas, estudio, producción)
2. Activar confianza inmediata con prueba social sintética (artistas, años, trayectoria)
3. Capturar usuarios en diferentes etapas del funnel (listo para reservar / en evaluación / descubriendo)

#### F. Usuario principal
Cualquier visitante nuevo: artista, banda, creador de contenido, productor. Llega por búsqueda de marca, referido, Instagram o recomendación directa.

#### G. Intención dominante
Comercial + local + marca. El usuario quiere saber si este es el lugar correcto antes de explorar.

#### H. CTA principal
> **"Reservar por WhatsApp"** [SUGGESTED — texto pendiente de confirmación del cliente]
> Alternativa: **"Consultar disponibilidad"**

#### I. CTAs secundarios
- "Ver salas de ensayo" → `/salas-de-ensayo`
- "Ver estudio de grabación" → `/estudio-de-grabacion`
- "Ver producción musical" → `/produccion-musical`

#### J. Promesa de la página (5 segundos)
> Turpial Sound es el hub premium para ensayo, grabación y producción musical en Caracas. Espacio profesional, equipo con criterio, trayectoria verificable.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Somos el hub de referencia para ensayo, grabación y producción musical en Caracas | [SUGGESTED] |
| 2 | Más de 10 años equipando proyectos musicales serios | [CONFIRMED — 2015 verificable] |
| 3 | Artistas y agrupaciones de la industria venezolana han pasado por aquí | [CONFIRMED — lista CLIENT_REQUIRED para nombres] |
| 4 | Tres líneas de servicio claras: ensayo, grabación, producción | [CONFIRMED] |
| 5 | Equipo con experiencia real, no solo espacio alquilado | [CONFIRMED como intención declarada] |
| 6 | Un solo lugar para ir desde el ensayo hasta el master final | [SUGGESTED] |
| 7 | La próxima sesión puede empezar hoy | [SUGGESTED — ancla el CTA] |

#### L. Pruebas necesarias
- Foto hero del espacio (sala o estudio) de alto impacto [CLIENT_REQUIRED]
- Número de artistas / proyectos (dato cuantificable si el cliente tiene uno) [CLIENT_REQUIRED]
- Logos o nombres de artistas autorizados para prueba social visual [CLIENT_REQUIRED]
- Años de trayectoria (2015 → confirmado) [CONFIRMED]
- Fotos de las tres líneas de servicio para las cards de servicios [CLIENT_REQUIRED]

#### M. Bloques sugeridos (secuencia narrativa)

```
01. HERO
    Imagen de alto impacto del espacio + headline + subheadline + CTA principal
    Mensaje: qué es + dónde está + acción

02. TRES SERVICIOS NÚCLEO
    Cards o secciones visuales: Salas de ensayo / Estudio de grabación / Producción musical
    Cada una con: nombre, descripción breve (1 línea), CTA secundario

03. PRUEBA DE AUTORIDAD (sintética)
    Número de artistas / proyectos + años + frase de posicionamiento
    O: logos de artistas autorizados en banda horizontal

04. POR QUÉ TURPIAL SOUND
    3–4 diferenciadores reales en formato visual compacto:
    infraestructura real / criterio técnico / trayectoria / espacio completo

05. SERVICIOS COMPLEMENTARIOS (ligero)
    Mención rápida de: podcast, locución, video session, mezcla, masterización
    → Enlace a /servicios

06. TESTIMONIO O CITA DE AUTORIDAD
    Una cita real de artista o cliente [CLIENT_REQUIRED]

07. CTA FINAL
    Sección de cierre con CTA principal + mensaje de apoyo
    "¿Listo para reservar tu próxima sesión?"
```

#### N. Riesgos de contenido
- Hero genérico (foto de stock, headline vacío) → destruye la primera impresión premium
- Listar demasiados servicios en el Home sin jerarquía → confunde al usuario
- Usar artistas sin lista autorizada → riesgo reputacional
- Exagerar ("el mejor estudio de Venezuela") sin evidencia → pierde credibilidad

#### O. Dependencias
- Foto hero real del espacio [CLIENT_REQUIRED]
- Lista curada de artistas autorizados para prueba social [CLIENT_REQUIRED]
- Dato cuantificable de proyectos o artistas [CLIENT_REQUIRED]
- Confirmación del CTA principal [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/`
- **Title sugerido:** `Turpial Sound — Estudio de grabación y hub de producción musical en Caracas`
- **Intención dominante:** branded + comercial local
- **Entidad principal:** Turpial Sound
- **Entidades secundarias:** Frank Lemus, Caracas, Venezuela
- **Preguntas que debe responder:** ¿Qué es Turpial Sound? ¿Dónde está? ¿Qué servicios ofrece? ¿Es el lugar adecuado para mi proyecto?
- **Relación con clusters:** enlaza como hub a los tres clusters principales
- **Riesgo de canibalización:** ninguno — la Home no compite con las money pages porque su intención es branded, no transaccional específica

---

### BRIEF 02 — SALAS DE ENSAYO

#### A. Rol de la página
Money page principal de la línea de salas. Su trabajo es capturar la intención de búsqueda "sala de ensayo en Caracas" y convertir al visitante en una reserva o consulta de disponibilidad. También cumple la función de mostrar qué hace que las salas de Turpial Sound sean diferentes de cualquier sala improvisada o informal.

#### B. Tipo
`MONEY`

#### C. Estado
`CONFIRMED` — estructura y mensajes clave; contenido específico de las salas en `CLIENT_REQUIRED`

#### D. Objetivo principal
Que el usuario quiera reservar una sala en Turpial Sound y tome acción inmediata o en las próximas horas.

#### E. Objetivos secundarios
1. Responder las objeciones más comunes antes de que el usuario las formule
2. Diferenciar la oferta de salas de Turpial Sound de la competencia informal
3. Facilitar la comparación entre modalidades/tarifas si se decide publicarlas

#### F. Usuario principal
Banda o músico activo que busca sala de ensayo profesional en Caracas. Puede ser recurrente (ensaya regularmente) o puntual (proyecto específico).

#### G. Intención dominante
Transaccional local. El usuario está listo o casi listo para reservar.

#### H. CTA principal
> **"Reservar por WhatsApp"** [SUGGESTED]
> Alternativa: **"Consultar disponibilidad"**

#### I. CTAs secundarios
- "Ver tarifas" → `/salas-de-ensayo/tarifas` [CLIENT_REQUIRED — si se decide publicar]
- "¿Tienes dudas? Ver preguntas frecuentes" → `/salas-de-ensayo/preguntas-frecuentes`
- "También grabamos" → `/estudio-de-grabacion` (upsell)

#### J. Promesa de la página (5 segundos)
> Salas de ensayo profesionales en Caracas: equipadas, confortables y disponibles cuando las necesitas.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Salas equipadas para ensayar con el nivel que tu proyecto merece | [SUGGESTED] |
| 2 | Equipos reales, no improvisados: [detalle de equipo disponible por sala] | [PLACEHOLDER — CLIENT_REQUIRED inventario de equipo] |
| 3 | Tarifas flexibles para cada etapa de tu proyecto: flexible, estándar, premium | [CONFIRMED concepto de modalidades; nombres y precios CLIENT_REQUIRED] |
| 4 | Reserva rápida, espacio listo cuando llegas | [SUGGESTED] |
| 5 | El personal conoce la industria: no eres un número de reserva | [CONFIRMED como diferenciador declarado] |
| 6 | Desde aquí puedes pasar directo a grabar | [SUGGESTED — upsell a estudio] |

#### L. Pruebas necesarias
- Fotos reales de cada sala (amplia, iluminación, equipos visibles) [CLIENT_REQUIRED]
- Lista de equipos disponibles por sala (amplificadores, baterías, monitores, PA, etc.) [CLIENT_REQUIRED]
- Nombres reales de las salas [CLIENT_REQUIRED]
- Capacidad por sala (número de músicos) [CLIENT_REQUIRED]
- Modalidades de tarifa y sus nombres oficiales [CLIENT_REQUIRED]
- Precios o rangos si el cliente decide publicarlos [CLIENT_REQUIRED]
- Testimonios de bandas o músicos [CLIENT_REQUIRED]

#### M. Bloques sugeridos

```
01. HERO DE SECCIÓN
    Foto de sala en uso o vacía de alto impacto + headline + CTA

02. QUÉ HACE ESPECIALES A ESTAS SALAS
    3–4 diferenciadores: equipamiento real / comodidad / ubicación / criterio técnico del personal

03. LAS SALAS DISPONIBLES
    Card por sala: nombre / capacidad / equipo disponible / modalidad de tarifa / CTA de reserva
    [CLIENT_REQUIRED — nombres y detalle de cada sala]

04. TARIFAS (si se decide publicar)
    Tabla de modalidades: flexible / estándar / premium
    Política de reserva, mínimo de horas, anticipo, reprogramación
    [CLIENT_REQUIRED — decisión + datos]

05. TESTIMONIO DE BANDA O MÚSICO
    Cita + nombre + proyecto o género
    [CLIENT_REQUIRED]

06. PREGUNTAS FRECUENTES (las 4–5 más críticas)
    ¿Qué equipo está incluido? / ¿Cuántas personas caben? / ¿Puedo traer mis propios instrumentos? / ¿Cómo reservo?

07. UPSELL
    "¿Ensayaste y quedaste listo para grabar? Te esperamos en el estudio."
    → CTA hacia /estudio-de-grabacion

08. CTA FINAL
    "Reserva tu sala ahora" + WhatsApp / formulario
```

#### N. Riesgos de contenido
- Describir las salas sin fotos reales → página inútil para tomar decisión
- No publicar nada sobre precios ni cómo reservar → genera fricción innecesaria
- Mezclar mensajes de grabación en esta página → confunde la intención y canibaliza `/estudio-de-grabacion`
- Exagerar "el mejor equipamiento" sin lista específica → pierde credibilidad

#### O. Dependencias
- Nombres, fotos y ficha técnica de cada sala [CLIENT_REQUIRED]
- Decisión sobre publicar tarifas [CLIENT_REQUIRED]
- Testimonio de banda o músico [CLIENT_REQUIRED]
- Política de reserva y reprogramación [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/salas-de-ensayo`
- **Title sugerido:** `Salas de ensayo en Caracas — Turpial Sound`
- **Intención dominante:** transaccional local
- **Entidad principal:** Turpial Sound / salas de ensayo Caracas
- **Preguntas que debe responder:** ¿Qué salas tienen? ¿Cuánto cuesta? ¿Cómo reservo? ¿Qué incluye el equipo?
- **Relación con clusters:** página pilar del cluster Salas de ensayo
- **Riesgo de canibalización:** las subpáginas por sala no deben optimizar para "sala de ensayo Caracas" — ese término es exclusivo del pilar

---

### BRIEF 03 — ESTUDIO DE GRABACIÓN

#### A. Rol de la página
Money page de la línea de grabación. Posiciona a Turpial Sound como el estudio de referencia en Caracas para sesiones de grabación profesional. Convierte la intención de búsqueda "estudio de grabación en Caracas" en una reserva o consulta.

#### B. Tipo
`MONEY`

#### C. Estado
`CONFIRMED` — estructura; contenido técnico del estudio en `CLIENT_REQUIRED`

#### D. Objetivo principal
Que el usuario reserve o consulte disponibilidad para una sesión de grabación.

#### E. Objetivos secundarios
1. Demostrar con evidencia técnica que el estudio está a la altura de proyectos profesionales
2. Responder objeciones sobre equipo, ingenieros, géneros y tiempos de entrega
3. Hacer visible el camino desde grabación hacia producción (upsell)

#### F. Usuario principal
Artista o banda con material listo para grabar. Puede ser artista emergente buscando su primer grabación profesional, o artista consolidado buscando calidad verificable.

#### G. Intención dominante
Transaccional local. Alta intención de compra.

#### H. CTA principal
> **"Reservar sesión de grabación"** [SUGGESTED]

#### I. CTAs secundarios
- "Ver equipamiento" → `/estudio-de-grabacion/equipamiento`
- "¿Primera vez en un estudio? Ver FAQ" → `/estudio-de-grabacion/preguntas-frecuentes`
- "¿Quieres algo más que grabación?" → `/produccion-musical` (upsell)

#### J. Promesa de la página (5 segundos)
> Graba tu proyecto con el equipamiento, el criterio técnico y la experiencia que merece en Caracas.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Estudio equipado para capturar exactamente lo que necesitas | [SUGGESTED] |
| 2 | [Consola / micrófonos / software disponibles] | [PLACEHOLDER — CLIENT_REQUIRED inventario técnico] |
| 3 | El equipo técnico conoce el lenguaje de la industria | [CONFIRMED como diferenciador declarado] |
| 4 | Artistas y agrupaciones de alto nivel han grabado aquí | [CONFIRMED — nombres CLIENT_REQUIRED] |
| 5 | Desde el ensayo hasta el master, puedes hacerlo todo en un solo espacio | [SUGGESTED] |
| 6 | Flexibilidad de horario y proceso adaptado a tu proyecto | [SUGGESTED] |

#### L. Pruebas necesarias
- Fotos del estudio: consola, booth, monitores, ambiente general [CLIENT_REQUIRED]
- Ficha técnica del estudio: consola, preamplificadores, micrófonos, monitores, software DAW [CLIENT_REQUIRED]
- Lista de artistas o proyectos grabados (curada y autorizada) [CLIENT_REQUIRED]
- Testimonio de artista o productor [CLIENT_REQUIRED]
- Nombre o foto del ingeniero responsable si es figura pública [SUGGESTED]

#### M. Bloques sugeridos

```
01. HERO DE SECCIÓN
    Foto del estudio (consola en primer plano o booth) + headline + CTA

02. EL ESTUDIO EN DETALLE
    Descripción del espacio: sala de control, cabina de grabación, capacidad, ambiente acústico
    [CLIENT_REQUIRED — datos reales]

03. EQUIPAMIENTO
    Lista visual o tabla: consola / micrófonos / preamplificadores / monitores / software
    → CTA: "Ver equipamiento completo" → /estudio-de-grabacion/equipamiento
    [CLIENT_REQUIRED]

04. QUIÉNES HAN GRABADO AQUÍ
    Banda horizontal con logos o nombres de artistas autorizados
    [CLIENT_REQUIRED — lista curada]

05. CÓMO FUNCIONA UNA SESIÓN
    3–4 pasos: reserva / llegada / sesión / entrega
    Incluye: tiempo mínimo, tarifa base si se publica, qué llevar

06. TESTIMONIO
    Cita de artista o productor + nombre + proyecto
    [CLIENT_REQUIRED]

07. PREGUNTAS FRECUENTES (4–5 más críticas)
    ¿Qué debo llevar? / ¿Incluye ingeniero de grabación? / ¿Cuánto tiempo necesito para una canción?

08. UPSELL
    "¿Quieres producción completa además de grabar?"
    → CTA hacia /produccion-musical

09. CTA FINAL
    "Reserva tu sesión" + WhatsApp / formulario
```

#### N. Riesgos de contenido
- Descripción del estudio sin foto real → el usuario no puede visualizar el espacio
- Ficha técnica ausente → el usuario técnico (productor, ingeniero) descarta el estudio sin ni siquiera contactar
- Nombres de artistas sin autorización → riesgo reputacional
- No aclarar qué incluye la sesión → genera consultas de calidad baja

#### O. Dependencias
- Fotos del estudio y booth [CLIENT_REQUIRED]
- Ficha técnica completa [CLIENT_REQUIRED]
- Lista autorizada de artistas o proyectos [CLIENT_REQUIRED]
- Testimonio verificable [CLIENT_REQUIRED]
- Estructura de tarifas / duración mínima de sesión [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/estudio-de-grabacion`
- **Title sugerido:** `Estudio de grabación en Caracas — Turpial Sound`
- **Intención dominante:** transaccional local
- **Preguntas que debe responder:** ¿Qué equipo tiene? ¿Quiénes han grabado ahí? ¿Cuánto cuesta una sesión? ¿Incluye ingeniero?
- **Relación con clusters:** página pilar del cluster Estudio de grabación
- **Riesgo de canibalización:** `/estudio-de-grabacion/equipamiento` no debe optimizar para "estudio de grabación Caracas" — ese término es del pilar

---

### BRIEF 04 — PRODUCCIÓN MUSICAL

#### A. Rol de la página
Money page de mayor valor de ticket y mayor complejidad de venta. Aquí llega el artista que quiere más que una sesión de grabación: quiere un proyecto completo, desde los arreglos hasta el master. El objetivo no es la reserva inmediata sino la solicitud de consulta o propuesta.

#### B. Tipo
`MONEY`

#### C. Estado
`CONFIRMED` — estructura; portafolio y proceso detallado en `CLIENT_REQUIRED`

#### D. Objetivo principal
Que el artista o banda con un proyecto en desarrollo solicite una consulta o propuesta.

#### E. Objetivos secundarios
1. Demostrar metodología y criterio técnico para proyectos integrales
2. Mostrar resultados de proyectos anteriores (portafolio)
3. Captar proyectos B2B con necesidades de producción más complejas

#### F. Usuario principal
Artista con proyecto en desarrollo que necesita pasar de idea o demo a material terminado y masterizado. También: productor independiente buscando un espacio bien equipado para sus clientes.

#### G. Intención dominante
Transaccional + proyecto. El usuario investiga antes de decidir; el ciclo de venta es más largo que en salas o grabación.

#### H. CTA principal
> **"Hablar sobre mi proyecto"** [SUGGESTED — tono más conversacional que "reservar"]
> Alternativa: **"Solicitar propuesta"**

#### I. CTAs secundarios
- "Ver proceso de producción" → `/produccion-musical/proceso`
- "Ver trabajos anteriores" → `/produccion-musical/portafolio` [CLIENT_REQUIRED]
- "¿Solo grabación? Ver estudio" → `/estudio-de-grabacion`

#### J. Promesa de la página (5 segundos)
> De la idea al master. Producción musical integral con criterio técnico y experiencia real en Caracas.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Producción musical completa: arreglos, grabación, mezcla y masterización en un solo lugar | [CONFIRMED — oferta declarada] |
| 2 | Cada proyecto es único. Empezamos desde tu idea y llegamos hasta donde necesites | [SUGGESTED] |
| 3 | El equipo entiende los géneros y los objetivos artísticos antes de empezar | [SUGGESTED] |
| 4 | Trabajos para artistas de [géneros] con entregables de nivel industria | [PLACEHOLDER — CLIENT_REQUIRED géneros y casos] |
| 5 | Transparencia en el proceso: sabes en qué etapa está tu proyecto en todo momento | [SUGGESTED] |
| 6 | Desde el ensayo hasta el master, sin cambiar de espacio ni de equipo | [SUGGESTED] |

#### L. Pruebas necesarias
- Portafolio de proyectos producidos (al menos 3–5 casos) [CLIENT_REQUIRED]
- Géneros musicales con experiencia comprobable [CLIENT_REQUIRED]
- Muestras de audio o video de producciones anteriores [CLIENT_REQUIRED]
- Testimonio de artista sobre proceso completo [CLIENT_REQUIRED]
- Descripción del proceso de trabajo en pasos concretos [CLIENT_REQUIRED o SUGGESTED si no existe documentación]

#### M. Bloques sugeridos

```
01. HERO DE SECCIÓN
    Imagen de producción en proceso (consola + músico) + headline + CTA

02. QUÉ INCLUYE "PRODUCCIÓN MUSICAL" EN TURPIAL SOUND
    Definición clara: arreglos / grabación / mezcla / masterización
    ¿Puedo entrar con solo una idea? / ¿Con demo? / ¿Con material grabado?

03. EL PROCESO EN PASOS
    4–6 etapas: consulta inicial / concepto y arreglos / grabación / mezcla / masterización / entrega
    [CLIENT_REQUIRED — proceso real]

04. PORTAFOLIO
    3–5 proyectos: artista + qué se produjo + resultado o enlace para escuchar
    [CLIENT_REQUIRED]

05. GÉNEROS Y ESTILOS
    Lista o descripción de géneros manejados con experiencia verificable
    [CLIENT_REQUIRED]

06. TESTIMONIO DE PROYECTO INTEGRAL
    Cita de artista sobre el proceso completo, no solo la grabación
    [CLIENT_REQUIRED]

07. PREGUNTAS FRECUENTES
    ¿Cuánto tiempo tarda una producción completa? / ¿Cómo se estructura el presupuesto? / ¿Qué entrego al final?

08. CTA FINAL
    "Cuéntame tu proyecto" / "Solicitar propuesta" + formulario o WhatsApp
```

#### N. Riesgos de contenido
- Página vacía de portafolio → sin evidencia, el usuario no tiene razón para elegir este estudio
- Prometer géneros que el equipo no domina → daña la credibilidad
- Describir el proceso como "hago todo lo que pidas" sin metodología → transmite falta de criterio
- Mezclar esta página con el discurso de salas de ensayo → confunde la intención del usuario

#### O. Dependencias
- Portafolio de producciones (mínimo 3 casos) [CLIENT_REQUIRED]
- Géneros con experiencia comprobable [CLIENT_REQUIRED]
- Proceso de producción documentado [CLIENT_REQUIRED]
- Muestras de audio/video [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/produccion-musical`
- **Title sugerido:** `Producción musical en Caracas — Turpial Sound`
- **Intención dominante:** transaccional + informacional de proyecto
- **Preguntas que debe responder:** ¿Qué incluye la producción? ¿Cuánto cuesta? ¿Han producido mi género? ¿Cómo empieza el proceso?
- **Relación con clusters:** página pilar del cluster Producción musical
- **Riesgo de canibalización:** `/produccion-musical/proceso` no compite con el pilar — resuelve una intención distinta (metodología, no conversión)

---

### BRIEF 05 — PODCAST Y LOCUCIÓN

#### A. Rol de la página
Money page del nicho de audio para comunicadores y creadores de contenido. Posiciona a Turpial Sound como alternativa profesional para grabar podcasts y locución en Caracas. Atrae un segmento diferente al musical.

#### B. Tipo
`MONEY`

#### C. Estado
`SUGGESTED` — estructura coherente con la oferta declarada; confirmar que el servicio es activo en V1

#### D. Objetivo principal
Que el creador de contenido o comunicador reserve o consulte disponibilidad para una sesión de podcast o locución.

#### E. Objetivos secundarios
1. Diferenciar la oferta de podcast/locución del entorno doméstico o amateur
2. Captar clientes B2B (empresas con necesidades de audio corporativo)
3. Establecer a Turpial Sound como referente más allá del nicho musical puro

#### F. Usuario principal
Podcaster independiente, locutor freelance, comunicador corporativo o empresa que necesita grabación de audio de calidad profesional.

#### G. Intención dominante
Transaccional / nicho. Alta intención para usuarios que ya saben lo que necesitan.

#### H. CTA principal
> **"Reservar sesión de podcast / locución"** [SUGGESTED]

#### I. CTAs secundarios
- "Ver preguntas frecuentes" → desde `/recursos/preguntas-frecuentes` o sección inline
- "También grabamos música" → `/estudio-de-grabacion`

#### J. Promesa de la página (5 segundos)
> Graba tu podcast o locución con calidad profesional en Caracas, sin el ruido ni las improvisaciones de una grabación casera.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Espacio acústicamente controlado para grabación de voz | [SUGGESTED] |
| 2 | Micrófonos y monitoreo de calidad profesional incluidos | [PLACEHOLDER — CLIENT_REQUIRED confirmar equipo disponible para este servicio] |
| 3 | Ingeniería de sonido disponible si la necesitas | [SUGGESTED] |
| 4 | Sesiones por horas, sin mínimos excesivos para proyectos cortos | [SUGGESTED — confirmar política] |
| 5 | Ideal para podcasts, voiceovers, spots, narración y contenido de marca | [CONFIRMED — oferta declarada] |

#### L. Pruebas necesarias
- Foto del booth de locución o espacio específico para voz [CLIENT_REQUIRED]
- Lista de equipos disponibles para este servicio [CLIENT_REQUIRED]
- Casos o clientes de podcast/locución si existen [CLIENT_REQUIRED]
- Política de tarifas y duración mínima de sesión [CLIENT_REQUIRED]

#### M. Bloques sugeridos

```
01. HERO DE SECCIÓN
    Imagen: micrófono de voz en primer plano o locutor en cabina + headline + CTA

02. PARA QUIÉN ES ESTE SERVICIO
    Podcasters / locutores / marcas / productoras / comunicadores

03. QUÉ INCLUYE LA SESIÓN
    Espacio / equipo / ingeniería (si aplica) / tiempos de entrega

04. CASOS O CLIENTES (si existen)
    [CLIENT_REQUIRED]

05. PREGUNTAS FRECUENTES
    ¿Puedo editar aquí mismo? / ¿Cuánto cuesta por hora? / ¿Necesito experiencia técnica?

06. CTA FINAL
    "Reservar sesión" + WhatsApp / formulario
```

#### N. Riesgos de contenido
- Página sin evidencia de que el espacio sirve para voz (no solo para instrumentos) → el locutor no se siente interpelado
- No separar este servicio del discurso de grabación musical → confunde al usuario no musical

#### O. Dependencias
- Confirmar que el servicio está activo en V1 [CLIENT_REQUIRED]
- Foto específica del espacio para voz/podcast [CLIENT_REQUIRED]
- Equipo disponible para este servicio [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/servicios/podcast-locucion`
- **Title sugerido:** `Grabación de podcast y locución en Caracas — Turpial Sound`
- **Intención dominante:** transaccional / nicho
- **Preguntas que debe responder:** ¿Tienen estudio para podcast en Caracas? ¿Cuánto cuesta grabar un podcast?
- **Riesgo de canibalización:** ninguno con las money pages musicales — intención y audiencia son distintas

---

### BRIEF 06 — VIDEO STUDIO SESSION

#### A. Rol de la página
Money page del servicio de video. Posiciona a Turpial Sound como espacio para grabar video de sesión musical en Caracas: el contenido audiovisual que artistas y bandas necesitan para redes, portafolios y plataformas.

#### B. Tipo
`MONEY`

#### C. Estado
`SUGGESTED` — estructura coherente; confirmar que el servicio es activo y qué incluye exactamente

#### D. Objetivo principal
Que el artista o banda reserve una sesión de video musical.

#### E. Objetivos secundarios
1. Posicionar a Turpial Sound como espacio completo para la producción audiovisual del artista
2. Atraer artistas que necesitan contenido para redes (Instagram, YouTube, TikTok)

#### F. Usuario principal
Artista o banda que necesita material audiovisual de calidad: sesión en vivo, mini-documental, clip para redes.

#### G. Intención dominante
Transaccional / nicho

#### H. CTA principal
> **"Reservar sesión de video"** [SUGGESTED]

#### I. CTAs secundarios
- "Ver también grabación de audio" → `/estudio-de-grabacion`

#### J. Promesa de la página (5 segundos)
> Tu próxima sesión en video: el espacio, la iluminación y el criterio técnico para que suene y se vea profesional.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Grabación de video en un espacio diseñado para la música | [SUGGESTED] |
| 2 | Ideal para: sesiones en vivo, clips para redes, material de portafolio | [CONFIRMED — oferta declarada] |
| 3 | [Detalle de equipo de video disponible] | [PLACEHOLDER — CLIENT_REQUIRED] |
| 4 | Audio profesional capturado en simultáneo durante la sesión | [SUGGESTED si aplica — confirmar] |

#### L. Pruebas necesarias
- Ejemplos de sesiones de video realizadas [CLIENT_REQUIRED]
- Equipo de video disponible (cámaras, iluminación) [CLIENT_REQUIRED]
- Política de tarifas para este servicio [CLIENT_REQUIRED]

#### M. Bloques sugeridos

```
01. HERO
    Foto o frame de una sesión de video en el estudio + headline + CTA

02. PARA QUÉ SIRVE
    Instagram / YouTube / TikTok / portafolio de artista / EPK

03. QUÉ INCLUYE
    Espacio / iluminación / equipo / grabación de audio sincronizada (si aplica)

04. EJEMPLOS DE SESIONES
    [CLIENT_REQUIRED]

05. CTA FINAL
```

#### N. Riesgos de contenido
- Sin ejemplos visuales del resultado → el artista no puede evaluar la calidad
- Describir el servicio de forma genérica sin mencionar el entorno musical → pierde relevancia

#### O. Dependencias
- Confirmar que el servicio está activo en V1 [CLIENT_REQUIRED]
- Ejemplos de video realizados [CLIENT_REQUIRED]
- Equipo de video disponible [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/servicios/video-session`
- **Title sugerido:** `Video studio session en Caracas — Turpial Sound`
- **Intención dominante:** transaccional / nicho
- **Preguntas que debe responder:** ¿Tienen espacio para grabar video musical en Caracas? ¿Qué equipo usan?

---

### BRIEF 07 — ARTISTAS / AUTORIDAD

#### A. Rol de la página
Página de autoridad y prueba social. Su función no es vender directamente sino validar la reputación de Turpial Sound con evidencia verificable. El usuario llega aquí cuando quiere saber "¿quiénes han confiado en este estudio?"

#### B. Tipo
`AUTHORITY`

#### C. Estado
`CONFIRMED` — estructura; todo el contenido específico en `CLIENT_REQUIRED`

#### D. Objetivo principal
Consolidar la confianza del usuario mediante evidencia real de la trayectoria de Turpial Sound con artistas, agrupaciones y proyectos de nivel.

#### E. Objetivos secundarios
1. Servir como destino de los CTAs de autoridad presentes en Home y páginas de servicio
2. Capturar búsquedas de marca combinadas con nombres de artistas (si se autoriza)
3. Construir señal de entidad para buscadores e IA

#### F. Usuario principal
Usuario en fase de evaluación. Ya conoce el estudio (lo encontró en otra página o por recomendación) y quiere confirmar la reputación antes de reservar.

#### G. Intención dominante
Reputacional. El usuario investiga, no está listo para comprar todavía.

#### H. CTA principal
> **"¿Quieres ser parte de esto? Contáctanos"** [SUGGESTED]
> → Enlace a `/contacto`

#### I. CTAs secundarios
- "Ver nuestro estudio" → `/estudio-de-grabacion`
- "Ver producción musical" → `/produccion-musical`

#### J. Promesa de la página (5 segundos)
> Artistas y proyectos de la industria venezolana han confiado en Turpial Sound. Esta es parte de su historia.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Una trayectoria de más de 10 años con artistas de la industria | [CONFIRMED — 2015] |
| 2 | Desde artistas consolidados hasta proyectos emergentes | [SUGGESTED] |
| 3 | [Lista curada de artistas y agrupaciones] | [CLIENT_REQUIRED] |
| 4 | Testimonios de quienes han trabajado aquí | [CLIENT_REQUIRED] |
| 5 | Cada proyecto tiene una historia. La nuestra se construyó con las suyas. | [SUGGESTED] |

#### L. Pruebas necesarias
- Lista curada y autorizada de artistas (mínimo 8–10) [CLIENT_REQUIRED — CRÍTICO]
- Fotos de sesiones con artistas (con permiso) [CLIENT_REQUIRED]
- Testimonios escritos o en video (mínimo 3) [CLIENT_REQUIRED]
- Logos de artistas o proyectos si están disponibles [CLIENT_REQUIRED]
- Casos breves: artista + qué se hizo + referencia al resultado [CLIENT_REQUIRED]

#### M. Bloques sugeridos

```
01. HEADLINE DE AUTORIDAD
    "Más de [N] artistas y proyectos han pasado por aquí"
    [PLACEHOLDER — N depende del dato real del cliente]

02. GALERÍA O MOSAICO DE ARTISTAS
    Logos / fotos / nombres de artistas autorizados
    [CLIENT_REQUIRED]

03. CASOS DESTACADOS (3–5)
    Formato: foto + nombre del artista + qué se hizo + resultado breve
    [CLIENT_REQUIRED]

04. TESTIMONIOS
    Citas con nombre + cargo / proyecto + foto si disponible
    [CLIENT_REQUIRED]

05. LA TRAYECTORIA DEL EQUIPO
    Párrafo breve sobre Frank Lemus y el equipo, conectado con la autoridad del estudio
    → Enlace a /nosotros para bio completa

06. CTA
    "Forma parte de esta historia" + enlace a /contacto
```

#### N. Riesgos de contenido
- Publicar nombres de artistas sin autorización expresa → riesgo reputacional y legal
- Testimonios sin nombre o empresa → pierde credibilidad ("alguien dijo que...")
- Fotos de sesiones sin permiso del artista → ídem
- Lista de artistas muy larga sin contexto de qué se hizo → parece un name-drop vacío

#### O. Dependencias
- Lista curada y autorizada de artistas [CLIENT_REQUIRED — bloquea toda la página]
- Testimonios verificables [CLIENT_REQUIRED]
- Fotos de sesiones con permiso [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/artistas`
- **Title sugerido:** `Artistas y proyectos — Turpial Sound`
- **Intención dominante:** reputacional / branded
- **Entidades secundarias:** artistas específicos autorizados; Caracas; Frank Lemus
- **Preguntas que debe responder:** ¿Quiénes han grabado aquí? ¿Qué proyectos han producido?
- **Señal de entidad:** esta página es crítica para que buscadores e IA reconozcan a Turpial Sound como entidad con relaciones verificables en la industria musical

---

### BRIEF 08 — RECURSOS / FAQ

#### A. Rol de la página
Hub editorial y página de soporte SEO/AEO. Captura tráfico informacional y construye autoridad temática. Los recursos individuales alimentan los clusters; el hub `/recursos` los indexa y distribuye.

#### B. Tipo
`SUPPORT` (hub editorial)

#### C. Estado
`SUGGESTED` — estructura clara; contenido de cada recurso a desarrollar

#### D. Objetivo principal
Capturar búsquedas informacionales de usuarios que investigan antes de reservar, y derivarlos hacia las money pages una vez que han encontrado valor en el contenido.

#### E. Objetivos secundarios
1. Construir autoridad temática en el nicho de grabación, ensayo y producción en Caracas
2. Responder las preguntas más frecuentes del mercado antes de que el usuario tenga que llamar
3. Servir como señal de expertise para buscadores e interfaces de IA (AEO)

#### F. Usuario principal
Usuario en etapa de investigación. Puede no conocer Turpial Sound todavía. Llegó por una búsqueda de Google del tipo "cómo prepararse para grabar" o "qué incluye una producción musical".

#### G. Intención dominante
Informacional → deriva hacia transaccional

#### H. CTA principal
Al final de cada recurso: CTA hacia la money page relevante
> "¿Listo para grabar? Reserva tu sesión en Turpial Sound"

#### I. CTAs secundarios
- "Ver todos los recursos" (desde artículos individuales hacia el hub)
- "Contactar directamente" desde la FAQ general si la pregunta no tiene respuesta en el contenido

#### J. Promesa de la página (5 segundos)
> Todo lo que necesitas saber antes de reservar tu primer ensayo, sesión de grabación o producción musical.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | El conocimiento del equipo de Turpial Sound, disponible antes de que reserves | [SUGGESTED] |
| 2 | Respuestas claras a las preguntas que más se repiten | [SUGGESTED] |
| 3 | Guías prácticas escritas desde la experiencia real, no desde teoría | [SUGGESTED] |

#### L. Recursos prioritarios para V1

| Recurso | URL | Cluster al que alimenta |
|---------|-----|------------------------|
| Cómo prepararse para una sesión de grabación | `/recursos/como-prepararse-para-grabar` | Estudio de grabación |
| Qué incluye una producción musical completa | `/recursos/que-incluye-una-produccion-musical` | Producción musical |
| Diferencias entre grabación, mezcla y masterización | `/recursos/grabacion-mezcla-masterizacion` | Estudio + Producción |
| FAQ general del estudio | `/recursos/preguntas-frecuentes` | Transversal |

#### M. Bloques sugeridos (hub `/recursos`)

```
01. HEADLINE
    "Recursos para artistas, bandas y creadores"

02. GRID DE RECURSOS
    Cards por recurso: título / descripción breve / categoría / CTA "Leer"

03. FAQ DESTACADAS (inline)
    Las 5–6 preguntas más frecuentes en forma de acordeón
    Cada respuesta termina con enlace al servicio relevante

04. CTA FINAL
    "¿Tienes una pregunta que no está aquí? Escríbenos"
    → /contacto
```

#### N. Riesgos de contenido
- Recursos genéricos sin aplicación específica a Turpial Sound → pierde relevancia y diferenciación
- FAQ sin enlace al servicio relevante → callejón sin salida
- Contenido de baja calidad que contradice el posicionamiento premium → daña la percepción de marca

#### O. Dependencias
- Redacción de los recursos individuales (trabajo editorial a realizar en Fase 5)
- Revisión del equipo para que el contenido sea técnicamente correcto y represente fielmente la experiencia real

#### P. Notas SEO/AEO
- **URL:** `/recursos`
- **Intención dominante:** informacional
- **Preguntas que debe responder (hub):** ¿Qué recursos tiene Turpial Sound para artistas? ¿Cómo preparo mi sesión?
- **Señal AEO:** la FAQ estructurada con Schema FAQ markup es una de las señales de AEO más directas de todo el sitio — priorizar desde el inicio técnico

---

### BRIEF 09 — CONTACTO / RESERVA

#### A. Rol de la página
Página de cierre de conversión. Cualquier usuario que llega aquí ya tomó la decisión (o está a punto). Su trabajo es eliminar toda fricción entre la intención y la acción.

#### B. Tipo
`MONEY` (cierre)

#### C. Estado
`CONFIRMED` — estructura; datos de contacto en `CLIENT_REQUIRED`

#### D. Objetivo principal
Que el usuario complete la acción de contacto con la menor fricción posible.

#### E. Objetivos secundarios
1. Orientar al usuario según el tipo de servicio que necesita (para filtrar consultas)
2. Transmitir confianza de respuesta rápida y atención real

#### F. Usuario principal
Usuario en fase de decisión. Llegó aquí desde una money page o directamente desde el CTA principal.

#### G. Intención dominante
Transaccional final.

#### H. CTA principal
> **"Enviar mensaje por WhatsApp"** [SUGGESTED — mecanismo pendiente de confirmación]
> Alternativa: Formulario de contacto

#### I. CTAs secundarios
- Número de teléfono directo si el cliente lo decide
- Dirección para visita si es relevante

#### J. Promesa de la página (5 segundos)
> Escríbenos y te respondemos. Sin burocracia, sin demoras.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Respuesta en menos de [N] horas [PLACEHOLDER — CLIENT_REQUIRED tiempo real de respuesta] | [CLIENT_REQUIRED] |
| 2 | Horario de atención: [días y horas] | [CLIENT_REQUIRED] |
| 3 | ¿No sabes qué servicio necesitas? Cuéntanos tu proyecto y te orientamos | [SUGGESTED] |

#### L. Información necesaria
- Número de WhatsApp Business [CLIENT_REQUIRED]
- Correo de contacto [CLIENT_REQUIRED]
- Dirección física y/o mapa [CLIENT_REQUIRED]
- Horario de atención [CLIENT_REQUIRED]
- Tiempo de respuesta comprometido [CLIENT_REQUIRED]

#### M. Bloques sugeridos

```
01. HEADLINE SIMPLE
    "Hablemos sobre tu próximo proyecto"

02. OPCIONES DE CONTACTO
    WhatsApp (primario) / Formulario / Correo / Teléfono
    [Según lo que confirme el cliente]

03. SELECTOR DE SERVICIO (opcional)
    Dropdown o selector previo al formulario:
    "¿Qué necesitas?" → Sala de ensayo / Grabación / Producción / Otro
    Ayuda a filtrar consultas y hacer el contacto más eficiente

04. DATOS DE UBICACIÓN
    Dirección / Mapa embebido / Instrucciones de llegada
    [CLIENT_REQUIRED]

05. HORARIOS
    [CLIENT_REQUIRED]
```

#### N. Riesgos de contenido
- Formulario muy largo → el usuario abandona antes de enviar
- Sin tiempo de respuesta comprometido → genera incertidumbre y pérdida de conversiones
- Solo formulario sin WhatsApp (si ese es el canal real de conversión) → fricción innecesaria

#### O. Dependencias
- Todos los datos de contacto [CLIENT_REQUIRED — bloquean la página]
- Decisión sobre mecanismo principal de conversión (WhatsApp / formulario / ambos)

#### P. Notas SEO/AEO
- **URL:** `/contacto`
- **Title sugerido:** `Reserva o contacta — Turpial Sound`
- **Schema:** LocalBusiness con dirección, horario y teléfono [CLIENT_REQUIRED para completar]
- **Señal de entidad:** la página de contacto con NAP (nombre, dirección, teléfono) consistente es una de las señales de entidad local más importantes para Google Business y mapas

---

### BRIEF 10 — LA MARCA / NOSOTROS

#### A. Rol de la página
Página de autoridad de entidad. Humaniza la marca, presenta al equipo, cuenta la historia y responde la pregunta "¿quiénes son estas personas y por qué debo confiarles mi proyecto?"

#### B. Tipo
`AUTHORITY`

#### C. Estado
`CONFIRMED` — estructura; bios y foto del equipo en `CLIENT_REQUIRED`

#### D. Objetivo principal
Construir confianza suficiente para que el usuario avance hacia reservar o contactar.

#### E. Objetivos secundarios
1. Establecer a Frank Lemus y Susej Vera como entidades verificables con trayectoria real
2. Servir como señal de entidad para buscadores e interfaces de IA
3. Complementar la prueba social de `/artistas` con la perspectiva interna de la marca

#### F. Usuario principal
Usuario en fase de evaluación profunda. Quiere saber con quién está tratando antes de invertir tiempo o dinero.

#### G. Intención dominante
Reputacional / confianza.

#### H. CTA principal
> **"Conoce nuestros servicios"** → enlace hacia `/salas-de-ensayo` o `/estudio-de-grabacion`
> Secundario: **"Reservar"** → `/contacto`

#### I. CTAs secundarios
- "Ver artistas" → `/artistas`
- "Ver servicios" → `/servicios`

#### J. Promesa de la página (5 segundos)
> Turpial Sound no es solo un espacio. Hay personas detrás con experiencia real en la industria musical venezolana.

#### K. Mensajes clave

| # | Mensaje | Estado |
|---|---------|--------|
| 1 | Turpial Sound nació en 2015 con una misión clara: dar a los artistas en Caracas un espacio que estuviera a la altura de su trabajo | [SUGGESTED] |
| 2 | Frank Lemus: [cargo + trayectoria] | [CLIENT_REQUIRED — bio oficial] |
| 3 | Susej Vera: [cargo + rol institucional] | [CLIENT_REQUIRED — bio oficial] |
| 4 | Más de [N] proyectos y artistas de la industria venezolana han pasado por aquí | [PLACEHOLDER — N pendiente del cliente] |
| 5 | La diferencia no solo está en el equipo: está en el criterio con que se usa | [SUGGESTED] |

#### L. Pruebas necesarias
- Foto profesional de Frank Lemus [CLIENT_REQUIRED]
- Foto profesional de Susej Vera [CLIENT_REQUIRED]
- Bio oficial de Frank Lemus (cargo, trayectoria verificable) [CLIENT_REQUIRED]
- Bio oficial de Susej Vera (cargo, trayectoria verificable) [CLIENT_REQUIRED]
- Perfiles externos enlazables (LinkedIn, Spotify, etc.) [CLIENT_REQUIRED]
- Foto del espacio como contexto de la historia [CLIENT_REQUIRED]

#### M. Bloques sugeridos

```
01. LA HISTORIA DE TURPIAL SOUND
    Párrafo de origen: 2015, Caracas, misión, por qué existe
    [PLACEHOLDER — redacción desde brief cuando haya bio del cliente]

02. EL EQUIPO
    Frank Lemus: foto + cargo + bio breve + perfiles externos
    Susej Vera: foto + cargo + bio breve + perfiles externos
    [CLIENT_REQUIRED]

03. LO QUE NOS DIFERENCIA
    3–4 puntos: infraestructura real / criterio técnico / trayectoria / espacio completo

04. NUESTRA MISIÓN EN UNA FRASE
    [PLACEHOLDER — definir con el cliente]

05. ARTISTAS QUE HAN CONFIADO EN NOSOTROS (referencia)
    Enlace o mención breve hacia /artistas

06. CTA
    "¿Listo para conocernos en persona? Reserva una sesión"
    → /contacto
```

#### N. Riesgos de contenido
- Bios genéricas o sin cargos específicos → pierden valor como señal de autoridad
- Historia corporativa sin alma → no conecta emocionalmente con artistas
- No incluir perfiles externos verificables → la entidad queda incompleta para SEO/AEO
- Foto de stock en vez de fotos reales del equipo → contradice el posicionamiento premium

#### O. Dependencias
- Bio y foto de Frank Lemus [CLIENT_REQUIRED — CRÍTICO para esta página]
- Bio y foto de Susej Vera [CLIENT_REQUIRED]
- Perfiles externos verificables [CLIENT_REQUIRED]
- Historia de la marca aprobada por el cliente [CLIENT_REQUIRED]

#### P. Notas SEO/AEO
- **URL:** `/nosotros`
- **Title sugerido:** `Sobre Turpial Sound — Estudio de grabación y producción en Caracas`
- **Intención dominante:** reputacional / branded
- **Entidades:** Frank Lemus, Susej Vera, Turpial Sound, Caracas
- **Schema:** Person (para Frank Lemus y Susej Vera) + Organization (para Turpial Sound)
- **Señal de entidad:** esta página, junto con `/artistas` y Google Business, forma el triángulo de señales de entidad más importante para que buscadores e IA reconozcan a Turpial Sound como organización real con personas verificables
