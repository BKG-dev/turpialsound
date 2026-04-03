# Launch Checklist — Turpial Sound

> Lista de verificación estricta antes del paso a producción (Main branch / Deploy).

## 1. Rendimiento, UI y UX
- [ ] Lighthouse score > 90 en Performance, Accessibility, Best Practices y SEO.
- [ ] Cero colisiones de `z-index` (Validar menús flotantes, botones numinosos y el AudioVisualizer).
- [ ] Animaciones CSS nativas y WebGL a 60fps estables sin desbordamientos horizontales.
- [ ] Fallback del BCV verificado (Simular desconexión o fallo del BCV para asegurar que entra la tasa de respaldo sin romper la página).

## 2. Entorno y Build (Next.js)
- [ ] `npm run build` se ejecuta limpiamente: cero errores de TypeScript y cero warnings severos de ESLint.
- [ ] Variables de entorno (ENVs) de producción configuradas correctamente en el hosting (Bases de datos, Stripe, APIs, Tokens).
- [ ] Manejo de caché verificado en Route Handlers (ej. El scraping del BCV no se ejecuta en cada refresh).

## 3. SEO, AEO y Metadatos
- [ ] `robots.txt` y `sitemap.xml` generados y accesibles.
- [ ] Etiquetas Open Graph (OG) y Twitter Cards presentes (imágenes de preview de enlaces activas).
- [ ] Schema.org (JSON-LD) para `LocalBusiness`, `Organization` y `Product` renderizando correctamente.

## 4. Lógica de Negocio (Marketplace & Turpial Studio)
- [ ] Pruebas de simulación del Escrow (Validar que el cálculo matemático de la comisión del 5% funciona a la perfección en la UI y la DB).
- [ ] Banners de advertencia y regex anti-bypass (teléfonos/emails) operativos en los hilos de chat del Marketplace.
- [ ] Formularios de reservas de estudio conectados y enviando data correcta.