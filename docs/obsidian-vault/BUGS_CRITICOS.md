---
tags: ["#status/live-source", "#area/backend", "#area/ui", "#area/ops"]
---

# Bugs Criticos

Este archivo registra los bloqueos y riesgos operativos activos del marketplace al 2026-04-24.

## 1. Bloqueador de migracion/schema para `paymentSenderBank`

- **Descripcion**: El flujo manual ya dependia a nivel de codigo de `paymentSenderBank` y `paymentPaidAt`. La verificacion real confirmo que la DB activa no tenia esas columnas al inicio del chequeo.
- **Estado real**: Resuelto en la DB activa.
- **Impacto**: El riesgo operativo de schema faltante para conciliacion manual queda cerrado en la base actualmente conectada.
- **Accion inmediata**: No reabrir este frente salvo evidencia de otra DB o entorno distinto.

## 2. QA operativa end-to-end pendiente

- **Descripcion**: Falta ejecutar la prueba real buyer -> admin -> escrow -> payout manual seller usando imagenes y comprobantes reales.
- **Estado real**: Pendiente critica.
- **Impacto**: Tipos limpios y deploy saneado no reemplazan una validacion operativa completa.
- **Accion inmediata**: Ejecutar QA solo por ruta despachada en `docs/07_handoffs/qa-dispatcher.json`; no reabrir migracion/schema salvo evidencia de otro entorno.

## 3. Storage productivo definitivo

- **Descripcion**: El problema de base64 ya quedo resuelto. La media publica no-booking del marketplace ya enruta uploads nuevos a Vercel Blob dedicado y fue validada en preview. Los comprobantes sensibles usan una capa separada con proxy autenticado, pero aun falta smoke vivo buyer/admin sobre proof nuevo.
- **Estado real**: Public media validada; proofs sensibles implementados tecnicamente y pendientes de validacion viva.
- **Impacto**: El riesgo principal de persistir listings nuevos en base64 queda cerrado. El riesgo abierto esta concentrado en confirmar que `paymentProofUrl` nuevo queda bajo `/api/marketplace/payment-proofs/...` y no en URL publica de Blob.
- **Accion inmediata**: No reabrir media publica no-booking salvo regresion con evidencia. Ejecutar solo el smoke corto `payment_proof_sensitive_preview` segun dispatcher.

## 4. Base64 fuera del camino productivo

- **Descripcion**: Imagenes de listings y comprobantes ya no deben volver a persistirse en base64.
- **Estado real**: Resuelto.
- **Impacto**: Reduce payload, evita presion innecesaria sobre la base y simplifica la migracion posterior a storage definitivo.
- **Accion inmediata**: No reintroducir data URLs ni blobs base64 en el camino real.

## 5. Checkout manual sigue siendo temporal

- **Descripcion**: El flujo de cobro actual sigue siendo manual por decision operativa.
- **Estado real**: Vigente y esperado.
- **Impacto**: No es bug por si mismo, pero condiciona conciliacion, dashboard y QA.
- **Accion inmediata**: Mantener el foco en operacion manual hasta estabilizar migracion/schema y QA.

## 6. Cierre final de payout aun no auditado

- **Descripcion**: `RELEASED` funciona como cola de payout manual, pero aun falta un cierre contable final explicito de "pagado al vendedor".
- **Estado real**: Pendiente alta.
- **Impacto**: Hay trazabilidad operativa, pero no cierre auditado completo del ultimo paso.
- **Accion inmediata**: Definirlo despues de estabilizar el flujo real.

## 7. Cron T+7 no implementado

- **Descripcion**: El auto-release del escrow sigue pendiente.
- **Estado real**: Pendiente.
- **Impacto**: La liberacion continua manual por admin.
- **Accion inmediata**: Mantener liberacion manual hasta cerrar lo critico.

## 8. SEO/AEO es restriccion transversal

- **Descripcion**: Cualquier cambio publico del marketplace debe evaluarse por SEO/AEO.
- **Estado real**: Restriccion vigente.
- **Impacto**: Afecta listings, categorias, metadata, slugs, landings e indexabilidad.
- **Accion inmediata**: Mantenerlo como criterio transversal, no como frente aislado.

## 9. Hallazgos funcionales activos de dashboard y operacion marketplace

### 9.1 Contador de Mis compras en cero con compras existentes

- **Descripcion**: Corregido. El dashboard ahora deriva esa metrica desde transacciones reales en vez de depender del agregado viejo del perfil.
- **Impacto**: Cierra la inconsistencia visible entre contador y listado.
- **Prioridad**: Resuelto.

### 9.2 Sin detalle util al abrir una compra o venta

- **Descripcion**: Corregido. Compras y ventas ahora abren un detalle con estado, referencia, banco, fechas, nota interna y linea de estado.
- **Impacto**: Buyer y seller ya pueden entender el paso operativo real.
- **Prioridad**: Resuelto.

### 9.3 Tabs Operativo y Todos casi duplicados

- **Descripcion**: Los tabs Operativo y Todos muestran practicamente la misma informacion.
- **Impacto**: El dashboard pierde jerarquia informativa y complica la lectura del flujo real.
- **Prioridad**: Media-Alta.

### 9.4 Export CSV con caracteres corruptos

- **Descripcion**: Corregido. El CSV ahora sale con UTF-8 BOM, escape de comillas y columnas alineadas con la vista.
- **Impacto**: Recupera utilidad para conciliacion y auditoria.
- **Prioridad**: Resuelto.

### 9.5 Datos de cobro del vendedor no visibles en Pagos

- **Descripcion**: Corregido. Pagos muestra metodo, cuenta y detalles visibles del payout method del vendedor.
- **Impacto**: Reduce friccion sobre payout manual.
- **Prioridad**: Resuelto.

### 9.6 Totales inconsistentes de ventas, comisiones, neto y pendiente

- **Descripcion**: Mitigado. Seller/admin ya calculan mejor totales operativos y comisiones, pero falta validacion con QA real de punta a punta.
- **Impacto**: Mejora fuerte de lectura contable; aun requiere validacion funcional sobre data real.
- **Prioridad**: Alta abierta.

### 9.7 Tab de comisiones en cero con flujo operativo existente

- **Descripcion**: Mitigado. Comisiones ya no depende solo de `RELEASED` mensual y toma mejor el flujo operativo actual.
- **Impacto**: Evita cero falsos mas obvios.
- **Prioridad**: Media-Alta abierta hasta QA.

### 9.8 Bug de escritura en nota interna

- **Descripcion**: Corregido. El draft de nota ya no se monta sobre el objeto de accion y permite escribir normalmente.
- **Impacto**: Recupera una herramienta central de operacion admin.
- **Prioridad**: Resuelto.

