# Turpial Sound — URL Architecture

> Estado: **Fase 2 — Provisional. Estructura definida; slugs en español confirmados; versión EN y subpáginas de sala/servicio pendientes de datos del cliente.**
> Última actualización: 2026-03-26
> Fuente base: `sitemap-master.md` + `docs/01_strategy/`

---

## Leyenda de estado

- **[CONFIRMED]** — estructura sólida, coherente con el negocio y el SEO; no requiere validación adicional del cliente
- **[SUGGESTED]** — propuesta coherente; puede refinarse con preferencia del cliente
- **[CLIENT_REQUIRED]** — depende de información factual que solo el cliente puede proveer

---

## 1. Principios de naming

### 1.1 Reglas generales

| Regla | Ejemplo correcto | Ejemplo incorrecto |
|-------|-----------------|-------------------|
| Minúsculas siempre | `/salas-de-ensayo` | `/Salas-De-Ensayo` |
| Hyphens como separador | `/estudio-de-grabacion` | `/estudio_de_grabacion` |
| Sin acentos en la URL | `/produccion-musical` | `/producción-musical` |
| Sin stopwords innecesarias | `/artistas` | `/los-artistas-del-estudio` |
| Conservar stopwords cuando son parte del término de búsqueda | `/salas-de-ensayo`, `/estudio-de-grabacion` | `/salas-ensayo` ← pierde densidad SEO |
| Sin trailing slash inconsistente | Definir una norma y aplicarla en toda la app | mezclar `/contacto` y `/contacto/` |
| Sin parámetros ni IDs en URLs públicas | `/recursos/como-prepararse-para-grabar` | `/recursos?id=12` |
| Máximo 3 niveles de profundidad | `/servicios/podcast-locucion` | `/servicios/audio/podcast/locucion/profesional` |

### 1.2 Idioma

- El idioma base del sitio es **español**. Las URLs en español son canónicas.
- Si el sitio tendrá versión en inglés, las URLs en inglés se alojan bajo el prefijo `/en/`.
- No se mezclan idiomas en una misma URL (`/estudio/recording-studio`).
- El nivel de bilingüismo del sitio (total, parcial o solo páginas core) afecta cuántas URLs en inglés existen. **[CLIENT_REQUIRED]**

### 1.3 Slugs y términos de búsqueda

Los slugs de las money pages están diseñados para coincidir directamente con los términos de búsqueda más valiosos del nicho:

| Página | Slug | Término objetivo |
|--------|------|-----------------|
| Salas de ensayo | `/salas-de-ensayo` | "salas de ensayo Caracas" |
| Estudio de grabación | `/estudio-de-grabacion` | "estudio de grabación en Caracas" |
| Producción musical | `/produccion-musical` | "producción musical Caracas" |
| Podcast y locución | `/servicios/podcast-locucion` | "podcast studio Caracas", "locución profesional Caracas" |
| Video studio session | `/servicios/video-session` | "video session musical Caracas" |

---

## 2. Estructura completa de URLs — Español (canónicas)

### 2.1 Páginas raíz

| URL | Nombre de página | Tipo | Estado |
|-----|-----------------|------|--------|
| `/` | Home | Money + entrada | [CONFIRMED] |
| `/nosotros` | Estudio / Sobre nosotros | Autoridad | [CONFIRMED] |
| `/contacto` | Contacto / Reserva | Conversión final | [CONFIRMED] |

> **Nota sobre `/nosotros` vs. `/estudio`:** ambas opciones son válidas. `/nosotros` es más directo para el usuario; `/estudio` tiene mayor densidad SEO si la intención de búsqueda incluye "estudio Turpial Sound". Decisión: **[SUGGESTED]** usar `/nosotros` como slug principal con alias o redirección desde `/estudio` si aplica. Confirmar preferencia del cliente.

---

### 2.2 Money pages — Salas de ensayo

| URL | Nombre de página | Estado |
|-----|-----------------|--------|
| `/salas-de-ensayo` | Salas de ensayo — página principal (hub) | [CONFIRMED] |
| `/salas-de-ensayo/sala-premium` | Sala Premium — detalle específico | [SUGGESTED — nombre real pendiente] |
| `/salas-de-ensayo/sala-estandar` | Sala Estándar — detalle específico | [SUGGESTED — nombre real pendiente] |
| `/salas-de-ensayo/tarifas` | Tarifas y disponibilidad | [CLIENT_REQUIRED — decisión de publicar precios] |
| `/salas-de-ensayo/preguntas-frecuentes` | FAQ de salas de ensayo | [SUGGESTED] |

> Los slugs de subpáginas (`sala-premium`, `sala-estandar`) son provisionales. Deben reemplazarse con los nombres reales que usa el cliente para sus salas. **[CLIENT_REQUIRED]**

---

