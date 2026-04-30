# Matriz de QA: Calendario y Notificaciones

## Objetivo
Validar la correcta sincronización con servicios externos (Email, Google Calendar).

## Alcance
Notificaciones automáticas y gestión de eventos de calendario.

## Precondiciones
- Integración API configurada y funcionando en entorno de pruebas.

## Casos de Prueba

### 1. Notificaciones (Release)
- **Pasos**: Finalizar reserva, subir comprobante o ejecutar expiración.
- **Resultado Esperado**: Recepción de correos automáticos (mock/log).
  - Confirmar envío de `booking.expired`.
- **Severidad**: Alta.

### 2. Sincronización Calendar
- **Pasos**: Confirmar reserva o ejecutar expiración.
- **Resultado Esperado**:
  - Confirmar: Evento creado/actualizado.
  - Expirar: Evento marcado como expired en Calendar.
- **Severidad**: Alta.

### 3. Manejo de Errores (Calendar/Email)
- **Pasos**: Simular caída de API de Google o servicio de email.
- **Resultado Esperado**:
  - Logs de error claros.
  - Auditoría (AuditLog) registra el fallo en Calendar.
  - El sistema no se bloquea.
- **Severidad**: Media.
