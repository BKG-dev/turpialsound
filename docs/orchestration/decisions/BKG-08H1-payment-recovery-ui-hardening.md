# BKG-08H1 Payment Recovery UI Hardening

- Modo disabled bloqueado antes de intent, upload y action.
- El token inicial se conserva hasta confirmar una respuesta segura.
- Un 500 o JSON invalido no consume el token inicial.
- Existe una unica fuente canonica para tamanio y MIME.
- Las excepciones del flujo quedan mapeadas a errores controlados.
- La UI productiva sigue desactivada.
- El wizard sigue desconectado.