### 2.3 Money pages — Estudio de grabación

| URL | Nombre de página | Estado |
|-----|-----------------|--------|
| `/estudio-de-grabacion` | Estudio de grabación — página principal | [CONFIRMED] |
| `/estudio-de-grabacion/equipamiento` | Equipamiento del estudio | [SUGGESTED] |
| `/estudio-de-grabacion/preguntas-frecuentes` | FAQ de grabación | [SUGGESTED] |

---

### 2.4 Money pages — Producción musical

| URL | Nombre de página | Estado |
|-----|-----------------|--------|
| `/produccion-musical` | Producción musical — página principal | [CONFIRMED] |
| `/produccion-musical/proceso` | Cómo trabajamos — proceso de producción | [SUGGESTED] |
| `/produccion-musical/portafolio` | Portafolio de producción | [CLIENT_REQUIRED — requiere casos publicables] |
| `/produccion-musical/preguntas-frecuentes` | FAQ de producción musical | [SUGGESTED] |

---

### 2.5 Servicios complementarios (hub + subpáginas)

| URL | Nombre de página | Estado |
|-----|-----------------|--------|
| `/servicios` | Servicios — página hub de navegación | [CONFIRMED] |
| `/servicios/mezcla-masterizacion` | Mezcla y masterización | [SUGGESTED] |
| `/servicios/podcast-locucion` | Podcast y locución | [SUGGESTED] |
| `/servicios/video-session` | Video studio session | [SUGGESTED] |
| `/servicios/arreglos-musicales` | Arreglos musicales | [SUGGESTED] |
| `/servicios/consultoria` | Consultoría y producción | [SUGGESTED — confirmar si es servicio activo en V1] |

> La página `/servicios` es una página-índice que orienta al usuario. No es una money page en sí: sirve de puente entre Home y los servicios individuales. Si algún servicio complementario tiene bajo volumen real de demanda, puede referenciarse desde la página de Servicios sin tener subpágina propia en V1. Confirmar con el cliente qué servicios están activos. **[CLIENT_REQUIRED]**

---

### 2.6 Autoridad

| URL | Nombre de página | Estado |
|-----|-----------------|--------|
| `/artistas` | Artistas y proyectos — hub | [CONFIRMED como estructura; contenido CLIENT_REQUIRED] |
| `/artistas/testimonios` | Testimonios | [CLIENT_REQUIRED — requiere testimonios reales] |
| `/artistas/proyectos` | Proyectos destacados | [CLIENT_REQUIRED — requiere casos publicables] |

> La sección `/artistas` no puede poblarse sin la lista curada y autorizada de artistas y proyectos. La estructura de URL está definida; el contenido bloquea la página. **[CLIENT_REQUIRED]**

---

### 2.7 Recursos y SEO/AEO

| URL | Nombre de página | Fase | Estado |
|-----|-----------------|------|--------|
| `/recursos` | Recursos — hub de contenidos | V1 | [CONFIRMED] |
| `/recursos/como-prepararse-para-grabar` | Cómo prepararse para una sesión de grabación | V1 | [SUGGESTED] |
| `/recursos/que-incluye-una-produccion-musical` | Qué incluye una producción musical completa | V1 | [SUGGESTED] |
| `/recursos/grabacion-mezcla-masterizacion` | Diferencias entre grabación, mezcla y masterización | V1 | [SUGGESTED] |
| `/recursos/preguntas-frecuentes` | Preguntas frecuentes — FAQ general | V1 | [SUGGESTED] |
| `/recursos/checklist-antes-del-estudio` | Checklist para bandas antes del estudio | Fase 2 | [SUGGESTED] |
| `/recursos/como-grabar-un-podcast-profesional` | Cómo grabar un podcast profesional | Fase 2 | [SUGGESTED] |
| `/recursos/glosario-produccion-musical` | Glosario de producción musical | Fase 2 | [SUGGESTED] |

> Para V1 se priorizan 3–4 recursos de mayor valor SEO. El hub `/recursos` indexa todo el contenido disponible.

---

### 2.8 Páginas estáticas / legales

| URL | Nombre de página | Estado |
|-----|-----------------|--------|
| `/politica-de-privacidad` | Política de privacidad | [CONFIRMED — obligatoria si hay formulario o analytics] |
| `/terminos-de-servicio` | Términos de servicio | [SUGGESTED] |

---

## 3. Estructura de URLs — Inglés (si el sitio es bilingüe)

> El nivel de bilingüismo del sitio no está confirmado. **[CLIENT_REQUIRED]**
> La estructura siguiente aplica si el cliente decide bilingüismo total o parcial con prefijo `/en/`.

### 3.1 Principio de internacionalización

