# PAYMENT ARCHITECTURE

**Actualizado:** 2026-04-19
**Estado:** Vigente para el flujo actual
**Modo operativo:** Pago manual temporal con escrow manual

---

## Resumen ejecutivo

La arquitectura de pagos implementada hoy no es una pasarela automatica. Es un flujo de **compra manual asistida por servidor** sobre el dominio del marketplace.

El sistema actual hace esto:

- crea transaccion
- registra metodo seleccionado
- recibe referencia y comprobante
- deja al admin la validacion del pago
- entra en escrow solo tras aprobacion real

El sistema actual no hace esto:

- cobrar por API bancaria
- confirmar via webhook
- almacenar comprobantes en storage productivo

---

## Principios vigentes

- No mezclar marketplace con booking
- No marcar `SOLD_OUT` antes de validacion real
- Mantener trazabilidad por `MpTransactionStatusHistory`
- Mantener el flujo manual hasta que exista una integracion confiable

---

## Modelos del dominio

Los pagos viven en el schema `Mp*` del marketplace y no dependen del sistema de reservas.

Modelos relevantes:

- `MpPayoutMethod`
- `MpListing`
- `MpTransaction`
- `MpTransactionStatusHistory`
- `MpDispute`
- `MpPayout`
- `MpWebhookLog`

---

## Flujo real implementado

### 1. Seleccion de metodo

El checkout obtiene metodos reales del seller desde `MpPayoutMethod`. Hoy solo expone los compatibles con el checkout manual actual.

Compatibles hoy:

- `PAGO_MOVIL`
- `ZELLE`
- `CRYPTO_WALLET`

No integrado en checkout actual:

- `BANK_TRANSFER`

### 2. Creacion de compra

`initiatePurchase()`:

- valida que el listing este activo
- valida que el buyer no sea el seller
- valida que el seller tenga activo el metodo seleccionado
- crea la transaccion en `PENDING_PAYMENT`
- registra `idempotencyKey`
- no toca el estado del listing

### 3. Envio de comprobante

`submitPaymentProof()`:

- exige referencia
- registra `paymentReference`
- registra `paymentProofUrl`
- mueve a `PAYMENT_RECEIVED`

### 4. Validacion admin

`validatePayment()`:

- si aprueba: `IN_ESCROW`, setea fechas de escrow y marca el listing como `SOLD_OUT`
- si rechaza: `PAYMENT_FAILED`

---

## Maquina de estados vigente

```text
PENDING_PAYMENT
  -> PAYMENT_RECEIVED
      -> IN_ESCROW
          -> DELIVERY_CONFIRMED
              -> RELEASED
          -> DISPUTED
              -> RELEASED
              -> REFUNDED
          -> RELEASED
  -> PAYMENT_FAILED
  -> CANCELLED
```

Notas practicas:

- `VALIDATING` sigue existiendo en schema y en acciones admin, pero el flujo principal actual entra a revision desde `PAYMENT_RECEIVED`.
- El flujo operativo vigente es manual aunque la arquitectura futura contemple webhooks.

---

## Comprobantes e imagenes

Estado actual:

- El comprobante puede viajar como string y hoy se comporta como almacenamiento temporal.
- Base64 no es aceptable como estrategia de produccion para comprobantes o imagenes del marketplace.

Decision pendiente obligatoria:

- definir storage productivo para imagenes y comprobantes

Opciones abiertas:

- Cloudflare Images
- S3 + CDN
- otro proveedor gestionado

Hasta resolver eso, el flujo sirve para validacion funcional, no como arquitectura final de media storage.

---

## Que queda diferido

### Mercantil

Queda fuera del flujo actual. Se pospone hasta contar con credenciales, pruebas y una decision de implementacion real.

### Binance Pay

Tambien queda fuera del flujo actual. No forma parte del MVP operativo.

### Webhooks

`MpWebhookLog` y la documentacion de integracion siguen siendo preparacion futura, no comportamiento activo de produccion.

---

## Validaciones pendientes

- QA end-to-end del checkout manual con seller real
- QA de aprobacion admin y transicion a escrow
- decision final de storage para media
- definicion de si `BANK_TRANSFER` entra o no al checkout actual
