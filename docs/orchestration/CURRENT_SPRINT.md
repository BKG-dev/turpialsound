# Current Sprint

Sprint:
BKG-08A

Name:
Contrato y esquema aislado de pago consolidado

Base:
33bf4fb91f3a17cd26ebd1cf0952194aefae2f74

State:
DIRECTOR_REVIEW

Scope:

* define the consolidated payment contract as a pure module;
* validate the additive payment schema proposal in isolated PostgreSQL;
* register canonical QA routes for the payment contract and schema gate;
* preserve the booking, hold, and expiration contracts already validated.

Out of Scope:

* transactional payment reporting;
* blob boundary;
* notifications;
* wizard integration;
* production;
* manual QA.

Result:

PAYMENT_CONTRACT_AND_SCHEMA_PENDING_CI

Next Action:

ChatGPT verifies the consolidated payment contract and schema before BKG-08B.