- URLs en inglés bajo el prefijo `/en/`.
- Cada URL en inglés tiene un canónico en español: `hreflang` declarado en el `<head>`.
- Los slugs en inglés se reescriben en inglés natural (no son traducciones literales del slug español).

### 3.2 URLs en inglés — Money pages prioritarias

| URL EN | Equivalente ES | Estado |
|--------|---------------|--------|
| `/en` | `/` | [SUGGESTED] |
| `/en/about` | `/nosotros` | [SUGGESTED] |
| `/en/rehearsal-rooms` | `/salas-de-ensayo` | [SUGGESTED] |
| `/en/recording-studio` | `/estudio-de-grabacion` | [SUGGESTED] |
| `/en/music-production` | `/produccion-musical` | [SUGGESTED] |
| `/en/services` | `/servicios` | [SUGGESTED] |
| `/en/services/mixing-mastering` | `/servicios/mezcla-masterizacion` | [SUGGESTED] |
| `/en/services/podcast-voiceover` | `/servicios/podcast-locucion` | [SUGGESTED] |
| `/en/services/video-session` | `/servicios/video-session` | [SUGGESTED] |
| `/en/artists` | `/artistas` | [SUGGESTED] |
| `/en/resources` | `/recursos` | [SUGGESTED] |
| `/en/contact` | `/contacto` | [SUGGESTED] |

> **Opción simplificada:** si el cliente decide bilingüismo parcial, solo las money pages y Home tienen versión EN. El resto permanece solo en español.

---

## 4. URLs que NO deben existir todavía

Estas URLs están fuera del alcance de V1 para evitar inflar la arquitectura antes de tener contenido real:

| URL descartada | Razón |
|---------------|-------|
| `/blog/` | Sin estrategia editorial activa; posponer a Fase 2 |
| `/noticias/` | Sin operación de publicación periódica en V1 |
| `/tienda/` | Sin ecommerce activo declarado |
| `/reservar-online/` | Sin sistema de reservas online integrado en V1 (CTA va a WhatsApp) |
| `/login/` | Sin área privada de clientes en V1 |
| URLs de artistas individuales | Sin perfiles de artista como páginas propias en V1; va en `/artistas` como lista curada |
| Subdominios por idioma (`en.turpialsound.com`) | Preferir prefijo `/en/` para mantener la autoridad de dominio unificada |

---

## 5. Resumen visual — Árbol de URLs definitivo V1

```
/
├── /nosotros
├── /salas-de-ensayo
│   ├── /salas-de-ensayo/[nombre-sala-1]        ← CLIENT_REQUIRED
│   ├── /salas-de-ensayo/[nombre-sala-2]        ← CLIENT_REQUIRED
│   ├── /salas-de-ensayo/tarifas                ← CLIENT_REQUIRED (decisión de publicar)
│   └── /salas-de-ensayo/preguntas-frecuentes
├── /estudio-de-grabacion
│   ├── /estudio-de-grabacion/equipamiento
│   └── /estudio-de-grabacion/preguntas-frecuentes
├── /produccion-musical
│   ├── /produccion-musical/proceso
│   ├── /produccion-musical/portafolio           ← CLIENT_REQUIRED
│   └── /produccion-musical/preguntas-frecuentes
├── /servicios
│   ├── /servicios/mezcla-masterizacion
│   ├── /servicios/podcast-locucion
│   ├── /servicios/video-session
│   ├── /servicios/arreglos-musicales
│   └── /servicios/consultoria
├── /artistas                                    ← contenido CLIENT_REQUIRED
│   ├── /artistas/testimonios                    ← CLIENT_REQUIRED
│   └── /artistas/proyectos                      ← CLIENT_REQUIRED
├── /recursos
│   ├── /recursos/como-prepararse-para-grabar
│   ├── /recursos/que-incluye-una-produccion-musical
│   ├── /recursos/grabacion-mezcla-masterizacion
│   └── /recursos/preguntas-frecuentes
├── /contacto
├── /politica-de-privacidad
└── /terminos-de-servicio

/en/                                             ← nivel de bilingüismo CLIENT_REQUIRED
├── /en/rehearsal-rooms
├── /en/recording-studio
├── /en/music-production
└── [resto según decisión de bilingüismo]
```

---

## 6. Criterios pendientes para congelar la arquitectura de URLs

- [ ] Nombres reales de las salas (definen slugs de subpáginas)
- [ ] Decisión sobre publicar o no las tarifas (define si existe `/salas-de-ensayo/tarifas`)
- [ ] Servicios activos en V1 vs. Fase 2 (define cuántas subpáginas de `/servicios` se crean)
- [ ] Portafolio publicable (define si existe `/produccion-musical/portafolio` en V1)
- [ ] Nivel de bilingüismo (define si existe `/en/` y qué páginas cubre)
- [ ] Dominio real del sitio (necesario para configurar canónicos, hreflang y Search Console)
