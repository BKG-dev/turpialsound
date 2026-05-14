# Turpial Sound ÔÇö Sitemap Maestro (Provisional)

> Estado: **Fase 2 ÔÇö Arquitectura de autoridad en apertura. Versi├│n provisional sujeta a validaci├│n del cliente.**
> ├Ültima actualizaci├│n: 2026-03-26
> Fuente base: `docs/01_strategy/` + `turpial_sound_control_point_01.md` + CLAUDE.md

## Estado real en produccion al 2026-05-11 (sitemap real)

**Proposito:** registrar el sitemap real desplegado en https://www.turpialsound.com/sitemap.xml tras el hotfix 92fd6a3.

### URLs reales en produccion

1. https://www.turpialsound.com/
2. https://www.turpialsound.com/reservas
3. https://www.turpialsound.com/salas-de-ensayo
4. https://www.turpialsound.com/estudio-de-grabacion
5. https://www.turpialsound.com/servicios
6. https://www.turpialsound.com/contacto
7. https://www.turpialsound.com/recursos
8. https://www.turpialsound.com/recursos/preguntas-frecuentes
9. https://www.turpialsound.com/marketplace

### Exclusiones explicitas

- /admin, /ops, /api, /payment-proofs, /marketplace/admin, /marketplace/dashboard, /lab.
- Listings individuales del marketplace (/marketplace/{slug}).
- Slugs dinamicos, query params, usuarios, perfiles, vendedores, filtros.
- URLs preview Vercel, localhost.

### Notas para reconciliacion posterior

- Este sitemap real es un snapshot limpio para Google Search Console. No incluye subpaginas sugeridas ni rutas aun no publicadas.
- El sitemap maestro (este documento) define la arquitectura deseada. El sitemap real es un subconjunto de URLs publicas aprobadas sin DB.
- Para cualquier expansion futura del sitemap real, referirse a este documento y a docs/obsidian-vault/00_CENTRAL_TURPIAL.md#Sitemap Hotfix Produccion.

---


---

## Leyenda de estado por secci├│n

- **[CONFIRMED]** ÔÇö estructura validada por l├│gica de negocio declarada y coherencia estrat├®gica s├│lida
- **[SUGGESTED]** ÔÇö propuesta coherente con el nicho; requiere aprobaci├│n del cliente antes de congelar
- **[CLIENT_REQUIRED]** ÔÇö estructura o contenido que depende de informaci├│n que solo el cliente puede proveer

---

## 1. Prop├│sito del sitemap

### Para qu├® existe
Este sitemap define la arquitectura maestra de informaci├│n del frente p├║blico de Turpial Sound: el conjunto de p├íginas, su jerarqu├¡a, su prop├│sito comercial y su relaci├│n entre s├¡.

Su funci├│n es establecer **qu├® existe, para qui├®n existe y por qu├® existe**, antes de definir URLs finales, dise├▒ar layouts o escribir contenido.

### Qu├® resuelve
- Ordena la oferta de Turpial Sound en una jerarqu├¡a comprensible para usuarios, buscadores e interfaces de IA.
- Define las money pages (p├íginas de conversi├│n prioritaria) y las p├íginas de autoridad.
- Previene el caos editorial: que el sitio crezca sin estructura, con p├íginas duplicadas o sin intenci├│n clara.
- Sirve como base para el mapa de URLs, los page briefs, los clusters de contenido y el sistema de linking interno.

### Qu├® no incluye todav├¡a
- URLs finales (eso va en `url-map.md`).
- Arquitectura del ODS (esa capa es interna y no pertenece al sitio p├║blico).
- Dise├▒o, layouts ni componentes.
- Contenido redactado o copy final.
- Jerarqu├¡a de navegaci├│n visual (eso va en `navigation-model.md`).

---

## 2. Principios de arquitectura

### 2.1 Claridad comercial primero
Cada p├ígina del sitio existe para resolver una intenci├│n real de un usuario real. No se crean p├íginas por completismo ni por est├®tica. La estructura sigue la l├│gica del negocio, no la l├│gica del men├║.

### 2.2 Jerarqu├¡a de conversi├│n visible
Las p├íginas m├ís importantes comercialmente tienen la mayor presencia en la arquitectura. El sitio debe poder convertir desde m├║ltiples puntos de entrada, siempre con el mismo CTA dominante.

