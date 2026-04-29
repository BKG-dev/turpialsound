# Matriz de QA: Core Booking (Reservas)

## Objetivo
Validar el flujo completo de creación y gestión inicial de reservas en el sistema.

## Alcance
Desde la selección del servicio hasta la creación de una solicitud en `pending_payment`.

## Precondiciones
- El sistema está desplegado en un entorno de pruebas.
- Los recursos (salas/servicios) están configurados.

## Casos de Prueba

### 1. Creación de Reserva (Smoke/Diario)
- **Pasos**: Cargar página de reservas, seleccionar servicio, seleccionar fecha/hora disponible, completar formulario, enviar.
- **Resultado Esperado**: Reserva creada, estado 'pending_payment', countdown iniciado.
- **Severidad**: Crítica.

### 2. Colisión de Recursos
- **Pasos**: Intentar reservar el mismo recurso en un horario ya ocupado.
- **Resultado Esperado**: El servidor rechaza el submit con error de disponibilidad.
- **Severidad**: Alta.

### 3. Flujo Completo de Reserva
- **Pasos**: Crear reserva hasta instrucciones de pago y reporte de comprobante.
- **Resultado Esperado**: Registro en BD, estado cambia según flujo, notificaciones disparadas.
- **Severidad**: Crítica.

## Casos pendientes de revisar (Codex)
- Verificación atómica de disponibilidad en BD.
- Integración con mocks de email/calendar.
