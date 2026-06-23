# BKG-07B Transactional Hold Acquisition

1. Disponibilidad y persistencia ocurren en la misma transacción.
2. La transacción es serializable con un máximo de tres intentos.
3. Los recursos físicos se bloquean antes de comprobar colisiones.
4. Los holds activos bloquean recursos.
5. Los holds expirados no bloquean.
6. El pago reportado continúa bloqueando aunque el hold haya expirado.
7. `no_physical_resource` permanece con `resourceId` `NULL`.
8. `active_replay` no extiende la ventana.
9. `expired_replay` exige una nueva clave.
10. `COMMIT` solo ocurre para una adquisición nueva.
11. `expiration writer` queda para `BKG-07C`.
12. No hay server action ni producción en este sprint.
