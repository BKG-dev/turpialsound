# Checker de Reservas Expiradas (Pending Payment)

## Proposito
Este script realiza una inspeccion **read-only** de reservas `pending_payment` reales que se encuentran en estado DB `under_review` y han excedido la ventana de pago configurada para el chequeo.

## Caracteristicas de Seguridad
- **No destructivo**: No realiza operaciones `UPDATE`, `DELETE` o `INSERT`.
- **No invasivo**: No dispara notificaciones ni sincronizaciones con Google Calendar.
- **Politica payment_reported**: excluye reservas `payment_reported` y reservas con comprobante activo.
- **Bloqueo de entorno**: exige `--confirm-local-db`, bloquea `production` y solo corre si `DATABASE_URL` se clasifica como local/test/dev.
- **Sin secretos**: no imprime `DATABASE_URL` ni credenciales.

## Como ejecutarlo
```bash
node scripts/checks/expired-pending-payment-check.mjs --confirm-local-db
```

Opcional:

```bash
node scripts/checks/expired-pending-payment-check.mjs --confirm-local-db --window-minutes=60 --limit=100
```

## Requisitos
- Requiere `DATABASE_URL` definido en la sesion actual.
- No usar `.env` remota/sospechosa.
- No ejecutar contra produccion.