### 2.3 Separaci├│n absoluta frente p├║blico / ODS
El n├║cleo operativo ODS (Google Sheets, Apps Script, Drive, Calendar, Gmail) es una capa interna separada. Ninguna p├ígina del sitio p├║blico accede ni depende de la UI del ODS. Si en alg├║n momento existe integraci├│n (por ejemplo: formulario de reservas conectado al sistema interno), se hace a trav├®s de endpoints o servicios delimitados, nunca exponiendo la operaci├│n interna.

### 2.4 Dise├▒ado para SEO local y AEO desde la ra├¡z
La arquitectura considera desde el inicio las b├║squedas objetivo del negocio. Cada p├ígina de servicio existe tambi├®n para resolver una intenci├│n de b├║squeda espec├¡fica. Los cl├║steres de contenido refuerzan la autoridad tem├ítica de la marca.

### 2.5 Control de complejidad
El sitio V1 no debe ser grande: debe ser bueno. Se privilegian pocas p├íginas bien construidas sobre muchas p├íginas mediocres. Todo lo que no es esencial para conversi├│n o autoridad puede ir a Fase 2 de producci├│n o a iteraciones futuras.

---

## 3. Mapa maestro ÔÇö Primer nivel

Las siguientes son las secciones principales del sitio p├║blico. Cada una cumple un rol estrat├®gico diferente.

```
TURPIAL SOUND ÔÇö SITIO P├ÜBLICO
Ôöé
Ôö£ÔöÇÔöÇ 01. HOME
Ôö£ÔöÇÔöÇ 02. ESTUDIO / SOBRE NOSOTROS
Ôö£ÔöÇÔöÇ 03. SALAS DE ENSAYO                    ÔåÉ money page
Ôö£ÔöÇÔöÇ 04. ESTUDIO DE GRABACI├ôN               ÔåÉ money page
Ôö£ÔöÇÔöÇ 05. PRODUCCI├ôN MUSICAL                 ÔåÉ money page
Ôö£ÔöÇÔöÇ 06. SERVICIOS COMPLEMENTARIOS
Ôöé   Ôö£ÔöÇÔöÇ Mezcla y masterizaci├│n
Ôöé   Ôö£ÔöÇÔöÇ Podcast y locuci├│n
Ôöé   Ôö£ÔöÇÔöÇ Video studio session
Ôöé   Ôö£ÔöÇÔöÇ Arreglos musicales
Ôöé   ÔööÔöÇÔöÇ Consultor├¡a y clases de producci├│n
Ôö£ÔöÇÔöÇ 07. ARTISTAS / AUTORIDAD
Ôö£ÔöÇÔöÇ 08. RECURSOS / FAQ
ÔööÔöÇÔöÇ 09. CONTACTO / RESERVA
```

---

## 4. Segundo nivel ÔÇö Definici├│n por secci├│n

---

### 4.1 HOME

| Campo | Valor |
|-------|-------|
| **Objetivo** | Posicionar a Turpial Sound como hub premium de referencia. Orientar al usuario hacia la acci├│n que m├ís le interesa. Consolidar la primera impresi├│n de autoridad. |
| **Usuario principal** | Cualquier visitante nuevo: artista, banda, creador de contenido, productor |
| **Intenci├│n de b├║squeda** | Turpial Sound [marca], estudio de grabaci├│n Caracas, sala de ensayo Caracas |
| **Conversi├│n esperada** | Clic a p├ígina de servicio prioritario o CTA directo de contacto/reserva |
| **P├íginas hijas** | Ninguna ÔÇö es la ra├¡z |
| **Estado** | [CONFIRMED] |

**Bloques obligatorios en Home:**
- Hero con propuesta de valor central + CTA principal
- Oferta en tres ejes (ensayo / grabaci├│n / producci├│n)
- Prueba social sint├®tica (artistas, trayectoria, a├▒os)
- Acceso r├ípido a los tres servicios prioritarios
- CTA de contacto o reserva
- Se├▒al de autoridad (n├║mero de artistas, a├▒os, proyectos)

---

### 4.2 ESTUDIO / SOBRE NOSOTROS

