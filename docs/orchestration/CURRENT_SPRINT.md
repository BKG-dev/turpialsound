# Current Sprint

- Sprint: `BKG-03`
- Name: Recálculo autoritativo de Arma tu paquete
- Objective: Rebuild the bundle estimate authoritatively from the validated submission contract, using only the internal catalog and without trusting client money fields.
- State: `TECHNICALLY_VALIDATED`
- Base: `d8603af449d18074a52a6968fd612c5a611906a6`

## Scope

- authoritative repricing from the validated custom bundle submission payload;
- catalog gap detection for future persistence planning;
- derived server-included items;
- pure technical validation scripts;
- orchestration decision and handoff updates.

## Out of Scope

- backend persistence;
- database writes;
- Prisma schema changes;
- migrations;
- seeds;
- payments;
- notifications;
- Calendar;
- production changes;
- connecting the wizard to the repricer;
- QA manual.

## Next Action

ChatGPT must review BKG-03 and evaluate the isolated database and persistent catalog gates before BKG-04.
