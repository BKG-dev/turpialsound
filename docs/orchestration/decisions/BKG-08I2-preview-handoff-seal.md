# BKG-08I2 Preview Handoff Seal

- SHA revisado: `18efd85c4fe17a586494c67fabaea316354b6d55`
- Decision: `FIX_REQUIRED`
- Functional SHA historico: `9bad848a031c2dc99e3e438719e5675c7e9b9258`
- Run historico: `28324400123`
- Job historico: `83911837361`
- Hallazgo:
  - el builder del token Preview invertia la relacion entre `holdExpiresAt` y `exp`;
  - el validator no rechazaba de forma explicita `exp > holdExpiresAt`;
  - el E2E no comprobaba el payload exacto enviado a `reportPayment`;
  - en Preview faltaba exigir `uploadReceipt === null`.
- Riesgo:
  - un token real con expiracion posterior al hold podia pasar la frontera temporal;
  - el handoff UI podia enviar mas campos de los permitidos sin ser detectado.
- Correccion: `BKG-08I2`
- Produccion: no autorizada.