| Campo | Valor |
|-------|-------|
| **Objetivo** | Construir confianza y autoridad de entidad. Humanizar la marca. Responder "┬┐qui├®nes son estos y por qu├® debo confiarles mi proyecto?" |
| **Usuario principal** | Usuario en fase de evaluaci├│n que quiere conocer la marca antes de reservar |
| **Intenci├│n de b├║squeda** | Turpial Sound estudio, qui├®nes somos Turpial Sound, Frank Lemus productor Caracas |
| **Conversi├│n esperada** | Avanzar a p├ígina de servicio espec├¡fico o contactar directamente |
| **P├íginas hijas** | Posiblemente `Frank Lemus` y `Susej Vera` como subp├íginas de experto si hay masa de contenido; evaluar en page briefs |
| **Estado** | [CONFIRMED] como secci├│n necesaria; contenido [CLIENT_REQUIRED] |

**Bloques obligatorios:**
- Historia de la marca (2015, origen, misi├│n)
- Frank Lemus: foto, bio, rol, credenciales
- Susej Vera: foto, bio, rol, credenciales
- Por qu├® Turpial Sound: diferenciadores reales con lenguaje sobrio
- Artistas que han confiado en el estudio (lista curada ÔÇö [CLIENT_REQUIRED])

---

### 4.3 SALAS DE ENSAYO ÔåÉ MONEY PAGE

| Campo | Valor |
|-------|-------|
| **Objetivo** | Convertir visitantes en reservas o consultas de sala de ensayo. Posicionar en b├║squedas locales relacionadas. |
| **Usuario principal** | Bandas, m├║sicos y proyectos que necesitan ensayar en espacio profesional |
| **Intenci├│n de b├║squeda** | sala de ensayo Caracas, sala de ensayo profesional Caracas, donde ensayar en Caracas, sala de ensayo con equipos Caracas |
| **Conversi├│n esperada** | Solicitar disponibilidad o reservar sala por WhatsApp |
| **Estado** | [CONFIRMED] |

**P├íginas hijas sugeridas:**

| Subp├ígina | Prop├│sito | Estado |
|-----------|-----------|--------|
| Sala Premium / Prioritaria | p├ígina de sala espec├¡fica con detalle de capacidad, equipo y tarifa | [SUGGESTED] |
| Sala Flexible / Est├índar | p├ígina de sala con tarifa accesible | [SUGGESTED] |
| Tarifas y disponibilidad | tabla de precios y condiciones de reserva | [CLIENT_REQUIRED ÔÇö depende de estructura de precios real] |
| FAQ Salas de Ensayo | respuestas a preguntas espec├¡ficas de ensayo | [SUGGESTED] |

**Bloques obligatorios en la p├ígina principal:**
- Qu├® incluye el espacio (equipos, condiciones, capacidad)
- Modalidades de tarifa (flexible, premium, prioritaria)
- Galer├¡a de fotos reales del espacio [CLIENT_REQUIRED]
- CTA de reserva / consulta de disponibilidad
- Preguntas frecuentes espec├¡ficas de ensayo

---

### 4.4 ESTUDIO DE GRABACI├ôN ÔåÉ MONEY PAGE

| Campo | Valor |
|-------|-------|
| **Objetivo** | Convertir en sesiones de grabaci├│n. Posicionar en b├║squedas de grabaci├│n profesional en Caracas. |
| **Usuario principal** | Artistas y bandas que necesitan grabar material nuevo o demo profesional |
| **Intenci├│n de b├║squeda** | estudio de grabaci├│n en Caracas, grabar m├║sica profesionalmente Caracas, sesi├│n de grabaci├│n Caracas, donde grabar en Caracas |
| **Conversi├│n esperada** | Reservar sesi├│n de grabaci├│n o consultar disponibilidad |
| **Estado** | [CONFIRMED] |

**P├íginas hijas sugeridas:**

| Subp├ígina | Prop├│sito | Estado |
|-----------|-----------|--------|
| Equipamiento del estudio | detalle de equipos, consola, micr├│fonos, software, monitores | [SUGGESTED ÔÇö valioso para SEO t├®cnico] |
| C├│mo prepararse para una sesi├│n de grabaci├│n | contenido editorial con valor SEO | [SUGGESTED] |
| FAQ Grabaci├│n | preguntas frecuentes espec├¡ficas de grabaci├│n | [SUGGESTED] |

