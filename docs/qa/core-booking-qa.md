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

---

## QA de concurrencia / atomicidad de slots

### 1. Doble Submit Simultáneo (Doble Click)
- **Pasos**: En una reserva válida, hacer doble clic rápido en el botón de submit o ejecutar dos peticiones idénticas desde la misma sesión.
- **Resultado Esperado**: Solo una reserva creada. El sistema gestiona la idempotencia o el bloqueo de transacción, evitando duplicidad.
- **Severidad**: Alta.

### 2. Race Condition (Dos navegadores/usuarios)
- **Pasos**: Abrir dos perfiles/navegadores distintos. Seleccionar el mismo recurso y slot. Enviar ambos formularios casi al mismo tiempo (a menos de 500ms).
- **Resultado Esperado**: La primera petición tiene éxito (200/201). La segunda debe fallar (400/409) con mensaje de "Slot no disponible" o error de concurrencia controlado, sin crear una segunda reserva.
- **Severidad**: Crítica.

### 3. Verificación en Admin (/admin)
- **Pasos**: Tras realizar los tests anteriores, verificar en el panel de admin si existen entradas duplicadas para el mismo slot/recurso.
- **Resultado Esperado**: Una sola entrada válida.
- **Severidad**: Alta.
