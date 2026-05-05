# Plan operativo paralelo - Marketplace integrado

Fecha: 2026-05-04
Rama madre integrada: integration/lab-marketplace-sprint2a-selective-2026-05-04

## Estado actual

Esta rama madre es la base integrada controlada por Jean. No se debe usar como rama diaria de desarrollo.

Manuel y Jean trabajaran marketplace en paralelo. Cada sprint debe salir en una rama propia desde esta rama madre.

## Regla principal

Nadie trabaja codigo directo sobre la rama madre.

Flujo obligatorio:

1. Actualizar rama madre.
2. Crear rama propia de sprint desde la madre.
3. Trabajar solo el scope autorizado.
4. Validar.
5. Push de la rama de sprint.
6. Revision o merge controlado hacia la madre.
7. Preview integrado.
8. QA minima.
9. Docs actualizados.

## Roles

### Jean

Jean es dueno del repo, dueno de booking/lab y guardian tecnico de la integracion.

Responsabilidades de Jean:
- proteger booking/lab;
- controlar integracion de ramas;
- revisar Vercel, envs y deploys;
- resolver errores globales de build/runtime;
- revisar Prisma, schema y migrations;
- aprobar o ejecutar cambios criticos de DB;
- ayudar con marketplace en frentes tecnicos, estructurales y UI.

### Manuel

Manuel es dueno funcional/producto del marketplace.

Responsabilidades de Manuel:
- definir comportamiento buyer/seller/admin;
- validar reglas operativas;
- priorizar sprints;
- definir tasas, payout, comision, fecha valor y cierre;
- hacer QA operacional real;
- cuidar copy operativo y claridad del flujo.

## Pendiente critico inmediato para Jean

La rama madre integrada perdio parte de Sprint 2A durante el port selectivo.

Manuel creo y pusheo una rama de reconciliacion:

Manuel/reconcile-sprint2a-on-integrated-mother

Commit:
6512972 fix(marketplace): reconcile sprint 2a flow on integration

Jean debe revisar esa rama y mergearla/controlarla hacia la rama madre cuando corresponda.

### Que restaura esa rama

- sellerDeliver.
- confirmDelivery deja de auto-liberar fondos.
- releaseEscrow solo permite liberar desde DELIVERY_CONFIRMED.
- Buyer CTA: Ya recibi.
- Seller CTA: Ya entregue.
- Confirmacion previa en ambos botones.
- Admin IN_ESCROW = Esperando conformidad.
- Admin DELIVERY_CONFIRMED = Fondos por liberar.
- Admin RELEASED = Operacion cerrada.
- Admin boton Liberar fondos solo en DELIVERY_CONFIRMED.

### Lo que NO toca la rama de reconciliacion

- booking;
- /reservas;
- schema;
- migrations;
- rates;
- payout formal;
- paymentProof/proxy SUPER.

## Bloqueo tecnico actual de integracion

tsc y npm run build globales fallan por booking:

components/bookings/PaymentFlipCountdown.tsx

El archivo importa flipclock, pero flipclock no aparece en package.json ni en pnpm-lock.yaml.

Este bloqueo pertenece a integracion/booking y debe ser revisado por Jean antes de declarar la rama madre como base sana para merges finales.

## Distribucion de sprints

### Manuel - lane funcional marketplace

Prioridad:
1. Rates diagnosis / Pendiente de tasa de pago.
2. Diseno funcional de rates/freeze rate/fecha valor.
3. Payout formal y cierre operativo.
4. Listing reservation/state.
5. QA operacional buyer/seller/admin.
6. Reglas de negocio, dinero, estados y flujo.

Ramas sugeridas Manuel:
- Manuel/marketplace-rates-diagnosis
- Manuel/marketplace-payout-design
- Manuel/marketplace-listing-state
- Manuel/marketplace-operational-qa

### Jean - lane tecnico/integracion/UX marketplace

Prioridad:
1. Resolver bloqueo flipclock.
2. Revisar/mergear Manuel/reconcile-sprint2a-on-integrated-mother.
3. Sprint 2A.1 sync stabilization.
4. Modal transaction detail desktop.
5. Timeline/stepper visual.
6. Chat/unread/system messages.
7. Refactors estructurales.
8. Vercel/env/runtime errors.

Ramas sugeridas Jean:
- Jean/integration-fix-flipclock
- Jean/merge-reconcile-sprint2a
- Jean/marketplace-2a1-sync-stabilization
- Jean/marketplace-transaction-detail-ux
- Jean/marketplace-chat-unread-system

## Locks obligatorios

### DB/schema lock

Solo Jean o quien Jean autorice toca:
- prisma/schema.prisma;
- prisma/migrations;
- npx prisma migrate dev;
- npx prisma migrate deploy;
- npx prisma db push.

### Transaction state lock

Un solo dueno por sprint para:
- actions/marketplace/transactions.ts;
- transiciones de estado;
- release;
- confirmDelivery;
- sellerDeliver;
- disputes;
- cancelaciones.

### Rates lock

Un solo dueno por sprint para:
- BCV/Binance;
- freeze rate;
- fallback;
- fecha valor;
- calculo visible de tasa.

### Payout lock

Un solo dueno por sprint para:
- MpPayout;
- seller payout registration;
- release/closure;
- fee breakdown;
- referencias/hash/fecha/metodo/adminId.

### Booking/lab lock

Booking/lab sigue bajo Jean. Manuel no toca booking/lab salvo autorizacion explicita.

## Prohibido

- trabajar codigo directo sobre la rama madre;
- tocar main;
- produccion;
- vercel --prod;
- migraciones sin lock;
- prisma db push contra DB compartida;
- force push;
- mezclar UX con DB critica en el mismo sprint;
- mezclar booking/lab con marketplace sin autorizacion de Jean;
- resolver errores Vercel/env sin logs.

## Validacion minima por sprint

- git diff --check
- npx tsc --noEmit
- npm run build
- git status -sb

Si toca Prisma:

- npx prisma generate
- npx prisma migrate status

Si el build global falla por un bloqueo ajeno, el reporte debe decirlo explicitamente y citar el archivo exacto.

## Rutina de inicio de sesion

Al iniciar sesion, leer:

1. docs/07_handoffs/parallel-sprint-distribution-2026-05-04.md
2. docs/07_handoffs/next-window-brief.md
3. docs/07_handoffs/session-summary-active.md
4. docs/obsidian-vault/SPRINTS_MARKETPLACE_PARALELO.md
5. docs/obsidian-vault/ROADMAP_RESCATE.md
6. docs/obsidian-vault/BUGS_CRITICOS.md

Luego confirmar:
- rama actual;
- sprint asignado;
- owner;
- locks activos;
- archivos autorizados;
- validaciones esperadas;
- stop condition.

## Pendientes prioritarios actuales

1. Jean: resolver bloqueo flipclock.
2. Jean: revisar/mergear rama Manuel/reconcile-sprint2a-on-integrated-mother.
3. Jean: confirmar preview integrado sano.
4. Manuel: iniciar rates diagnosis en rama propia.
5. Jean/Manuel: no pisarse en transactions.ts, AdminDashboard.tsx ni DashboardClient.tsx sin lock.
6. Luego documentar merge y avanzar a Sprint 2A.1 / Rates diagnosis en paralelo.

## Capa de hitos pragmaticos

Ademas de la distribucion tecnica por sprints, el roadmap debe leerse junto con:

- docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md
- docs/obsidian-vault/HITOS_MARKETPLACE_PRACTICOS.md

Estos documentos traducen cada sprint a un resultado verificable para buyer, seller o admin.
