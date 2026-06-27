# BKG-08H1 Handoff

- Sprint: `BKG-08H1`
- Base SHA: `0068c87083a0e59b2dcb9afd307550f08ca832c4`
- State: `DIRECTOR_REVIEW`
- Result: `PAYMENT_RECOVERY_UI_HARDENING_PENDING_CI`

## Context

- El modo `disabled` queda bloqueado antes del flujo de reporte.
- El token inicial vive hasta obtener una respuesta segura.
- Los reintentos tras 500 o JSON invalido reusan el mismo token en memoria.
- Existe una sola fuente canonica para tamano y MIME de comprobantes.
- Las excepciones de intent, upload y action quedan sanitizadas.
- La UI productiva sigue desactivada y el wizard sigue desconectado.

## Next Action

- ChatGPT verifica el endurecimiento del modo Preview y la recanalizacion segura del reintento.
