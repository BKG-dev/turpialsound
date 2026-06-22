# Current Sprint

Sprint:
BKG-04B1

Name:
Correct temporal snapshots and transactional contract

Base:
18d0b609c5c02256d66cfcfc690ff813d1ed5ea2

State:
DIRECTOR_REVIEW

Scope:

* correct temporal snapshot semantics;
* require a single-connection SQL session;
* harden persistence invariants;
* keep the isolated PostgreSQL workflow as the gate.

Out of Scope:

* availability;
* wizard wiring;
* schema.prisma;
* generated Prisma;
* production;
* manual QA;
* Vercel config.

Result:

PERSISTENCE_CORRECTION_PENDING_CI

Next Action:

Director verifies the workflow before approving availability work.
