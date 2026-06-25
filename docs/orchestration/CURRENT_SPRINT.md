# Current Sprint

Sprint:
BKG-08D

Name:
Entrypoint server-only seguro para reporte de pago consolidado

Base:
14b6dd49029c79cbc705f0598f49def353beb01b

State:
DIRECTOR_REVIEW

Scope:

* create a safe server-only payment entrypoint;
* keep Preview isolated from SQL and Blob;
* preserve the isolated proof flow and transactional reporting gates.

Out of Scope:

* public Server Action wiring;
* notifications;
* wizard integration;
* production;
* manual QA;
* BKG-08E.

Result:

PAYMENT_SERVER_ENTRYPOINT_PENDING_CI

Next Action:

ChatGPT verifies the safe server-only payment entrypoint before action wiring.
