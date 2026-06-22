# Current Sprint

Sprint:
BKG-04B

Name:
Persistence adapter mult-item isolated

Base:
145d2307e91ba93e6681a7a587c3c50a3f5c3373

State:
TECHNICALLY_VALIDATED

Scope:

* implementar el persistence adapter aislado;
* persistir BookingRequest y BookingRequestItem snapshot-backed;
* mantener la transaccionalidad y el rollback obligatorio;
* validar el flujo con GitHub Actions y PostgreSQL efimero.

Out of Scope:

* schema.prisma;
* generated Prisma;
* Preview wiring;
* application Preview integration;
* production;
* QA manual.

Result:

READY_FOR_BKG_05

Next Action:

ChatGPT reviews BKG-04B and defines continuous availability block calculation.