**Bloques obligatorios en la p├ígina principal:**
- Qu├® incluye la sesi├│n de grabaci├│n
- Equipamiento disponible
- Proceso: c├│mo funciona desde la reserva hasta la entrega
- Artistas o proyectos grabados aqu├¡ (prueba social) [CLIENT_REQUIRED]
- Galer├¡a del estudio [CLIENT_REQUIRED]
- CTA de reserva / consulta

---

### 4.5 PRODUCCI├ôN MUSICAL ÔåÉ MONEY PAGE

| Campo | Valor |
|-------|-------|
| **Objetivo** | Captar proyectos de producci├│n integral. Posicionar como referente de producci├│n musical en Caracas. |
| **Usuario principal** | Artistas con proyecto en desarrollo que necesitan pasar de idea a material terminado |
| **Intenci├│n de b├║squeda** | producci├│n musical en Caracas, productor musical Caracas, producir una canci├│n en Caracas, arreglos y producci├│n musical Venezuela |
| **Conversi├│n esperada** | Consultar sobre proyecto de producci├│n / solicitar propuesta |
| **Estado** | [CONFIRMED] |

**P├íginas hijas sugeridas:**

| Subp├ígina | Prop├│sito | Estado |
|-----------|-----------|--------|
| Proceso de producci├│n | c├│mo trabaja Turpial Sound en un proyecto integral | [SUGGESTED] |
| Portafolio de producci├│n | trabajos producidos con referencias si existen | [CLIENT_REQUIRED] |
| FAQ Producci├│n Musical | preguntas sobre alcance, tiempos, entregables | [SUGGESTED] |

**Bloques obligatorios en la p├ígina principal:**
- Qu├® es producci├│n musical y qu├® incluye en Turpial Sound
- El proceso: desde la idea hasta el master final
- G├®neros y estilos manejados [CLIENT_REQUIRED ÔÇö definir cu├íles confirmar]
- Portafolio o casos [CLIENT_REQUIRED]
- CTA de consulta de proyecto

---

### 4.6 SERVICIOS COMPLEMENTARIOS

| Campo | Valor |
|-------|-------|
| **Objetivo** | Ampliar la oferta visible sin saturar la navegaci├│n principal. Captar usuarios de nichos espec├¡ficos (podcast, locuci├│n, video). |
| **Usuario principal** | Creadores de contenido, comunicadores, empresas, artistas con necesidades espec├¡ficas |
| **Intenci├│n de b├║squeda** | varias intenciones espec├¡ficas por subservicio |
| **Conversi├│n esperada** | Consulta directa o derivaci├│n al servicio relevante |
| **Estado** | [CONFIRMED] como secci├│n; subp├íginas [SUGGESTED] |

**P├íginas hijas:**

| Subp├ígina | B├║squeda objetivo | Estado |
|-----------|------------------|--------|
| Mezcla y masterizaci├│n | mezcla y masterizaci├│n Caracas, masterizaci├│n de audio Caracas | [SUGGESTED] |
| Podcast y locuci├│n | estudio de podcast Caracas, grabaci├│n de podcast Caracas, locuci├│n profesional Caracas | [SUGGESTED] |
| Video studio session | video session musical Caracas, grabar sesi├│n en video Caracas | [SUGGESTED] |
| Arreglos musicales | arreglos musicales Caracas, arreglo de canci├│n Venezuela | [SUGGESTED] |
| Consultor├¡a y clases | consultor├¡a de producci├│n musical Caracas, clases de producci├│n musical Caracas | [SUGGESTED ÔÇö evaluar si hay demanda real] |

**Nota de arquitectura:** estos servicios pueden organizarse como una secci├│n-├¡ndice que enlaza a p├íginas individuales (modelo hub/spoke), o como p├íginas independientes desde el primer nivel si el cliente confirma que son l├¡neas activas de negocio con volumen. Definir en `page-briefs.md`.

---

### 4.7 ARTISTAS / AUTORIDAD

| Campo | Valor |
|-------|-------|
| **Objetivo** | Consolidar la prueba social de la marca. Demostrar con evidencia que artistas de nivel han confiado en Turpial Sound. |
| **Usuario principal** | Usuario en evaluaci├│n que quiere confirmar la reputaci├│n del estudio antes de contactar |
| **Intenci├│n de b├║squeda** | Turpial Sound artistas, qui├®n ha grabado en Turpial Sound, Oscar D'Le├│n estudio Caracas [si se autoriza], testimonios Turpial Sound |
| **Conversi├│n esperada** | Aumentar confianza ÔåÆ derivar a servicio relevante o CTA de contacto |
| **Estado** | [SUGGESTED] ÔÇö estructura clara; contenido completamente [CLIENT_REQUIRED] |

