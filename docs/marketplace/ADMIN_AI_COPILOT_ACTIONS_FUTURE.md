# Admin AI Copilot: Future Actions Design

## 1. Fase 1: Read-Only (Estado Actual)
La fase inicial debe ser estrictamente **read-only** por las siguientes razones:
- **Seguridad:** Prevención de ejecuciones accidentales o no autorizadas sobre transacciones sensibles.
- **Validación de Modelo:** Asegurar que el Copilot comprenda correctamente el estado del marketplace (transacciones, usuarios, pagos reportados) antes de otorgarle capacidad de acción.
- **Aprendizaje:** Generar logs de las recomendaciones que el Copilot daría, permitiendo a los administradores humanos validar su precisión sin riesgo operativo.

---

## 2. Fase 2: Capacidades de Acción (Diseño)

En una futura fase, el Admin Copilot podría gestionar el ciclo de vida de la transacción.

### Acciones Diseñadas
| Acción | Descripción | Riesgo | Compensación/Rollback |
| :--- | :--- | :--- | :--- |
| **Solicitar Conformidad** | Pide al usuario final confirmar recepción. | Bajo | Reenvío manual. |
| **Validar Pago** | Confirma que un pago reportado es válido. | Alto | Auditoría de admin, revertir estado. |
| **Liberar Fondos** | Inicia el proceso de pago al vendedor. | Crítico | Registro de disputa, bloqueo manual. |
| **Registrar Pago Vendedor** | Asienta el pago realizado. | Crítico | Reversión de registro contable. |
| **Abrir/Cerrar Disputa** | Gestiona mediaciones. | Medio | Cambio de estado de disputa. |

---

## 3. Requisitos para Habilitación de Acciones
Para que cualquier acción sea considerada, debe cumplir estrictamente con:

### A. Permisos y Confirmación
- **Rol:** Acción restringida exclusivamente a roles `ADMIN` verificados.
- **Confirmación Humana:** NINGUNA acción financiera o de estado se ejecutará sin una aprobación explícita del administrador tras una vista previa de la operación (Two-Man Rule).

### B. Auditoría y Seguridad
- **Logs:** Registro inmutable de cada acción del Copilot + firma del Admin que aprobó.
- **Transparencia:** UI clara que muestre "El Copilot sugiere: X. Acción: [APROBAR] [RECHAZAR]".

### C. Datos Requeridos
- Contexto completo de la `MpTransaction`.
- ID único de entidad.
- Historial de estados previo.

---

## 4. Stop Conditions (Seguridad Crítica)
- **Prohibido:** Automatizar acciones financieras (`liberar fondos`, `registrar pagos`) sin un sistema completo de logs, auditoría y confirmación UI explícita.
- **Prohibido:** Implementar estas capacidades antes de que el sistema de `proof` y `proxy SUPER` esté maduro y auditado por humanos.

*Nota: Este documento es de diseño arquitectónico y no implica ninguna implementación de código.*
