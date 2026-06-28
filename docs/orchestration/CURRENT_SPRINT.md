# Current Sprint

Sprint:
BKG-08I2

Name:
Sellado de expiracion del handoff Preview y payload E2E

Base:
18efd85c4fe17a586494c67fabaea316354b6d55

State:
DIRECTOR_REVIEW

Scope:

* invariantes temporales firmadas del handoff Preview;
* builder/validator del token alineados con expiry del hold;
* payload exacto del handoff UI hacia la accion;
* receipt simulado nulo en Preview.

Out of Scope:

* DB o Blob reales;
* wiring del wizard a produccion;
* produccion;
* QA manual;
* siguiente sprint.

Result:
PREVIEW_HANDOFF_SEAL_PENDING_CI

Next Action:
ChatGPT verifies the signed hold-expiry invariant and exact Preview action payload before isolated PostgreSQL lifecycle integration.
