# Session Summary - Activa

## Estado real integrado - 2026-05-07

- Rama madre estable actual: `integration/today-reservas-marketplace-stable-2026-05-07`.
- HEAD base de referencia de integracion: `cbc72e3`.
- Commit estable operativo validado: `c01ec60` (`fix(marketplace): render active listings on public page`).
- `/reservas` queda congelado como zona sana.
- `/marketplace` queda activo y visible en rama integrada.
- BCV corregido y respondiendo con tasa fresca (incluye fix `a96c247`).
- Main y produccion no tocados.

## Incidente aprendido - Marketplace vacio en Preview (2026-05-07)

- Sintoma: `/marketplace` vacio en Preview.
- No fue causa raiz de UI ni filtros.
- Causa real: Preview apuntando a DB incorrecta sin tablas `mp_*`.
- Evidencia tecnica: Prisma `P2021` por ausencia de `public.mp_listings`.
- Solucion real: corregir `DATABASE_URL` y `DIRECT_URL` al mismo proyecto/base Neon integrada.

## Regla obligatoria de conexiones DB

- `DATABASE_URL` debe ser pooled/pooler.
- `DIRECT_URL` debe ser direct/no-pooler.
- Ambas deben apuntar al mismo proyecto/base Neon integrada.
- Nunca imprimir secretos.

## Protocolo obligatorio si marketplace carga vacio

1. Confirmar branch/commit exacto del deployment.
2. Revisar runtime logs del deployment.
3. Buscar logs `marketplace.discovery`.
4. Distinguir `DB_MISSING` / `QUERY_ERROR` / `ZERO_ACTIVE` / `FILTERED_EMPTY`.
5. Si hay `P2021`, validar DB target y existencia real de tablas `mp_*` antes de tocar UI.
6. Comparar `DATABASE_URL` y `DIRECT_URL` con fingerprint seguro (host hint, pooler, sslmode).
7. Corregir env/DB de Preview solo por Jean.
8. Redeployar el mismo commit tras corregir target DB.
9. Solo tocar UI si DB/query/data ya estan correctas.

## Smoke base esperado en Preview integrado

- `/` responde.
- `/marketplace` responde.
- `/reservas` responde.
- `/api/bcv-rate` responde.
- `/admin/login` responde.
- `/ops/payment-review` responde con control de acceso.
- `/payment-proofs/view` sin token responde error controlado (no `500`).

## Metodologia Oreshnik-Codex 2.0

- 1 rama madre estable.
- N worktrees separados.
- N agentes Codex.
- 1 owner por lock.
- 1 commit/push por sprint cerrado.
- 0 trabajo directo sobre madre.
- 0 `main`.
- 0 produccion.
- 0 cambios en zonas sanas fuera de scope.

## Roles operativos

- Jean: integracion, merges, Vercel/envs, DB/Prisma/schema/migrations, rama madre, preview integrado, booking/reservas.
- Manuel: marketplace producto, buyer/seller/admin flow, QA operacional, rates, payout, estados, copy/UX operativo.

## Ola 1 (fuente activa)

- J1 Docs Control Tower.
- J2 Preview Runtime Guard.
- M2 Marketplace QA Harness.
- J3 Integration Gatekeeper.
- M1 Marketplace Protected Flow E2E: fuera de esta integracion prep hasta autorizacion.

## LAB Meta Embedded Signup Coexistence - 2026-05-10

- Se creo la pagina LAB_ONLY: `/lab/meta-embedded-signup`.
- Gate de seguridad habilitado por query param: `/lab/meta-embedded-signup?secret=...`.
- Fail-closed activo: si falta `META_EMBEDDED_SIGNUP_LAB_SECRET`, o no coincide, responde `404`.
- Listener `window.message` implementado para `WA_EMBEDDED_SIGNUP` aceptando solo:
  - `https://www.facebook.com`
  - `https://web.facebook.com`
- Payload mostrado en pantalla de forma saneada (sin tokens): `type`, `event`, `data.waba_id`, `data.phone_number_id`, `data.business_id`.

### Variables ENV requeridas (LAB)

