# BKG-08J Isolated Database Lifecycle

- SHA revisado: `04ad8ea1d5bcf5f20cb88810c5c8429651acf89c`
- Decision: `CONTINUE`
- Functional SHA: `pending_ci`
- Workflow: `Booking Isolated Custom Bundle Full Lifecycle`
- Run: `pending_ci`
- Job: `pending_ci`
- Hallazgo:
  - el ciclo aislado debe validar booking, hold, payment, proof, expiration y cleanup sobre PostgreSQL efimero;
  - la evidencia debe permanecer separada del camino de produccion y del audit de compatibilidad Neon;
  - no se autoriza produccion.
- Riesgo:
  - mezclar la validacion aislada con bases remotas o con el audit de compatibilidad productiva.
- Siguiente sprint: `BKG-08J`
- Produccion: no autorizada.
