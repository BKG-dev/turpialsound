# MARKETPLACE - RESUMEN DE IMPLEMENTACION

**Actualizado:** 2026-04-23
**Estado general:** Funcional en modo real sobre Neon/PostgreSQL
**Separacion:** El dominio `Mp*` del marketplace sigue aislado del sistema de booking
**Fuente viva de trazabilidad:** `docs/obsidian-vault/*`

---

## Estado real actual

El marketplace ya opera como modulo separado del booking y tiene flujo real de auth, listings, chat, dashboard, admin, Q&A y checkout manual. No esta conectado todavia a pasarelas automaticas; el cobro sigue siendo manual y validado por admin.

Estado confirmado al cierre de esta actualizacion:

- `npx tsc --noEmit` limpio
- checkout usando metodos reales del seller
- transaccion creada sin agotar el listing antes de validacion
- listing pasa a `SOLD_OUT` solo cuando el pago es aprobado y entra en escrow

---

## Que esta construido y funcionando

### Backend

| Modulo | Archivo | Estado |
|---|---|---|
| Auth | `actions/marketplace/auth.ts` | Funcional |
| Listings | `actions/marketplace/listings.ts` | Funcional |
| Transacciones | `actions/marketplace/transactions.ts` | Funcional con flujo manual |
| Chat | `actions/marketplace/chat.ts` | Funcional |
| Favoritos | `actions/marketplace/favorites.ts` | Funcional |
| Usuarios | `actions/marketplace/users.ts` | Funcional |
| Admin | `actions/marketplace/admin.ts` | Funcional |
| Q&A | `actions/marketplace/questions.ts` | Funcional |

### Frontend

| Area | Archivo principal | Estado |
|---|---|---|
| Landing marketplace | `app/marketplace/page.tsx` | Funcional |
| Detalle de listing | `app/marketplace/[slug]/page.tsx` | Funcional |
| Dashboard buyer/seller | `app/marketplace/dashboard/page.tsx` | Funcional |
| Admin panel | `app/marketplace/admin/page.tsx` | Funcional |
| Checkout modal | `components/marketplace/CheckoutModal.tsx` | Funcional con flujo manual |
| Chat transaccional | `components/marketplace/TransactionChat.tsx` | Funcional |
| Q&A listing | `components/marketplace/ListingQASection.tsx` | Funcional |
| AI demo chat | `app/api/marketplace/ai-chat/route.ts` | Funcional si existe API key |

---

## Pago actual

El esquema vigente es **manual temporal**.

- El buyer inicia compra desde el checkout.
- El checkout carga metodos reales activos del seller.
- El buyer reporta referencia y comprobante.
- La transaccion pasa a `PAYMENT_RECEIVED`.
- Admin valida manualmente.
- Si aprueba, la transaccion pasa a `IN_ESCROW` y el listing pasa a `SOLD_OUT`.
- Si rechaza, la transaccion pasa a `PAYMENT_FAILED` y el listing sigue disponible.

Pasarelas automaticas Mercantil y Binance quedan diferidas para una fase posterior. La arquitectura base para integrarlas existe a nivel documental y de schema, pero no forman parte del flujo operativo actual.

---

## Maquina de estados efectiva hoy

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

Notas:

- `initiatePurchase()` crea la transaccion en `PENDING_PAYMENT`.
- `submitPaymentProof()` mueve a `PAYMENT_RECEIVED`.
- `validatePayment()` mueve a `IN_ESCROW` o `PAYMENT_FAILED`.
- `SOLD_OUT` se aplica al listing solo cuando hay aprobacion real del pago.

---

## Base de datos

El marketplace permanece separado del booking mediante modelos `Mp*` en `prisma/schema.prisma`.

Modelos clave:

- `MpUser`
- `MpPayoutMethod`
- `MpListing`
- `MpListingQuestion`
- `MpChatThread`
- `MpMessage`
- `MpTransaction`
- `MpTransactionStatusHistory`
- `MpDispute`
- `MpPayout`
- `MpWebhookLog`

`MpListingQuestion` ya existe en schema y en codigo. Si el entorno no ha corrido la migracion correspondiente, sigue siendo una tarea operativa pendiente.

---

## Pendientes explicitos

| Item | Estado |
|---|---|
| Pasarelas Mercantil | Diferido hasta credenciales y sprint posterior |
| Binance Pay | Diferido |
| Cron T+7 auto-release | Pendiente |
| Persistencia de imagenes | Implementada con Vercel Blob publico no-booking |
| Base64 para comprobantes/imagenes | No debe seguir en produccion |
| Storage productivo | Vercel Blob no-booking; requiere `TS_WEB_BLOB_READ_WRITE_TOKEN` por entorno |
| QA manual end-to-end del flujo de compra | Pendiente |

Nota de ownership: el Blob/token de marketplace public images pertenece al dominio publico no-booking de Manuel, compartido con home/subpaginas si migran media publica. No debe usar `BLOB_READ_WRITE_TOKEN` generico ni el Blob/token de Jean para `/reservas`/booking. Los comprobantes de pago no van en este Blob publico.

---

## Decision documental

La fuente de trazabilidad viva del proyecto pasa a ser Obsidian:

- `docs/obsidian-vault/ROADMAP_RESCATE.md`
- `docs/obsidian-vault/BUGS_CRITICOS.md`

Los documentos de `docs/marketplace/` quedan como referencia tecnica sincronizada, pero el seguimiento vivo de estado y rescate debe mantenerse en Obsidian.