**P├íginas hijas sugeridas:**

| Subp├ígina | Prop├│sito | Estado |
|-----------|-----------|--------|
| Artistas y proyectos | lista curada de artistas con imagen y nota | [CLIENT_REQUIRED ÔÇö lista autorizada] |
| Testimonios | citas de artistas o clientes con nombre | [CLIENT_REQUIRED] |
| Casos / proyectos destacados | caso breve: artista + proyecto + qu├® se hizo + resultado | [CLIENT_REQUIRED] |

**Nota cr├¡tica:** esta secci├│n no puede construirse sin la lista curada y autorizada de artistas. No usar ning├║n nombre sin autorizaci├│n expl├¡cita.

---

### 4.8 RECURSOS / FAQ

| Campo | Valor |
|-------|-------|
| **Objetivo** | Captar tr├ífico de b├║squeda informacional. Posicionar a Turpial Sound como referente editorial en su nicho. Responder preguntas del mercado antes de que el usuario las haga. |
| **Usuario principal** | Usuario en fase de investigaci├│n; artista nuevo que no sabe qu├® necesita; buscador en Google de terms informativos |
| **Intenci├│n de b├║squeda** | c├│mo prepararse para grabar, qu├® necesita una banda para grabar, diferencia entre mezcla y masterizaci├│n, cu├ínto cuesta un estudio de grabaci├│n, c├│mo reservar un estudio |
| **Conversi├│n esperada** | Capturar atenci├│n ÔåÆ construir confianza ÔåÆ derivar a servicio o contacto |
| **Estado** | [SUGGESTED] como secci├│n; contenidos espec├¡ficos a definir |

**P├íginas hijas sugeridas:**

| Pieza | Tipo | Valor SEO/AEO | Estado |
|-------|------|---------------|--------|
| FAQ general (preguntas frecuentes del estudio) | FAQ estructurada | Alto ÔÇö AEO directo | [SUGGESTED] |
| C├│mo prepararse para una sesi├│n de grabaci├│n | gu├¡a | Alto ÔÇö long tail | [SUGGESTED] |
| Diferencias entre ensayo, grabaci├│n, mezcla y producci├│n | explicaci├│n educativa | Alto ÔÇö queries informacionales | [SUGGESTED] |
| Qu├® incluye una producci├│n musical completa | gu├¡a de servicio | Alto | [SUGGESTED] |
| C├│mo grabar un podcast de calidad profesional | gu├¡a nicho podcast | Medio | [SUGGESTED] |
| Checklist para bandas antes de entrar al estudio | recurso descargable o en p├ígina | Alto ÔÇö engagement | [SUGGESTED] |
| Glosario b├ísico de producci├│n musical | glosario | Medio ÔÇö autoridad de entidad | [SUGGESTED ÔÇö Fase 2 de producci├│n] |

**Nota:** no todos estos recursos van en V1. Priorizar FAQ general + 2ÔÇô3 gu├¡as core para el lanzamiento.

---

### 4.9 CONTACTO / RESERVA

| Campo | Valor |
|-------|-------|
| **Objetivo** | Capturar la conversi├│n final. Facilitar el primer contacto sin fricci├│n. |
| **Usuario principal** | Usuario listo para reservar, consultar o cotizar |
| **Intenci├│n de b├║squeda** | contactar Turpial Sound, reservar sala de ensayo Caracas, reservar estudio de grabaci├│n Caracas |
| **Conversi├│n esperada** | Mensaje por WhatsApp / formulario de consulta / llamada directa |
| **Estado** | [CONFIRMED] |

**Contenido obligatorio:**
- CTA de WhatsApp como acci├│n principal [SUGGESTED ÔÇö pendiente confirmaci├│n del cliente]
- Formulario de contacto b├ísico (nombre, servicio de inter├®s, mensaje)
- Horarios de atenci├│n [CLIENT_REQUIRED]
- Direcci├│n y mapa [CLIENT_REQUIRED]
- Correo de contacto [CLIENT_REQUIRED]
- Redes sociales enlazadas [CLIENT_REQUIRED]

