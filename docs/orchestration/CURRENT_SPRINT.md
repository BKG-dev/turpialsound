# Current Sprint

Sprint:
BKG-07B1

Name:
Corregir semantica de allocations en replay idempotente

Base:
b7fecf05592310556f70d153413dd09f3fab6afc

State:
TECHNICALLY_VALIDATED

Scope:

* preserve acquired versus replayed allocation semantics;
* validate persisted replay integrity;
* reject corrupt replay rows;
* keep replay idempotent;
* keep the hold acquisition isolated.

Out of Scope:

* expiration writer;
* wizard wiring;
* production;
* manual QA.

Result:

READY_FOR_BKG_07C

Next Action:

ChatGPT reviews BKG-07B1 and defines isolated expiration and release processing.
