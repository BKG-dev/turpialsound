# Current Sprint

Sprint:
BKG-08B

Name:
Adapter transaccional aislado de reporte de pago consolidado

Base:
632faaa777793df9f2f1dd56a62b4e346eece3b8

State:
TECHNICALLY_VALIDATED

Scope:

* implement the isolated transactional payment reporting adapter;
* keep the additive payment schema proposal intact;
* keep hold acquisition and expiration gates compatible;
* validate replay, proof persistence, rollback, and payment-versus-expiration races in ephemeral PostgreSQL.

Out of Scope:

* blob upload wiring;
* notifications;
* wizard integration;
* production;
* manual QA;
* BKG-08C.

Result:

READY_FOR_BKG_08C

Next Action:

ChatGPT reviews BKG-08B and defines the isolated private Blob boundary.
