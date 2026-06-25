# BKG-08D Server-Only Payment Entrypoint

- El entrypoint es server-only y no se expone al wizard.
- Preview no abre SQL ni Blob y devuelve una simulacion sanitizada.
- Fuera de Preview se abre primero la sesion SQL y despues el storage privado.
- La clave de idempotencia se deriva en servidor y no se acepta desde el cliente.
- La salida publica nunca expone bookingRequestId, fingerprint, pathname, URL ni token.
- El cierre de la sesion SQL es obligatorio aunque el flujo falle.
- No hay notificaciones, Calendar ni promotion a produccion en este sprint.