---

## 5. Money pages ÔÇö V1 prioritarias

Estas p├íginas son las que deben existir s├¡ o s├¡ en el lanzamiento inicial y deben tener el mayor nivel de calidad editorial, t├®cnica y visual:

| Prioridad | P├ígina | Raz├│n |
|-----------|--------|-------|
| 1 | Home | Puerta de entrada universal; posiciona la marca y orienta |
| 2 | Salas de ensayo | Mayor volumen de demanda probable; b├║squedas locales directas |
| 3 | Estudio de grabaci├│n | Servicio m├ís identificable del nicho; b├║squedas de alto valor |
| 4 | Producci├│n musical | Servicio de mayor ticket y mayor complejidad; captura proyectos serios |
| 5 | Contacto / Reserva | Cierra la conversi├│n desde cualquier otro punto del sitio |

---

## 6. P├íginas de autoridad

Estas p├íginas construyen confianza, entidad y se├▒ales para buscadores e interfaces de IA. No son necesariamente de alta conversi├│n directa, pero son cr├¡ticas para que el resto del sitio funcione mejor.

| P├ígina | Prop├│sito principal |
|--------|---------------------|
| Estudio / Sobre nosotros | Entidad de marca; bios de voceros; historia |
| Artistas / Autoridad | Prueba social verificable; portafolio de relaciones |
| Casos / Proyectos | Evidencia de resultado; storytelling de autoridad |
| FAQ general | Responde preguntas del mercado; AEO directo |

---

## 7. P├íginas de soporte SEO/AEO

Estas piezas refuerzan la autoridad tem├ítica de Turpial Sound en su nicho y captan tr├ífico de b├║squeda informacional:

| Pieza | Intenci├│n de b├║squeda objetivo | Fase de producci├│n |
|-------|-------------------------------|-------------------|
| C├│mo prepararse para una sesi├│n de grabaci├│n | "qu├® necesito para grabar", "c├│mo preparar mi banda para el estudio" | V1 |
| Qu├® incluye una producci├│n musical completa | "producci├│n musical qu├® es", "qu├® hace un productor musical" | V1 |
| Diferencias entre grabaci├│n, mezcla y masterizaci├│n | "diferencia mezcla masterizaci├│n", "fases de producci├│n musical" | V1 |
| FAQ espec├¡fica de salas de ensayo | "preguntas salas de ensayo", "qu├® llevar al ensayo" | V1 |
| FAQ espec├¡fica de grabaci├│n | "preguntas estudio de grabaci├│n", "cu├ínto dura una sesi├│n de grabaci├│n" | V1 |
| C├│mo grabar un podcast profesionalmente | "podcast studio Caracas", "c├│mo grabar podcast calidad" | Fase 2 |
| Glosario de producci├│n musical | "qu├® es el mastering", "qu├® es un mix" | Fase 2 |
| Checklist para bandas antes de entrar al estudio | "checklist grabaci├│n estudio", "qu├® llevar al estudio de grabaci├│n" | Fase 2 |

---

## 8. Jerarqu├¡a de conversi├│n

### CTA principal (sugerido ÔÇö pendiente validaci├│n del cliente)
> **Reservar por WhatsApp** ÔÇö presente en todas las p├íginas de servicio y en el hero de Home.

### CTA secundarios
| CTA | Contexto de aparici├│n |
|-----|-----------------------|
| Consultar disponibilidad | P├íginas de salas y estudio de grabaci├│n |
| Solicitar propuesta de producci├│n | P├ígina de producci├│n musical |
| Cotizar servicio | P├íginas de servicios complementarios |
| Ver artistas / Ver trabajos | Desde Home y p├íginas de servicio hacia secci├│n de autoridad |
| Leer gu├¡a / Ver FAQ | Desde Home y servicios hacia recursos |

### P├íginas de entrada org├ínica esperadas
Las b├║squedas de mayor volumen llevar├ín tr├ífico a:
1. Home ÔåÆ b├║squeda de marca
2. Salas de ensayo ÔåÆ "sala de ensayo Caracas"
3. Estudio de grabaci├│n ÔåÆ "estudio de grabaci├│n Caracas"
4. Producci├│n musical ÔåÆ "producci├│n musical Caracas"
5. Podcast y locuci├│n ÔåÆ "podcast studio Caracas", "locuci├│n profesional Caracas"
6. Gu├¡as y FAQ ÔåÆ long tail informacional

