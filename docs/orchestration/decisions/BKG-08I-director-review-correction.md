# BKG-08I Director Review Correction

- SHA revisado: `725c07037fa151fd177b88df6b71a3d30c032fbd`
- Decisión: `FIX_REQUIRED`
- Functional SHA observado: `a0dbd1ac7f2e53e24eb9a46d8b3f430c37aa59e0`
- Run: `28307447869`
- Job: `83866106422`
- Hallazgo: la autoridad temporal del preview seguía usando la duración del hold en vez de la duración comercial del quote, el resumen de exito seguia dependiendo de estimaciones cliente y el E2E no ejecutaba realmente el flujo UI de pago.
- Acción: `BKG-08I1`
- Producción: no autorizada
