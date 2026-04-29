# Design Brief: Ubicación y Filtros del Marketplace

## 1. Resumen Ejecutivo
Este brief define la arquitectura para la integración de ubicación geográfica y un sistema de filtrado avanzado para el marketplace de Turpial Sound. 
**Nota: Este documento es estrictamente un ejercicio de diseño y planeación. No constituye una autorización para implementar cambios en el sistema.**

## 2. Ubicación: ¿Dónde vive?
Se propone un modelo híbrido para asegurar flexibilidad y precisión.

*   **User Profile (Nivel de cuenta):** El usuario define su "ubicación base" (ciudad/país) en su perfil. Esto sirve como predeterminado para búsquedas.
*   **Listing (Nivel de oferta):** Cada listing puede opcionalmente especificar una "ubicación física del equipo/servicio". 
    *   *Razón:* Un usuario puede vivir en Caracas, pero listar un equipo que está físicamente en Valencia.
    *   *Privacidad:* La ubicación exacta (dirección) nunca es pública. Se muestra a nivel de ciudad o zona.

### Campos Requeridos
| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `country` | String | Código ISO o nombre. |
| `state` | String | Estado o provincia. |
| `city` | String | Ciudad. |
| `zone` | String (Opt) | Zona de la ciudad (ej: "Chacao", "El Paraíso"). |
| `isPublic` | Boolean | Define si el listing es localizable por ubicación. |

## 3. Filtros Públicos (MVP)
Para la fase inicial, los filtros deben ser rápidos y estar integrados en la UI de exploración.

1.  **Ubicación:** Radio de búsqueda o selección de ciudad/estado.
2.  **Categoría/Subcategoría:** Basado en el `category` actual, expandido si es necesario.
3.  **Precio:** Rango (Min/Max).
4.  **Estado del producto:** (Nuevo, Usado, Como nuevo).
5.  **Tipo de oferta:** (Venta, Servicio, Alquiler).

## 4. Impacto en Schema / Migración
*   **MpListing:** Agregar campos `city`, `state`, `country`, `locationZone`, `isLocationPublic`.
*   **MpUser:** Agregar campos `city`, `state`, `country`.
*   *Nota:* Se requerirá una migración de datos para popular estos campos en los registros existentes.

**STOP CONDITION:** Bajo ninguna circunstancia se deben modificar archivos en `prisma/`, `schema/migrations/` o realizar cambios en la base de datos sin autorización explícita de Manuel.

## 5. Estrategia de Implementación (Orden de riesgo)
1.  **UI/UX Filtros en Cliente:** Implementar el estado local de filtros en `MarketplacePageClient.tsx` usando los datos ya cargados (sin backend).
2.  **Schema / Migración:** Actualizar las tablas para almacenar las ubicaciones.
3.  **Backend (API/Actions):** Implementar lógica de filtrado en `actions/marketplace/listings.ts` para manejar consultas filtradas.
4.  **SEO/AEO:** Generar páginas dinámicas para ubicaciones populares.

**Recomendación de Modelo:**
*   Para tareas de diseño: `5.4-mini/medium` es suficiente.
*   Para tareas de implementación (DB/Schema/Runtime): `5.5/xhigh` o equivalente (modelo fuerte) es obligatorio.

## 6. Riesgos SEO/AEO
*   **Contenido duplicado:** Evitar crear demasiadas rutas de búsqueda.
*   **Indexación:** Asegurar que los filtros no generen URLs infinitas.

## 7. UI/UX
*   **Mobile:** Filtros escondidos tras un botón "Filtros" que despliega un drawer (inferior).
*   **Desktop:** Sidebar izquierdo persistente para filtros.

## 8. Próximo Prompt Recomendado (Para cuando sea autorizado)
> "Manuel, tengo el diseño aprobado para la ubicación/filtros. Por favor, autoriza la fase de auditoría read-only del esquema actual. Una vez hecho, propongo seguir con el diseño del schema, revisión de dependencias, y solo después de tu aprobación explícita, proceder con las migraciones y cambios de código en runtime."
