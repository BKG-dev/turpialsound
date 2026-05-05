# SEO/AEO — Listings Sitemap & Metadata Hardening

- **Rama:** `Manuel/marketplace-seo-aeo-listings-sitemap`
- **Base:** `origin/Manuel/marketplace-integrated-finance-discovery`
- **Commit:** feat(marketplace): add listings sitemap and seo metadata hardening

---

## Archivos tocados

| Archivo | Cambio |
|---|---|
| `app/sitemap.ts` | Sitemap dinámico de listings públicos (ACTIVE) |
| `app/marketplace/[slug]/page.tsx` | JSON-LD Product/Offers, availability, title AEO |

---

## Qué cerró

### Sitemap listings
- Agregadas URLs de listings con `status = 'ACTIVE'` al sitemap (`app/sitemap.ts:44-51`).
- Cada entry incluye `url`, `lastModified` (basado en `updatedAt`), `changeFrequency: 'weekly'`, `priority: 0.65`.
- Excluye DRAFT, PAUSED, SOLD_OUT, ARCHIVED.
- Usa `getDb()` de `lib/marketplace/db.ts` siguiendo patrón existente del proyecto.
- Maneja error DB de forma segura: si la DB no está disponible, el sitemap se sirve sin listings, sin romper el resto.

### Canonical listing detail
- Ya existía canonical absoluto limpio en `generateMetadata` (`app/marketplace/[slug]/page.tsx:207-208`): `https://turpialsound.com/marketplace/${slug}`.
- Sin query params.
- Sin cambios necesarios.

### JSON-LD Product
- Agregado nodo `Product` (o `Service`) con `name`, `description`, `image`, `url`, `category`.
- Agregado nodo `Offer` con `price`, `priceCurrency`, `availability`, `url`.
- Availability mapeada:
  - `active` + `activeTransactionStatus` (en proceso) → `https://schema.org/LimitedAvailability`
  - `active` sin transacción activa → `https://schema.org/InStock`
  - `sold`, `escrow`, u otros estados → `https://schema.org/OutOfStock`
- No expone datos bancarios, payment proof, ni datos privados del vendedor.
- No promete "sin riesgo".
- No expone raw enums visibles.

### Availability
- Mapeo de estados de listing a schema.org availability implementado en `getSchemaAvailability()` (`app/marketplace/[slug]/page.tsx:68-79`).

### Filtros / indexación
- Los filtros actuales son client-side en `MarketplacePageClient` y no generan páginas indexables dedicadas.
- La página `/marketplace` mantiene canonical limpio (`https://turpialsound.com/marketplace`) sin query params.
- **Futuro P1:** páginas SEO por categoría/ubicación si se decide. No implementado en esta rama.

### AEO metadata
- Title de listing detail mejorado: `${listing.title} — Marketplace Musical en Venezuela | ${siteConfig.name}`.
- Description de listing detail incluye referencia a "Compra y venta de equipos musicales con operacion protegida en Turpial Sound Marketplace, Venezuela."
- Title de marketplace page ya incluye "Marketplace musical en Venezuela".
- Sin keyword stuffing.

---

## Blockers
- Ninguno.

---

## Validaciones

| Validación | Estado |
|---|---|
| `git diff --check` | Pendiente |
| `npx tsc --noEmit` | Pendiente |
| `npm run build` | Pendiente |

---

## Nota sobre filtros client-side
Los filtros actuales (`/marketplace`) son client-side y no generan URLs indexables separadas. Esto es intencional y documentado. Si en el futuro se crean páginas SEO por categoría (`/marketplace/categoria/instrumentos`), será necesario un backend más amplio con query params o rutas dinámicas dedicadas.
