---
tags: ["#status/live-source", "#area/backend", "#area/ui", "#area/ops"]
---

# Bugs Criticos

Este archivo registra los bloqueos y riesgos operativos activos del marketplace al 2026-04-20 y sirve como checkpoint de cierre de sesion.

## 1. Migracion real de conciliacion manual pendiente o no confirmada

- **Descripcion**: La conciliacion manual ya usa `paymentSenderBank` y `paymentPaidAt` a nivel de codigo, pero sigue siendo bloqueador hasta confirmar que la migracion fue aplicada en la base real.
- **Estado real**: Bloqueador critico mientras no se confirme o aplique en entorno operativo real.
- **Impacto**: Si la base real no tiene esas columnas e indices, el flujo real puede quedar incompleto o romper en admin/checkout aunque el codigo ya este listo.
- **Prioridad**: Critica.
- **Accion inmediata**: Verificar la base real; si falta, aplicar migracion antes de seguir.

## 2. QA operativa end-to-end no ejecutada

- **Descripcion**: El flujo manual actual ya esta funcional, pero falta validacion manual completa buyer -> admin -> escrow -> payout manual seller.
- **Estado real**: Pendiente.
- **Impacto**: Puede haber fallas de operacion no detectadas por tipado o lectura de codigo.
- **Prioridad**: Critica.
- **Accion inmediata**: Ejecutar prueba de punta a punta antes de abrir mas alcance.

## 3. Storage productivo definitivo de media aun no definido

- **Descripcion**: Imagenes del marketplace y comprobantes ya salieron de base64, pero el storage actual sigue siendo temporal.
- **Estado real**: Resuelto el problema de base64; pendiente la capa definitiva de storage durable.
- **Impacto**: El flujo mejora rendimiento y persistencia practica, pero aun no es la solucion final de produccion.
- **Prioridad**: Alta.
- **Accion inmediata**: Mantener la capa desacoplada actual y migrar luego el backend de storage sin rehacer el flujo.

## 4. Base64 fuera del camino productivo, no reabrir

- **Descripcion**: Base64 ya no debe volver al flujo productivo de listings ni comprobantes.
- **Estado real**: Resuelto en el checkpoint actual.
- **Impacto**: Mejora rendimiento, reduce riesgo sobre Neon y evita payloads innecesarios.
- **Prioridad**: Regla operativa.
- **Accion inmediata**: Mantener persistencia por URL y no reintroducir data URLs en el camino real.

## 5. Payout operativo sin cierre final auditado

- **Descripcion**: El sistema ya distingue entre monto operativo y monto realmente listo para pago, pero aun no existe el ultimo estado explicito de "pagado al vendedor".
- **Estado real**: `RELEASED` funciona como cola de payout manual, no como cierre contable final.
- **Impacto**: El seller summary ya no sobreestima cobros, pero falta trazabilidad completa del ultimo paso.
- **Prioridad**: Alta.
- **Accion inmediata**: Mantener `RELEASED` como cola operativa y definir el estado final auditable despues.

## 6. Cron T+7 no implementado

- **Descripcion**: El release automatico del escrow aun no existe.
- **Estado real**: Pendiente.
- **Impacto**: La liberacion sigue siendo manual por admin.
- **Prioridad**: Media-Alta.
- **Accion inmediata**: Mantener liberacion manual hasta estabilizar flujo y luego implementar cron.

## 7. No reabrir validacion admin desde estados incorrectos

- **Descripcion**: El backend ya fue endurecido para que la validacion admin no ocurra desde `PENDING_PAYMENT`; solo desde `PAYMENT_RECEIVED` o `VALIDATING`.
- **Estado real**: Resuelto y vigente.
- **Impacto**: Reduce el riesgo de aprobar transacciones sin conciliacion real.
- **Prioridad**: Regla operativa.
- **Accion inmediata**: Mantener esta restriccion y no reabrir estados previos sin transicion explicita.

## Pendiente de validar

- QA completa con imagenes reales en cards, detalle y dashboard.
- QA completa con comprobantes reales en checkout/admin.
- Confirmacion real de la migracion `paymentSenderBank` en base operativa.

## Requisito transversal del proyecto

SEO/AEO es requisito transversal del sitio completo. No es un bug puntual del marketplace, pero si una condicion obligatoria para cualquier cambio de contenido, estructura, slugs, listings o metadata.

## Siguiente paso exacto al retomar

Resolver primero:

1. verificar la base real y confirmar `paymentSenderBank`,
2. aplicar migracion real si falta,
3. ejecutar QA manual end-to-end,
4. documentar hallazgos,
5. luego pasar al storage productivo definitivo.

Despues de eso:

6. cierre final de payout,
7. cron T+7,
8. reabrir pasarelas solo cuando el flujo manual este estable.
