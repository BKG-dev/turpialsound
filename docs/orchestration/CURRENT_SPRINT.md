# Current Sprint

Sprint:
BKG-06

Name:
Asignacion de recursos y deteccion aislada de colisiones

Base:
262e2adc77b7f25b66ca8cfa58b5a171da51720d

State:
TECHNICALLY_VALIDATED

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

TECHNICALLY_VALIDATED

Next Action:

ChatGPT reviews BKG-06 and decides whether to start BKG-07 after resolving the remaining resource policy gaps.
