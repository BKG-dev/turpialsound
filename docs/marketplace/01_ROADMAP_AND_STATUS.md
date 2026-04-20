# MARKETPLACE ROADMAP & STATUS

**Actualizado:** 2026-04-19
**Estado:** Marketplace funcional en produccion tecnica
**Scope:** Marketplace separado del booking
**Fuente viva de seguimiento:** `docs/obsidian-vault/*`

---

## Estado rapido

| Area | Estado real |
|---|---|
| Schema Prisma `Mp*` | Operativo y separado del booking |
| Auth y sesiones | Completo |
| Listings | Completo |
| Detalle `/marketplace/[slug]` | Completo |
| Dashboard buyer/seller | Completo |
| Admin panel | Completo |
| Chat persistente | Completo |
| Favoritos | Completo |
| Q&A publica | Completo |
| Checkout | Completo en modo manual temporal |
| Pasarelas automaticas | Diferidas |
| Cron T+7 | Pendiente |
| Upload de imagenes productivo | Pendiente |
| TypeScript | Limpio (`npx tsc --noEmit`) |

---

## Decision operativa vigente

El proyecto entra en una etapa de estabilizacion del marketplace antes de integrar pasarelas.

1. El marketplace queda validado como modulo independiente del booking.
2. El pago sigue siendo manual temporalmente.
3. El checkout ya no usa mocks de cobro.
4. Mercantil y Binance quedan explicitamente diferidos.
5. Obsidian concentra el seguimiento vivo de riesgos, rescate y decisiones.

---

## Flujo de pago vigente

### Lo que ya esta resuelto

- `CheckoutModal.tsx` carga metodos reales del seller.
- `getSellerPayoutMethodsForCheckout()` entrega metodos activos compatibles.
- `initiatePurchase()` crea transaccion coherente con el flujo actual.
- `submitPaymentProof()` registra referencia y comprobante.
- `validatePayment()` define entrada real a escrow.

### Lo que todavia no existe

- Cobro automatico por Mercantil
- Cobro automatico por Binance
- Webhooks de pago reales en produccion
- Storage productivo para comprobantes

---

## Definition of Done actual

### Cumplido

- Codigo funcional del marketplace
- TS limpio
- Checkout sin mocks de pago
- Listing no se agota antes de validacion real
- Documentacion base sincronizada

### Aun no cumplido

- QA manual integral buyer -> admin -> escrow -> release
- Decidir storage productivo de imagenes/comprobantes
- Implementar cron T+7
- Definir roadmap real de pasarelas

---

## Fases

### Fase A - Base marketplace
**Estado:** Completa

- auth
- listings
- chat
- dashboard
- admin
- favoritos
- Q&A

### Fase B - Checkout manual estabilizado
**Estado:** Completa

- metodos reales del seller
- referencia + comprobante
- validacion manual por admin
- escrow coherente

### Fase C - Infraestructura pendiente
**Estado:** Pendiente

- cron T+7
- storage de imagenes/comprobantes
- endurecimiento operativo

### Fase D - Pasarelas
**Estado:** Diferida

- Mercantil
- Binance Pay
- webhooks reales
- conciliacion automatica

---

## Bloqueadores y decisiones abiertas

| Item | Tipo | Estado |
|---|---|---|
| Storage de imagenes | Decision tecnica | Abierto |
| Base64 en produccion | Riesgo tecnico | Debe eliminarse |
| Credenciales Mercantil | Externo | No disponibles |
| Decision Binance | Producto/negocio | Diferida |
| Cron T+7 | Infraestructura | Pendiente |
| QA manual completa | Operacion | Pendiente |

---

## Nota de gobierno documental

Desde esta fecha:

- `docs/marketplace/` describe arquitectura y estado tecnico consolidado.
- `docs/obsidian-vault/` es la fuente de trazabilidad viva del proyecto.

Todo cambio operativo, bloqueo o decision practica debe reflejarse primero en Obsidian y luego consolidarse aqui si cambia el estado tecnico del sistema.
