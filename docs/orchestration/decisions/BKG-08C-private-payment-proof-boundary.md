# BKG-08C Private Payment Proof Boundary

- La frontera privada de comprobantes de pago debe validar bytes reales y no confiar en rutas, URLs o MIME declarados sin verificación.
- El pathname privado debe ser determinista y no revelar la clave de idempotencia original.
- La metadata confiable debe surgir únicamente de la frontera inyectable y del objeto privado confirmado por el store.
- La subida privada debe ser reutilizable de forma segura y permitir cleanup compensatorio sólo cuando la llamada creó el objeto.
- El flow aislado debe conectar la frontera privada con el adapter transaccional de BKG-08B sin Blob real, sin server actions y sin wizard.
- No hay wiring de producción en este sprint.