### 9.9 Badge de mensajes sin leer no clickeable

- **Descripcion**: Corregido. El badge superior ahora abre el tab de mensajes.
- **Impacto**: Mejora navegacion operativa.
- **Prioridad**: Resuelto.

### 9.10 Tab de mensajes no refleja bien los mensajes sin leer

- **Descripcion**: Mitigado. El tab ahora separa `Chats por Atender` y `Todos los Chats`, pero falta confirmar en QA que el conteo real coincide con todos los casos.
- **Impacto**: Mejora priorizacion; aun requiere validacion.
- **Prioridad**: Media-Alta abierta.

### 9.11 Falta mensaje de tranquilidad tras Pago recibido

- **Descripcion**: Corregido. Ya existe copy operativo para buyer y seller tras `PAYMENT_RECEIVED`.
- **Impacto**: Reduce incertidumbre durante validacion manual.
- **Prioridad**: Resuelto.

### 9.12 Desalineacion funcional entre metricas, tabs y flujo real

- **Descripcion**: Mitigado en gran parte, no cerrado. Ya se corrigieron contadores, detalle clickeable, mensajes, CSV, payout visible y tabla admin. Aun falta QA real para detectar desajustes residuales.
- **Impacto**: El frente pasa de correccion estructural a validacion y pulido.
- **Prioridad**: Alta abierta.

## 10. Segunda pasada de QA/pulido pendiente

- **Descripcion**: Hace falta validar con datos reales las diferencias entre `Operativo` y `Todos + terminales`, la consistencia final de comisiones/totales y el comportamiento del tab de mensajes en escenarios reales.
- **Estado real**: Pendiente alta.
- **Impacto**: Puede quedar desalineacion residual aunque la base funcional ya fue corregida.
- **Accion inmediata**: Ejecutar QA manual completa buyer -> admin -> escrow -> payout manual seller y luego ajustar solo hallazgos residuales.

### 10.1 Punto de control colgado en QA automatizada headless - 2026-04-20

- **Descripcion**: La corrida automatizada E2E para buyer/admin/seller quedo colgada durante la ejecucion del script temporal headless `scripts/qa-marketplace-temp.mjs`.
- **Estado real**: Interrumpida por timeout primero y luego abortada manualmente antes de completar la segunda pasada instrumentada.
- **Lo ya confirmado antes de la colgada**:
  - Se levanto la app local en dev para QA.
  - Se inspecciono el dataset real y se confirmaron usuarios mock operables: `mvera@dev.local`, `igor@dev.local`, `user@dev.local`.
  - Se creo un listing temporal de QA para seller conocido `user@dev.local`:
    - slug: `qa-manual-temporal-user-20260420`
    - id: `cmo7wy8xq0000fonekh97u9oj`
    - sellerId: `cmnw0qv3600041cnex7s3zqrc`
    - precio: `100 USD`
  - Se dejo listo el script temporal de automatizacion con trazas por paso para retomar sin reconstruir contexto.
- **Sintoma del bloqueo**:
  - La primera corrida de `node scripts/qa-marketplace-temp.mjs` expiro sin devolver reporte ni screenshots.
  - La segunda corrida instrumentada se aborto por usuario antes de completar, asi que no hay conclusion funcional cerrada del headless.
  - Solo quedo creado el directorio `.tmp-qa-downloads`; no se confirmaron artefactos utiles de evidencia.
- **Hipotesis operativa actual**:
  - El atasco ocurre en una interaccion UI del flujo headless y no en la preparacion previa.
  - El ultimo punto estable es la preparacion del entorno + listing QA + script instrumentado.
- **Riesgo**:
  - La QA manual/funcional completa sigue abierta; no se debe dar por validado el flujo buyer/admin/seller.
- **Punto exacto para retomar**:
  - Reusar `scripts/qa-marketplace-temp.mjs`.
  - Arrancar desde el paso buyer sobre `/marketplace/qa-manual-temporal-user-20260420`.
  - Revisar primero en que log se queda la instrumentacion (`LOGIN`, `NAVIGATE`, `CLICK`, `SET`) antes de relanzar la cadena completa.

### 10.2 Etapa A buyer bloqueada por 500 en listing temporal

- **Fecha**: 2026-04-20
- **Ruta**: `/marketplace/qa-manual-temporal-user-20260420`
- **Rol objetivo**: Buyer
- **Resultado**: Bloqueada antes de checkout.
- **Hallazgo**: La ruta del listing temporal responde `HTTP 500` en la app local. No se pudo abrir detalle, entrar al checkout ni validar el mensaje post-pago.
- **Decision operativa**: Se detuvo la etapa A sin insistir para evitar loops largos, tal como se pidio para esta nueva pasada por etapas.
- **Siguiente paso recomendado**: Inspeccionar el error server-side del listing y confirmar si el fallo es del route/page, del dataset de ese listing o de una dependencia del detalle antes de reintentar buyer.

### 10.3 Checkpoint util: 500 aislado, listing valido y buyer retoma en instancia limpia

- **Fecha**: 2026-04-20
- **Ruta estable**: `http://localhost:3002/marketplace/qa-manual-temporal-user-20260420`
- **Estado real**: Recuperado el acceso al listing temporal.
- **Causa raiz del 500**:
  - No venia del listing ni de sus datos.
  - El error salia del runtime server-side de Next con referencia faltante a `./vendor-chunks/@opentelemetry.js`.
  - Se trato de un estado roto/stale de `.next` en la instancia previa.
- **Lo confirmado en este punto**:
  - `getListingBySlug('qa-manual-temporal-user-20260420')` responde con datos validos.
  - El listing temporal sigue siendo util para QA.
  - La ruta vuelve a responder `200` al levantar una instancia limpia.
- **Decision operativa**:
  - Seguir usando el mismo listing temporal.
  - Reanudar buyer sobre `localhost:3002`.
- **Ultimo punto seguro para volver si algo se rompe**:
  - App limpia arriba en `localhost:3002`.
  - Listing accesible y renderizando detalle.

### 10.4 Checkpoint util: buyer llega hasta submit real de pago manual

- **Fecha**: 2026-04-20
- **Ruta probada**: `http://localhost:3002/marketplace/qa-manual-temporal-user-20260420`
- **Rol simulado**: Buyer `igor@dev.local`
- **Estado real**: Flujo buyer avanza mas alla del login y del checkout.
- **Lo que ya quedo validado en esta etapa**:
  - El detalle del listing carga.
  - `Comprar Ahora` abre el flujo.
  - El login buyer desde el modal del listing funciona.
  - El checkout manual abre correctamente.
  - Se puede elegir `Pago movil`.
  - Se puede llenar `Numero de operacion` y `Banco emisor`.
  - `Confirmar pago` dispara submit real y el servidor responde `POST 200` sobre la ruta del listing.
