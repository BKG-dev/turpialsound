import { writeFileSync, existsSync, mkdirSync } from "fs";
import { QUEUE_FILE, QUEUE_DIR } from "../../lib/rrss/config.mjs";
import { indexAssets, loadAssetIndex } from "../../lib/rrss/assetIndex.mjs";
import { matchAssetForPublication } from "../../lib/rrss/matchAssetsToPosts.mjs";
import { validateItem } from "../../lib/rrss/safetyRules.mjs";
import logger from "../../lib/rrss/logger.mjs";

if (!existsSync(QUEUE_DIR)) mkdirSync(QUEUE_DIR, { recursive: true });

function buildPublicationQueue() {
  const assets = loadAssetIndex();
  if (assets.length === 0) {
    logger.warn("No assets indexed. Run index-assets first.");
    return [];
  }

  const queue = [];

  // ===== FACEBOOK PUBLICATIONS (10) =====
  queue.push({
    id: "fb_post_01",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "Bienvenidos a Turpial Sound",
    caption: `Bienvenidos a Turpial Sound.

Somos un espacio completo de ensayo, grabación y producción musical en Caracas, Venezuela. Desde 2015 ofrecemos:

— Salas de ensayo equipadas para bandas y solistas.
— Estudio de grabación profesional.
— Producción musical integral: grabación, mezcla y master.
— Servicios de podcast, locución y video.
— Marketplace de instrumentos y equipos con operación protegida.

Nuestro equipo tiene más de 30 años de experiencia acumulada en producción musical e ingeniería de audio.

Si necesitas reservar, cotizar un proyecto o publicar equipo en el marketplace, escríbenos por WhatsApp. El link está en el botón de la página.

Gracias por estar aquí.`,
    cta: "Escribe por WhatsApp",
    hashtags: ["#TurpialSound", "#EstudioDeGrabacion", "#Caracas", "#ProduccionMusical", "#SalasDeEnsayo"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post fijado de la página de Facebook."
  });

  queue.push({
    id: "fb_post_02",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "No es magia. Es trabajo.",
    caption: `Producir no es solo grabar. Es tomar 500 decisiones.

Desde qué micrófono usar hasta cuánta reverb va en el puente. Desde el orden de las tomas hasta la mezcla final.

No es magia. Es criterio. Es experiencia. Es trabajo.

Eso es lo que hacemos en Turpial Sound.`,
    cta: "Reserva tu sesión por WhatsApp",
    hashtags: ["#ProduccionMusical", "#Mezcla", "#Masterizacion", "#EstudioDeGrabacion", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #14 del batch."
  });

  queue.push({
    id: "fb_post_03",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "También grabamos podcasts",
    caption: `No solo grabamos música.

Turpial Sound también ofrece:
— Grabación de podcast y locución comercial.
— Voiceover para videos y publicidad.
— Video sessions para contenido digital.

Si eres creador de contenido, comunicador o podcaster, tenemos el espacio y el equipo para que tu audio suene profesional.

Consulta disponibilidad por WhatsApp. El link está en la página.`,
    cta: "Escribe por WhatsApp para consultar",
    hashtags: ["#Podcast", "#Locucion", "#Voiceover", "#ContenidoDigital", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #15 del batch. Amplía percepción de servicios."
  });

  queue.push({
    id: "fb_post_04",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "Cómo ponerle precio a tu equipo usado",
    caption: `¿Vas a vender tu equipo y no sabes qué precio ponerle? No es solo ver cuánto pagaste.

Considera esto:

— Antigüedad real, no emocional. Un equipo de hace 5 años no vale lo mismo que uno nuevo, por mucho que lo quieras.
— Estado: rayones, golpes, perillas sueltas. Todo baja el precio. Sé honesto en la descripción.
— Precio de mercado: ¿cuánto pide otra gente por un equipo similar en Venezuela hoy?
— Urgencia: si necesitas vender rápido, el precio debe ser más competitivo.

Publicar en el marketplace de Turpial Sound te da visibilidad frente a músicos, no frente a revendedores. La operación protegida te respalda en el proceso.

Link para publicar: turpialsound.com/marketplace`,
    cta: "Publica tu listing en el marketplace",
    hashtags: ["#VenderEquipo", "#MarketplaceMusical", "#ConsejosDeVenta", "#EquipoMusical", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #10 del batch. Educativo para vendedores."
  });

  queue.push({
    id: "fb_post_05",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "7 cosas que debe tener un buen listing",
    caption: `Un buen listing no es solo una foto y un precio. Aquí 7 cosas que sí o sí debes incluir:

1. Fotos nítidas: mínimo 3, con luz natural. Que se vea el equipo de frente, de atrás y los detalles.
2. Marca y modelo exactos: nada de "guitarra eléctrica". Squier Affinity Stratocaster 2019.
3. Estado real: nuevo, como nuevo, usado con detalles, usado funcional. Sin maquillar.
4. Precio en USD: claro y sin regateo emocional. Si aceptas ofertas, dilo.
5. Ubicación: ciudad y estado. Así quien busca cerca te encuentra.
6. Descripción: ¿por qué vendes? ¿qué incluye? ¿tiene estuche, cable, manual?
7. Disponibilidad para probar: si el comprador puede probar el equipo, dilo.

Publica tu listing en el marketplace de Turpial Sound. Operación protegida incluida.

turpialsound.com/marketplace`,
    cta: "Publica tu listing ahora",
    hashtags: ["#Marketplace", "#VenderInstrumentos", "#ListingTips", "#EquipoMusical", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #12 del batch. Más extenso para Facebook."
  });

  queue.push({
    id: "fb_post_06",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "Tu equipo parado es plata quieta (FB extendido)",
    caption: `¿Tienes equipo musical que ya no usas? Guitarras, pedales, interfaces, micrófonos, monitores. Todo eso que está guardado puede convertirse en tu próximo upgrade.

Publicar en el marketplace de Turpial Sound es gratis. La comisión es transparente (5% solo si se vende). Y la operación protegida respalda la transacción.

No dejes tu equipo parado. Publícalo hoy.`,
    cta: "Link en bio para publicar",
    hashtags: ["#VenderEquipo", "#MarketplaceMusical", "#EquipoDeMusica", "#VenderInstrumentos", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #17. Corregido 'sin comisiones ocultas' por 'comisión transparente'."
  });

  queue.push({
    id: "fb_post_07",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "¿Cuánto cuesta producir una canción?",
    caption: `Una de las preguntas que más nos hacen: ¿cuánto cuesta grabar una canción?

La respuesta honesta: depende. Pero aquí van rangos reales para que tengas una idea:

— Grabación de una canción (1 día de estudio): desde $100 hasta $300 según la complejidad.
— Mezcla profesional: $80-$200 por canción, según pistas y nivel de detalle.
— Master: $30-$60 por canción.
— Producción integral (grabar + mezclar + master): desde $200 por tema sencillo.

¿Por qué estos precios? Porque grabar no es solo apretar REC. Es equipo profesional, tratamiento acústico, ingeniero con experiencia, y horas de escucha crítica.

Te damos un presupuesto exacto sin compromiso. Escríbenos por WhatsApp.`,
    cta: "Pide tu presupuesto por WhatsApp",
    hashtags: ["#ProduccionMusical", "#PresupuestoDeGrabacion", "#CostoProduccion", "#TurpialSound", "#Caracas"],
    sourceDoc: "council_correction_7",
    notes: "Post nuevo — Consejo de Expertos #7: contenido sobre presupuesto/costos reales."
  });

  queue.push({
    id: "fb_post_08",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "¿Cómo presupuestar tu proyecto musical?",
    caption: `Grabar, mezclar y masterizar un proyecto cuesta. Pero no saber cuánto cuesta es peor.

Aquí una guía realista para presupuestar:

1. Define qué quieres: ¿un single? ¿un EP de 5 temas? ¿un álbum? Cada uno tiene un costo distinto.
2. El estudio no es el único costo: considera transporte, alimentación, y tiempo de ensayo previo.
3. Pregunta por paquetes: muchos estudios ofrecen descuento por proyecto completo (grabación + mezcla + master).
4. Reserva con anticipación: improvisar sale más caro.
5. El productor importa: un buen productor te ahorra horas de estudio (y dinero).

En Turpial Sound armamos presupuestos personalizados según tu proyecto. Sin letra pequeña.

Escríbenos por WhatsApp y te enviamos una cotización.`,
    cta: "Solicita tu cotización por WhatsApp",
    hashtags: ["#PresupuestoMusical", "#PlanificaTuProyecto", "#ProduccionMusical", "#ConsejosMusicales", "#TurpialSound"],
    sourceDoc: "council_correction_7",
    notes: "Post nuevo #2 — Consejo de Expertos #7: contenido sobre presupuesto."
  });

  queue.push({
    id: "fb_post_09",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "Gracias por este mes",
    caption: `Primer mes en redes. Apenas arrancando.

Gracias a los que escribieron, comentaron, compartieron y preguntaron. Esto se construye con comunidad.

Se viene más contenido del estudio, las salas, el marketplace y la música que hacemos aquí.

Si tienes algo que grabar, mezclar, producir, comprar o vender: aquí estamos.`,
    cta: "Escribe por WhatsApp si necesitas algo",
    hashtags: ["#TurpialSound", "#ComunidadMusical", "#MusicosVenezuela", "#Gracias"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #19. Publicar al final del mes."
  });

  queue.push({
    id: "fb_post_10",
    channel: "facebook",
    format: "feed",
    status: "needs_review",
    title: "¿Qué canción venezolana te gustaría grabar o versionar?",
    caption: `Pregunta para la comunidad:

¿Qué canción venezolana te gustaría grabar o versionar?

No importa el género. No importa la época. Una que sientas tuya.

Cuéntanos en los comentarios. Nos interesa de verdad.`,
    cta: "Comenta abajo. Etiqueta a un músico.",
    hashtags: ["#MusicaVenezolana", "#TalentoVenezolano", "#ComunidadMusical", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #20. Engagement puro."
  });

  // ===== INSTAGRAM FEED PUBLICATIONS (10) =====
  queue.push({
    id: "ig_post_01",
    channel: "instagram",
    format: "feed",
    status: "needs_review",
    title: "Esto no es un cuarto adaptado",
    caption: `Esto no es un cuarto adaptado. Es un estudio de grabación profesional.

Cada metro cuadrado está tratado acústicamente. Cada micrófono tiene su lugar. Cada sesión tiene criterio detrás.

Caracas, Venezuela. Turpial Sound.`,
    cta: "Guarda este post",
    hashtags: ["#TurpialSound", "#EstudioDeGrabacion", "#EstudioCaracas", "#GrabacionProfesional", "#Caracas"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #1. Corregido: removido '10 años' para cumplir con límite de 1/6."
  });

  queue.push({
    id: "ig_post_02",
    channel: "instagram",
    format: "carousel",
    status: "needs_review",
    title: "3 salas de ensayo en Caracas",
    caption: `Tres salas de ensayo. No es un cuarto prestado. Son espacios diseñados para trabajar.

Cada sala tiene backline, acústica cuidada y espacio real para una banda completa.

Desliza para verlas. ¿Ya tienes dónde ensayar esta semana?`,
    cta: "Etiqueta a tu banda en los comentarios",
    hashtags: ["#SalasDeEnsayo", "#EnsayarEnCaracas", "#BandaVenezuela", "#MusicoIndependiente", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #2. Carrusel de salas."
  });

  queue.push({
    id: "ig_post_03",
    channel: "instagram",
    format: "feed",
    status: "needs_review",
    title: "La consola no miente",
    caption: `La consola no miente.

Detrás de cada fader hay una decisión. Detrás de cada decisión, criterio. Y detrás del criterio, más de 30 años de experiencia acumulada.

No es magia. Es trabajo.`,
    cta: "Comparte este post",
    hashtags: ["#IngenieriaDeAudio", "#Consola", "#EstudioProfesional", "#Mezcla", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #4."
  });

  queue.push({
    id: "ig_post_04",
    channel: "instagram",
    format: "carousel",
    status: "needs_review",
    title: "Comprar equipo usado sin miedo",
    caption: `Comprar equipo usado da nervios. Lo entendemos.

Por eso creamos la operación protegida en el marketplace de Turpial Sound.

No soltamos el dinero hasta que el comprador confirma que todo está bien. Simple. Sin letra pequeña.

Desliza para ver cómo funciona.`,
    cta: "Guarda este post para después",
    hashtags: ["#OperacionProtegida", "#CompraSegura", "#MarketplaceMusical", "#CompraYVentaInstrumentos", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #5. Carrusel. CTAs diversificados."
  });

  queue.push({
    id: "ig_post_05",
    channel: "instagram",
    format: "carousel",
    status: "needs_review",
    title: "3 cosas que revisamos antes de liberar un pago",
    caption: `Cuando compras o vendes en el marketplace, el equipo de Turpial Sound revisa cada transacción.

No es automático. Es criterio humano.

Las 3 cosas que revisamos antes de liberar un pago. Desliza.`,
    cta: "Comparte con alguien que le sirva",
    hashtags: ["#OperacionProtegida", "#CompraSegura", "#VentaProtegida", "#Escrow", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #6. Carrusel. CTAs diversificados."
  });

  queue.push({
    id: "ig_post_06",
    channel: "instagram",
    format: "feed",
    status: "needs_review",
    title: "¿Qué estás grabando ahora?",
    caption: `¿Qué estás grabando ahora?

Un EP. Un single. Una demo. Una idea que no te deja dormir.

El estudio está listo. Las salas también. Tu proyecto es lo único que falta.`,
    cta: "Cuéntanos en los comentarios qué estás creando",
    hashtags: ["#MusicaVenezolana", "#TalentoVenezolano", "#ProduccionMusical", "#Grabando", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #7. Engagement."
  });

  queue.push({
    id: "ig_post_07",
    channel: "instagram",
    format: "carousel",
    status: "needs_review",
    title: "5 cosas que incluso los avanzados pasan por alto al comprar guitarra usada",
    caption: `¿Ya sabes probar una guitarra usada? Aquí 5 cosas que incluso los músicos con experiencia pasan por alto.

Desliza. Puede ahorrarte un mal rato.`,
    cta: "Comparte con un guitarrista",
    hashtags: ["#ConsejosMusicales", "#GuitarraUsada", "#CompraYVentaInstrumentos", "#EquipoMusical", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #8. Corregido por Consejo #10: subir nivel educativo, no asumir ignorancia."
  });

  queue.push({
    id: "ig_post_08",
    channel: "instagram",
    format: "carousel",
    status: "needs_review",
    title: "¿Micrófono dinámico o de condensador? La respuesta real",
    caption: `Micrófono dinámico vs. de condensador. No es solo "uno aguanta y otro captura detalle".

Hay matices que importan: impedancia, sensibilidad, patrón polar, y sobre todo: ¿qué vas a grabar y en qué espacio?

Desliza para entender la diferencia real.`,
    cta: "¿Cuál usas más y por qué? Comenta",
    hashtags: ["#Microfonos", "#HomeStudio", "#AudioProfesional", "#ConsejosMusicales", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #9. Corregido por Consejo #10: subir nivel."
  });

  queue.push({
    id: "ig_post_09",
    channel: "instagram",
    format: "feed",
    status: "needs_review",
    title: "De noche también se graba",
    caption: `De noche también se graba. De noche también se mezcla.

El estudio está vivo a la hora que haga falta. Porque la música no tiene horario de oficina.`,
    cta: "Reserva tu sesión. Link en bio.",
    hashtags: ["#EstudioNocturno", "#Grabacion", "#MusicaSinHorario", "#SesionDeGrabacion", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #18. Ambiente."
  });

  queue.push({
    id: "ig_post_10",
    channel: "instagram",
    format: "carousel",
    status: "needs_review",
    title: "Monitores de estudio vs. parlantes normales: no es solo respuesta plana",
    caption: `¿Vas a mezclar con parlantes normales? No es solo que "mienten".

La diferencia real está en la respuesta de fase, la distorsión armónica, y la imagen estéreo. Un monitor de estudio te muestra lo que realmente grabaste. Un parlante normal te muestra lo que el fabricante quiere que escuches.

Desliza para entenderlo.`,
    cta: "Guarda si estás armando tu home studio",
    hashtags: ["#MonitoresDeEstudio", "#HomeStudio", "#Mezcla", "#ProduccionMusical", "#AudioProfesional", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #13. Corregido por Consejo #10: subir nivel técnico."
  });

  // ===== REELS (5) =====
  queue.push({
    id: "reel_01",
    channel: "instagram",
    format: "reel",
    status: "needs_review",
    title: "Recorrido del estudio en 30s",
    caption: "El espacio completo. Del ensayo al master en un mismo lugar.",
    cta: "Reserva por WhatsApp",
    hashtags: ["#TurpialSound", "#EstudioDeGrabacion", "#TourDelEstudio", "#Caracas"],
    sourceDoc: "05_calendar_30_days.md",
    notes: "Usar videoRRSS.webm o video del estudio."
  });

  queue.push({
    id: "reel_02",
    channel: "instagram",
    format: "reel",
    status: "needs_review",
    title: "3 cosas que hacen que tu listing venda más rápido",
    caption: `1. Fotos con luz natural — sin flash, sin fondo desordenado.
2. Precio justo — ni regalado ni inflado.
3. Descripción honesta — si tiene un rayón, dilo.

Publica en el marketplace. Link en bio.`,
    cta: "Link en bio para publicar tu listing",
    hashtags: ["#VenderInstrumentos", "#MarketplaceMusical", "#ConsejosDeVenta", "#TurpialSound"],
    sourceDoc: "06_posts_batch_01.md",
    notes: "Post #11. Reel con texto en pantalla."
  });

  queue.push({
    id: "reel_03",
    channel: "instagram",
    format: "reel",
    status: "needs_review",
    title: "Un día en Turpial — timelapse de sesión",
    caption: "Así se trabaja aquí. 11am Llega la banda. 11:30 Soundcheck. 1pm A grabar.",
    cta: "Reserva tu sesión por WhatsApp",
    hashtags: ["#DetrasDeCamaras", "#EstudioDeGrabacion", "#BTS", "#SesionDeGrabacion", "#TurpialSound"],
    sourceDoc: "05_calendar_30_days.md",
    notes: "Requiere permiso de cliente si aparecen personas."
  });

  queue.push({
    id: "reel_04",
    channel: "instagram",
    format: "reel",
    status: "needs_review",
    title: "Antes y después de la mezcla",
    caption: `5s de audio crudo → 10s de audio mezclado.

La diferencia se escucha. Reserva tu mezcla por WhatsApp.`,
    cta: "Reserva tu mezcla por WhatsApp",
    hashtags: ["#Mezcla", "#AntesYDespues", "#AudioProfesional", "#TurpialSound"],
    sourceDoc: "05_calendar_30_days.md",
    notes: "Alto riesgo si la diferencia no es dramática. Seleccionar caso notable."
  });

  queue.push({
    id: "reel_05",
    channel: "instagram",
    format: "reel",
    status: "needs_review",
    title: "¿Cómo armar tu home studio sin gastar de más?",
    caption: `No necesitas gastar miles de dólares para sonar bien.

Aquí 3 decisiones inteligentes para montar tu home studio con presupuesto realista.`,
    cta: "Guarda este reel y compártelo",
    hashtags: ["#HomeStudio", "#PresupuestoMusical", "#ProduccionMusical", "#ConsejosMusicales", "#TurpialSound"],
    sourceDoc: "council_correction_7",
    notes: "Nuevo reel sobre presupuesto. Consejo #7."
  });

  // ===== STORIES (5) =====
  queue.push({
    id: "story_01",
    channel: "instagram",
    format: "story",
    status: "needs_review",
    title: "¿Qué estás grabando ahora?",
    caption: "¿Qué estás grabando ahora? Banda / Solista / Productor",
    cta: "Encuesta interactiva + caja de preguntas",
    hashtags: [],
    sourceDoc: "05_calendar_30_days.md",
    notes: "3 stories: foto del estudio, encuesta, caja de preguntas. Sticker interactivo incluido (Consejo #6)."
  });

  queue.push({
    id: "story_02",
    channel: "instagram",
    format: "story",
    status: "needs_review",
    title: "Tips para vender equipo",
    caption: `¿Tienes equipo para vender?
Checklist rápido: fotos con luz natural, precio justo, descripción honesta, ubicación clara.
Publica en el marketplace.`,
    cta: "Sticker: ¿Qué equipo tienes para vender? + Link en bio",
    hashtags: [],
    sourceDoc: "05_calendar_30_days.md",
    notes: "3 stories con checklist. Sticker de pregunta incluido (Consejo #6)."
  });

  queue.push({
    id: "story_03",
    channel: "instagram",
    format: "story",
    status: "needs_review",
    title: "¿Micrófono dinámico o de condensador?",
    caption: `¿Qué micrófono necesitas?
1. Dinámico: batería, amplis, vivo.
2. Condensador: voces, acústicos, estudio.
¿Cuál usas más?`,
    cta: "Sticker encuesta: Dinámico / Condensador / Los dos",
    hashtags: [],
    sourceDoc: "05_calendar_30_days.md",
    notes: "3 stories educativas. Encuesta incluida (Consejo #6)."
  });

  queue.push({
    id: "story_04",
    channel: "instagram",
    format: "story",
    status: "needs_review",
    title: "Detrás de cámaras de mezcla",
    caption: `Así se ve una sesión de mezcla. ¿Produces tu propia música?`,
    cta: "Sticker encuesta: Sí / No / Estoy aprendiendo",
    hashtags: [],
    sourceDoc: "05_calendar_30_days.md",
    notes: "3 stories BTS. Encuesta incluida (Consejo #6)."
  });

  queue.push({
    id: "story_05",
    channel: "instagram",
    format: "story",
    status: "needs_review",
    title: "Gracias por este mes",
    caption: `Gracias por este primer mes. Se viene más.`,
    cta: "Sticker: ¿Qué contenido te gustó más? + agradecimiento",
    hashtags: [],
    sourceDoc: "05_calendar_30_days.md",
    notes: "3 stories de cierre. Repost de interacciones positivas. Encuesta incluida (Consejo #6)."
  });

  // ===== CARRUSELES EDUCATIVOS (3) =====
  // (ig_post_02, ig_post_04, ig_post_05, ig_post_07, ig_post_08, ig_post_10 are already carousels)

  // ===== DM/REPLY SUGGESTIONS (5) =====
  queue.push({
    id: "reply_01",
    channel: "instagram",
    format: "dm_reply",
    status: "needs_review",
    title: "Sugerencia: Pregunta de precio",
    caption: "Gracias por tu interés. Los precios varían según el proyecto. ¿Qué necesitas grabar, mezclar o producir? Escríbenos por WhatsApp y te damos un estimado sin compromiso.",
    cta: "Derivar a WhatsApp si hay interés",
    hashtags: [],
    sourceDoc: "responseBot",
    notes: "Sugerencia DM. NO envío automático."
  });

  queue.push({
    id: "reply_02",
    channel: "instagram",
    format: "dm_reply",
    status: "needs_review",
    title: "Sugerencia: Quiero comprar equipo",
    caption: "¡Genial! Tenemos un marketplace con equipos e instrumentos disponibles. Escríbenos por WhatsApp y te orientamos con lo que buscas. Link en la bio.",
    cta: "Derivar a WhatsApp",
    hashtags: [],
    sourceDoc: "responseBot",
    notes: "Sugerencia DM. NO envío automático."
  });

  queue.push({
    id: "reply_03",
    channel: "instagram",
    format: "dm_reply",
    status: "needs_review",
    title: "Sugerencia: Quiero vender equipo",
    caption: "¡Claro! Publicar tu equipo en el marketplace es gratis. La comisión es transparente: 5% solo si se vende. Escríbenos por WhatsApp y te ayudamos con el listing.",
    cta: "Derivar a WhatsApp",
    hashtags: [],
    sourceDoc: "responseBot",
    notes: "Sugerencia DM. Comisión corregida (Consejo #4)."
  });

  queue.push({
    id: "reply_04",
    channel: "instagram",
    format: "comment_reply",
    status: "needs_review",
    title: "Sugerencia: Quiero reservar sala",
    caption: "Tenemos salas de ensayo equipadas en Caracas. Cada sala tiene backline, acústica cuidada y espacio para banda completa. Escríbenos por WhatsApp para disponibilidad y reserva. Link en bio.",
    cta: "Derivar a WhatsApp",
    hashtags: [],
    sourceDoc: "responseBot",
    notes: "Sugerencia reply comentario. NO envío automático."
  });

  queue.push({
    id: "reply_05",
    channel: "instagram",
    format: "dm_reply",
    status: "needs_review",
    title: "Sugerencia: Reclamo o problema",
    caption: "Lamentamos cualquier inconveniente. Nuestro equipo revisa cada caso personalmente. Escríbenos por WhatsApp con los detalles de tu situación y lo resolvemos.",
    cta: "SIEMPRE derivar a humano. No respuesta automática.",
    hashtags: [],
    sourceDoc: "responseBot",
    notes: "Reclamo. SIEMPRE derivar a humano. Consejo #8."
  });

  return queue;
}

// Run safety validation on all items
function validateAndEnrich(queue) {
  const assets = loadAssetIndex();
  
  for (const item of queue) {
    const validation = validateItem(item);
    item.safetyFlags = validation.flags;
    item.riskLevel = validation.riskLevel;
    item.requiresHumanReview = validation.requiresHumanReview;

    // Match assets
    const match = matchAssetForPublication(item, assets);
    item.assetCandidates = [match.asset].filter(Boolean);
    item.selectedAsset = match.asset ? match.asset.path : "ASSET_REQUIRED";
    item.selectedAssetPublicUrl = match.publicUrl || null;
    item.requiresPublicUrlForLive = match.requiresPublicUrlForLive || false;

    if (!match.asset) {
      item.notes = (item.notes ? item.notes + " " : "") + "ASSET FALTANTE: sin asset asignado automáticamente.";
    }

    if (item.riskLevel === "high") {
      item.status = "needs_review";
      item.notes = (item.notes ? item.notes + " " : "") + "RIESGO ALTO: requiere revisión humana obligatoria.";
    }

    item.scheduledFor = null;
    item.updatedAt = new Date().toISOString();
  }

  return queue;
}

function main() {
  logger.info("Building publication queue...");
  let queue = buildPublicationQueue();
  queue = validateAndEnrich(queue);

  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
  logger.info(`Built queue with ${queue.length} items -> ${QUEUE_FILE}`);

  const stats = {
    total: queue.length,
    facebook: queue.filter((i) => i.channel === "facebook").length,
    instagramFeed: queue.filter((i) => i.channel === "instagram" && i.format === "feed").length,
    instagramCarousel: queue.filter((i) => i.format === "carousel").length,
    reels: queue.filter((i) => i.format === "reel").length,
    stories: queue.filter((i) => i.format === "story").length,
    repliesDm: queue.filter((i) => i.format === "dm_reply" || i.format === "comment_reply").length,
    needsReview: queue.filter((i) => i.status === "needs_review").length,
    needsAsset: queue.filter((i) => !i.selectedAsset || i.selectedAsset === "ASSET_REQUIRED").length,
    highRisk: queue.filter((i) => i.riskLevel === "high").length,
    mediumRisk: queue.filter((i) => i.riskLevel === "medium").length,
    lowRisk: queue.filter((i) => i.riskLevel === "low").length,
  };

  console.log("\nQueue Summary:");
  console.log(`  Total: ${stats.total}`);
  console.log(`  Facebook: ${stats.facebook}`);
  console.log(`  Instagram Feed: ${stats.instagramFeed}`);
  console.log(`  Instagram Carousels: ${stats.instagramCarousel}`);
  console.log(`  Reels: ${stats.reels}`);
  console.log(`  Stories: ${stats.stories}`);
  console.log(`  Replies/DM Suggestions: ${stats.repliesDm}`);
  console.log(`  Needs Review: ${stats.needsReview}`);
  console.log(`  Needs Asset: ${stats.needsAsset}`);
  console.log(`  High Risk: ${stats.highRisk}`);
  console.log(`  Medium Risk: ${stats.mediumRisk}`);
  console.log(`  Low Risk: ${stats.lowRisk}`);
}

main();
