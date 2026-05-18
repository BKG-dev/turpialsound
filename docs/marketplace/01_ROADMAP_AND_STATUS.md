# MARKETPLACE ROADMAP & STATUS

**Actualizado:** 2026-05-17 17:35 VET
**Estado:** Marketplace completo S12-S-REV-01 + S-MP-01 carrito consolidado. Ratings, reviews, KPI, SEO, export pagos, carrito multivendedor e inventario por cantidad implementados.
**Preview Vercel:** `turpialsound-egsoseogk-bkgs-projects-829c67c1.vercel.app`
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
| Checkout | Completo en modo manual temporal (transicion a confirmacion de entrega implementada) |
| Carrito consolidado | Completo S-MP-01: `MpOrder` padre, hijas por seller/listing, cantidad e inventario real |
| Pasarelas automaticas | Diferidas |
| Cron T+7 | Pendiente |
| Upload de imagenes productivo | Implementado con Vercel Blob publico no-booking; QA viva completada |
| TypeScript | Limpio (`npx tsc --noEmit`) |
| Playwright UI testing | Instalado en rama madre (S11). Login UI smoke 3/3 PASS. |

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
- `checkoutCart()` crea orden consolidada con transacciones hijas por listing/seller.
- `submitOrderPaymentProof()` exige comprobante y propaga proof a orden e hijas.
- `submitPaymentProof()` registra referencia y comprobante.
- `validatePayment()` define entrada real a escrow.

### Lo que todavia no existe

- Cobro automatico por Mercantil
- Cobro automatico por Binance
- Webhooks de pago reales en produccion
- Storage sensible para comprobantes separado del Blob publico no-booking

---

## Definition of Done actual

### Cumplido

- Codigo funcional del marketplace
- TS limpio
- Checkout sin mocks de pago
- Listing no se agota antes de validacion real
- Carrito consolidado multivendedor con inventario por cantidad
- QA canonico `S-MP-01` 17/17 PASS
- Documentacion base sincronizada
- QA harness server-side 12/12 PASS
- Playwright login UI smoke 3/3 PASS

### Aun no cumplido

- QA manual integral buyer -> admin -> escrow -> release
- Configurar y validar Vercel Blob no-booking con `TS_WEB_BLOB_READ_WRITE_TOKEN`
- Implementar cron T+7
- Definir roadmap real de pasarelas
- Purchase flow browser E2E (S12)
- Full regression browser (S17)

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
- carrito consolidado con `MpOrder`
- unidades por transaccion en `MpTransaction.quantity`

### Fase C - Infraestructura pendiente
**Estado:** En curso

- cron T+7
- QA viva de storage de imagenes/comprobantes
- endurecimiento operativo
- Playwright setup (S11 completo)

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
| Storage de imagenes | Decision tecnica | Vercel Blob no-booking implementado |
| Base64 en produccion | Riesgo tecnico | Fuera del flujo productivo |
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

## Regla de storage/media

- DB compartida con el equipo: si.
- Blob/token compartido con booking/reservas: no.
- Jean mantiene ownership de `/reservas` y booking con su propio Blob/token.
- Manuel mantiene ownership de home, subpaginas, marketplace y frontend publico no-booking.
- Media publica no-booking usa `TS_WEB_BLOB_READ_WRITE_TOKEN`.
- Comprobantes sensibles del marketplace no usan esa capa publica; requieren storage sensible dedicado o proxy autenticado.
