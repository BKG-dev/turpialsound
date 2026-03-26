# Next Window Brief

> Fecha: 2026-03-26 (actualizado sesión 8)
> Para usar al inicio de la siguiente sesión de trabajo.

---

## Estado al cierre de esta sesión

- **Shell técnico creado** — 40+ archivos. Listo para instalar y validar build.
- **Fase 4 en progreso** — Shell hecho; faltan sistema visual, seo-aeo-implementation.md, ods-architecture.md
- **Build no ejecutado aún** — `next.config.ts` fue migrado a `next.config.mjs`; listo para `npm run build`

---

## Primer paso obligatorio en la próxima sesión

```bash
cd C:\proyectos\turpialsong
npm install
npm run build
npm run lint
```

Si hay errores de TypeScript o de módulos, documentarlos y resolverlos antes de avanzar.

---

## Caminos válidos después del build

### Camino A — Sistema visual (alta prioridad)
Con el shell listo, los design tokens provisionales [SUGGESTED] necesitan confirmación o refinamiento.

Crear:
- `docs/04_design/design-principles.md`
- `docs/04_design/design-tokens.md` — formaliza los tokens ya implementados como SUGGESTED
- `docs/04_design/motion-rules.md`
- `docs/04_design/layout-rules.md`

### Camino B — Contenido real (cuando lleguen datos del cliente)
Cuando el cliente provea datos de Bloques A-D:
1. Actualizar `content/site.ts` — dominio, teléfono, email, redes
2. Actualizar `content/artists.ts` — lista autorizada
3. Actualizar `app/nosotros/page.tsx` — bios reales
4. Actualizar `content/services.ts` — especificaciones de equipos, precios
5. Verificar `content/faq.ts` contra respuestas reales

### Camino C — Hero inmersivo (cuando sistema visual esté aprobado)
El hero en `app/page.tsx` es un placeholder. Reemplazar con:
- Video background (opción más simple, mejor performance)
- O componente R3F lazy-loaded con fallback de imagen estática

### Camino D — Documentación técnica pendiente de Fase 4
- `docs/05_technical/seo-aeo-implementation.md`
- `docs/05_technical/ods-architecture.md`
- `docs/05_technical/ods-refactor-plan.md`

---

## Abrir primero
1. `docs/07_handoffs/session-summary-active.md`
2. `docs/05_technical/shell-implementation-log.md` — estado del build y CLIENT_REQUIRED
3. `tailwind.config.ts` — para entender tokens actuales antes de crear design-tokens.md

---

## No reabrir
- Stack técnico (confirmado)
- Arquitectura de aplicación (confirmada)
- Estructura de carpetas (implementada)
- Sistema editorial de Fase 3 (cerrado)
- Decisiones de URL y navegación (implementadas)
- Rutas del sitio (todas creadas)

---

## Primer prompt sugerido — para validar build y continuar

```
Continúa Turpial Sound. Lee session-summary-active.md y next-window-brief.md.
El shell técnico está creado. El primer paso es ejecutar:
  npm install
  npm run build
  npm run lint
Reporta el resultado. Si hay errores, resuélvelos.
Si el build pasa limpio, el siguiente paso es crear el sistema visual:
  docs/04_design/design-principles.md
  docs/04_design/design-tokens.md
Basa los tokens en los valores SUGGESTED ya implementados en tailwind.config.ts,
y formalízalos con contexto de brand-core.md y messaging-pillars.md.
```
