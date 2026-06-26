# BKG-08F Handoff

- Objetivo: cerrar la frontera de recuperacion segura y transporte privado de pago consolidado.
- Componentes:
  - recovery-session handoff cookie-backed;
  - protected upload transport;
  - recovery token validation before body, SQL or Blob;
  - private upload reuse and cleanup;
  - QA contract and isolated transport gate.
- Codigo local validado y CI remoto pendiente.
- Workflow transportador reconocido: `booking-isolated-custom-bundle-payment-proof-boundary.yml`.
- Preview: aislado de SQL y Blob.
- Wizard: desconectado.
- Produccion: bloqueada.