- **Punto exacto de bloqueo**:
  - Despues de `Confirmar pago` no aparece de forma visible el estado exitoso esperado del modal.
  - No se pudo confirmar en UI el mensaje `Pago procesado` ni el copy de validacion/escrow.
- **Hipotesis operativa**:
  - El submit sale al backend, pero queda por confirmar si la transaccion persiste y la UI no re-renderiza, o si el frontend no entra al estado `success`.
- **Ultimo punto seguro para volver si algo se rompe**:
  - Buyer puede reanudarse desde el checkout del mismo listing en `localhost:3002`.
  - No hace falta recrear listing ni rehacer el aislamiento del `500`.

### 10.5 Punto de control exacto para retomar buyer sin loops largos

- **Fecha**: 2026-04-20
- **Objetivo pendiente**: Cerrar la etapa A buyer validando el mensaje tranquilizador post-pago.
- **Archivo de apoyo creado**:
  - `scripts/qa-marketplace-buyer.mjs`
- **Uso previsto**:
  - Runner corto solo para buyer, sin encadenar admin ni seller.
  - Pensado para retomar desde listing -> login -> checkout -> reportar pago.
- **Bloqueo actual a revisar primero**:
  - Transicion post-`submitPaymentProof` en `components/marketplace/CheckoutModal.tsx`.
- **Siguiente paso exacto recomendado**:
  - Verificar si `setSuccess(true)` se ejecuta.
  - Si se ejecuta, revisar por que el modal no muestra el estado exitoso.
  - Si no se ejecuta, revisar el resultado real de `submitPaymentProof` y la persistencia de la transaccion.
- **Regla de retoma**:
  - No avanzar a admin ni seller hasta cerrar este punto buyer.

### 10.6 Buyer confirmado en UI y persistencia; admin/seller siguen pendientes

- **Fecha**: 2026-04-21
- **Ruta probada**: `http://localhost:3002/marketplace/qa-manual-temporal-user-20260420`
- **Estado real**: La etapa buyer ya quedÃ³ validada sobre la instancia limpia.
- **Lo confirmado en esta pasada**:
  - El runner corto `scripts/qa-marketplace-buyer.mjs` fue corregido para seleccionar bien `Banco emisor` en el checkout.
  - Buyer `igor@dev.local` completa login, checkout, `Pago movil`, referencia y banco emisor.
  - La UI sÃ­ muestra el estado post-pago esperado:
    - `Pago procesado`
    - `Tu pago esta siendo validado.`
    - `Notificaremos la resolucion o la liberacion del escrow en menos de 24h.`
  - La transaccion quedÃ³ persistida para el slug QA con estado `PAYMENT_RECEIVED`.
  - Registro confirmado:
    - transactionId: `cmo827au800002kne6v9ofhk4`
    - reference: `QA1776741813862`
    - senderBank: `0105 - Banco Mercantil, C.A. Banco Universal`
- **Hallazgo importante**:
  - El bloqueo anterior no era del checkout productivo sino del runner de QA, que estaba aceptando el option vacio del `select` de banco.
- **Pendiente abierto**:
  - Seguir con QA admin y seller.
  - El runner encadenado `scripts/qa-marketplace-temp.mjs` todavÃ­a necesita ajuste fino en la navegacion/admin tabs antes de cerrar la pasada completa.
- **Regla operativa**:
  - No tocar booking ni reabrir la logica buyer ya validada salvo que aparezca una regresion nueva con evidencia.
- **Punto exacto de retoma**:
  - Tomar la transaccion `cmo827au800002kne6v9ofhk4` ya creada para el slug QA.
  - Entrar por admin y validar aprobacion hacia `IN_ESCROW`.
  - Luego validar seller sobre `sales` y `payouts` sin volver a correr buyer.

## 11. Pendiente visual pro para hero marketplace

- **Descripcion**: Queda en cola una mejora visual pro para el hero del marketplace con animacion tipo rayo/plasma de alta calidad.
- **Alcance**: Aplica solo al hero del marketplace; el resto del site no se toca.
- **Criterio tecnico**: Debe ser ligera en rendimiento y preferiblemente resolverse con implementacion CSS/SVG hibrida o equivalente liviano.
- **Restricciones**: No reintroducir canvas pesado, no comprometer rendimiento, no afectar SEO/AEO y mantenerse compatible con el hero actual.
- **Estado real**: Pendiente para una proxima pasada, sin implementacion en esta ventana.

## Siguiente frente recomendado

- Consolidar una pasada de QA funcional del dashboard marketplace para validar las correcciones ya aplicadas.
- Si QA detecta residuales, hacer segunda pasada puntual sin abrir frentes nuevos.
- Mantener el frente aislado del booking.

## Resuelto y confirmado

- Marketplace separado del booking.
- Prefijo `MP_` del marketplace como regla de no colision.
- Dashboard adaptado al flujo manual actual.
- `SOLD_OUT` solo despues de pago validado.
- Aprobacion admin endurecida para no aprobar desde `PENDING_PAYMENT`.
- Base64 fuera del flujo productivo.
- Build de Vercel documentado como cerrado en tipos y ESLint.
- DB activa correcta confirmada: Neon `neondb`.
- `paymentSenderBank`, `paymentPaidAt` y sus indices ya aplicados en `mp_transactions`.
- Historial Prisma alineado para `20260419_marketplace_manual_reconciliation`.
- `npm run build` limpio.
- `npx tsc --noEmit` limpio.

## 12. Storage productivo publico no-booking

- **Fecha**: 2026-04-23
- **Estado real**: Media publica no-booking validada en preview; proofs sensibles implementados tecnicamente y pendientes de smoke vivo.
- **Descripcion**: El flujo productivo ya no debe depender de `public/uploads` para imagenes publicas del marketplace ni futuras imagenes publicas del sitio. La capa publica no-booking usa Vercel Blob solo cuando existe `TS_WEB_BLOB_READ_WRITE_TOKEN`.
- **Impacto**: Cierra la decision tecnica principal de storage publico de Manuel y evita consumir por accidente el Blob/token de Jean. En produccion, si falta el token dedicado, el upload publico falla explicitamente.
- **Frontera**:
  - Jean: `/reservas` y booking, con su propio Blob/token.
  - Manuel: home, subpaginas, marketplace y frontend publico no-booking.
  - DB compartida: si.
  - Blob/token compartido: no.
