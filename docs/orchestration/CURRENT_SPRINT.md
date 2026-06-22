# Current Sprint

- Sprint: `BKG-02A`
- Name: Endurecer el contrato backend multitem de Arma tu paquete
- Objective: Harden the strict submission contract with isolated errors, strict session duration handling, Venezuelan phone normalization, and real catalog exhaustiveness checks.
- State: `TECHNICALLY_VALIDATED`
- Base: `1105064abd0d2c87a8b3e40ad0bcbec54e263e65`

## Scope

- submission parser hardening;
- strict requester and item validation;
- phone normalization for Venezuelan WhatsApp numbers;
- real catalog exhaustiveness checks in the canonical QA script;
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
- connecting the wizard to the contract;
- authoritative repricing.

## Next Action

ChatGPT must review BKG-02A and decide whether to start the authoritative server repricing sprint.
