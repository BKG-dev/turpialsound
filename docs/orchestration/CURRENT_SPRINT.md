# Current Sprint

Sprint:
BKG-07A

Name:
Contrato y esquema aislado de holds e idempotencia

Base:
4e2b597471347e572121ce61b876f6fb68c7fcd6

State:
DIRECTOR_REVIEW

Scope:

* additive hold schema proposal;
* pure hold contract;
* canonical fingerprint;
* replay classification;
* isolated PostgreSQL schema gate;
* orchestration state bootstrap.

Out of Scope:

* hold acquisition;
* resource assignment;
* wizard wiring;
* Prisma schema changes;
* production;
* manual QA.

Result:

HOLD_SCHEMA_AND_CONTRACT_PENDING_CI

Next Action:

ChatGPT verifies the isolated hold schema and contract before BKG-07B.