- **Media sensible**:
  - Los comprobantes de pago del marketplace no entran en el Blob publico no-booking.
  - `payment-proof` queda fuera de `TS_WEB_BLOB_READ_WRITE_TOKEN`.
  - La capa sensible ya quedo implementada con storage separado + proxy autenticado.
  - En Preview/Production falla cerrado si falta el token dedicado del storage sensible.
- **Validacion tecnica**:
  - `npx tsc --noEmit`: limpio
  - `npm run build`: limpio
- **Validacion viva cerrada**:
  - sellerIA publico listing nuevo en preview vigente.
  - `/api/marketplace/upload` respondio `200`.
  - la URL persistida apunta a `https://*.public.blob.vercel-storage.com/public-media/marketplace/listings/...`.
  - `data:image/...` queda ausente en el listing nuevo.
- **Pendiente operativo**:
  - No usar como evidencia el preview viejo `3397rmisp`.
  - Mantener `TS_WEB_BLOB_READ_WRITE_TOKEN` configurado en Preview/Production.
  - Correr smoke tecnico corto buyer/admin sobre proofs sensibles.

## Siguiente paso exacto al retomar

1. mantener cerrado Blob publico no-booking como validado en preview,
2. correr smoke tecnico corto buyer -> admin sobre proof nuevo por URL interna autenticada,
3. validar que `paymentProofUrl` nuevo use `/api/marketplace/payment-proofs/...` y no Blob publico,
4. si proofs sensibles quedan estables, retomar continuidad transaccional buyer -> seller -> admin,
5. mantener cerrado `paymentSenderBank` y no reabrir booking/reservas.

## 13. Proofs sensibles marketplace

- **Fecha**: 2026-04-23
- **Estado real**: Implementado a nivel tecnico; token sensible presente en Preview segun preflight previo; pendiente smoke tecnico corto con browser interactivo funcional.
- **Descripcion**: `payment-proof` ya no comparte storage con media publica no-booking. Los comprobantes nuevos salen por una capa sensible separada que persiste una URL interna autenticada del app y no una URL publica del store.
- **Implementacion aplicada**:
  - `lib/media/marketplace-sensitive-storage.ts`
  - `app/api/marketplace/payment-proofs/[...proofPath]/route.ts`
  - validacion de `transactionId` en `/api/marketplace/upload`
  - fallback local sensible fuera de `public/`
- **Variable nueva requerida**:
  - `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN`
- **Impacto**:
  - proofs nuevos dejan de exponerse por Blob publico
  - se mantiene separacion clara entre media publica y media transaccional sensible
  - no se toca booking ni `/reservas`
- **Riesgo residual**:
  - si falta el token sensible en Preview/Production, el upload falla cerrado
  - proofs legacy no migrados en esta pasada
- **Siguiente paso**:
  - mantener `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` cargado en Preview
  - ejecutar smoke tecnico corto buyer/admin en browser interactivo funcional
  - si no hay browser interactivo, detenerse y reportar la precondicion; no improvisar CDP ni server actions por HTTP

## 14. Reanudacion Codex no interactiva

- **Fecha**: 2026-04-24
- **Estado real**: `codex resume --last` no pudo reanudar esta sesion desde el agente actual.
- **Sintoma**:
  - intento sandbox: `Access is denied` al cargar configuracion.
  - intento escalado: `Error: stdin is not a terminal`.
- **Impacto**: No se recupero contexto adicional por CLI. No se ejecuto QA ni se valido ningun frente nuevo en esta sesion.
- **Decision operativa**: Mantener como fuente viva el vault y el dispatcher ya presentes en repo.
- **Siguiente paso exacto**: Para QA, resolver primero el `task_id` en `docs/07_handoffs/qa-dispatcher.json`. El frente abierto sigue siendo `payment_proof_sensitive_preview`; requiere browser interactivo funcional y no permite fallbacks ad hoc.

## 15. Smoke proof sensible detenido por capacidad de browser en esta sesion

- **Fecha**: 2026-04-24
- **Task**: `payment_proof_sensitive_preview`
- **Preview objetivo**: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`
- **Estado real**: No ejecutado.
- **Credenciales registradas**:
  - buyerIA: `buyerIA / BuyerIA_QA_2026!`
  - SUPER: `mvera / 13894619`
- **Bloqueo exacto**: La ruta canonica es `manual_preview` y esta sesion no tiene una herramienta de browser interactivo controlable por Codex para hacer login, adjuntar comprobante y abrir el proxy. Usar Playwright/CDP, server actions reverse engineered o HTTP ad hoc seria una ruta no canonica prohibida.
- **Resultado del proof**:
  - buyerIA no subio proof.
  - no hubo status de upload.
  - no se obtuvo `paymentProofUrl`.
  - no se valido si quedo fuera del Blob publico.
  - SUPER no pudo abrir proxy porque no hubo proof nuevo.
- **Accion inmediata**: Reintentar solo desde una sesion con control real de browser interactivo o ejecutar manualmente en navegador humano siguiendo el dispatcher. No buscar otra cuenta ni otra ruta.

## 16. Smoke proof sensible validado manualmente

- **Fecha**: 2026-04-24
- **Task**: `payment_proof_sensitive_preview`
- **Estado real**: Validado manualmente.
- **Preview usado**: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`
- **Credenciales usadas**:
  - buyerIA: `buyerIA / BuyerIA_QA_2026!`
  - SUPER: `mvera / 13894619`
- **Resultado del proof**:
  - buyerIA subio proof nuevo.
  - `paymentProofUrl` final queda bajo `/api/marketplace/payment-proofs/...`.
  - URL confirmada: `/api/marketplace/payment-proofs/marketplace-sensitive-media/marketplace/payment-proofs/2026/04/1777011359365-8ff99e05-ec49-4178-962b-0295b361eb5d.webp`
  - no usa `https://*.public.blob.vercel-storage.com/...`.
  - SUPER pudo abrir el comprobante por proxy autenticado.
- **Impacto**: Cierra el riesgo abierto de proofs nuevos expuestos en Blob publico para este smoke.
- **Accion inmediata**: Mantener `payment-proof` fuera del Blob publico no-booking. No reabrir este frente salvo regresion con evidencia.

## 17. Checkpoint Git y proximo frente

- **Fecha**: 2026-04-24
- **Estado Git**: Commits de cierre creados y pusheados.
- **Rama vigente**: `UI-UX-finalV3`.
- **Estado QA inmediato**: `payment_proof_sensitive_preview` validado manualmente; no reabrir salvo regresion con evidencia.
- **Siguiente frente**: preview fresco + regresion corta.
- **Regla de ejecucion**: La regresion corta debe salir primero de `docs/07_handoffs/qa-dispatcher.json`; si no existe `task_id` exacto, detenerse y reportar `GAP OPERATIVO`.