### P├íginas de cierre comercial
Las p├íginas donde se espera que ocurra la conversi├│n final:
- Salas de ensayo (ÔåÆ WhatsApp)
- Estudio de grabaci├│n (ÔåÆ WhatsApp)
- Producci├│n musical (ÔåÆ WhatsApp o formulario)
- Contacto / Reserva (ÔåÆ WhatsApp / formulario / llamada)

### Flujo de conversi├│n sugerido

```
Entrada org├ínica (b├║squeda / redes / recomendaci├│n)
      Ôåô
Home o p├ígina de servicio espec├¡fica
      Ôåô
Prueba social / Sobre nosotros / Artistas (si el usuario eval├║a)
      Ôåô
P├ígina de servicio con detalle + CTA
      Ôåô
WhatsApp / Formulario / Tel├®fono
      Ôåô
Reserva confirmada o solicitud calificada
```

---

## 9. Dependencias antes de congelar el sitemap definitivo

Los siguientes puntos dependen exclusivamente del cliente y bloquean la versi├│n final de la arquitectura:

| Dependencia | Impacto si no se resuelve | Estado |
|-------------|--------------------------|--------|
| CTA principal confirmado (WhatsApp / otro) | Cambia la mec├ínica de conversi├│n de todo el sitio | [CLIENT_REQUIRED] |
| Estructura de precios (┬┐se publican tarifas o no?) | Define si hay p├ígina de "Tarifas" o se oculta detr├ís de CTA | [CLIENT_REQUIRED] |
| Lista de salas disponibles y sus nombres | Define si hay subp├íginas por sala o una sola p├ígina | [CLIENT_REQUIRED] |
| Lista autorizada de artistas | Define si existe la secci├│n de Artistas/Autoridad y con qu├® contenido | [CLIENT_REQUIRED] |
| Dominio y estructura de URL | Define si el sitio es espa├▒ol, ingl├®s o biling├╝e desde /en/ o subdominios | [CLIENT_REQUIRED] |
| Nivel de biling├╝ismo decidido | Define si se duplican p├íginas en ingl├®s o se usa i18n en JS | [CLIENT_REQUIRED] |
| Servicios activos confirmados | Define cu├íles subp├íginas de Servicios Complementarios se crean en V1 | [CLIENT_REQUIRED] |
| Existencia de portafolio / casos publicables | Define si existe secci├│n de casos en V1 o se pospone | [CLIENT_REQUIRED] |

---

## 10. Documentos derivados del sitemap

Una vez aprobado el sitemap maestro (o su versi├│n provisional), los siguientes documentos deben generarse en este orden:

| Orden | Documento | Contenido | Carpeta |
|-------|-----------|-----------|---------|
| 1 | `url-map.md` | URL definitiva de cada p├ígina (espa├▒ol + ingl├®s si aplica) | `02_information_architecture/` |
| 2 | `navigation-model.md` | Men├║ principal, men├║ footer, breadcrumbs, CTAs fijos | `02_information_architecture/` |
| 3 | `content-clusters.md` | Cl├║sters tem├íticos: p├ígina pilar + p├íginas sat├®lite + FAQ | `02_information_architecture/` |
| 4 | `internal-linking.md` | Qu├® p├íginas se enlazan entre s├¡ y con qu├® texto de ancla | `02_information_architecture/` |
| 5 | `page-briefs.md` | Brief individual por p├ígina: objetivo, usuario, secciones, copy guide, CTA | `03_editorial/` |

---

## 11. Vista consolidada ÔÇö ├ürbol completo V1 propuesto

