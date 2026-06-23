# Current Sprint

Sprint:
BKG-07B1

Name:
Corregir semántica de allocations en replay idempotente

Base:
c37fb1cc3b33142c5e656217bb8b4d17499f8c22

State:
DIRECTOR_REVIEW

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

REPLAY_ALLOCATION_CORRECTION_PENDING_CI

Next Action:

ChatGPT verifies replay allocation parity before BKG-07C.
