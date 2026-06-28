# BKG-08I1 Preview Authority Hardening

- La duracion comercial autoritativa sale del `quote`.
- La ventana del hold sigue siendo un contrato distinto y no reemplaza la duracion del paquete.
- El resultado publico de preview debe renderizar valores del servidor, no estimaciones derivadas en cliente.
- El handoff firmado debe transportar claims temporales estrictos e incoherentes deben rechazarse.
- La ruta de recuperacion debe comprobar el token antes de cualquier lectura de archivo, DB o Blob.
- El flujo E2E debe ejecutar `submitCustomBundlePaymentRecoveryUiFlow` de forma real en QA.
- No hay DB, Blob ni produccion en este sprint.
