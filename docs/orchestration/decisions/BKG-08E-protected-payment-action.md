# BKG-08E Protected Payment Action

- La accion protegida recibe solo datos publicos permitidos.
- El token de recuperacion firmado se valida antes de leer el archivo.
- La autorizacion ocurre antes de cualquier SQL o Blob.
- El token y el `publicCode` deben coincidir.
- La frontera exacta `exp <= now` se rechaza.
- No se acepta una clave de idempotencia del cliente.
- La accion llama al entrypoint server-only validado en BKG-08D.
- El resultado publico permanece sanitizado.
- La accion incluye un kill switch explicito de produccion.
- La accion permanece desconectada del wizard y de la UI.
- Produccion no autorizada.
