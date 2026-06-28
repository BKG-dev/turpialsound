# BKG-08I2 Handoff

- Sellado de expiracion del handoff Preview en curso.
- Builder y validator del token Preview alineados con la relacion `holdAcquiredAt <= iat < exp <= holdExpiresAt`.
- El E2E ahora verifica el payload exacto hacia `reportPayment`.
- En Preview, `uploadReceipt` queda nulo.
- El flujo UI real de simulacion sigue encadenando submission, handoff y recovery sin token en URL.
- El workflow sigue pendiente de CI remoto.
- Integracion aislada de PostgreSQL aun no iniciada.
- Wizard desconectado.
- Produccion bloqueada.
- Siguiente accion: integracion aislada de PostgreSQL para el end-to-end de Preview.

