# Turpial Sound — KPI Dashboard Design (S-MK-02)

> Estado: **Investigación completada — Documento S-MK-02**
> Fecha: 2026-05-12
> Fuentes: docs/01_strategy/*, docs/marketplace/*, investigación de industria, mejores prácticas de analytics
> Versión: 1.0

---

## 1. Business KPIs — Ingresos y Conversión

### 1.1 Revenue (Ingresos)

| KPI | Definición | Frecuencia | Fuente | Target (12 meses) |
|-----|-----------|-----------|--------|-------------------|
| **Revenue Total** | Suma de todos los ingresos (booking + marketplace + B2B) | Diario, Semanal, Mensual | Sistema interno + Payment Gateway | $5,000–$9,000/mes |
| **Revenue por Booking** | Ingresos por reservas de salas/estudios | Semanal, Mensual | Sistema de reservas (`/reservas`) | $2,500–$5,000/mes |
| **Revenue por Servicio** | Ingresos desglosados: ensayo, grabación, producción, mezcla, podcast, locución | Mensual | Sistema de reservas | Según revenue mix (ver doc S-MK-01) |
| **Revenue por Marketplace** | Comisiones por transacciones de compra/venta | Semanal, Mensual | Sistema marketplace | $1,000–$3,000/mes |
| **Revenue por B2B** | Ingresos por contratos corporativos | Mensual, Trimestral | CRM / facturación | $500–$1,000/mes |
| **Revenue por Academia** | Ingresos por clases, workshops, consultorías | Mensual | Sistema de registro | $500–$1,000/mes |

**Alerta:** Revenue mensual < 70% del target → trigger amarillo. < 50% → trigger rojo.

### 1.2 Conversion Rate (Tasa de Conversión)

| KPI | Definición | Frecuencia | Fuente | Target (12 meses) |
|-----|-----------|-----------|--------|-------------------|
| **Visitante → Booking** | % de visitantes del sitio que completan una reserva | Semanal | GA4 + Sistema de reservas | 3–5% |
| **Visitante → Contacto WhatsApp** | % de visitantes que inician conversación por WhatsApp | Semanal | GA4 + WhatsApp Business API | 5–10% |
| **Visitante → Registro Marketplace** | % de visitantes que se registran en el marketplace | Semanal | GA4 + Sistema marketplace | 4–8% |
| **Visitante → Publicación (Seller)** | % de visitantes que publican un producto para vender | Semanal | GA4 + Sistema marketplace | 1–3% |
| **Visitante → Compra (Buyer)** | % de visitantes que completan una compra en marketplace | Semanal | GA4 + Sistema marketplace | 0.5–2% |
| **Reserva → Show** | % de reservas que efectivamente se presentan (no cancelan) | Mensual | Sistema de reservas | 85%+ |
| **Lead → Cliente cerrado** | % de leads B2B que se convierten en contrato | Mensual | CRM | 20–30% |

### 1.3 Average Ticket (Ticket Promedio)

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **Ticket promedio general** | Revenue total / número de transacciones | Mensual | Sistema interno | $100–$150 |
| **Ticket promedio — Ensayo** | Revenue ensayos / número de reservas de ensayo | Mensual | Sistema de reservas | $40–$80 |
| **Ticket promedio — Grabación** | Revenue grabación / número de sesiones | Mensual | Sistema de reservas | $150–$300 |
| **Ticket promedio — Producción** | Revenue producción / número de proyectos | Mensual | Sistema de reservas | $500–$2,000 |
| **Ticket promedio — Marketplace** | Revenue marketplace / número de transacciones | Mensual | Sistema marketplace | $80–$250 |
| **Ticket promedio — B2B** | Revenue B2B / número de contratos | Trimestral | CRM | $800–$5,000 |

### 1.4 CAC (Customer Acquisition Cost)

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **CAC Total** | Gasto total en marketing / número de nuevos clientes | Mensual | GA4 + Ad spend + Sistema interno | < $15 |
| **CAC — Orgánico** | (Costo de contenido + SEO) / clientes nuevos desde orgánico | Mensual | Estimado (tiempo equipo + herramientas) | < $5 |
| **CAC — Pagado** | Gasto en ads / clientes nuevos desde ads | Mensual | Google Ads + Meta Ads | < $20 |
| **CAC — Referido** | (Costo de programa de referidos) / clientes nuevos desde referidos | Mensual | Sistema de referidos | < $10 |
| **CAC — Social** | (Costo de gestión de redes) / clientes nuevos desde redes | Mensual | Estimado | < $8 |

**Cálculo de CAC inicial (meses 1–6):**
- Gasto en marketing digital proyectado: $200–$500/mes
- Clientes nuevos esperados desde canales digitales: 10–25/mes
- CAC estimado inicial: $20–$50 (fase de inversión en adquisición)
- CAC objetivo a 12 meses: < $15

### 1.5 LTV (Lifetime Value)

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **LTV — Cliente recurrente** | Ticket promedio × número de sesiones/año × años de relación | Anual | Histórico de reservas | $600–$2,400 |
| **LTV — Artista/Banda** | Valor total de un artista/banda durante la relación con el estudio | Anual | Histórico de reservas | $1,200–$5,000 |
| **LTV — Seller Marketplace** | Comisiones totales generadas por un vendedor recurrente | Anual | Sistema marketplace | $50–$200 |
| **LTV — Buyer Marketplace** | Comisiones totales generadas por un comprador recurrente | Anual | Sistema marketplace | $30–$120 |
| **LTV — Cliente B2B** | Valor total de un contrato corporativo (incluyendo renovaciones) | Anual | CRM | $2,000–$15,000 |

**Ratio LTV:CAC objetivo:** > 3:1 (es decir, cada $1 invertido en adquirir un cliente debe retornar al menos $3).

### 1.6 Churn / Retención

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **Tasa de retención (30 días)** | % de clientes que vuelven dentro de 30 días | Mensual | Sistema de reservas | > 30% |
| **Tasa de retención (90 días)** | % de clientes que vuelven dentro de 90 días | Trimestral | Sistema de reservas | > 40% |
| **Tasa de retención (12 meses)** | % de clientes activos que siguen reservando a 12 meses | Anual | Sistema de reservas | > 25% |
| **Clientes recurrentes** | % de reservas que provienen de clientes que ya han reservado antes | Mensual | Sistema de reservas | > 40% |
| **Churn rate mensual** | % de clientes activos que dejan de reservar en un mes dado | Mensual | Sistema de reservas | < 15% |

---

## 2. Technical KPIs — Rendimiento y Confiabilidad

### 2.1 Uptime & Availability

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **Uptime — Web** | % de tiempo que el sitio está disponible | Diario (24/7) | Vercel Analytics / UptimeRobot | > 99.5% |
| **Uptime — API** | % de tiempo que las APIs responden correctamente | Diario (24/7) | Vercel Analytics / Health checks | > 99.5% |
| **Uptime — Marketplace** | % de tiempo que el marketplace está operativo | Diario (24/7) | Vercel Analytics | > 99.5% |
| **Uptime — Base de datos** | % de tiempo que Supabase/Prisma responde sin errores | Diario (24/7) | Supabase Dashboard | > 99.9% |
| **Tiempo de recuperación (MTTR)** | Tiempo promedio desde incidente hasta resolución | Por incidente | Sistema de monitoreo | < 30 min |

**Alerta:** Uptime < 99.0% → trigger amarillo. Uptime < 97.0% → trigger rojo.

### 2.2 Performance Metrics

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **LCP (Largest Contentful Paint)** | Tiempo de carga del elemento más grande visible | Semanal | Google PageSpeed Insights / Lighthouse | < 2.5s |
| **FID (First Input Delay)** | Tiempo de respuesta a la primera interacción del usuario | Semanal | Google PageSpeed Insights / Lighthouse | < 100ms |
| **CLS (Cumulative Layout Shift)** | Estabilidad visual durante la carga | Semanal | Google PageSpeed Insights / Lighthouse | < 0.1 |
| **TTFB (Time to First Byte)** | Tiempo de respuesta del servidor | Semanal | Vercel Analytics | < 600ms |
| **Core Web Vitals — Pasa** | % de páginas que pasan los Core Web Vitals de Google | Mensual | Google Search Console | > 90% |
| **Peso promedio de página** | Tamaño total de la página cargada | Mensual | Lighthouse / GA4 | < 1.5 MB |

### 2.3 Error Rates

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **Tasa de error 4xx** | % de requests que resultan en error de cliente (404, 403, etc.) | Semanal | Vercel / Supabase logs | < 2% |
| **Tasa de error 5xx** | % de requests que resultan en error de servidor | Semanal | Vercel / Supabase logs | < 0.5% |
| **Errores en booking** | % de intentos de reserva que fallan por error técnico | Semanal | Sistema de reservas | < 1% |
| **Errores en pago** | % de intentos de pago que fallan (excluyendo fondos insuficientes) | Semanal | Payment Gateway / Binance | < 2% |
| **Errores en marketplace** | % de transacciones de marketplace que fallan | Semanal | Sistema marketplace | < 2% |

### 2.4 Flow Completion Rates

| KPI | Definición | Frecuencia | Fuente | Target |
|-----|-----------|-----------|--------|--------|
| **Completación — Booking flow** | % de usuarios que inician el booking y lo completan | Semanal | GA4 + Sistema de reservas | > 60% |
| **Completación — Purchase flow** | % de usuarios que inician una compra y la completan | Semanal | GA4 + Sistema marketplace | > 50% |
| **Completación — Payment proof** | % de comprobantes de pago subidos correctamente | Semanal | Sistema de payment proof | > 90% |
| **Completación — Seller listing** | % de usuarios que inician la publicación de un producto y la completan | Semanal | Sistema marketplace | > 70% |
| **Completación — Registro** | % de usuarios que inician registro y lo completan | Semanal | Sistema de auth | > 80% |
| **Tasa de abandono — Booking** | % de usuarios que abandonan el booking a mitad del proceso | Semanal | GA4 + Sistema de reservas | < 40% |

---

## 3. Marketing KPIs — Adquisición y Engagement

### 3.1 Traffic (Tráfico)

| KPI | Definición | Frecuencia | Fuente | Target (12 meses) |
|-----|-----------|-----------|--------|-------------------|
| **Usuarios totales** | Visitantes únicos al sitio | Semanal, Mensual | GA4 | 3,000–8,000/mes |
| **Sesiones totales** | Visitas totales (incluyendo retornos) | Semanal, Mensual | GA4 | 5,000–12,000/mes |
| **Pageviews** | Páginas vistas totales | Semanal, Mensual | GA4 | 15,000–35,000/mes |
| **Tráfico orgánico** | Visitantes desde buscadores (Google, Bing) | Semanal, Mensual | GA4 / Search Console | 40–50% del total |
| **Tráfico directo** | Visitantes que escriben la URL directamente | Mensual | GA4 | 20–25% del total |
| **Tráfico social** | Visitantes desde Instagram, Facebook, TikTok, YouTube | Mensual | GA4 | 20–30% del total |
| **Tráfico referral** | Visitantes desde otros sitios web | Mensual | GA4 | 5–10% del total |
| **Tráfico pagado** | Visitantes desde Google Ads / Meta Ads | Mensual | GA4 | 5–10% del total (cuando activo) |
| **Tráfico mobile** | % de tráfico desde dispositivos móviles | Mensual | GA4 | 70–80% |
| **Sesiones por usuario** | Promedio de veces que un usuario visita el sitio | Mensual | GA4 | 1.5–2.5 |

### 3.2 SEO Performance

| KPI | Definición | Frecuencia | Fuente | Target (12 meses) |
|-----|-----------|-----------|--------|-------------------|
| **Impresiones totales** | Veces que el sitio aparece en resultados de búsqueda | Semanal, Mensual | Google Search Console | 50,000–150,000/mes |
| **Clicks totales** | Clicks desde resultados de búsqueda al sitio | Semanal, Mensual | Google Search Console | 2,000–8,000/mes |
| **CTR promedio** | Click-through rate desde búsquedas | Mensual | Google Search Console | 3–6% |
| **Posición promedio** | Posición promedio en resultados de búsqueda | Mensual | Google Search Console | < 15 |
| **Keywords en top 3** | # de keywords objetivo en posiciones 1–3 | Mensual | Search Console / Ahrefs | 5–10 |
| **Keywords en top 10** | # de keywords objetivo en posiciones 1–10 | Mensual | Search Console / Ahrefs | 15–30 |
| **Keywords indexadas** | # total de keywords por las que el sitio aparece | Mensual | Google Search Console | 500–2,000 |
| **Páginas indexadas** | # de páginas del sitio indexadas en Google | Mensual | Google Search Console | 50–200 |
| **Backlinks** | # de enlaces externos apuntando al sitio | Trimestral | Ahrefs / Google Search Console | 20–100 |

**Keywords prioritarias a monitorear:**
1. "estudio de grabación en Caracas"
2. "sala de ensayo en Caracas"
3. "producción musical en Caracas"
4. "mezcla y masterización en Caracas"
5. "grabación de podcast en Caracas"
6. "estudio de locución en Caracas"
7. "marketplace instrumentos musicales Venezuela"
8. "comprar instrumentos musicales Caracas"
9. "Turpial Sound"

### 3.3 Social Media Engagement

| KPI | Definición | Frecuencia | Fuente | Target (12 meses) |
|-----|-----------|-----------|--------|-------------------|
| **Seguidores Instagram** | # total de seguidores | Mensual | Instagram Insights | 2,000–5,000 |
| **Engagement Rate Instagram** | (Likes + Comments + Shares + Saves) / Alcance | Mensual | Instagram Insights | 3–6% |
| **Alcance Instagram** | # de cuentas únicas alcanzadas | Mensual | Instagram Insights | 5,000–15,000/mes |
| **Clicks al sitio desde Instagram** | # de taps en el link de la bio | Mensual | Instagram Insights / GA4 | 200–800/mes |
| **Seguidores YouTube** | # total de suscriptores | Mensual | YouTube Studio | 200–1,000 |
| **Vistas YouTube** | # total de reproducciones | Mensual | YouTube Studio | 1,000–5,000/mes |
| **Seguidores TikTok** | # total de seguidores (si se activa) | Mensual | TikTok Analytics | 500–3,000 |
| **Mensajes WhatsApp Business** | # de conversaciones iniciadas por mes | Mensual | WhatsApp Business API | 100–300/mes |
| **Tasa de respuesta WhatsApp** | % de mensajes respondidos en < 30 min | Semanal | WhatsApp Business API | > 90% |

### 3.4 Google Business Profile

| KPI | Definición | Frecuencia | Fuente | Target (12 meses) |
|-----|-----------|-----------|--------|-------------------|
| **Vistas totales** | Veces que el perfil aparece en búsqueda o maps | Mensual | Google Business Profile | 5,000–20,000/mes |
| **Búsquedas directas** | Usuarios que buscan "Turpial Sound" directamente | Mensual | Google Business Profile | 500–2,000/mes |
| **Búsquedas por descubrimiento** | Usuarios que encuentran el perfil buscando categoría/servicio | Mensual | Google Business Profile | 3,000–12,000/mes |
| **Clicks al sitio** | Clicks desde GBP al sitio web | Mensual | Google Business Profile | 300–1,500/mes |
| **Clicks para llamar** | Toques en el botón de llamada | Mensual | Google Business Profile | 50–200/mes |
| **Solicitudes de dirección** | Usuarios que piden indicaciones para llegar | Mensual | Google Business Profile | 100–400/mes |
| **Reseñas totales** | # acumulado de reseñas en GBP | Mensual | Google Business Profile | 50–200 |
| **Calificación promedio** | Estrellas promedio (1–5) | Mensual | Google Business Profile | > 4.5 |
| **Fotos subidas** | # de fotos en el perfil (propias + clientes) | Mensual | Google Business Profile | 30–100 |

---

## 4. Dashboard Architecture

### 4.1 Fuentes de Datos y Método de Integración

```
┌─────────────────────────────────────────────────────────────────┐
│                   TURPIAL SOUND KPI DASHBOARD                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Google       │  │ Google Search│  │ Google Business      │  │
│  │ Analytics 4  │  │ Console      │  │ Profile              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │               │
│         ▼                 ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Google Looker Studio                     │   │
│  │              (Dashboard principal — gratuito)             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                     ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Sistema de   │  │ Sistema      │  │ Base de datos        │  │
│  │ Reservas     │  │ Marketplace  │  │ (Supabase/Prisma)    │  │
│  │ (Interno)    │  │ (Interno)    │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │               │
│         ▼                 ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                API Interna / Webhooks                     │   │
│  │          (Datos de negocio → Google Sheets)               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Google Sheets (Data Warehouse Lite)          │   │
│  │   - Revenue diario/semanal/mensual                        │   │
│  │   - Reservas y conversiones                               │   │
│  │   - Transacciones marketplace                             │   │
│  │   - CAC, LTV, Churn                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         ADMIN COPILOT BI (Fase futura — marketplace)      │   │
│  │    Consultas en lenguaje natural sobre KPIs de negocio    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Herramientas Recomendadas (Free/Low-Cost para Contexto Venezuela)

| Herramienta | Uso | Costo | Prioridad |
|-------------|-----|-------|-----------|
| **Google Analytics 4** | Analytics de tráfico, conversiones, eventos | Gratuito | Crítica |
| **Google Search Console** | SEO: impresiones, clicks, posición, indexación | Gratuito | Crítica |
| **Google Business Profile** | Presencia local, reseñas, vistas, interacciones | Gratuito | Crítica |
| **Google Looker Studio** | Dashboard visual unificado (conecta GA4, GSC, Sheets) | Gratuito | Crítica |
| **Google Sheets** | Almacén de datos de negocio, KPIs calculados | Gratuito | Alta |
| **Google Tag Manager** | Gestión de tags de tracking sin tocar código | Gratuito | Alta |
| **Microsoft Clarity** | Heatmaps, grabaciones de sesiones, rage clicks | Gratuito | Media |
| **UptimeRobot** | Monitoreo de uptime (50 monitores, 5-min intervalos) | Gratuito | Media |
| **WhatsApp Business API** | Analítica de conversaciones, tasa de respuesta | Gratuito (limitado) | Media |
| **Meta Business Suite** | Analítica de Instagram y Facebook | Gratuito | Media |
| **YouTube Studio** | Analítica del canal de YouTube | Gratuito | Baja (hasta activar canal) |
| **TikTok Analytics** | Analítica de TikTok (si se activa cuenta) | Gratuito | Baja (futuro) |
| **Ahrefs Webmaster Tools** | Monitoreo de backlinks y keywords (limitado) | Gratuito | Media |
| **Sistema de Reservas (interno)** | Datos de booking, revenue, ocupación | Desarrollo interno | Crítica |
| **Sistema Marketplace (interno)** | Datos de transacciones, comisiones, usuarios | Desarrollo interno | Crítica |

### 4.3 Sistema de Alertas

| Alerta | Condición | Severidad | Canal |
|--------|-----------|-----------|-------|
| **Revenue bajo mínimo** | Revenue mensual < 50% del target | Crítica (roja) | WhatsApp grupo directivo |
| **Revenue bajo esperado** | Revenue mensual < 70% del target | Advertencia (amarilla) | Email / Slack |
| **Downtime** | Sitio caído > 5 minutos | Crítica (roja) | WhatsApp grupo técnico |
| **Error rate alto** | Tasa de error 5xx > 2% en 1 hora | Crítica (roja) | WhatsApp grupo técnico |
| **Booking fallido** | > 3 intentos de reserva fallidos en 1 día | Alta | Email / Slack |
| **Pago fallido** | > 5 pagos fallidos en 1 día | Alta | Email / Slack |
| **Caída de tráfico** | Tráfico diario cae > 40% vs. semana anterior | Advertencia (amarilla) | Email |
| **Caída de posición SEO** | Keyword principal cae > 5 posiciones | Advertencia (amarilla) | Email / Slack |
| **Reseña negativa** | Nueva reseña de 1–2 estrellas en Google | Alta | WhatsApp grupo directivo |
| **Sin actividad social** | 7 días sin post en Instagram | Advertencia (amarilla) | Recordatorio interno |
| **LTV:CAC bajo** | Ratio LTV:CAC < 2:1 en ventana de 3 meses | Advertencia (amarilla) | Email |
| **Churn alto** | Churn mensual > 25% | Advertencia (amarilla) | Email |

**Implementación de alertas:**
- **Fase 1 (inmediata):** Alertas manuales — revisión semanal de Looker Studio por responsable de marketing
- **Fase 2 (3–6 meses):** Alertas automáticas vía Google Sheets + Apps Script → notificaciones por email
- **Fase 3 (6–12 meses):** Webhooks desde sistema interno + integración con WhatsApp Business API para alertas críticas

### 4.4 Frecuencia de Revisión

| Revisión | Frecuencia | Responsable | Enfoque |
|----------|-----------|-------------|---------|
| **Daily Standup** | Diario | Equipo técnico | Uptime, errores, anomalías de tráfico |
| **Weekly Marketing Review** | Semanal | Marketing / Manuel Vera | Tráfico, conversión, SEO, social media, campañas |
| **Monthly Business Review** | Mensual | Frank Lemus + Susej Vera + Manuel Vera | Revenue, CAC, LTV, churn, marketplace |
| **Quarterly Strategy Review** | Trimestral | Dirección | Tendencias, ajustes de estrategia, proyecciones |

---

## 5. Visual Framework — Wireframe del Dashboard

### 5.1 Layout Recomendado (Looker Studio)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TURPIAL SOUND — KPI DASHBOARD                          Período: [MENSUAL]│
│  Actualizado: DD/MM/YYYY HH:MM                           ▼ Filtros       │
├──────────┬──────────┬──────────┬──────────┬──────────┬───────────────────┤
│ REVENUE  │BOOKINGS  │ CONV %   │AVG TICKET│ MARKETP. │ UPTIME            │
│ TOTAL    │DEL MES   │ SITIO    │          │ REVENUE  │                   │
│ $X,XXX   │   XXX    │  X.X%    │  $XXX    │  $XXX    │  99.X%            │
│ ▲/▼X% vs │ ▲/▼X% vs │ ▲/▼ vs   │ ▲/▼ vs   │ ▲/▼ vs   │ ●●●○○            │
│ mes ant  │ mes ant  │ mes ant  │ mes ant  │ mes ant  │                   │
├──────────┴──────────┴──────────┴──────────┴──────────┴───────────────────┤
│                                                                           │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │ REVENUE POR SERVICIO (BARRAS)   │  │ TRÁFICO POR CANAL (DONUT)      │ │
│  │ Ensayo ████████████ $X,XXX      │  │ ● Orgánico    XX%              │ │
│  │ Grabac ██████████   $X,XXX      │  │ ● Directo     XX%              │ │
│  │ Prod   ██████       $X,XXX      │  │ ● Social      XX%              │ │
│  │ Market █████        $X,XXX      │  │ ● Referral    XX%              │ │
│  │ Mix    ████         $XXX        │  │ ● Pagado      XX%              │ │
│  │ Podcast███          $XXX        │  │                                │ │
│  └─────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │ CONVERSIÓN POR FLUJO (FUNNEL)   │  │ KEYWORDS TOP 10 (TABLA)        │ │
│  │ Visitantes        X,XXX ████████│  │ # │ Keyword         │Pos│Clicks │ │
│  │ → Página servicio X,XXX ██████  │  │ 1 │estudio grab...  │ 1 │ XXX   │ │
│  │ → CTA click         XXX ████    │  │ 2 │sala ensayo...   │ 3 │ XXX   │ │
│  │ → Booking iniciado   XX ███     │  │ 3 │producción...    │ 2 │ XXX   │ │
│  │ → Booking completado XX ██      │  │ 4 │mezcla Caracas   │ 5 │ XXX   │ │
│  │ → Show               XX █       │  │ 5 │podcast studio...│ 4 │ XXX   │ │
│  └─────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │ TENDENCIA DE REVENUE (LÍNEA)    │  │ GOOGLE BUSINESS (MÉTRICAS)     │ │
│  │  6 meses, por servicio          │  │ Vistas:    X,XXX/mes            │ │
│  │  ╱╲    ╱╲                       │  │ Clicks:    XXX/mes              │ │
│  │ ╱  ╲╱╱  ╲╱╲                     │  │ Llamadas:  XXX/mes              │ │
│  │╱          ╲                     │  │ Reseñas:   XXX (★X.X)           │ │
│  └─────────────────────────────────┘  └─────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │ ALERTAS ACTIVAS                                        [VER TODAS]   │ │
│  │ ⚠ Revenue mensual bajo 70% del target — contactar responsable        │ │
│  │ ✓ Uptime 99.7% — dentro de parámetros                                │ │
│  │ ⚠ Booking: 3 fallos técnicos en últimas 24h — revisar logs           │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│  MARKETPLACE KPIs                                                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┐ │
│  │LISTINGS  │TRANSACC. │COMISIONES│SELLERS   │BUYERS    │DISPUTAS       │ │
│  │ACTIVOS   │DEL MES   │DEL MES   │ACTIVOS   │ACTIVOS   │ABIERTAS       │ │
│  │   XXX    │   XXX    │  $XXX    │   XXX    │   XXX    │    X          │ │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴───────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Tipos de Gráfico Recomendados por Métrica

| Métrica | Tipo de Gráfico | Razón |
|---------|----------------|-------|
| Revenue total | **Scorecard (KPI)** | Valor único con comparación vs. período anterior |
| Revenue por servicio | **Bar Chart horizontal** | Comparar categorías fácilmente |
| Revenue trend | **Line Chart** | Visualizar tendencia temporal |
| Tráfico por canal | **Donut Chart** | Mostrar proporciones del total |
| Tráfico total trend | **Area Chart** | Acumulación y tendencia |
| Conversion funnel | **Funnel Chart** | Visualizar caída en cada paso |
| Keywords ranking | **Table con heatmap** | Datos precisos con color condicional |
| Posición promedio | **Line Chart invertido** | Que "bajar" visualmente sea bueno |
| Google Business métricas | **Scorecards + Line** | KPIs numéricos con tendencia |
| CAC / LTV | **Scorecard + Bar** | Comparación lado a lado |
| Uptime | **Gauge / Scorecard** | Indicador binario (OK/No OK) |
| Top páginas | **Table ordenada** | Ranking por tráfico |
| Errores | **Column Chart** | Identificar picos de error |
| Social engagement | **Line Chart multi-serie** | Comparar plataformas |
| Marketplace listings | **Bar Chart por categoría** | Distribución de productos |

### 5.3 Sistema de Color Coding

| Estado | Color | Código Hex | Condición |
|--------|-------|-----------|-----------|
| **On Track (Verde)** | Verde esmeralda | `#10B981` | KPI ≥ 90% del target |
| **Warning (Amarillo)** | Ámbar | `#F59E0B` | KPI entre 70–90% del target |
| **Critical (Rojo)** | Rojo coral | `#EF4444` | KPI < 70% del target |
| **Neutral** | Gris azulado | `#6B7280` | KPI informativo sin target |
| **Background** | Gris muy oscuro | `#1A1A2E` | Fondo del dashboard |
| **Card Background** | Gris oscuro | `#16213E` | Fondo de tarjetas |
| **Text Primary** | Blanco | `#FFFFFF` | Texto principal |
| **Text Secondary** | Gris claro | `#9CA3AF` | Texto secundario / labels |

**Reglas de aplicación:**
- Scorecards principales deben usar el color condicional según el estado del KPI
- Flechas de tendencia: ▲ verde si mejora, ▼ roja si empeora
- Líneas de gráficos usar colores de marca (turquesa, coral) para consistencia visual
- Funnel de conversión: el color se degrada de verde (top) a rojo si la caída es mayor al 50%

### 5.4 KPIs Prioritarios "Above the Fold"

Los siguientes KPIs deben ser visibles sin scroll en cualquier dispositivo:

1. **Revenue Total** (mes actual)
2. **Bookings del mes**
3. **Tasa de Conversión** (visitante → booking)
4. **Ticket Promedio**
5. **Uptime** (últimas 24h)

### 5.5 Filtros Recomendados

- **Período:** Hoy / Ayer / Últimos 7 días / Últimos 30 días / Este mes / Mes anterior / Personalizado
- **Servicio:** Todos / Ensayo / Grabación / Producción / Mezcla / Podcast / Marketplace / B2B
- **Fuente de tráfico:** Todas / Orgánico / Directo / Social / Referral / Pagado
- **Dispositivo:** Todos / Desktop / Mobile / Tablet

---

## 6. Roadmap de Implementación del Dashboard

### Fase 1: Fundación (Semanas 1–2)
- [ ] Instalar y configurar Google Analytics 4 (GA4) en todas las páginas del sitio
- [ ] Configurar Google Tag Manager (GTM)
- [ ] Implementar eventos de conversión en GTM:
  - `booking_started` — usuario inicia flujo de reserva
  - `booking_completed` — usuario completa reserva
  - `whatsapp_click` — click en botón de WhatsApp
  - `marketplace_registration` — registro en marketplace
  - `marketplace_listing_created` — publicación de producto
  - `marketplace_purchase_initiated` — inicio de compra
  - `marketplace_purchase_completed` — compra completada
  - `b2b_contact_form` — envío de formulario B2B
- [ ] Verificar Search Console conectado y recibiendo datos
- [ ] Completar Google Business Profile al 100%

### Fase 2: Dashboard Base (Semanas 3–4)
- [ ] Crear Looker Studio dashboard con fuentes: GA4, Search Console, Google Sheets
- [ ] Configurar hoja de Google Sheets para revenue (actualización manual inicial)
- [ ] Crear visualizaciones base: revenue, tráfico, conversiones, keywords
- [ ] Configurar color coding condicional

### Fase 3: Integración de Datos Internos (Semanas 5–8)
- [ ] Crear API endpoint para exportar datos de reservas a Google Sheets
- [ ] Crear API endpoint para exportar datos de marketplace a Google Sheets
- [ ] Automatizar actualización diaria de datos vía cron job o webhook
- [ ] Agregar métricas de negocio (CAC, LTV, churn) al dashboard

### Fase 4: Alertas y Monitoreo (Semanas 9–12)
- [ ] Configurar UptimeRobot para monitoreo 24/7
- [ ] Implementar Google Apps Script para alertas automáticas desde Sheets
- [ ] Configurar notificaciones de WhatsApp para alertas críticas (futuro)
- [ ] Documentar protocolo de respuesta a cada tipo de alerta

### Fase 5: Optimización Continua (Mensual)
- [ ] Revisión mensual de KPIs y ajuste de targets
- [ ] Añadir nuevos KPIs según necesidades del negocio
- [ ] Integrar nuevas fuentes de datos (YouTube, TikTok, WhatsApp Business)
- [ ] Evolucionar hacia Admin Copilot BI (consultas en lenguaje natural)

---

## 7. Fuentes y Referencias

| Fuente | Tipo | Dato utilizado |
|--------|------|----------------|
| `docs/01_strategy/offers-and-economics.md` | Interna | Estructura de oferta, ticket promedio ($100), CTA principal |
| `docs/01_strategy/market-positioning.md` | Interna | Keywords a dominar, nicho de mercado |
| `docs/01_strategy/customer-profiles.md` | Interna | Perfiles de cliente, canales de llegada |
| `docs/marketplace/ADMIN_COPILOT_BI_ROADMAP.md` | Interna | Futuro BI para marketplace |
| `docs/marketplace/01_ROADMAP_AND_STATUS.md` | Interna | Estado del marketplace, sprints |
| `docs/obsidian-vault/ESTADO_NEGOCIO_TURPIAL_2026-05-10.md` | Interna | Frentes de negocio activos (booking + marketplace) |
| Google Analytics 4 Documentation | Externa | Métricas estándar, eventos recomendados |
| Google Looker Studio Documentation | Externa | Capacidades de dashboard, conectores |
| Google Search Console API | Externa | Métricas de SEO disponibles |
| Core Web Vitals (web.dev) | Externa | Umbrales de performance recomendados |
| Mejores prácticas de SaaS analytics | Externa | CAC, LTV, churn, cohortes |
