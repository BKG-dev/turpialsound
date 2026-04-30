# Matriz de QA: Admin Ops

## Objetivo
Validar las funcionalidades de administracion de reservas.

## Alcance
Panel de administracion en `/admin`.

## Precondiciones
- Usuario con credenciales de administrador.

## Casos de Prueba

### 1. Visualizacion (Smoke)
- **Pasos**: Acceder a `/admin`.
- **Resultado Esperado**: Lista de reservas cargada correctamente.
- **Severidad**: Critica.

### 2. Gestion de Reservas
- **Pasos**: Aplicar filtros (pendientes, reportadas), ver comprobante, confirmar/cancelar reserva.
- **Resultado Esperado**: Accion exitosa y actualizacion de estados en BD.
- **Severidad**: Critica.

### 3. Ejecucion de Expiracion (Admin)
- **Pasos**: Cargar `/admin` con una reserva vencida en espera de pago.
- **Resultado Esperado**: Reserva marcada como `rejected`, notas actualizadas y slot liberado.
- **No debe ocurrir**: Reservas `payment_reported` o con comprobante activo no deben ser expiradas por esta ejecucion.
- **Severidad**: Alta.

### 4. Seguridad de Acceso
- **Pasos**: Intentar acceder a `/admin` sin sesion interna valida.
- **Resultado Esperado**: Redireccion a `/admin/login`.
- **Severidad**: Critica.

### 5. API Expiracion (Seguridad)
- **Pasos**: Ejecutar `POST /api/bookings/expire` sin bearer, con bearer invalido y con bearer valido en entorno de prueba.
- **Resultado Esperado**: Sin bearer o bearer invalido responde `401`; con bearer valido ejecuta expiracion.
- **Severidad**: Critica.
