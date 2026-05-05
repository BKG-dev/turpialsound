---
tags: ["#marketplace", "#sprints", "#paralelo", "#status/live-source"]
---

# SPRINTS MARKETPLACE PARALELO

Rama madre integrada: `integration/lab-marketplace-sprint2a-selective-2026-05-04`

Estado global: **Sprint 0 COMPLETADO / Sprint 2A.1 ACTIVO (proximo)**.

Regla operativa: `var/rate-state.json` no debe entrar en staging.

## Sprint 2A.1 - Corte 2 (checkpoint tecnico + Preview)

- Commit: `6cda82e` (`fix(marketplace): sync chat unread after message events`).
- Tag: `cp/sprint2a1-cut2-chat-unread-sync-2026-05-05`.
- Preview Ready: `https://turpialsound-eskweq84b-bkgs-projects-829c67c1.vercel.app`.
- Cambios:
  - `TransactionChat` emite eventos `message_sent/messages_read/send_error/refresh_error`.
  - `DashboardClient` refresca `threads/unread` inmediatamente via callback.
  - Polling de 20s conservado como fallback.
- Validaciones:
  - `git diff --check` OK
  - `pnpm exec tsc --noEmit` OK
  - `pnpm run build` OK
  - Smoke HTTP Preview OK (`/` 200, `/marketplace` 200, `/marketplace/dashboard` 307 gate esperado, `/marketplace/admin` 307 gate esperado, `/admin/login` 200, `/api/bcv-rate` 200)
  - logs de Preview sin errores relevantes del corte.
- Pendiente para cierre QA completo:
  - smoke autenticado chat/unread manual;
  - confirmar mensaje enviado visible;
  - confirmar refresh inmediato unread/hilos;
  - confirmar marcar leido -> badge/hilos.
- Estado recomendado: listo tecnico + Preview OK, pendiente QA E2E autenticado de chat/unread.

## Sprint 2A.1 - Corte 1 (checkpoint validado)

- Commit: `77f7516` (`fix(marketplace): improve post-action sync feedback`).
- Tag: `cp/sprint2a1-cut1-sync-feedback-2026-05-05`.
- Preview Ready: `https://turpialsound-e6d4x13ys-bkgs-projects-829c67c1.vercel.app`.
- Smoke HTTP: OK (`/`, `/marketplace`, `/admin/login`, `/api/bcv-rate` en 200; gates esperados en `/marketplace/dashboard` y `/marketplace/admin` con 307).
- Smoke autenticado manual superficial: positivo.
- Aclaracion: no equivale a QA E2E exhaustivo.
- Estado recomendado: listo para PR ready/revision.
- Pendiente antes de merge final (maxima seguridad):
  - QA profundo seller/admin.
  - Accion admin real.
  - Disputa/accion seller real.
  - Verificar refresh badges/stats post-accion.
  - Confirmar modal no-stale en flujo real.
- Si falla `gh auth`, crear PR manual desde GitHub con base/head ya definidos.

## Sprint 0 - COMPLETADO

- Owner tecnico: Jean
- Owner funcional: Manuel
- Objetivo: cerrar documentacion operativa, validar rama madre y preparar smoke test booking/lab + marketplace.
- Archivos/zonas sensibles: docs handoff, estado de ramas, verificacion de integracion.
- Validacion minima: rama local/remota confirmada, checkpoint documental actualizado, estado git limpio salvo untracked esperado.
- Stop condition: bloqueo de rama/entorno no resuelto o divergencia critica en rama madre.

Resumen de cierre Sprint 0:
- tecnica: `prisma validate` OK, `prisma migrate status` OK, `tsc --noEmit` OK, `pnpm run build` OK.
- smoke preview: `/`, `/marketplace`, `/reservas`, `/admin/login`, `/admin` (gate), `/ops/payment-review` (gate), `/api/bcv-rate` en 200.
- bloqueantes: ninguno.

## Sprint 2A.1 Sync stabilization - ACTIVO / PROXIMO

- Owner tecnico: Jean
- Owner funcional: Manuel
- Objetivo: estabilizar sincronizacion tecnica y operativa sobre rama madre.
- Archivos/zonas sensibles: integracion marketplace, wiring no critico, handoffs.
- Validacion minima: smoke de rutas clave y diff acotado por alcance.
- Stop condition: conflicto con locks DB/schema o booking/lab.

