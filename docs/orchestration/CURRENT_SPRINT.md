# Current Sprint

Sprint:
BKG-04B

Name:
Persistence adapter mult-item isolated

Base:
145d2307e91ba93e6681a7a587c3c50a3f5c3373

State:
DIRECTOR_REVIEW

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

PERSISTENCE_ADAPTER_PENDING_CI

Next Action:

ChatGPT verifies the isolated mult-item persistence workflow before starting availability work.
