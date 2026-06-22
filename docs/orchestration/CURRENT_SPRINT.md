# Current Sprint

Sprint:
BKG-06

Name:
Asignacion de recursos y deteccion aislada de colisiones

Base:
262e2adc77b7f25b66ca8cfa58b5a171da51720d

State:
DIRECTOR_REVIEW

Scope:

* build the canonical resource policy for managed services;
* resolve candidate physical resources from the authoritative schedule;
* detect isolated conflicts with read-only SQL;
* keep resourceId out of persistence and out of the wizard.

Out of Scope:

* holds;
* resource persistence;
* wizard wiring;
* production writes;
* manual QA;
* Vercel config.

Result:

RESOURCE_CONFLICT_GATE_PENDING_CI

Next Action:

ChatGPT verifies the isolated resource conflict workflow and resolves the remaining resource policy gaps.