```
TURPIAL SOUND (sitio p├║blico)
Ôöé
Ôö£ÔöÇÔöÇ / (Home)
Ôöé
Ôö£ÔöÇÔöÇ /nosotros (o /estudio)                         [autoridad de entidad]
Ôöé   Ôö£ÔöÇÔöÇ Frank Lemus ÔÇö inline o subp├ígina
Ôöé   ÔööÔöÇÔöÇ Susej Vera ÔÇö inline o subp├ígina
Ôöé
Ôö£ÔöÇÔöÇ /salas-de-ensayo                               [money page]
Ôöé   Ôö£ÔöÇÔöÇ /salas-de-ensayo/sala-premium              [SUGGESTED]
Ôöé   Ôö£ÔöÇÔöÇ /salas-de-ensayo/sala-estandar             [SUGGESTED]
Ôöé   Ôö£ÔöÇÔöÇ /salas-de-ensayo/tarifas                   [CLIENT_REQUIRED]
Ôöé   ÔööÔöÇÔöÇ /salas-de-ensayo/faq                       [SUGGESTED]
Ôöé
Ôö£ÔöÇÔöÇ /estudio-de-grabacion                          [money page]
Ôöé   Ôö£ÔöÇÔöÇ /estudio-de-grabacion/equipamiento         [SUGGESTED]
Ôöé   ÔööÔöÇÔöÇ /estudio-de-grabacion/faq                  [SUGGESTED]
Ôöé
Ôö£ÔöÇÔöÇ /produccion-musical                            [money page]
Ôöé   Ôö£ÔöÇÔöÇ /produccion-musical/proceso                [SUGGESTED]
Ôöé   Ôö£ÔöÇÔöÇ /produccion-musical/portafolio             [CLIENT_REQUIRED]
Ôöé   ÔööÔöÇÔöÇ /produccion-musical/faq                   [SUGGESTED]
Ôöé
Ôö£ÔöÇÔöÇ /servicios
Ôöé   Ôö£ÔöÇÔöÇ /servicios/mezcla-masterizacion            [SUGGESTED]
Ôöé   Ôö£ÔöÇÔöÇ /servicios/podcast-locucion                [SUGGESTED]
Ôöé   Ôö£ÔöÇÔöÇ /servicios/video-studio-session            [SUGGESTED]
Ôöé   Ôö£ÔöÇÔöÇ /servicios/arreglos-musicales              [SUGGESTED]
Ôöé   ÔööÔöÇÔöÇ /servicios/consultoria                     [SUGGESTED ÔÇö evaluar demanda]
Ôöé
Ôö£ÔöÇÔöÇ /artistas                                      [autoridad ÔÇö CLIENT_REQUIRED]
Ôöé   Ôö£ÔöÇÔöÇ /artistas/testimonios                      [CLIENT_REQUIRED]
Ôöé   ÔööÔöÇÔöÇ /artistas/proyectos                        [CLIENT_REQUIRED]
Ôöé
Ôö£ÔöÇÔöÇ /recursos
Ôöé   Ôö£ÔöÇÔöÇ /recursos/como-prepararse-para-grabar      [SUGGESTED ÔÇö V1]
Ôöé   Ôö£ÔöÇÔöÇ /recursos/que-incluye-produccion-musical   [SUGGESTED ÔÇö V1]
Ôöé   Ôö£ÔöÇÔöÇ /recursos/grabacion-mezcla-masterizacion   [SUGGESTED ÔÇö V1]
Ôöé   Ôö£ÔöÇÔöÇ /recursos/faq                              [SUGGESTED ÔÇö V1]
Ôöé   ÔööÔöÇÔöÇ /recursos/checklist-antes-del-estudio      [SUGGESTED ÔÇö Fase 2]
Ôöé
ÔööÔöÇÔöÇ /contacto                                      [conversi├│n final]

ÔöÇÔöÇÔöÇ P├üGINAS EST├üTICAS (footer / legal)
Ôö£ÔöÇÔöÇ /politica-de-privacidad
ÔööÔöÇÔöÇ /terminos-de-servicio
```

**Nota sobre ingl├®s:** si el sitio es biling├╝e total, se replica la estructura bajo `/en/`. Si es biling├╝e parcial, solo las p├íginas core tienen versi├│n en ingl├®s. Definir en `url-map.md` una vez el cliente confirme el nivel de biling├╝ismo.

---

## 12. Criterios para declarar este sitemap como versi├│n final

- [ ] CTA principal del sitio confirmado por el cliente
- [ ] Estructura de precios decidida (┬┐se publica o no?)
- [ ] Lista y nombres de salas confirmados
- [ ] Lista de artistas autorizados para la secci├│n de autoridad
- [ ] Nivel de biling├╝ismo del sitio definido
- [ ] Servicios activos en V1 confirmados (cu├íles s├¡, cu├íles van a Fase 2)
- [ ] Portafolio publicable: ┬┐existe para V1 o se pospone?
