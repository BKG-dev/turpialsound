# Plan operativo paralelo - Marketplace integrado

Fecha: 2026-05-05
Estado: Sprint 0 activo
Rama madre integrada: `integration/lab-marketplace-sprint2a-selective-2026-05-04`

## Premisa de ownership

- Jean = owner tecnico del repo, booking/lab, integracion, Prisma/schema/migrations, Vercel/envs y salud de rama madre.
- Manuel = owner funcional/producto marketplace: buyer/seller/admin, rates, payout, listing reservation/state, QA operacional, copy y reglas de negocio.

## Regla principal

- Nadie trabaja codigo directo sobre la rama madre.
- Cada sprint sale en rama propia (`Jean/...` o `Manuel/...`) creada desde la rama madre.
- La rama madre solo recibe merges validados.

Flujo obligatorio:

1. Actualizar rama madre.
2. Crear rama propia del sprint desde la madre.
3. Trabajar solo el scope autorizado por sprint.
4. Validar.
5. Push de la rama del sprint.
6. Revision o merge controlado hacia la madre.
7. Preview integrado.
8. QA minima.
9. Docs actualizados.

## Sprint 0 (activo)

- Owner: Jean (tecnico), Manuel (QA/product review).
- Objetivo: confirmar rama madre integrada, booking/lab + marketplace, envs, Prisma, build, preview y smoke test.

## Distribucion de sprints

- Sprint 2A.1 Sync stabilization: Jean tecnico, Manuel QA/product.
- Sprint UX-TX-Detail: Jean tecnico, Manuel product review.
- Sprint 3A Rates diagnosis: Manuel owner, Jean technical review.
- Sprint 3B Rates implementation: Jean tecnico si hay DB/schema, Manuel product owner.
- Sprint 4A Payout architecture: Manuel product owner, Jean review tecnico DB.
- Sprint 4B Payout implementation: Jean tecnico si hay DB/schema, Manuel QA/product.
- Listing reservation/state: Manuel reglas, Jean si toca DB critica.
- Chat/system messages: Jean tecnico, Manuel QA.
- Publish requirements / Filters / Search: dividido segun UI/reglas.

## Pendiente critico inmediato para Jean

La rama madre integrada perdio parte de Sprint 2A durante el port selectivo.

Rama de reconciliacion identificada:

- `Manuel/reconcile-sprint2a-on-integrated-mother`
- commit `6512972` fix(marketplace): reconcile sprint 2a flow on integration

Jean debe revisar esa rama y mergearla/controlarla hacia la rama madre cuando corresponda.

### Que restaura esa rama

- `sellerDeliver`
- `confirmDelivery` deja de auto-liberar fondos
- `releaseEscrow` solo libera desde `DELIVERY_CONFIRMED`
- CTA buyer/seller de conformidad operativa
- Admin `IN_ESCROW` / `DELIVERY_CONFIRMED` / `RELEASED` alineados

### Lo que NO toca la rama de reconciliacion

- booking
- `/reservas`
- schema/migrations
- rates
- payout formal
- `paymentProof`/proxy SUPER

## Locks obligatorios

### DB/schema lock

Solo Jean o quien Jean autorice toca:

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `prisma migrate dev/deploy`
- `prisma db push`

### Transaction state lock

Un solo owner por sprint para:

- `actions/marketplace/transactions.ts`
- transiciones de estado
- `release`
- `confirmDelivery`
- `sellerDeliver`
- disputas/cancelaciones

### Rates lock

Un solo owner por sprint para:

- BCV/Binance
- freeze rate
- fallback
- fecha valor
- calculo visible de tasa

### Payout lock

Un solo owner por sprint para:

- `MpPayout`
- payout seller
- release/closure
- fee breakdown
- referencias/hash/fecha/metodo/adminId

### Booking/lab lock

Booking/lab sigue bajo Jean. Manuel no toca booking/lab salvo autorizacion explicita.

## Prohibido

- tocar `main`
- tocar produccion
- `vercel --prod`
- force push
- migraciones sin lock
- mezclar UX con DB critica en el mismo sprint
- mezclar booking/lab con marketplace sin autorizacion de Jean

## Validacion minima por sprint

- `git diff --check`
- `npx tsc --noEmit`
- `npm run build`
- `git status -sb`

Si toca Prisma:

- `npx prisma generate`
- `npx prisma migrate status`

Si el build global falla por un bloqueo ajeno, reportarlo con archivo exacto.

## Rutina de inicio de sesion

Leer:

1. `docs/07_handoffs/parallel-sprint-distribution-2026-05-04.md`
2. `docs/07_handoffs/next-window-brief.md`
3. `docs/07_handoffs/session-summary-active.md`
4. `docs/obsidian-vault/SPRINTS_MARKETPLACE_PARALELO.md`
5. `docs/obsidian-vault/ROADMAP_RESCATE.md`
6. `docs/obsidian-vault/BUGS_CRITICOS.md`

Luego confirmar:

- rama actual
- sprint asignado
- owner
- locks activos
- archivos autorizados
- validaciones esperadas
- stop condition

## Capa de hitos y QA

Ademas de esta distribucion, seguir:

- `docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md`
- `docs/obsidian-vault/HITOS_MARKETPLACE_PRACTICOS.md`
- `docs/07_handoffs/marketplace-integrated-qa-procedure-2026-05-04.md`
- `docs/obsidian-vault/QA_MARKETPLACE_INTEGRADO.md`