## 18. Lenguaje UX marketplace normalizado

- **Fecha**: 2026-04-24
- **Estado real**: Resuelto para Seller Cobros y Admin Pagos.
- **Descripcion**: El copy visible del marketplace fue simplificado para publico general en Venezuela. Se reemplazo jerga tecnica o interna como escrow, payout, released, operativo, neto operativo, fee y unknown por terminos humanos.
- **Superficies ajustadas**:
  - Seller Cobros: ventas realizadas, ganancia estimada, disponible para cobrar, cobros listos.
  - Admin Pagos: pagos pendientes a vendedores, listo para pagar, comisiones y cargos, monto final a pagar, metodo de cobro no configurado.
- **Glosario formal**: `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`.
- **Regla futura**: Toda pantalla nueva del marketplace debe seguir el glosario antes de introducir terminos visibles.
- **Restricciones respetadas**: No se tocaron booking, `/reservas`, enums, estados internos ni logica de negocio.

## 19. Seller Cobros con debilidad visual y baja jerarquia financiera

- **Fecha**: 2026-04-24
- **Estado real**: Resuelto a nivel UI/UX y validado tecnicamente.
- **Descripcion**: Seller Cobros desaprovechaba el viewport, tenia tabs apretados, jerarquia debil entre KPIs principales y cargos, y el bloque de datos/resumen no explicaba con suficiente claridad que estaba en revision y que ya estaba listo para cobrar.
- **Causa raiz**: Contenedor `max-w-3xl` demasiado estrecho para dashboard financiero, tabbar flex en una sola fila, y KPIs de distinto peso visual tratados como tarjetas equivalentes.
- **Cambio aplicado**: Ancho util ampliado, tabbar en grilla responsive, encabezado de estado de cobros, KPIs principales separados de comisiones/cargos, resumen mas claro y metodo de cobro con valores legibles.
- **Validacion**: `npx tsc --noEmit` limpio; `npm run build` limpio.
- **Restricciones respetadas**: No se tocaron booking, `/reservas`, Admin Pagos, enums ni logica de negocio.

### 19.1 Checkpoint post-commit sin push

- **Fecha**: 2026-04-25
- **Commit**: `9d44def style(marketplace): polish seller payouts dashboard`
- **Alcance del commit**: solo `components/marketplace/dashboard/DashboardClient.tsx`.
- **Estado de push**: pendiente.
- **Build/QA post-commit**: pendientes por instruccion explicita; no se corrieron despues del commit.
- **Worktree**: sucio; quedan cambios unstaged/untracked fuera del commit.
- **Stash**: `stash@{0}: On UI-UX-finalV3: pre-seller-cobros-polish-unstaged` sigue intacto.
- **Temporales pendientes**: existe `.tmp-seller-cobros-polish-staged.patch`; tambien existe `.tmp-preview-dev.log`.
- **Regla**: no limpiar, no aplicar stash, no borrar patch ni logs temporales sin instruccion explicita.
- **Siguiente accion**: limpieza controlada del worktree clasificando cambios a conservar, basura temporal eliminable y decision sobre stash viejo.

## 20. Checkpoint Seller Dashboard + Glosario UX

- **Fecha**: 2026-04-25
- **Estado real**: Cerrado y validado tecnicamente.
- **Commit**: `21bb346 style(marketplace): clarify seller dashboard payouts UX`
- **Archivos**:
  - `components/marketplace/dashboard/DashboardClient.tsx`
  - `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- **Descripcion**: Seller Cobros quedo alineado con lenguaje de usuario final y con el glosario UX. El vendedor ahora ve montos por etapa: `Monto en revision`, `Monto en proceso`, `Listo para cobrar` y `Datos de cobro`.
- **Impacto**: Reduce confusion financiera y operacional sin tocar calculos ni logica de negocio. El dashboard seller aprovecha mejor desktop con `max-w-6xl` y mantiene lectura mobile-first.
- **Validacion**: `npx tsc --noEmit` limpio; `npm run build` limpio; `git status --short` final limpio.
- **Restricciones respetadas**: No se tocaron AdminDashboard, booking, `/reservas`, Prisma/runtime/db/env, APIs/actions ni Blob/storage/paymentProofUrl/proxy SUPER.
- **Riesgo activo**: No mezclar la siguiente pasada de Admin dashboard con SEO/AEO ni con cierre final de payout. No tocar runtime/Prisma/env ni stashes sin instruccion explicita.
- **Accion inmediata recomendada**: Admin dashboard, solo para alinear lenguaje operacional/financiero con el glosario y sin tocar logica ni calculos.

## 21. Checkpoint Admin Dashboard UX

- **Fecha**: 2026-04-25
- **Estado real**: Cerrado y validado tecnicamente.
- **Commit**: `e8ce902 style(marketplace): clarify admin dashboard operations UX`
- **Archivos**:
  - `components/marketplace/admin/AdminDashboard.tsx`
  - `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- **Descripcion**: Admin Dashboard quedo alineado con el glosario UX. La primera vista prioriza pagos por revisar, dinero en proceso, disputas abiertas y monto listo para pagar.
- **Impacto**: Reduce confusion operacional/financiera en admin sin tocar calculos, queries, APIs, permisos ni estados backend. Las metricas informativas quedan en segundo nivel.
- **Cambios de lenguaje**: `Escrow` -> `En proceso` / `Dinero en proceso`; `RELEASED` / `Liberado` -> `Listo para pagar`; `Payouts listos` -> `Ventas listas`; `Neto vendedor` -> `Monto a pagar`; `Fee retenido` -> `Comision plataforma`.
- **Cambios visuales**: Layout admin ampliado a `max-w-6xl`; tabs admin en grilla responsive.
- **Validacion**: `npm run build` limpio; lint/type check limpio; build genero 29 paginas; `git status --short` final limpio.
- **Restricciones respetadas**: No se tocaron seller dashboard, booking, `/reservas`, Prisma/runtime/db/env, APIs/actions ni Blob/storage/paymentProofUrl/proxy SUPER.
- **Riesgo activo**: No implementar cierre final de payout sin diseno previo. No tocar runtime/Prisma/env sin tarea explicita. No mezclar SEO/AEO con cierre contable.
- **Accion inmediata recomendada**: SEO/AEO del marketplace publico. Luego disenar cierre final de payout/pago al vendedor sin implementar DB/schema hasta aprobacion explicita.

## 22. Checkpoint SEO/AEO publico marketplace

- **Fecha**: 2026-04-26
- **Estado real**: Cerrado y validado tecnicamente para `/marketplace`.
- **Commit**: `60be254 feat(marketplace): improve public SEO and AEO`
- **Archivos**:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `app/marketplace/page.tsx`
  - `app/sitemap.ts`
