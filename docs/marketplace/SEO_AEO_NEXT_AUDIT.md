# SEO/AEO Audit: Marketplace de Turpial Sound

## 1. Estado Actual (SEO/AEO cubierto)
- **Metadata Base:** Implementada vía `generatePageMetadata` en `app/marketplace/page.tsx`.
- **Rutas Dinámicas:** Implementadas para listings en `app/marketplace/[slug]/page.tsx` con soporte para metadata dinámica (title, description, canonical).
- **Estructura JSON-LD (CollectionPage):** Presente en la página principal del marketplace.
- **Estructura JSON-LD (ItemPage):** Implementada en `app/marketplace/[slug]/page.tsx` para cada listado.
- **Breadcrumbs (Schema):** Implementados en ambos niveles (collection y item).
- **Sitemap:** Configurado en `app/sitemap.ts`, cubriendo páginas estáticas principales.

## 2. Hallazgos (Brechas Detectadas)

### P0 (Crítico - Bloqueo de Indexación)
- Ninguno detectado. Las páginas están renderizadas y son alcanzables.

### P1 (Alta Importancia - SEO Técnico/Contenido)
- **Sitemap Dinámico:** `app/sitemap.ts` es estático. No incluye las URLs dinámicas de los productos (listings), limitando el descubrimiento masivo por motores de búsqueda.
- **Categorización SEO:** Falta estructura de URL para categorías/filtros (ej: `/marketplace/categoria/guitarras`) que permita indexar aterrizajes de búsqueda específicos.

### P2 (Mejoras - Optimización)
- **Canonical Tags:** Verificar la implementación de etiquetas canonical en listings con filtros múltiples para evitar contenido duplicado.
- **FAQs Públicas:** Falta integrar FAQs de soporte/marketplace dentro del ecosistema de búsqueda (Schema FAQPage).
- **Control de Indexación:** Implementar `noindex` para páginas de estado de listado, filtros vacíos o listings eliminados/cerrados (actualmente se maneja con `notFound()`, pero asegurar que los headers HTTP de cache/indexación sean correctos).

## 3. Riesgos de implementación (JSON-LD Product)
Aunque ya existe `ItemPage` JSON-LD, asegurar que los datos dinámicos (precio, disponibilidad, imágenes) estén siempre validados y actualizados para evitar errores en Google Search Console y mantener la confianza del usuario.

## 4. Recomendación de Secuencia
1. **Sitemap Dinámico:** Actualizar `app/sitemap.ts` para integrar los slugs de productos activos desde la base de datos.
2. **Landing de Filtros/Categorías:** Diseñar e implementar rutas SEO-friendly para categorías principales.
3. **SEO Técnico:** Refinar etiquetas canonical y la lógica de cabeceras `noindex` para evitar indexación de contenido transaccional o filtrado de baja calidad.

## 5. Verificación realizada
- Inspección del árbol de archivos: `app/marketplace/[slug]/page.tsx` existe y contiene lógica de renderizado, metadata y JSON-LD.
- Verificación de sitemap: `app/sitemap.ts` lista solo rutas estáticas (no dinámicas).

## 6. No implementar en este sprint
El sprint actual se centra exclusivamente en el asistente IA. Esta auditoría SEO/AEO queda marcada como backlog técnico para una fase posterior de optimización de visibilidad.

*Nota: Este reporte es producto de una inspección estática. No se ha modificado ningún archivo de código.*