- `NEXT_PUBLIC_META_APP_ID=2448823618894016`
- `NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID=1332825818761234`
- `META_EMBEDDED_SIGNUP_LAB_ENABLED=true`
- `META_EMBEDDED_SIGNUP_LAB_SECRET=<secreto-largo-unico>`

### Datos Meta usados en el LAB

- `META_APP_ID`: `2448823618894016`
- `META_EMBEDDED_SIGNUP_CONFIG_ID`: `1332825818761234`
- `FB.login` configurado con `config_id`, `response_type=code`, `override_default_response_type=true`, `extras.featureType=whatsapp_business_app_onboarding`.

### Como probar en Preview

1. Configurar variables ENV LAB en el entorno Preview.
2. Deploy del branch con esta pagina.
3. Abrir `/lab/meta-embedded-signup?secret=...`.
4. Pulsar `Iniciar Embedded Signup de WhatsApp`.
5. Revisar en pantalla `status`, presencia/no presencia de `authResponse.code` y eventos `WA_EMBEDDED_SIGNUP`.
6. En movil con WhatsApp Business App, abrir Plataforma para empresas y escanear QR si Meta lo presenta en el flujo.

### Configuracion adicional en Meta despues del deploy

1. Agregar el dominio de Preview en Facebook Login for Business / dominios permitidos para JavaScript SDK (si aplica en la app/config).
2. Agregar redirect URI valido si el flujo de Embedded Signup lo exige para esa configuracion.
3. Verificar que la configuracion Embedded Signup seleccionada tenga habilitado el flujo de coexistencia de WhatsApp Business App.

## LAB WhatsApp Reserva Token - 2026-05-10

- Se creo pagina LAB_ONLY: `/lab/whatsapp-reserva-token` con gate por `?secret=...`.
- Se crearon endpoints:
  - `POST /api/whatsapp/lab/challenge`
  - `GET /api/whatsapp/lab/status`
  - `GET /api/whatsapp/webhook` (verificacion Meta)
  - `POST /api/whatsapp/webhook` (recepcion de mensajes entrantes)
- Persistencia del lab: `audit_log` via `prisma.auditLog` con `bookingRequestId: null` y `nextState` saneado (sin payload crudo, sin secretos).

### Acciones canonicas usadas en audit_log

- `whatsapp_reserva_token.challenge_created`
- `whatsapp_reserva_token.message_received`
- `whatsapp_reserva_token.challenge_verified`
- `whatsapp_reserva_token.challenge_failed`
- `whatsapp_reserva_token.challenge_expired`

### Variables ENV requeridas (LAB WhatsApp)

- `WHATSAPP_LAB_ENABLED=true`
- `WHATSAPP_LAB_SECRET=<secreto-largo-unico>`
- `WHATSAPP_LAB_INBOUND_NUMBER_LABEL=`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN=`
- `WHATSAPP_APP_SECRET=`
- `WHATSAPP_PHONE_NUMBER_ID=`
- `WHATSAPP_BUSINESS_ACCOUNT_ID=`

### Configuracion en Meta (Webhook)

1. Callback URL: `https://<preview-url>/api/whatsapp/webhook`
2. Verify token: valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Webhook field: `messages`

### Flujo de prueba del LAB

1. Abrir `/lab/whatsapp-reserva-token?secret=...`
2. Escribir WhatsApp del usuario
3. Pulsar `Generar codigo`
4. Enviar el codigo al WhatsApp conectado/prueba
5. Esperar polling de estado hasta `verified`

### Notas operativas

- Meta no valida el codigo del challenge; Meta solo entrega el mensaje entrante al webhook.
- La validacion de codigo y telefono ocurre 100% en backend del lab.
- Limitacion de numeracion: `from/wa_id` puede llegar sin `+`; se aplica normalizacion tolerante para Venezuela.

## LAB Evolution Webhook - 2026-05-10

- Endpoint: `POST /api/whatsapp/evolution-webhook`.
- Gate fail-closed: si `EVOLUTION_WEBHOOK_ENABLED !== true`, responde `404`.
- Autenticacion aceptada por cualquiera de estas vias:
  - Header `x-evolution-secret`.
  - Query param `?secret=...` (fallback para Evolution Manager cuando no envia header).
