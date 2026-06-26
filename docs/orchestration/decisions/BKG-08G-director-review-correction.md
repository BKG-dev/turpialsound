# BKG-08G Director Review Correction

- SHA revisado: `0a79cb157612e0147b6bddf01324bf11b218a8e4`
- Decisión: `FIX_REQUIRED`
- Run previo: `28263105055`
- Job previo: `83743201556`
- Hallazgo: `cleanupOwnedReceiptAfterFailure` no preservaba de forma verificable la causa original cuando el borrado estructurado fallaba o lanzaba.
- Hallazgo adicional: `headPrivate` necesitaba sanitización explícita en el receipt entrypoint.
- Hallazgo adicional: la Server Action validaba demasiado antes de la autorización de recuperación.
- Acción: `BKG-08G1`
- Producción: no autorizada
