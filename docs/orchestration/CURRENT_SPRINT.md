# Current Sprint

Sprint:
BKG-08I2

Name:
Sellado de expiracion del handoff Preview y payload E2E

Base:
18efd85c4fe17a586494c67fabaea316354b6d55

State:
TECHNICALLY_VALIDATED

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
READY_FOR_ISOLATED_DATABASE_END_TO_END

Next Action:
ChatGPT reviews BKG-08I2 and defines isolated PostgreSQL lifecycle integration.