- **Descripcion**: `/marketplace` quedo como Server Component con metadata publica. La UI interactiva paso a `MarketplacePageClient.tsx`. Se agregaron title, description, canonical, OpenGraph, Twitter card, JSON-LD estatico `CollectionPage` + `BreadcrumbList`, y la ruta publica al sitemap.
- **Copy publico**: Ajustado para no prometer escrow, fiduciario ni operacion sin riesgo.
- **Validacion**: `git diff --check`, `npx tsc --noEmit` y `npm run build` reportados limpios en el cierre; build genero 29 paginas incluyendo `/marketplace` y `/sitemap.xml`.
- **Restricciones respetadas**: No se tocaron booking, `/reservas`, Prisma/runtime/db/env, APIs/actions, dashboards privados ni Blob/storage/paymentProofUrl/proxy SUPER.
- **Riesgo activo**: No agregar Product JSON-LD dinamico sin revisar datos reales. No tocar DB/actions para SEO. No mezclar SEO/AEO con payout final.
- **Accion inmediata recomendada**: SEO/AEO de `/marketplace/[slug]` solo metadata/semantica y sin tocar DB/actions. Luego disenar cierre final de payout/pago al vendedor sin implementar DB/schema hasta aprobacion explicita.

## 23. Checkpoint SEO/AEO detalle marketplace

- **Fecha**: 2026-04-26
- **Estado real**: Cerrado y validado tecnicamente para `/marketplace/[slug]`.
- **Commit**: `745068b feat(marketplace): improve listing detail SEO and AEO`
- **Archivo**:
  - `app/marketplace/[slug]/page.tsx`
- **Descripcion**: La ficha publica dinamica del marketplace ahora tiene metadata dinamica ampliada: title, description, canonical, OpenGraph, Twitter card, fallback de imagen y `noindex` para listing no encontrado.
- **JSON-LD**: Agregado `ItemPage` + `BreadcrumbList`. `Product` JSON-LD no fue agregado por prudencia de datos.
- **Copy publico**: Se elimino "Pago fiduciario protegido" y se reemplazo por una explicacion de pago reportado, revision manual, validacion y confirmacion.
- **Sitemap**: No fue tocado; el sitemap dinamico de slugs queda pendiente porque requeriria consultar DB.
- **Validacion**: `git diff --check`, `npx tsc --noEmit` y `npm run build` reportados limpios; build genero 29 paginas y `/marketplace/[slug]` quedo dinamico server-rendered.
- **Restricciones respetadas**: No se tocaron sitemap, booking, `/reservas`, Prisma/runtime/db/env, APIs/actions, dashboards privados ni Blob/storage/paymentProofUrl/proxy SUPER.
- **Riesgo activo**: No agregar Product JSON-LD dinamico sin datos consistentes. No consultar DB desde sitemap sin diseno. No implementar cierre final de payout sin especificacion.
- **Accion inmediata recomendada**: Disenar el cierre final de payout/pago al vendedor, solo diseno primero porque implementarlo tocaria DB/schema/acciones admin. Alternativa menor: revision visual/manual del marketplace publico despues del deployment.

## 24. Checkpoint P0 marketplace publico/mobile

- **Fecha**: 2026-04-26
- **Estado real**: Cerrado y validado tecnicamente; pendiente validacion manual en preview.
- **Commit**: `586663b fix(marketplace): resolve mobile public marketplace regressions`
- **Archivos**:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `components/layout/AnimatedLogo.tsx`
  - `components/layout/MobileMenu.tsx`
  - `components/layout/SiteHeader.tsx`
  - `components/marketplace/ListingQASection.tsx`
  - `components/marketplace/MarketplaceAuthModal.tsx`
  - `components/marketplace/MarketplaceCard.tsx`
  - `components/marketplace/MarketplaceImage.tsx`
  - `components/marketplace/MarketplaceModals.tsx`
  - `components/marketplace/TransactionChat.tsx`
  - `content/marketplace.ts`
  - `lib/marketplace/media-client.ts`
- **Descripcion**: Se corrigieron regresiones P0 del marketplace publico en mobile/desktop superficial: navbar mobile desbordado, logo/texto sin constraints, menu hamburguesa transparente/superpuesto, `Quiero comprar` sin salida de carga, copy viejo de pago fiduciario, imagenes sin fallback visible, upload movil poco robusto y textarea de preguntas sin `id/name`.
- **Cambios cerrados**:
  - navbar mobile sin overflow;
  - menu hamburguesa legible con fondo solido/opaco y z-index correcto;
  - `Quiero comprar` con estado de error acotado si no cargan listados;
  - cards/listings sin copy de pago fiduciario;
  - fallback y error handling visible para imagenes;
  - upload movil mejorado para imagenes de publicaciones;
  - textarea de preguntas con `id` y `name`.
- **Validacion**: `git diff --check` limpio con warnings CRLF; `npx tsc --noEmit` limpio; `npm run build` limpio. Commit unico usado porque la separacion parcial de `MarketplaceModals.tsx` no aplico limpio y se evito loop.
- **Restricciones respetadas**: No se tocaron booking, `/reservas`, Prisma/runtime/db/env, APIs/actions, dashboards privados ni Blob/storage/paymentProofUrl/proxy SUPER.
- **Validacion pendiente en preview**: `/marketplace` mobile, menu hamburguesa, `Quiero Comprar`, `Quiero Vender` + upload desde movil, cards/listings con imagenes/fallback, listing detail + textarea preguntas y smoke rapido desktop.
- **Riesgo activo**: `lib/marketplace/media-client.ts` cambio para upload movil; validar desde galeria/camara. Si el upload visual funciona pero falla backend/storage, reportar antes de tocar storage/backend. No mezclar con payout final.

## 25. Sprint UX publico responsive marketplace

- **Fecha**: 2026-04-28
- **Estado real**: Cerrado y validado tecnicamente; pendiente solo revision visual humana si se quiere evidencia UI.
- **Descripcion**: Se corrigio el frente publico responsive del marketplace sin tocar schema ni logica de negocio. El foco fue legibilidad real en fondos oscuros, Q&A usable en mobile/desktop, labels compactos de bancos y horas no militares en chat.
- **Cambios cerrados**:
  - contraste reforzado en `/marketplace`, ficha publica, cards/listings, Q&A, checkout, modales y chat;
  - preguntas/respuestas mas legibles, con texto mayor, fondos mas contrastados y mejor espaciado;
  - inputs de preguntas/respuestas en detalle y modales pasan a areas tactiles mas comodas, con `id/name` donde aplica;
  - banco emisor del checkout se presenta como `0105-Mercantil` sin cambiar el valor completo enviado internamente;
  - horas visibles del chat marketplace pasan a formato 12h;
  - auth bar publica se ajusta con wrapping/truncado para mobile sin degradar desktop.
