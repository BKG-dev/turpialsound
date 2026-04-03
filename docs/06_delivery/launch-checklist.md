# Turpial Sound — Launch Checklist (Pre-Flight)

Lista de chequeo final de bloqueo obligatorio antes de exponer el sitio al dominio público final.

## 1. Contenido del Cliente (CLIENT_REQUIRED)
- [ ] Dominio oficial configurado en `content/site.ts`.
- [ ] Número de WhatsApp oficial y Email verificados.
- [ ] Coordenadas GPS y Horarios introducidos en `lib/schema.ts` (`LocalBusiness`).
- [ ] Lista final de artistas autorizados (`content/artists.ts`).
- [ ] Biografías y fotos oficiales del equipo (`/nosotros`).
- [ ] Textos legales de Privacidad y Términos aprobados.
- [ ] Ficha técnica real de equipos para las salas de ensayo.

## 2. Validaciones Técnicas
- [ ] El comando `npm run build` finaliza sin errores ni warnings críticos de ESLint.
- [ ] Comprobación de Google Rich Results (Schema JSON-LD no arroja errores).
- [ ] Lighthouse Report: Performance > 90, Accessibility > 95, SEO > 95.
- [ ] Testeo en dispositivo físico iOS y Android para certificar que el WebGL (Logo 3D y visualizador) no colapsa el navegador.

## 3. Infraestructura
- [ ] DNS apuntados correctamente a Vercel.
- [ ] Certificado SSL (HTTPS) aprovisionado.
- [ ] Google Search Console verificado e indexación del `sitemap.xml` solicitada.
- [ ] Variables de entorno (`.env.production`) configuradas en el panel de Vercel.