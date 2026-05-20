# QA Checklist — Turpial Sound

## Técnica
- [ ] `npx tsc --noEmit` — sin errores TypeScript
- [ ] lint sin warnings nuevos
- [ ] build local sin error (`next build`)
- [ ] rutas sin 404
- [ ] metadata (title, description) por página
- [ ] schema estructurado por plantilla
- [ ] imágenes/video con src correcto y alt/aria
- [ ] integración ODS estable (si aplica)

## Visual
- [ ] desktop grande (1440+)
- [ ] laptop (1280)
- [ ] tablet (768)
- [ ] mobile (375)
- [ ] contraste legible (mínimo AA)
- [ ] jerarquía visual clara
- [ ] consistencia modular con el sistema de diseño

## Editorial
- [ ] headline con valor real (sin relleno genérico)
- [ ] tono consistente con `tone-of-voice.md`
- [ ] sin adjetivos vacíos ("innovador", "único", etc.)
- [ ] intención clara por página
- [ ] CTA coherente

## SEO / AEO
- [ ] intención resuelta por URL
- [ ] entidad de marca clara
- [ ] headings en orden correcto (H1 → H2 → H3)
- [ ] FAQ útiles y estructuradas
- [ ] linking interno lógico
- [ ] contenido legible por máquina y humano

## ODS (cuando aplique)
- [ ] creación de orden funciona
- [ ] correlativo correcto
- [ ] generación documental
- [ ] notificación correcta
- [ ] creación de evento
- [ ] transición de estados
- [ ] registro histórico consistente
- [ ] endpoints responden sin exponer datos sensibles

## Pre-release
- [ ] build limpio en Vercel preview
- [ ] todos los links verificados
- [ ] titles y descriptions revisados
- [ ] schema válido (Google Rich Results Test)
- [ ] conversiones funcionando (formulario, CTA)
- [ ] documentación actualizada