## Sprint UX-TX-Detail - PENDIENTE

- Owner tecnico: Jean
- Owner funcional: Manuel
- Objetivo: pulido UX y detalle transaccional sin tocar contratos criticos.
- Archivos/zonas sensibles: `app/marketplace/**`, `components/marketplace/**`, estilos scoped.
- Validacion minima: `/marketplace` y `/marketplace/[slug]` funcionales, sin regresion en `/reservas`.
- Stop condition: necesidad de cambios en schema/migrations o acoplamiento con rates criticos.

## Sprint 3A Rates diagnosis - PENDIENTE

- Owner tecnico: Jean (review tecnico)
- Owner funcional: Manuel (owner)
- Objetivo: diagnostico funcional/tactico de tasas.
- Archivos/zonas sensibles: `lib/marketplace/reference-rate.ts`, flujos de consumo de tasa.
- Validacion minima: diagnostico documentado y plan de implementacion aprobado.
- Stop condition: requerimiento de cambios DB sin lock aprobado.

## Sprint 3B Rates implementation - PENDIENTE

- Owner tecnico: Jean
- Owner funcional: Manuel
- Objetivo: implementar tasas cuando aplique DB/schema.
- Archivos/zonas sensibles: schema/modelos de tasas, acciones marketplace dependientes.
- Validacion minima: contrato de datos consistente + smoke funcional sin romper reservas.
- Stop condition: riesgo de mezcla con booking/lab o migraciones sin lock.

## Sprint 4A Payout architecture - PENDIENTE

- Owner tecnico: Jean (review DB)
- Owner funcional: Manuel (owner)
- Objetivo: definir arquitectura de payout y reglas operativas.
- Archivos/zonas sensibles: estados de transaccion, reglas de payout, modelo financiero operativo.
- Validacion minima: arquitectura documentada y validada por ambos owners.
- Stop condition: dependencia tecnica no acordada con locks de transaccion/DB.

## Sprint 4B Payout implementation - PENDIENTE

- Owner tecnico: Jean
- Owner funcional: Manuel
- Objetivo: implementar payout segun arquitectura aprobada.
- Archivos/zonas sensibles: acciones de payout, estados terminales, observabilidad.
- Validacion minima: QA operacional y no regresion de flujos existentes.
- Stop condition: cambios criticos de schema sin lock o impacto en booking/lab.

## Listing reservation/state - PENDIENTE

- Owner tecnico: Jean (si toca DB critica)
- Owner funcional: Manuel
- Objetivo: consolidar reglas de reserva/estado de listings.
- Archivos/zonas sensibles: estado transaccional marketplace y UI de disponibilidad.
- Validacion minima: reglas de negocio coherentes y trazables.
- Stop condition: conflicto con transaction state lock.

## Chat/system messages - PENDIENTE

- Owner tecnico: Jean
- Owner funcional: Manuel
- Objetivo: alinear mensajes operativos y experiencia de chat.
- Archivos/zonas sensibles: componentes de chat y notificaciones de marketplace.
- Validacion minima: consistencia de mensajes por estado.
- Stop condition: dependencia de logica externa no aprobada.

## Publish requirements / Filters / Search - PENDIENTE

- Owner tecnico: Jean (UI/infra)
- Owner funcional: Manuel (reglas)
- Objetivo: mejorar publicacion, filtros y busqueda con reglas claras.
- Archivos/zonas sensibles: formularios de publish, filtros de listado, experiencia de busqueda.
- Validacion minima: UX consistente y resultados correctos en escenarios base.
- Stop condition: cambio transversal que requiera tocar zonas bloqueadas.

## Pendiente inmediato para Jean

1. Resolver bloqueo global de build ligado a `components/bookings/PaymentFlipCountdown.tsx` (dependencia `flipclock` ausente en manifest/lock).
2. Revisar y controlar rama `Manuel/reconcile-sprint2a-on-integrated-mother` (`6512972`) para recuperar Sprint 2A perdido en el port selectivo.

## Capa complementaria

Para cierre de sprint, complementar con:

- `docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md`
- `docs/obsidian-vault/HITOS_MARKETPLACE_PRACTICOS.md`
- `docs/07_handoffs/marketplace-integrated-qa-procedure-2026-05-04.md`
- `docs/obsidian-vault/QA_MARKETPLACE_INTEGRADO.md`
