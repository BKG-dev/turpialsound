# Design Brief: Admin AI Copilot (Privado)

## 1. Justificación de Aislamiento
El chat público y el Admin AI Copilot deben ser entidades arquitectónicas totalmente separadas. 
- **Riesgo:** El uso de un "modo dios" o un prompt único para ambos contextos expondría riesgos inaceptables de inyección de prompts, fuga de datos administrativos a usuarios no autorizados y contaminación de estados.
- **Principio:** El asistente público solo conoce información pública. El Copilot conoce el estado administrativo, pero opera bajo estricta autenticación.

## 2. Arquitectura Recomendada
- **Ruta:** `/marketplace/admin/copilot`
- **Autenticación:** Requiere sesión activa con privilegios `ADMIN` en el sistema de Auth actual.
- **RBAC (Role Based Access Control):** El acceso al Copilot debe estar restringido a roles específicos (ej: `OPERATOR`, `MANAGER`, `ADMIN`).
- **Contexto:** Efímero por sesión administrativa, vinculado al ID del usuario admin.

## 3. Herramientas Sugeridas (Fase 1: Read-only)
El Copilot inicial debe ser estrictamente informativo para auditoría interna:
- **Usuarios:** Consulta de estado de cuentas registradas.
- **Ventas:** Resumen de volumen de ventas del día.
- **Operaciones:** Listado de transacciones pendientes de revisión.
- **Detalle:** Explicación técnica/administrativa de una transacción específica.
- **Dashboard:** Explicación de los estados y KPIs del dashboard admin.

## 4. Acciones Futuras (Con confirmación UI)
Cualquier acción de escritura debe seguir el patrón **[IA -> Propuesta -> UI Confirmación -> Acción Admin]**:
- Validación de pagos.
- Solicitud de conformidad al comprador.
- Liberación de fondos (tras cierre exitoso).
- Registro de pagos a vendedores.

## 5. Auditoría y Seguridad
- **Auditoría Obligatoria:** Cada solicitud enviada al Copilot debe registrarse (quién, cuándo, qué preguntó, qué respondió).
- **Logs Seguros:** Los logs deben residir en una base de datos de auditoría, nunca en el historial del LLM.
- **Riesgos P0/P1/P2:**
    - **P0:** Fuga de claves/tokens mediante jailbreak admin (Mitigación: no inyectar secretos).
    - **P1:** Acción administrativa no autorizada (Mitigación: siempre exigir confirmación explícita en UI).
    - **P2:** Alucinación en estados financieros (Mitigación: usar herramientas deterministas, no inferencias del LLM para datos críticos).

## 6. Secuencia Recomendada
1. Implementar infraestructura de *Read-only* para consulta de datos.
2. Establecer el sistema de logs de auditoría.
3. (Opcional/Futuro) Implementar flujo de confirmación UI para acciones de escritura.
