# Current Sprint

Sprint:
BKG-08C

Name:
Frontera privada aislada para comprobantes de pago consolidado

Base:
c69581622cbf13459b1ffbde4c5bb6c9ec293bd8

State:
DIRECTOR_REVIEW

Scope:

* implement the isolated private payment proof boundary;
* keep the transactional payment reporting adapter intact;
* validate binary signatures, deterministic private paths, trusted metadata, and cleanup behavior;
* integrate the boundary only through the isolated proof flow gate.

Out of Scope:

* production Blob wiring;
* notifications;
* wizard integration;
* production;
* manual QA;
* BKG-08D.

Result:

PRIVATE_PAYMENT_PROOF_BOUNDARY_PENDING_CI

Next Action:

ChatGPT verifies the isolated private payment proof boundary before BKG-08D.