- **Dark/light**: Pendiente separado. No hay infraestructura de tema segura y los colores del marketplace estan hardcodeados en multiples superficies; implementarlo bien requiere sprint de diseno/refactor, no parche local.
- **Validacion**: `git diff --check` limpio con warnings CRLF; `npx tsc --noEmit` limpio; `npm run build` limpio, 29 paginas generadas.
- **Restricciones respetadas**: No se tocaron booking, `/reservas`, main/produccion, stashes, Prisma schema/migrations, tasas, carrito, finanzas/P&L, conformidad/fondos ni `paymentProofUrl`/proxy SUPER.
- **Riesgo activo**: La validacion ejecutada fue tecnica, no QA visual/manual. Si se pide QA visual futura, debe salir primero de `docs/07_handoffs/qa-dispatcher.json`; sin `task_id` exacto corresponde `GAP OPERATIVO`.
- **Accion inmediata recomendada**: Sprint 2 de bugs internos acotados, empezando por validar ruta dispatcher para `Guardar metodo de cobro` y nota interna admin.

## 26. Dark/light marketplace publico

- **Fecha**: 2026-04-28
- **Estado real**: Resuelto a nivel tecnico para superficies publicas principales del marketplace.
- **Descripcion**: El pendiente dark/light del Sprint UX publico queda implementado con theme scoped local, sin tocar booking, `/reservas`, negocio, pagos, schema ni dashboards financieros.
- **Cobertura**:
  - `/marketplace`;
  - `/marketplace/[slug]`;
  - cards/listings;
  - Q&A;
  - auth modal;
  - modales;
  - checkout;
  - chat/transaccion;
  - acciones de detalle.
