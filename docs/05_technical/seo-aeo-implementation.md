# Turpial Sound — Implementación SEO & AEO (As-Built)

> Estado: **Implementado en App Router**
> Última actualización: 2026-04-01

## 1. Metadata API (App Router)
Implementado centralizadamente en `lib/metadata.ts`.
* **Factory function:** `generatePageMetadata()` se importa en cada `page.tsx` para inyectar un `<title>`, `<meta description>`, y los tags de OpenGraph y Twitter de forma automatizada.
* **Canonicals:** Cada página genera su etiqueta `rel="canonical"` apuntando a la URL absoluta del siteConfig.
* **Root Fallback:** `layout.tsx` incluye `rootMetadata` para proteger rutas que no declaren su propia metadata.

## 2. Schema Markup (JSON-LD Structuring)
Generadores tipados en `lib/schema.ts` para inyección directa como Server Components.
* **`Organization`**: Inyectado en `layout.tsx`. Declara a Turpial Sound como entidad global.
* **`LocalBusiness` (MusicVenue)**: Preparado para las páginas de Contacto y Home (requiere coordenadas GPS y horarios del cliente).
* **`Service`**: Inyectado en las Money Pages (Salas de ensayo, Producción Musical, Estudio de grabación) para vincular la oferta al área de servicio local (Caracas).
* **`BreadcrumbList`**: Generador implementado para orientar a los crawlers sobre la jerarquía del sitio.
* **`FAQPage`**: Estructura preguntas y respuestas en `/recursos/preguntas-frecuentes` optimizado para Answer Engine Optimization (AEO).

## 3. Crawlability
* `app/sitemap.ts`: Genera dinámicamente el `sitemap.xml` asignando prioridad (1.0 a money pages, 0.8 a servicios satélites).
* `app/robots.ts`: Instrucciones `Allow` globales.
* Rutas transaccionales (`/salas-de-ensayo`, etc.) se generan como páginas estáticas (SSG) por defecto para garantizar un TTFB ultra-rápido a los bots de indexación.