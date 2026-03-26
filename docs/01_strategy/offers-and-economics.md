---
# Turpial Sound — Offers and Economics

> Estado: **Fase 1 en consolidación — estructura confirmada, cifras y jerarquía pendientes de validación.**
> Última actualización: 2026-03-26
> Fuente base: `turpial_sound_control_point_01.md` + cuestionario maestro de intake

---

## Leyenda de estado por campo

- **[CONFIRMADO]** — dato validado por el cliente en el proceso de intake
- **[SUGERIDO]** — propuesta estratégica coherente con el negocio declarado; requiere aprobación del cliente
- **[CLIENT_REQUIRED]** — dato que solo puede venir del cliente; bloquea producción si no se resuelve

---

## 1. Modelo de negocio

| Campo | Valor | Estado |
|-------|-------|--------|
| Modelo de negocio | B2B y B2C | [CONFIRMADO] |
| Segmento B2C principal | artistas independientes, bandas, creadores de contenido | [CONFIRMADO] |
| Segmento B2B principal | productoras, sellos, marcas, agencias, empresas con necesidades de locución/podcast | [SUGERIDO — consistent con oferta declarada] |

---

## 2. Oferta núcleo

Estas tres líneas son las de mayor volumen, mayor frecuencia y mayor visibilidad para el frente público.

| # | Servicio | Descripción operativa | Estado |
|---|----------|-----------------------|--------|
| 1 | Salas de ensayo | Espacios equipados para bandas y proyectos musicales en diferentes modalidades de tarifa | [CONFIRMADO] |
| 2 | Estudio de grabación | Sesiones de grabación profesional con equipamiento y soporte técnico | [CONFIRMADO] |
| 3 | Producción musical | Desarrollo integral de proyectos: arreglos, grabación, mezcla y entrega | [CONFIRMADO] |

---

## 3. Oferta expandida

Estas líneas complementan la oferta núcleo y amplían los segmentos de mercado atendidos.

| # | Servicio | Estado |
|---|----------|--------|
| 4 | Mezcla y masterización | [CONFIRMADO] |
| 5 | Arreglos musicales | [CONFIRMADO] |
| 6 | Grabación de instrumentos o secciones | [CONFIRMADO] |
| 7 | Podcast y locución | [CONFIRMADO] |
| 8 | Video studio session | [CONFIRMADO] |
| 9 | Consultoría / clases de producción | [CONFIRMADO] |

---

## 4. Jerarquía editorial de la oferta para el sitio web

### Propuesta de ordenamiento
> [SUGERIDO]

**Capa 1 — Money pages (prioridad máxima en sitio):**
- Salas de ensayo
- Estudio de grabación
- Producción musical

**Capa 2 — Servicios satélite (páginas de detalle o secciones):**
- Mezcla y masterización
- Podcast y locución
- Video studio session

**Capa 3 — Servicios complementarios (referenciados desde otras páginas o FAQ):**
- Arreglos musicales
- Grabación de instrumentos/secciones
- Consultoría / clases de producción

**Razón:** el sitio no puede vender todo por igual; la jerarquía garantiza que el usuario conozca primero la oferta de mayor valor y mayor demanda, y luego descubra el resto.

**Pendiente de validación:** confirmar con el cliente si esta jerarquía refleja correctamente qué genera más ingresos reales.

---

## 5. Estructura de tarifas

| Campo | Valor | Estado |
|-------|-------|--------|
| Ticket promedio base | ~100 USD | [CONFIRMADO] |
| Modalidades de tarifa de salas | flexible, premium, prioritaria (mencionadas por el cliente) | [CONFIRMADO como referencia; detalles de precios no disponibles] |
| Precios por servicio | CLIENT_REQUIRED — tabla completa con precios actuales |
| Paquetes disponibles | CLIENT_REQUIRED — detalles de paquetes si existen |
| Depósito o anticipo requerido | CLIENT_REQUIRED |
| Política de cancelación y reprogramación | CLIENT_REQUIRED |
| Moneda de cobro | USD | [CONFIRMADO implícitamente por "ticket promedio 100 USD"] |
| Métodos de pago aceptados | CLIENT_REQUIRED |

---

## 6. Conversión y prioridad comercial

| Campo | Propuesta | Estado |
|-------|-----------|--------|
| CTA principal | Reservar por WhatsApp | [SUGERIDO — pendiente confirmación del cliente] |
| CTA alternativo desktop | Consultar disponibilidad | [SUGERIDO] |
| Conversión de mayor valor | Reserva confirmada de sala/estudio premium o solicitud calificada de producción musical integral | [SUGERIDO] |
| Conversión secundaria | Lead de podcast/locución o video session | [SUGERIDO] |
| Objetivo del sitio en una frase | Convertir la autoridad y reputación offline de Turpial Sound en reservas, consultas calificadas y cierre comercial para salas, estudios y servicios de producción | [SUGERIDO — pendiente aprobación] |

---

## 7. Métricas de éxito sugeridas a 90 días

> [SUGERIDO — basadas en el modelo de negocio y los objetivos declarados]

- Aumento mensurable en consultas calificadas vía WhatsApp o formulario web
- Aumento en reservas originadas desde el sitio (atribuibles, aunque sea por declaración del usuario)
- Crecimiento en búsquedas de marca en Search Console
- Indexación de páginas core y FAQ dentro del primer mes de publicación
- Aparición en búsquedas locales: "estudio de grabación en Caracas", "sala de ensayo Caracas", "producción musical Caracas"
- Primeros leads orgánicos no dependientes de RRSS ni recomendación informal

**Pendiente:** acordar qué métrica es la número uno para el cliente, y cómo se medirá si no existe GA4 activo.

---

## 8. Riesgos operativos conocidos de la oferta

| Riesgo | Descripción | Acción recomendada |
|--------|-------------|-------------------|
| Oferta dispersa | muchos servicios sin jerarquía pueden confundir al usuario | Aplicar la jerarquía de 3 capas; cada servicio tiene su lugar |
| Precios no publicados | si el cliente no quiere publicar tarifas, se necesita un sistema alternativo de conversión | Decidir si se publica rango, precio base o se oculta con CTA directo |
| Canal WhatsApp como única conversión | si WhatsApp no tiene respuesta rápida, se pierden oportunidades | Confirmar SLA de respuesta o complementar con formulario o reserva online |

---

## 9. Criterios pendientes para cerrar este documento

- [ ] Confirmar jerarquía real de servicios por ingresos
- [ ] Confirmar CTA principal (WhatsApp / disponibilidad / formulario)
- [ ] Confirmar si se publicarán tarifas o rangos en el sitio
- [ ] Proveer tabla de precios y paquetes actuales (para uso interno; puede no publicarse completa)
- [ ] Confirmar política de cancelación/reprogramación (para FAQ y conversión)
- [ ] Confirmar métodos de pago
