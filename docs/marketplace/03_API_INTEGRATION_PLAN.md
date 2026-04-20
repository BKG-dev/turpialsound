# API INTEGRATION PLAN

**Actualizado:** 2026-04-19
**Estado:** Diferido por decision operativa
**Nota:** Este documento describe trabajo futuro, no el flujo activo actual

---

## Decision actual

Las integraciones de Mercantil y Binance no forman parte del flujo vigente del marketplace.

El sistema operativo actual usa:

- checkout manual
- metodos reales del seller
- comprobante manual
- validacion admin

Las pasarelas quedan para una fase posterior, despues de estabilizar:

- QA manual del flujo actual
- cron T+7
- storage productivo de imagenes/comprobantes

---

## Alcance futuro

### Mercantil

Objetivo futuro:

- soporte para C2P
- Pago Movil
- Boton de Pago
- webhook de confirmacion
- conciliacion automatica

Prerequisitos:

- credenciales sandbox/produccion
- documentacion oficial validada
- definicion de estados y conciliacion
- pruebas end-to-end

### Binance Pay

Objetivo futuro:

- orden automatica
- deteccion de pago
- webhook
- refund parcial o total

Prerequisitos:

- decision de negocio de usar merchant API
- credenciales
- politica de redes y activos soportados

---

## Integracion con el flujo actual

Cuando una pasarela entre, debe respetar estas reglas ya fijadas:

1. No romper el aislamiento del dominio marketplace.
2. No marcar el listing como `SOLD_OUT` antes de validacion/confirmacion real.
3. Mantener `MpTransactionStatusHistory` como trail obligatorio.
4. Reemplazar el almacenamiento temporal de comprobantes por storage productivo.

---

## Estado de preparacion

| Item | Estado |
|---|---|
| Schema base para transacciones | Listo |
| Schema base para webhook logs | Listo |
| Flujo manual temporal | Operativo |
| Cliente Mercantil | No iniciado |
| Cliente Binance | No iniciado |
| Webhooks en produccion | No iniciados |
| Pruebas sandbox | Bloqueadas o diferidas |

---

## Orden recomendado

1. Cerrar QA manual del checkout real actual.
2. Resolver media storage productivo.
3. Implementar cron T+7.
4. Definir Mercantil como primera pasarela real.
5. Evaluar Binance despues.

---

## Variables futuras

Las siguientes variables siguen siendo futuras y no bloquean el flujo operativo actual:

- `MERCANTIL_*`
- `BINANCE_*`
- `CRON_SECRET` para el cron cuando se implemente

La ausencia de estas variables hoy no invalida el marketplace manual.
