# Matriz de QA: Flujo de Pagos

## Objetivo
Validar la logica de gestion de pagos y verificacion de comprobantes.

## Alcance
Desde el estado `pending_payment` hasta la confirmacion o cancelacion de la reserva.

## Precondiciones
- Reserva creada en estado `pending_payment`.

## Casos de Prueba

### 1. Subida de Comprobante (Smoke/Diario)
- **Pasos**: Subir archivo `image/jpeg` valido a una reserva pendiente.
- **Resultado Esperado**: Estado cambia a `payment_reported`, se almacena el archivo.
- **Severidad**: Critica.

### 2. Comprobante Invalido/Duplicado
- **Pasos**: Subir formato distinto de `image/jpeg`, archivo vacio, archivo mayor al limite, o intentar subir un comprobante ya procesado.
- **Resultado Esperado**: Sistema rechaza la subida con mensaje claro.
- **Severidad**: Alta.

### 3. Expiracion de Reserva (Automatica/Manual)
- **Pasos**: Dejar pasar el tiempo limite de pago o ejecutar el endpoint `/api/bookings/expire` con bearer valido.
- **Resultado Esperado**: Solo reservas `pending_payment` reales cambian a `rejected`, `internalNotes` incluye `[ops_status:expired]`, se crea auditoria `booking_expired_payment_window` y el slot/recurso queda liberado para nuevas reservas.
- **No debe ocurrir**: Reservas `payment_reported` o con comprobante activo no deben expirar automaticamente; quedan para revision/admin.
- **Severidad**: Critica.

### 4. Confirmacion Administrativa
- **Pasos**: Admin aprueba comprobante.
- **Resultado Esperado**: Estado `confirmed`, disparo de notificaciones de exito.
- **Severidad**: Critica.
