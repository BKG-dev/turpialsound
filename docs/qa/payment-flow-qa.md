# Matriz de QA: Flujo de Pagos

## Objetivo
Validar la lógica de gestión de pagos y verificación de comprobantes.

## Alcance
Desde el estado 'pending_payment' hasta la confirmación o cancelación de la reserva.

## Precondiciones
- Reserva creada en estado 'pending_payment'.

## Casos de Prueba

### 1. Subida de Comprobante (Smoke/Diario)
- **Pasos**: Subir archivo `image/jpeg` válido a una reserva pendiente.
- **Resultado Esperado**: Estado cambia a 'payment_reported', se almacena el archivo.
- **Severidad**: Crítica.

### 2. Comprobante Inválido/Duplicado
- **Pasos**: Subir formato distinto de `image/jpeg`, archivo vacío, archivo mayor al límite, o intentar subir un comprobante ya procesado.
- **Resultado Esperado**: Sistema rechaza la subida con mensaje claro.
- **Severidad**: Alta.

### 3. Expiración de Reserva
- **Pasos**: Dejar pasar el tiempo límite de pago y ejecutar el flujo operativo de expiración.
- **Resultado Esperado**: Reserva cambia a 'expired' y libera el bloqueo de disponibilidad.
- **Severidad**: Crítica.

### 4. Confirmación Administrativa
- **Pasos**: Admin aprueba comprobante.
- **Resultado Esperado**: Estado 'confirmed', disparo de notificaciones de éxito.
- **Severidad**: Crítica.
