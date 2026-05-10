---
tags: ["#sprints", "#marketplace", "#codev", "#status/live-source"]
fecha: 2026-05-10
base: integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07
---

# Sprints Co-development Marketplace - 2026-05-10

## Guardrails globales

- Un sprint por rama.
- Un owner principal por sprint.
- Reviewer cruzado cuando la zona sea critica.
- No tocar booking, schema, envs o produccion sin lock y gate.
- No mezclar dos sprints en la misma rama.
- No trabajar dos personas sobre el mismo archivo/zona critica sin lock.
- Antes de cualquier QA, resolver primero el `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- Si la validacion exacta no existe en dispatcher, detenerse y reportar `GAP OPERATIVO`.

## Resumen rapido

| Sprint | Owner | Reviewer | Cierre de avance |
|--------|-------|----------|------------------|
| S01 | Manuel | Jean | Preview BKG autonomo |
| S02 | Jean | Manuel | Discovery estable o error clasificado |
| S03 | Manuel | Jean | Login QA cerrado |
| S04 | Jean | Manuel | Payment proof protegido validado |
| S05 | Manuel | Jean | Delivery/receipt operativo |
| S06 | Jean | Manuel | Payout admin auditable |
| S07 | Jean | Manuel | Tasas y accounting listos |
| S08 | Manuel | Jean | Action center y UX claros |
| S09 | Manuel | Jean | Discovery publico listo |
| S10 | Jean | Manuel | Release gate de launch |

## Fase A - Autonomia y runtime seguro

### S01 - BKG Preview Smoke Autonomy

- **Owner principal:** Manuel
- **Segundo par/reviewer:** Jean
- **Objetivo de negocio:** demostrar preview BKG funcional desde `Manuel/*` sin depender de Cerberus ni produccion
- **Que avance queda cerrado:** Manuel puede validar marketplace en Preview real por su cuenta
- **Rama recomendada:** `Manuel/s01-preview-smoke-autonomy-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** docs de resultado, preview deploy, validaciones de runtime y smoke documentado
- **Zonas prohibidas:** `app/`, `components/`, `actions/`, `lib/`, `prisma/`, booking, `main`, produccion, env values
- **Validacion minima:** `preview-runtime-guard.ts`, verificacion de nombres de env en Preview, smoke pasivo de rutas clave, `task_id=marketplace_login_smoke` si las credenciales QA existen por env
- **Preview requerido:** si, Preview only en BKG Vercel `turpialsound`
- **Push a madre permitido:** si, solo si el sprint genera docs/reportes y el checklist da limpio
- **Production permitido:** no
- **Stop condition:** preview no responde, faltan env names criticos, `/reservas` falla, la validacion requerida no tiene ruta canonica y cae en `GAP OPERATIVO`

### S02 - Marketplace Discovery Runtime Stabilization

- **Owner principal:** Jean
- **Segundo par/reviewer:** Manuel
- **Objetivo de negocio:** resolver o descartar el error Prisma/query de discovery visto en el intento de produccion
- **Que avance queda cerrado:** `/marketplace` no rompe en Preview y los logs clasifican DB/query/empty/filter states
- **Rama recomendada:** `Jean/s02-marketplace-discovery-runtime-stabilization-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** discovery/listings runtime, logs concisos, docs de hallazgo
- **Zonas prohibidas:** booking, schema/migrations, envs, produccion
- **Validacion minima:** `task_id=S02_MARKETPLACE_DISCOVERY_RUNTIME_STABILIZATION` desde dispatcher; `preview-runtime-guard.ts` sobre Preview BKG y clasificacion exacta `OK | DB_MISSING | QUERY_ERROR | ZERO_ACTIVE | FILTERED_EMPTY | UNKNOWN` con smoke de `/`, `/marketplace`, `/reservas`, `/api/bcv-rate`, `/admin/login`, `/ops/payment-review` y `/payment-proofs/view`
- **Preview requerido:** si
- **Push a madre permitido:** si, tras fix minimo validado o cierre documental con hallazgo reproducible
- **Production permitido:** no hasta gate explicito
- **Stop condition:** el fix exige schema, DB manual, env change o toca booking; la validacion cae en `GAP OPERATIVO`; o el smoke intenta cerrar con Preview fuera de `bkgs-projects-829c67c1` o con URL `cerberus77s-projects`

### S03 - Auth/Login QA Closure

- **Owner principal:** Manuel
- **Segundo par/reviewer:** Jean
- **Objetivo de negocio:** cerrar buyer/seller/admin login en Preview real
- **Que avance queda cerrado:** roles buyer/seller/SUPER quedan validados y sin credenciales hardcodeadas
- **Rama recomendada:** `Manuel/s03-auth-login-qa-closure-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** docs y ajustes menores de login si aparecen residuos confirmados
- **Zonas prohibidas:** booking, produccion, secretos, env values
- **Validacion minima:** `task_id=marketplace_login_smoke` desde dispatcher
- **Preview requerido:** si
- **Push a madre permitido:** si, si el diff queda acotado y el smoke pasa
- **Production permitido:** no hasta gate explicito
- **Stop condition:** faltan `QA_*`, el task exacto no puede ejecutarse, o el problema real sube a auth/SUPER con lock faltante

## Fase B - Flujo transaccional critico

### S04 - Protected Payment Proof E2E

- **Owner principal:** Jean
- **Segundo par/reviewer:** Manuel
- **Objetivo de negocio:** validar comprobantes protegidos, acceso SUPER/admin y cero exposicion sensible
- **Que avance queda cerrado:** payment proof protegido entra en operacion QA segura
- **Rama recomendada:** `Jean/s04-protected-payment-proof-e2e-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** rutas de proof protegido, auth proxy, docs de cierre
- **Zonas prohibidas:** booking, Blob publico para proofs, produccion
- **Validacion minima:** `task_id=payment_proof_sensitive_preview`
- **Preview requerido:** si
- **Push a madre permitido:** si, solo tras cierre del lock Jean + Manuel
- **Production permitido:** no hasta QA matrix
- **Stop condition:** el proof toca Blob publico, el proxy SUPER falla, o la cobertura exacta documentada deja de ser ejecutable

### S05 - Buyer/Seller Delivery & Receipt Flow

- **Owner principal:** Manuel
- **Segundo par/reviewer:** Jean
- **Objetivo de negocio:** cerrar "Ya entregue" / "Ya recibi" / mensajes de sistema / cero liberacion prematura
- **Que avance queda cerrado:** comprador y vendedor ya no quedan bloqueados despues del pago validado
- **Rama recomendada:** `Manuel/s05-delivery-receipt-flow-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** buyer/seller dashboard, transiciones de estado, system messages, docs
- **Zonas prohibidas:** booking, payout final automatico, produccion
- **Validacion minima:** smoke QA canonico aplicable desde dispatcher; si no existe cobertura exacta para delivery/receipt, detenerse y registrar `GAP OPERATIVO`
- **Preview requerido:** si
- **Push a madre permitido:** si, tras smoke y revision de Jean
- **Production permitido:** no
- **Stop condition:** transicion inconsistente, liberacion prematura o falta ruta QA canonica exacta

### S06 - Admin Seller Payout Registration & Closure

- **Owner principal:** Jean
- **Segundo par/reviewer:** Manuel
- **Objetivo de negocio:** formalizar pago al vendedor con referencia, hash, fecha, metodo, monto y estado final
- **Que avance queda cerrado:** admin puede cerrar la operacion con registro auditable de payout
- **Rama recomendada:** `Jean/s06-admin-seller-payout-closure-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** admin marketplace, payout closure, docs y reportes
- **Zonas prohibidas:** booking, schema no planificado, produccion
- **Validacion minima:** smoke admin aplicable y validacion operativa de registro final; si la cobertura exacta no esta en dispatcher, detenerse con `GAP OPERATIVO`
- **Preview requerido:** si
- **Push a madre permitido:** si, tras cierre del reviewer y checklist
- **Production permitido:** no si requiere schema fuera de sprint DB
- **Stop condition:** aparece necesidad de schema/migration, falta lock financiero, o no hay ruta QA exacta

## Fase C - Finanzas, UX y lanzamiento

### S07 - Rates / Finance / Accounting Hardening

- **Owner principal:** Jean
- **Segundo par/reviewer:** Manuel
- **Objetivo de negocio:** congelar tasas, fee 5 por ciento, fees bancarios/Binance y modelo de accounting
- **Que avance queda cerrado:** calculo financiero auditable y listo para lanzamiento
- **Rama recomendada:** `Jean/s07-rates-finance-accounting-hardening-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** motor de tasas, snapshots, admin finance read-only, docs
- **Zonas prohibidas:** booking, produccion, migracion sin lock
- **Validacion minima:** `task_id=reconcile_read_only` mas contraste contra [[ARQUITECTURA_TASAS]]
- **Preview requerido:** si
- **Push a madre permitido:** si, solo tras lock financiero y reporte claro
- **Production permitido:** no sin migracion/gate
- **Stop condition:** calculo incorrecto, falta snapshot auditable o hace falta migracion fuera del sprint autorizado

### S08 - UX / Action Center / Notifications

- **Owner principal:** Manuel
- **Segundo par/reviewer:** Jean
- **Objetivo de negocio:** mostrar proximos pasos visibles, chips accionables, unread y dashboards buyer/seller/admin claros
- **Que avance queda cerrado:** el usuario sabe que hacer sin soporte manual
- **Rama recomendada:** `Manuel/s08-ux-action-center-notifications-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** dashboards marketplace, action center, notificaciones, copy operativo
- **Zonas prohibidas:** booking, release config, produccion
- **Validacion minima:** preview QA canonico aplicable; si la cobertura exacta no existe, detenerse y registrar `GAP OPERATIVO`
- **Preview requerido:** si
- **Push a madre permitido:** si, tras review visual/operativa de Jean
- **Production permitido:** no
- **Stop condition:** badges incorrectos, acciones duplicadas o falta ruta QA exacta para el cierre

### S09 - SEO/AEO / Public Discovery Polish

- **Owner principal:** Manuel
- **Segundo par/reviewer:** Jean
- **Objetivo de negocio:** discovery publico, filtros, copy, metadata y SEO/AEO
- **Que avance queda cerrado:** marketplace publico queda presentable y encontrable
- **Rama recomendada:** `Manuel/s09-seo-aeo-public-discovery-polish-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** UI publica de marketplace, metadata, copy, filtros, docs
- **Zonas prohibidas:** booking, pagos, produccion
- **Validacion minima:** preview visual/funcional y evidencia documental; si hace falta QA exacto no cubierto, registrar `GAP OPERATIVO`
- **Preview requerido:** si
- **Push a madre permitido:** si
- **Production permitido:** solo despues de runtime estable y gate final
- **Stop condition:** discovery vuelve a romper, filtros rompen query, o falta cobertura valida para QA final

### S10 - Launch Readiness / Security Rotation / Release Gate

- **Owner principal:** Jean
- **Segundo par/reviewer:** Manuel
- **Objetivo de negocio:** rotar secretos, cerrar checklist final, preview final, rollback plan y release gate
- **Que avance queda cerrado:** marketplace queda listo para lanzamiento controlado
- **Rama recomendada:** `Jean/s10-launch-readiness-release-gate-2026-05-10`
- **Base branch:** `integration-prep/m1-reconcile-protected-flow-on-79cb265-2026-05-07`
- **Zonas autorizadas:** release checklist, rotacion de secretos, docs, configuracion controlada de release
- **Zonas prohibidas:** booking sin motivo, release improvisado, cambios exploratorios
- **Validacion minima:** preview smoke final, QA matrix final, checklist de release y rollback plan
- **Preview requerido:** si
- **Push a madre permitido:** si
- **Production permitido:** si, solo con gate explicito de Jean
- **Stop condition:** secreto sin rotar, P0 abierto, rollback no definido o QA final incompleto

## Decision final de secuencia

- **Paralelo real:** S01 y S02 pueden arrancar en ventanas distintas con reviewer cruzado.
- **Secuencia critica:** S04 -> S05 -> S06.
- **Release:** S10 existe para cerrar riesgo, no para abrir scope nuevo.