- **Persistencia**: `localStorage` con key `turpial-marketplace-theme`; si no existe preferencia guardada, se respeta `prefers-color-scheme`.
- **Validacion**: `git diff --check` limpio con warnings LF -> CRLF; `npx tsc --noEmit` limpio; `npm run build` limpio con 29 paginas generadas.
- **Riesgo residual**: Pendiente solo revision visual humana opcional mobile/desktop. No ejecutar QA automatizada sin `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- **Restricciones respetadas**: No se tocaron carrito, tasas, finanzas, conformidad/fondos, schema/migrations ni `paymentProofUrl`/proxy SUPER.

## 27. Dark/light incompleto en dashboard/admin marketplace

- **Fecha**: 2026-04-28
- **Estado real**: Resuelto tecnicamente; sin commit y sin push.
- **Sintoma**: El theme dark/light funcionaba en superficies publicas, pero dashboard usuario/seller, admin y tabs quedaban fuera del root themeado.
- **Causa**: `MarketplaceThemeProvider` estaba montado localmente en landing y detalle; no existia `app/marketplace/layout.tsx`.
- **Fix**:
  - provider centralizado en `app/marketplace/layout.tsx`;
  - providers duplicados removidos de landing y detalle;
  - toggle agregado a dashboard y admin;
  - CSS scoped ampliado para tabs, cards, badges, tablas nativas, inputs, forms, paneles y modales;
  - toggle convertido a switch con label de accion disponible.
- **Validacion**:
  - `git diff --check`: limpio, solo warnings LF -> CRLF.
  - `npx tsc --noEmit`: limpio.
  - `npm run build`: limpio, 29 paginas generadas.
- **Restricciones respetadas**: No se ejecuto Playwright, QA automatizada ni CDP. No se tocaron booking, `/reservas`, main/produccion, stashes, schema/migrations, carrito, tasas, finanzas, conformidad/fondos, pagos ni `paymentProofUrl`/proxy SUPER.

## 28. Residuos visuales theme marketplace

- **Fecha**: 2026-04-28
- **Estado real**: Resuelto tecnicamente; sin commit y sin push.
- **Sintomas**:
  - banda negra superior en home marketplace light mode;
  - cards/paneles con fondo oscuro fijo en light;
  - bloques admin lavados o poco visibles;
  - textos secundarios demasiado tenues en dark;
  - tabs/paneles/inputs/modales con contraste irregular.
- **Causa principal**:
  - el `pt-16` global del `<main>` dejaba expuesto el fondo global oscuro antes del provider de marketplace;
  - coexistian estilos inline hardcodeados con el nuevo theme scoped.
- **Fix**:
  - `mp-route-shell` cubre el hueco superior con el fondo del theme;
  - tokens `--mp-*` ajustados para contraste;
  - compatibilidad CSS scoped ampliada para estilos inline, clases legacy, inputs, tablas, cards, panels, tabs y modales.
- **Validacion**:
  - `git diff --check`: limpio, solo warnings LF -> CRLF.
  - `npx tsc --noEmit`: limpio.
  - `npm run build`: limpio, 29 paginas generadas.
- **Restricciones respetadas**: No se ejecuto Playwright, QA automatizada ni CDP. No se tocaron booking, `/reservas`, main/produccion, stashes, schema/migrations, carrito, tasas, finanzas, conformidad/fondos, pagos, SOLD_OUT ni `paymentProofUrl`/proxy SUPER.

## 29. Cards negras residuales en dashboard usuario/seller

- **Fecha**: 2026-04-28
- **Estado real**: Resuelto tecnicamente; sin commit y sin push.
- **Sintomas**:
  - KPI superiores negros en light mode;
  - Cobros con cards internas oscuras: comision plataforma, cargo bancario, cargo Binance, datos de cobro, resumen y metodos registrados;
  - Mensajes con contenido mejorado pero KPI/listados superiores aun inconsistentes;
  - textos secundarios con contraste bajo.
- **Causa**: fondos y gradientes inline hardcodeados en `DashboardClient.tsx`, mas textos secundarios fijos demasiado tenues.
- **Fix**:
  - migracion directa a tokens `--mp-*` en las superficies criticas del dashboard usuario/seller;
  - cards, listados, TabBar, Mensajes y Cobros ahora dependen del theme scoped.
- **Restricciones respetadas**: No se ejecuto Playwright, QA automatizada ni CDP. No se tocaron admin, home, booking, `/reservas`, schema/migrations, carrito, tasas, finanzas/P&L, conformidad/fondos, acciones server, pagos, SOLD_OUT ni `paymentProofUrl`/proxy SUPER.

## 30. Guardar metodo de cobro y nota interna admin

- **Fecha**: 2026-04-28
- **Estado real**: Resuelto tecnicamente; sin commit y sin push.
- **Sintomas**:
  - el boton `Guardar metodo de cobro` podia fallar al guardar ciertos metodos del seller/usuario;
  - la nota interna admin podia perder foco, escribir un caracter por render o comportarse de forma erratica.
- **Causa metodo de cobro**:
  - mismatch entre `BINANCE_PAY` visible en UI y `CRYPTO_WALLET` como enum persistible;
  - falta de validacion server para tipo, moneda, payload y duplicado;
  - formulario condicionado a ventas en proceso, limitando el registro preventivo de datos.
- **Fix metodo de cobro**:
  - normalizacion de tipo antes de persistir;
  - validacion cliente/server de campos requeridos;
  - bloqueo de duplicados activos exactos;
  - actualizacion local de UI tras crear metodo y default automatico para el primer metodo.
- **Causa nota interna admin**:
  - `AdminDashboard` renderizaba tabs internos definidos dentro del componente como JSX (`<EscrowTab />`);
  - cada actualizacion del draft de nota podia crear una nueva identidad de componente y remountar el input.
- **Fix nota interna admin**:
  - tabs internos renderizados como helpers (`EscrowTab()`), preservando foco y value controlado;
  - el guardado sigue ocurriendo solo al confirmar la accion admin.
- **Archivos**:
  - `components/marketplace/dashboard/DashboardClient.tsx`;
  - `components/marketplace/admin/AdminDashboard.tsx`;
  - `actions/marketplace/users.ts`.
- **Restricciones respetadas**: No se ejecuto Playwright, QA automatizada ni CDP. No se tocaron booking, `/reservas`, schema/migrations, carrito, tasas, finanzas/P&L, conformidad/fondos, pagos/escrow fuera de la nota, SOLD_OUT, Blob/token de Jean ni `paymentProofUrl`/proxy SUPER.

## 31. Metodo de cobro con banco libre y telefono no normalizado

- **Fecha**: 2026-04-28
- **Estado real**: Resuelto tecnicamente; sin commit y sin push.
- **Sintomas**:
  - Banco en metodos de cobro aceptaba texto libre;
  - telefono podia guardarse con formatos inconsistentes;
  - `Metodos registrados` mostraba botones `Copiar` para datos propios del usuario.
- **Causa**:
  - el formulario de Cobros no reutilizaba la lista bancaria ya usada por checkout;
  - no existia helper reutilizable para normalizar movil venezolano;
  - la vista heredaba una accion de copia que no aporta valor en datos propios.
- **Fix**:
  - Banco pasa a select con `VENEZUELAN_BANK_OPTIONS`;
  - se agrega `normalizeVenezuelanMobilePhone` con prefijos `0412`, `0414`, `0416`, `0422`, `0424`, `0426`;
  - cliente y server validan/normalizan telefono y banco;
  - se quitan botones `Copiar` de los detalles registrados.
- **Ejemplos soportados**:
  - `+584141333305` -> `04141333305`;
  - `584141333305` -> `04141333305`;
  - `4141333305` -> `04141333305`;
  - `0414-133-33-05` -> `04141333305`;
  - `+584221234567` -> `04221234567`;
  - `4221234567` -> `04221234567`.
- **Archivos**:
  - `components/marketplace/dashboard/DashboardClient.tsx`;
  - `actions/marketplace/users.ts`;
  - `lib/marketplace/venezuelan-phone.ts`.
- **Restricciones respetadas**: No se ejecuto Playwright, QA automatizada ni CDP. No se tocaron booking, `/reservas`, schema/migrations, carrito, tasas, finanzas/P&L, conformidad/fondos, pagos/escrow, SOLD_OUT, Blob/token de Jean ni `paymentProofUrl`/proxy SUPER.

## 32. Hallazgos DiagnÃ³stico Sprint 3A - Marketplace-Pure

- **Fecha:** 2026-04-28
- **Estado real:** Diagnosticado; pendiente implementaciÃ³n en Sprint 3B.
- **Hallazgo 32.1: Mensajes/badges intra-sesiÃ³n:**
  - El refresh del chat no propaga el estado leÃ­do/no leÃ­do al dashboard global inmediatamente sin recarga o polling largo.
  - Se recomienda centralizar en `getMessageSummary()` y usar callbacks desde el chat.
- **Hallazgo 32.2: Disponibilidad por transacciÃ³n activa:**
  - El sistema permite iniciar compra aunque ya exista una transacciÃ³n activa (ej. `PENDING_PAYMENT`).
  - Falta refuerzo en `initiatePurchase()` y bloqueo visual en UI.
- **Impacto:** Riesgo de ventas duplicadas y confusiÃ³n en notificaciones en tiempo real.
- **AcciÃ³n inmediata:** Implementar bloqueos y sincronizaciÃ³n de estado en Sprint 3B.

## Checkpoint Sprint 3B1 - disponibilidad por transacción activa

**Fecha:** 2026-04-28
**Rama:** Marketplace-Pure
**Estado:** completado técnicamente, pendiente validación manual local antes de commit.

### Implementado
- Se agregó bloqueo de compra duplicada cuando un listing tiene una transacción activa.
- initiatePurchase() ahora rechaza nuevas compras si existe ctiveTx para el listing.
- La disponibilidad pública se deriva de ctiveTransactionStatus.
- MarketplaceCard muestra overlay de disponibilidad según estado.
- ListingDetailActions deshabilita el CTA de compra y muestra copy informativo.
- No se marca SOLD_OUT antes de validación real por admin.

### Estados bloqueantes
- PENDING_PAYMENT
- PAYMENT_RECEIVED
- VALIDATING
- IN_ESCROW
- DELIVERY_CONFIRMED
- DISPUTED

### Estados terminales
- RELEASED
- REFUNDED
- PAYMENT_FAILED
- CANCELLED

### Copy operativo
- PENDING_PAYMENT: Reservado temporalmente
- PAYMENT_RECEIVED / VALIDATING: Pago en revisión
- IN_ESCROW: Venta en proceso
- DELIVERY_CONFIRMED: Entrega confirmada
- DISPUTED: Operación en disputa
- SOLD_OUT / RELEASED: Vendido
- ACTIVE sin transacción activa: Disponible

### Validación técnica reportada
-
px tsc --noEmit: OK.
-
pm run build: OK.
- Pendiente confirmar git diff --check tras esta sincronización documental.

### Restricciones respetadas
- No se tocó schema.prisma.
- No se aplicaron migraciones.
- No se tocó booking ni /reservas.
- No se tocó main ni producción.
- No se tocaron pasarelas, carrito, tasas, finanzas, conformidad/fondos ni paymentProofUrl/proxy SUPER.
