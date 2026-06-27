# BKG-08H1 Director Review Correction

- SHA revisado: `0068c87083a0e59b2dcb9afd307550f08ca832c4`
- Functional SHA previo: `5830563dbd68439428c87a50296129b2965989df`
- Run previo: `28300702394`
- Job previo: `83848350918`
- Decisión: `FIX_REQUIRED`
- Corrección: `BKG-08H1`
- Producción: `no autorizada`

## Hallazgos

- `paymentUiMode` `disabled` no debe permitir continuar el flujo.
- El token inicial debe sobrevivir a respuestas transitorias o inválidas.
- La fuente de tamaño y MIME debe permanecer unificada.
- El formulario no debe filtrar `error.message` al usuario.
- Las excepciones del flujo deben seguir sanitizadas.

## Cierre esperado

- Corregir el hardening de UI de recuperación.
- Mantener el wizard desconectado.
- Mantener producción bloqueada.
