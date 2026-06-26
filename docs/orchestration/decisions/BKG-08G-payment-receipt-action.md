# BKG-08G Payment Receipt Action

El upload receipt opaco se integra con la accion protegida sin exponer claves, rutas privadas ni metadata interna al caller.

Reglas:

- la accion solo acepta campos publicos permitidos;
- la autorizacion firmada ocurre antes de leer el recibo;
- el entrypoint de receipt permanece server-only;
- el resultado publico permanece sanitizado;
- el wizard sigue desconectado;
- produccion sigue bloqueada.

Frontera:

- el receipt valida el binding con `publicCode`, `paymentMethod` y `paymentReference`;
- la transaccion de reporte sigue siendo la unica escritura;
- la compensacion de cleanup sigue siendo parte del flow transaccional.
