# BKG-08D Handoff

- Objetivo: introducir un entrypoint server-only seguro para reporte de pago consolidado.
- Componentes:
  - core inyectable para decidir runtime, idempotencia y flujo;
  - wrapper server-only que reusa el guard de Preview;
  - adaptador SQL dedicado con conexion unica;
  - adaptador privado de Blob inyectable;
  - contrato y gate aislado para validacion.
- Estado remoto: pendiente de workflow CI.
- Preview: aislado de SQL y Blob.
- Wizard: desconectado.
- Produccion: bloqueada.

