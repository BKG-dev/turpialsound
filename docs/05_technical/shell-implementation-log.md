# Shell Implementation Log

> Fecha: 2026-03-26 (sesión 8)
> Estado: Shell creado — listo para instalar dependencias y validar build

---

## Archivos creados en esta sesión

### Configuración raíz
| Archivo | Descripción |
|---------|-------------|
| `package.json` | Dependencias: Next 14.2.20, React 18, Tailwind 3.4, TypeScript 5, clsx, tailwind-merge |
| `next.config.mjs` | next/image formats avif/webp, typedRoutes experimental — migrado de `.ts` a `.mjs` (Next 14 no soporta `.ts`) |
| `tailwind.config.ts` | Design tokens provisionales: paleta oscura + amber/gold [SUGGESTED], fuentes, spacing, sombras, breakpoints |
| `tsconfig.json` | strict: true, path alias `@/*`, moduleResolution: bundler |
| `postcss.config.mjs` | Tailwind + autoprefixer |
| `.eslintrc.json` | next/core-web-vitals + no-unused-vars + no-explicit-any |
| `.prettierrc` | singleQuote, trailingComma all, prettier-plugin-tailwindcss |
| `.gitignore` | Standard Next.js ignores |

### Tipos
| Archivo | Descripción |
|---------|-------------|
| `types/index.ts` | Service, Artist, Testimonial, FAQItem, NavItem, SiteConfig |

### Lib
| Archivo | Descripción |
|---------|-------------|
| `lib/utils.ts` | cn() helper (clsx + tailwind-merge), formatWhatsAppUrl() |
| `lib/metadata.ts` | generatePageMetadata() factory, rootMetadata constant |
| `lib/schema.ts` | buildOrganizationSchema, buildLocalBusinessSchema, buildServiceSchema, buildFAQSchema, buildPersonSchema, buildBreadcrumbSchema |

### Content
| Archivo | Descripción |
|---------|-------------|
| `content/site.ts` | siteConfig — constantes globales (CLIENT_REQUIRED: dominio, teléfono, dirección, redes) |
| `content/navigation.ts` | mainNavItems, ctaNav, footerNavItems |
| `content/services.ts` | coreServices (3), expandedServices (4), getServiceBySlug() |
| `content/faq.ts` | faqItems (8), getFAQByCategory(), getAllFAQCategories() |
| `content/artists.ts` | featuredArtists placeholder (CLIENT_REQUIRED: lista autorizada) |

### Styles
| Archivo | Descripción |
|---------|-------------|
| `styles/globals.css` | CSS variables, reset, tipografía base, utility classes (container-base, section-padding, accent-line, text-gradient-gold) |

### Components
| Archivo | Descripción |
|---------|-------------|
| `components/ui/Button.tsx` | Variantes: primary, secondary, ghost, whatsapp; tamaños sm/md/lg; as button o as link |
| `components/layout/SiteHeader.tsx` | Server Component; nav desktop con dropdown; logo; CTA |
| `components/layout/MobileMenu.tsx` | Client Component; hamburger; nav móvil con sub-ítems |
| `components/layout/SiteFooter.tsx` | Logo, nav, contacto, barra inferior con privacidad |
| `components/sections/PageHero.tsx` | Hero de página interior; eyebrow, heading, subheading, children slot |
| `components/sections/SectionShell.tsx` | Contenedor de sección + SectionHeading |
| `components/sections/CTASection.tsx` | Sección CTA reutilizable con CTA primario y secundario opcional |
| `components/sections/FAQList.tsx` | Client Component; acordeón accesible; aria-expanded |
| `components/sections/ContactBlock.tsx` | Bloque de contacto con WhatsApp deeplink y email |

### App directory
| Ruta | Descripción |
|------|-------------|
| `app/layout.tsx` | Root layout; Syne + Inter via next/font; Organization JSON-LD |
| `app/page.tsx` | Home: Hero placeholder + servicios + authority bar + diferenciadores + CTA |
| `app/not-found.tsx` | 404 personalizada |
| `app/sitemap.ts` | Sitemap XML con todas las rutas y prioridades |
| `app/robots.ts` | robots.txt |
| `app/nosotros/page.tsx` | Equipo + bios placeholder (CLIENT_REQUIRED) + Person schema |
| `app/salas-de-ensayo/page.tsx` | Features + internal links + Service schema + Breadcrumb |
| `app/estudio-de-grabacion/page.tsx` | Equipment placeholder + authority bar + Service schema |
| `app/produccion-musical/page.tsx` | Proceso 4 pasos + Service schema |
| `app/servicios/page.tsx` | Hub de todos los servicios (core + expanded) |
| `app/servicios/podcast-locucion/page.tsx` | Shell con Service schema |
| `app/servicios/video-session/page.tsx` | Shell con Service schema |
| `app/servicios/mezcla-masterizacion/page.tsx` | Shell con Service schema |
| `app/servicios/arreglos-musicales/page.tsx` | Shell con Service schema |
| `app/artistas/page.tsx` | Lista parcial (CLIENT_REQUIRED: autorización) + trayectoria |
| `app/recursos/page.tsx` | Preview FAQ + link a página completa |
| `app/recursos/preguntas-frecuentes/page.tsx` | FAQ completo + FAQPage JSON-LD |
| `app/contacto/page.tsx` | ContactBlock + datos + servicios disponibles |
| `app/politica-de-privacidad/page.tsx` | noIndex: true; placeholder legal (CLIENT_REQUIRED) |

---

## Próximo paso obligatorio antes de continuar

```bash
# Desde C:\proyectos\turpialsong
npm install
# o si pnpm está disponible:
pnpm install
```

Luego validar:
```bash
npm run build
npm run lint
```

---

## Build bloqueantes conocidos
- `next.config.ts` causaba error de carga en Next 14: **RESUELTO** — migrado a `next.config.mjs` (2026-03-26).
- Si `next/font` falla offline: reemplazar temporalmente con variables CSS locales en `globals.css`.

---

## CLIENT_REQUIRED que bloquean contenido final
- `content/site.ts`: dominio oficial, teléfono WhatsApp, email, dirección, redes sociales
- `content/artists.ts`: lista autorizada completa
- `app/nosotros/page.tsx`: bios oficiales de Frank Lemus y Susej Vera
- `app/artistas/page.tsx`: lista completa con autorización de publicación
- `app/politica-de-privacidad/page.tsx`: texto legal revisado
- `lib/schema.ts` → `buildLocalBusinessSchema`: horarios y coordenadas reales
- Todos los equipos en `content/services.ts` marcados como CLIENT_REQUIRED

---

## Tokens de diseño — SUGGESTED (pendientes de aprobación del cliente)
- Background: `#0A0A0A`
- Surface: `#111111`
- Accent gold: `#C9973A`
- Text primary: `#F2F2F2`
- Text secondary: `#A0A0A0`

Cuando el cliente confirme colores oficiales:
1. Actualizar `tailwind.config.ts` → `theme.extend.colors`
2. Actualizar `styles/globals.css` → `:root` CSS variables
3. Marcar como CONFIRMED en este log y en `design-tokens.md`
