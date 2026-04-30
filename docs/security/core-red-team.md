# Matriz de Auditoria de Seguridad - Flujo de Expiracion (Red Team)

## 1. RIESGOS CONFIRMADOS
- **Falta de scheduler configurado**: el flujo puede ejecutarse desde `/admin` o mediante `POST /api/bookings/expire`, pero falta configurar un scheduler externo/Vercel Cron.
- **Sincronizacion Calendar fragil**: si Google Calendar falla durante la expiracion, la DB queda expirada/liberada y el fallo queda auditado, pero el evento externo puede quedar desalineado hasta reconciliacion manual.

## 2. RIESGOS MITIGADOS
- **Autenticacion endpoint**: `POST /api/bookings/expire` exige `Authorization: Bearer <BOOKINGS_EXPIRE_CRON_SECRET>`.
- **Fail closed**: si `BOOKINGS_EXPIRE_CRON_SECRET` no esta configurado, el endpoint responde `401` y no ejecuta expiracion.
- **Idempotencia basica**: la operacion solo actualiza filas `status = under_review` que siguen siendo `pending_payment` real; reservas ya `rejected`/`expired` no se reexpiran.
- **Proteccion payment_reported**: reservas `payment_reported` o con `PaymentProof.isActive = true` quedan fuera de expiracion automatica.
- **Auditoria**: cada expiracion efectiva genera `booking_expired_payment_window`; fallos de Calendar generan `calendar_sync_failed_on_expiration`.

## 3. RIESGOS PENDIENTES
- **Sin retry/outbox**: si email o Calendar fallan, no existe reintento persistente automatico.
- **Rate limiting**: el endpoint no tiene rate limiting; depende del bearer secret y de la idempotencia de la operacion.
- **Rotacion de secreto**: la seguridad de `BOOKINGS_EXPIRE_CRON_SECRET` depende de configuracion y rotacion operacional externa.

## EVIDENCIA
- `app/api/bookings/expire/route.ts` valida bearer y falla cerrado si falta secret.
- `lib/bookings/operations.ts` ejecuta la expiracion en transaccion, excluye comprobantes activos y deja email/calendar fuera de la transaccion.
- `lib/bookings/operations.ts` audita fallo de Calendar con `calendar_sync_failed_on_expiration`.

## RECOMENDACION PARA CODEX
1. Configurar scheduler externo/Vercel Cron contra `POST /api/bookings/expire`.
2. Agregar reconciliacion o reintento operativo para fallos de Calendar/email.
3. Evaluar rate limiting si el endpoint queda expuesto a internet publica.
