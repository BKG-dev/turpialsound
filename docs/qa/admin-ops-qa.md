# Matriz de QA: Admin Ops

## Objetivo
Validar las funcionalidades de administración de reservas.

## Alcance
Panel de administración en `/admin`.

## Precondiciones
- Usuario con credenciales de administrador.

## Casos de Prueba

### 1. Visualización (Smoke)
- **Pasos**: Acceder a `/admin`.
- **Resultado Esperado**: Lista de reservas cargada correctamente.
- **Severidad**: Crítica.

### 2. Gestión de Reservas
- **Pasos**: Aplicar filtros (pendientes, reportadas), ver comprobante, confirmar/cancelar reserva.
- **Resultado Esperado**: Acción exitosa y actualización de estados en BD.
- **Severidad**: Crítica.

### 3. Seguridad de Acceso
- **Pasos**: Intentar acceder a `/admin` sin sesión interna válida.
- **Resultado Esperado**: Redirección a `/admin/login`.
- **Severidad**: Crítica.
