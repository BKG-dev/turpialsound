# TURPIAL SOUND — CLAUDE CODE MASTER

> Este archivo gobierna toda ejecución. Los detalles extensos viven en `/docs` y se leen solo cuando se trabaja ese frente.

---

## North Star

**Brand Authority Platform + Lead Engine + ODS Operations Core**

Dos capas coordinadas:
1. **Frente público** — web premium de autoridad, captación, SEO/AEO, conversión.
2. **Frente operativo** — motor ODS sobre Google Workspace (Sheets, Apps Script, Drive, Calendar, Gmail).

Nunca tratar el proyecto como landing aislada ni como simple script. Siempre como sistema.

---

## Arquitectura maestra

```
[ Dominio 1 ] Public Brand Platform
  Next.js · TypeScript · Tailwind · Vercel
  SEO/AEO · leads · portfolio · autoridad

[ Dominio 2 ] Operations Core
  Google Apps Script · Sheets · Drive · Calendar · Gmail
  ODS · agenda · documentos · aprobaciones
```

**Regla de separación**: el ODS no contamina la arquitectura del front público. La integración va por endpoints bien delimitados.

---

## Stack

| Frente | Tecnología |
|--------|-----------|
| Frontend | Next.js App Router · TypeScript estricto · Tailwind CSS |
| Aislamiento fino | CSS Modules o vanilla-extract |
| 3D / efectos | React Three Fiber / Drei solo donde justifique el valor visual |
| Backend operativo | Google Apps Script (mantener; abstraer hacia API cuando el negocio lo justifique) |
| Deploy | Vercel (principal) · Cloudflare (alternativa edge) |

CSS: tokens globales mínimos, módulos por componente, naming explícito. Sin `globals.css` monolítico.

---

## Principios operativos

1. **No improvisar** — cerrar brief, sitemap, stack y checkpoints antes de tocar código productivo.
2. **Todo persiste en `.md`** — ninguna decisión maestra vive solo en el chat.
3. **Un cambio, una razón** — explicar: problema · decisión · impacto · archivos · riesgo.
4. **La autoridad no se inventa** — apoyar con evidencia, metodología, casos, estructura.
5. **Diseño y sistema van juntos** — el front premium debe sostener SEO, AEO, conversión y mantenibilidad.
6. **El ODS no rebaja la marca** — el motor operativo no justifica bajar el nivel visual del frente público.

---

## Fases — referencia rápida

| Fase | Foco | Gate |
|------|------|------|
| 1 | Intake / verdad base | categoría · promesa · oferta · CTA |
| 2 | Arquitectura de autoridad | sitemap · money pages · rol ODS |
| 3 | Sistema editorial y visual | tono · tokens · motion · layouts |
| 4 | Shell técnico + ODS boundary | rutas · metadata · frontera ODS/front |
| 5 | Producción guiada | calidad por página · bloques reutilizables |
| 6 | QA + release | build limpio · links · schema · conversiones |

→ Detalle completo de cada fase y sus gates: `docs/00_governance/phases-detail.md`

---

## Pre-lectura obligatoria por frente

**Estrategia** → `roadmap-master.md` · `brand-core.md` · `market-positioning.md` · `authority-map.md` · `session-summary-active.md`

**Contenido** → `brand-core.md` · `messaging-pillars.md` · `tone-of-voice.md` · `page-briefs.md`

**UI** → `design-principles.md` · `design-tokens.md` · `component-inventory.md` · `layout-rules.md`

**ODS** → `ods-architecture.md` · `ods-refactor-plan.md` · `data-model.md` · `api-contracts.md` · `bug-log.md` · `session-summary-active.md`

→ Referencia ODS completa: `docs/05_technical/ods-reference.md`

---

## Debugging

Orden al encontrar un bug:
1. síntoma visible
2. hipótesis principal
3. archivos sospechosos
4. fix mínimo propuesto
5. riesgo secundario
6. test para confirmar

No mezclar refactor con hotfix. Registrar en `bug-log.md`: fecha · bug · causa · fix · validación · lección.

---

## Definition of Done

Un bloque está terminado cuando:
- resuelve una función real
- no rompe consistencia sistémica
- pasa validación visual y técnica básica
- queda documentado
- deja claro qué sigue

---

## Prioridad ante conflictos

1. claridad estratégica
2. integridad del sistema
3. experiencia del usuario
4. mantenibilidad técnica
5. performance
6. refinamiento visual extra

---

## SEO / AEO

Cada URL resuelve una intención. Cada bloque aporta a usuario y máquina. Sin relleno. Sin adjetivos vacíos.
Activos clave: `authority-map.md` · `content-clusters.md` · `page-briefs.md` · `entity-bios.md` · `faq-bank.md`

---

## Git y sesiones

- **Commit + push antes de cada compactación** — nunca compactar sin push limpio.
- Antes de cerrar sesión: actualizar `session-summary-active.md` y `next-window-brief.md`.
- → Template de handoff: `docs/00_governance/session-handoff-template.md`

---

## Modelos y tokens

→ Ver `TASK_ROUTING.md` para routing de modelos por tipo de tarea.
→ Contexto activo: solo objetivo inmediato + archivos relevantes + restricciones vigentes.
→ Compactar cuando: fase cerrada · contexto mezclado · costo sin justificación.

---

## Documentación de referencia

```
docs/
  00_governance/   phases-detail.md · session-handoff-template.md · roadmap-master.md
  01_strategy/     brand-core.md · market-positioning.md · customer-profiles.md · authority-map.md
  02_ia/           sitemap-master.md · url-map.md · content-clusters.md
  03_editorial/    messaging-pillars.md · tone-of-voice.md · page-briefs.md · faq-bank.md
  04_design/       design-principles.md · design-tokens.md · component-inventory.md · motion-rules.md
  05_technical/    stack-decision.md · app-architecture.md · ods-reference.md · api-contracts.md
  06_delivery/     qa-checklist.md · bug-log.md · launch-checklist.md
  07_handoffs/     session-summary-active.md · next-window-brief.md · compact-history.md
```

---

*Cada intervención debe acercar Turpial Sound a una posición de autoridad verificable, elegante, escalable y operativamente sólida.*
