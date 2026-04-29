# Matriz de QA: Calendario y Notificaciones

## Objetivo
Validar la correcta sincronización con servicios externos (Email, Google Calendar).

## Alcance
Notificaciones automáticas y gestión de eventos de calendario central. La integración de calendar vive en `lib/bookings/google-calendar.ts`.

## Precondiciones
- Integración API configurada y funcionando en entorno de pruebas.

## Casos de Prueba

### 1. Notificaciones (Release)
- **Pasos**: Finalizar reserva o subir comprobante.
- **Resultado Esperado**: Recepción de correos automáticos (mock/log).
- **Severidad**: Alta.

### 2. Sincronización Calendar
- **Pasos**: Crear solicitud, reportar pago, confirmar reserva y cancelar/expirar una solicitud en entorno de prueba.
- **Resultado Esperado**: Evento creado/actualizado/marcado según estado operativo en Google Calendar.
- **Severidad**: Alta.

### 3. Manejo de Errores
- **Pasos**: Simular caída de API de Google o servicio de email.
- **Resultado Esperado**: Logs de error claros, el sistema no se bloquea.
- **Severidad**: Media.
