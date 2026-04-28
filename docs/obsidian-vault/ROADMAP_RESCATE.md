---
tags: ["#roadmap", "#status/urgent", "#status/live-source"]
---

# Roadmap de Rescate

Obsidian es la fuente de trazabilidad viva del proyecto. Este archivo refleja el estado operativo real del marketplace al 2026-04-21 y deja el checkpoint para retomar sin rearmar contexto.

## Nota temporal QA local - ROTAR / BORRAR AL TERMINAR

`CREDENCIALES QA ADMIN TEMPORALES`

- admin principal: `mvera` / `13894619`
- admin alterno: `Igor` / `bugdanoff`

## Nota temporal corrida extendida local - ROTAR / BORRAR PROXIMA SESION

Objetivo operativo de esta corrida:
- validar end-to-end local de maxima cobertura util sobre marketplace con buyer + seller + admin,
- recorrer login, navegacion, chat/superficie conversacional, compra, pago manual, seller sales/cobros, admin validaciones/comisiones/pagos,
- comparar coherencia visible de estados y calculos entre buyer, seller y admin.

Credenciales QA temporales activas para esta corrida:
- buyer: `Igor` / `bugdanoff`
- seller: `mvera` / `13894619`
- admin: `mvera` / `13894619`

Regla temporal:
- estas credenciales deben borrarse o rotarse en la proxima sesion,
- usar contextos separados por rol durante la corrida para evitar contaminacion de sesion,
- no mover estas credenciales a codigo productivo, seeds, variables permanentes ni logs persistentes.

Restriccion operativa:
- uso exclusivo para pruebas locales de hoy,
- no copiar a `AGENTS.md`,
- no mover a variables permanentes,
- no dejar en seeds publicas,
- no dejar en codigo productivo,
- no dejar en logs persistentes del repo.

## Estado actual real del marketplace

El marketplace esta funcional y es un sistema separado del booking.

El schema del marketplace mantiene prefijo `MP_` en Prisma para evitar colisiones con el backend de booking de Jean.

El flujo operativo vigente sigue siendo manual temporal:

- checkout manual para buyer,
- conciliacion manual por admin,
- entrada a escrow solo despues de validacion real,
- payout manual al seller.

Las imagenes de listings y los comprobantes ya no deben ir en base64. La media quedo migrada a persistencia por URL/asset externo temporal con capa desacoplada para mover luego a storage productivo sin rehacer formularios ni render.

El dashboard ya acompana el flujo manual actual tanto para conciliacion admin como para seguimiento seller.

El build de Vercel quedo documentado como limpio en tipos y luego con ajustes ESLint cerrados para deploy.

SEO/AEO es requisito transversal para todo el sitio y debe considerarse en cualquier cambio publico de marketplace o paginas relacionadas.

## Hecho y confirmado

- [x] Marketplace funcional y separado del booking.
- [x] Prefijo `MP_` mantenido como regla de separacion en Prisma.
- [x] Checkout manual temporal operativo.
- [x] Conciliacion manual operativa a nivel de codigo y dashboard.
- [x] `initiatePurchase()` no agota el listing antes de pago validado.
- [x] El listing pasa a `SOLD_OUT` solo cuando el pago es aprobado y entra en escrow.
- [x] Aprobacion admin restringida para no aprobar desde `PENDING_PAYMENT`.
- [x] Dashboard admin y seller adaptados al flujo manual actual.
- [x] Imagenes y comprobantes fuera del flujo productivo de base64.
- [x] Persistencia de media por URL/asset externo temporal desacoplado.
- [x] Build de Vercel saneado en tipos y luego ajustado en ESLint para cerrar deploy.

## Bloqueos criticos

- [x] Confirmar en la base real si existen `paymentSenderBank`, `paymentPaidAt` e indices.
- [x] Aplicar la migracion/schema real de conciliacion manual en la DB activa.
- [ ] Ejecutar QA manual end-to-end buyer -> admin -> escrow -> payout manual seller.
  Estado parcial actual: buyer ya fue validado en UI y persistencia sobre `localhost:3002`; siguen pendientes admin, escrow y payout seller.
- [ ] Confirmar en entorno real que la capa actual de media por URL funciona correctamente.

## Hallazgos funcionales activos del marketplace

- [x] Mis compras muestra contador alineado con compras reales del listado.
  Impacto: la metrica visible ya no depende del agregado atrasado del perfil.
  Prioridad: resuelto.
- [x] Al abrir una compra o venta ahora aparece detalle con estado, referencia, banco, fechas y linea de estado.
  Impacto: buyer y seller ya tienen contexto util para operar.
  Prioridad: resuelto.
- [ ] Operativo y Todos muestran casi la misma informacion.
  Impacto: la segmentacion del dashboard no aporta valor real.
  Prioridad: media-alta.
- [x] El CSV exportado ya sale con BOM UTF-8, caracteres legibles y columnas alineadas con la vista.
  Impacto: vuelve a ser util para conciliacion operativa.
  Prioridad: resuelto.
- [x] En Pagos ya se muestran los datos de cobro del vendedor.
  Impacto: admin vuelve a tener visibilidad operativa para payout manual.
  Prioridad: resuelto.
- [x] Totales de ventas, comisiones, neto y pendiente quedaron mas coherentes en seller/admin.
  Impacto: mejora la lectura contable del flujo real.
  Prioridad: parcialmente resuelto; validar con QA real.
- [x] El tab de comisiones ya no depende solo de `RELEASED` mensual y refleja mejor flujo operativo.
  Impacto: evita cero falsos cuando ya existen operaciones activas.
  Prioridad: parcialmente resuelto; validar con datos reales.
- [x] La nota interna de validaciones ya no queda limitada a un caracter por render.
  Impacto: el input vuelve a ser usable en operacion admin.
  Prioridad: resuelto.
- [x] El badge de mensajes sin leer ya es clickeable y navega al tab correcto.
  Impacto: reduce friccion para entrar al contexto correcto.
  Prioridad: resuelto.
- [x] El tab de mensajes ahora separa chats por atender y todos los chats.
  Impacto: mejora la correspondencia entre badge, prioridad y listado.
  Prioridad: parcialmente resuelto; validar conteos reales en QA.
- [x] Ya existe mensaje operativo posterior a Pago recibido para buyer y seller.
  Impacto: reduce incertidumbre durante validacion manual.
  Prioridad: resuelto.
- [ ] Existe un desajuste transversal entre metricas, tabs y flujo real.
  Impacto: el dashboard necesita una pasada de coherencia funcional, no solo fixes puntuales.
  Prioridad: critica.

## Correcciones funcionales aplicadas en esta ventana

- [x] Dashboard buyer/seller ahora deriva contadores clave desde transacciones reales y no desde agregados viejos del perfil.
- [x] Compras y ventas quedaron clickeables con modal de detalle operativo.
- [x] Mensajes prioriza conversaciones con unread y el badge superior navega al tab.
- [x] Admin obtuvo vista conmutada entre tarjetas y tabla completa para conciliacion.
- [x] Reporte de payouts muestra metodo, cuenta y detalles visibles de cobro.
- [x] Export CSV corregido con encoding UTF-8 BOM y columnas escapadas.
- [x] Input de nota interna desacoplado del objeto de accion para evitar escritura rota.
- [x] `npm run build` limpio post-cambios.
- [x] `npx tsc --noEmit` limpio post-cambios.

## Pendiente importante

- [ ] Sustituir el storage temporal actual por storage productivo definitivo y durable.
- [ ] Definir el cierre auditable del payout despues de `RELEASED`.
- [ ] Implementar cron T+7 para auto-release.
- [ ] Mantener Mercantil y Binance Pay diferidos hasta estabilizar operacion real.
- [ ] Hero marketplace plasma/rayo pro ligero.
  Alcance: aplica solo al hero del marketplace y debe mantenerse compatible con el hero actual.
  Criterio visual: version pro, estetica y liviana, con sensacion de rayo/plasma de alta calidad sin tocar el resto del site.
  Implementacion preferida: CSS/SVG hibrida o equivalente liviano.
  Restricciones: no reintroducir canvas pesado, no afectar rendimiento, no afectar SEO/AEO y no tocar otras superficies del sitio.
  Estado: queda en cola para una proxima pasada.

## Validacion real ya cerrada

- [x] DB activa correcta confirmada: Neon `neondb`.
- [x] `paymentReference` ya existia en la base activa.
- [x] `paymentSenderBank` y `paymentPaidAt` no estaban en la base activa al iniciar esta verificacion.
- [x] La migracion `20260419_marketplace_manual_reconciliation` estaba pendiente en la DB activa.
- [x] `prisma migrate deploy` no pudo usarse directamente por baseline/historial Prisma desalineado sobre una base no vacia (`P3005`).
- [x] Se aplico el SQL real de la migracion sobre la DB activa.
- [x] Se alineo el historial con `prisma migrate resolve --applied 20260419_marketplace_manual_reconciliation`.
- [x] Quedaron presentes `paymentReference`, `paymentSenderBank`, `paymentPaidAt` e indices asociados en `mp_transactions`.
- [x] `npm run build` limpio.
- [x] `npx tsc --noEmit` limpio.

## Resuelto y no reabrir

- [x] No mezclar marketplace con booking.
- [x] No quitar prefijo `MP_`.
- [x] No usar base64 en el camino productivo.
- [x] No mover `SOLD_OUT` antes de pago validado.
- [x] No aprobar manualmente desde estados previos no permitidos.

## Foco operativo vigente

Hasta nuevo aviso, el orden correcto es:

1. tomar como cerrado el bloqueador de schema/migracion,
2. correr QA manual end-to-end sobre dashboard, conciliacion y payout visual,
3. documentar hallazgos residuales o ajustes de segunda pasada,
4. luego migrar de storage temporal a storage productivo definitivo.

## Checkpoint corrida extendida local 2026-04-21

Resultado operativo sintetico:
- buyer `Igor / bugdanoff` completo login y recompra local sobre `qa-manual-temporal-user-20260420` hasta `Pago procesado`,
- buyer ve nuevos registros `QA manual temporal user` en `Mis compras` con estado visible `Pago Recibido`,
- seller `mvera / 13894619` entro a `Mis Ventas`, abrio `Mensajes`, respondio en el hilo de `prueva de venta fluijo completo` y valido `Cobros`,
- `Cobros` seller quedo coherente con metodo registrado visible `Pago movil / Cobro QA mvera / Mercantil / 04141234567`,
- admin `mvera / 13894619` entro al shell, `Dashboard`, `Comisiones` y `Pagos`,
- `Pagos` sigue mostrando bloque viejo de payout `manuel vera p` con `UNKNOWN · Sin método configurado`,
- intento de localizar `prueva de venta fluijo completo` en `Validaciones` durante esta corrida no encontro el registro en esa vista; ese frente sigue abierto como inconsistencia operativa,
- buyer/seller si muestran `prueva de venta fluijo completo` en superficies propias con estado visible `En Escrow`,
- los warnings de hidratacion persisten en `MarketplaceCard.tsx` y `DashboardClient.tsx`, pero no bloquearon el flujo principal,
- estado global de la corrida: `amarillo`.

## Checkpoint reconciliacion puntual 2026-04-21

Foco 1 `seller/Cobros`:
- la UI calcula `Total de ventas`, `Fee bancario`, `Neto a recibir` y `Pendiente por pagar` sobre `payoutRelevantSales`,
- pero `Comision 5%` sale de `platformFeeAmount - extraFee`,
- en el registro comun visible `prueva de venta fluijo completo` se observa `Total de ventas $2500.00`, `Fee bancario 0.03% $0.75`, `Neto a recibir $2499.25`, `Pendiente por pagar $0.00` y `Comision 5% $0.00`,
- interpretacion mas probable: el fee extra bancario existe en la transaccion visible, pero el componente no tiene `platformFeeAmount` cargado/coherente para ese estado y por eso el 5% queda en cero; parece inconsistencia real de dato/calculo visible, no solo copy.

Foco 2 `admin/Validaciones`:
- el propio encabezado/copy define la vista como `Pagos reportados por compradores pendientes de validacion manual`,
- el filtro por defecto de `Validaciones` es `PAYMENT_RECEIVED`,
- el registro comun `prueva de venta fluijo completo` hoy se ve como `En Escrow` en buyer y seller,
- conclusion operativa: lo mas probable es que no deba aparecer en `Validaciones` por su estado actual; la ausencia apunta mas a diferencia esperable por etapa del flujo que a bug de query en esa vista.

Foco 3 `seller/Cobros` vs `admin/Pagos`:
- `seller/Cobros` muestra metodo de cobro configurado para `mvera` (`Pago movil`, `Cobro QA mvera`, `Mercantil`, `04141234567`),
- `admin/Pagos` sigue mostrando un bloque distinto de payout historico para `manuel vera p` con `UNKNOWN · Sin método configurado`,
- no hay evidencia suficiente para tratarlos como el mismo payout; hoy parecen superficies de registros distintos.

## Checkpoint claro para reanudar manana

- estado del marketplace: funcional, separado del booking y en fase de estabilizacion,
- estado del checkout manual: activo como flujo temporal oficial,
- estado de imagenes/storage: base64 eliminado del flujo real; media por URL con storage externo temporal,
- estado del dashboard: acompanando conciliacion manual y seguimiento operativo,
- estado del dashboard post-fix: contadores, detalle clickeable, mensajes priorizados, CSV corregido, datos de cobro visibles y tabla completa admin ya implementados,
- bloqueador `paymentSenderBank`: resuelto en la DB activa; columnas e indices ya existen y el historial Prisma quedo alineado,
- estado buyer QA: confirmado en UI y DB para `qa-manual-temporal-user-20260420`,
- transaccion buyer confirmada: `cmo827au800002kne6v9ofhk4` en `PAYMENT_RECEIVED`,
- pendiente operativo actual: continuar desde admin y seller sin reabrir buyer salvo evidencia de regresion.

## Checkpoint cuentas QA persistentes 2026-04-21

Metodo elegido:
- script local idempotente `scripts/setup-marketplace-qa-accounts.ts`,
- objetivo: crear o normalizar cuentas QA persistentes sin tocar auth global ni Prisma,
- reutilizacion: correr el script vuelve a dejar usuarios, payout y listing QA en estado estable sin duplicar basura estructural.

Cuentas QA persistentes:
- `buyerIA`
  - email: `buyerIA@local.test`
  - password: `BuyerIA_QA_2026!`
  - rol efectivo: `USER`
  - `isSeller: false`
  - sin admin / sin exencion
- `sellerIA`
  - email: `sellerIA@local.test`
  - password: `SellerIA_QA_2026!`
  - rol efectivo: `USER`
  - `isSeller: true`
  - sin admin / sin exencion (`SOCIO` y `SUPER` no aplican)

Metodo de cobro persistente `sellerIA`:
- tipo: `PAGO_MOVIL`
- label: `Cobro QA sellerIA`
- banco: `Mercantil`
- telefono: `04120000002`
- cedula: `26000001`
- queda como predeterminado para futuras QA locales.

Listing QA persistente asociado:
- slug: `selleria-qa-e2e-persistente`
- titulo: `sellerIA QA e2e persistente`
- status: `ACTIVE`
- seller: `sellerIA`
- uso previsto: buyerIA -> sellerIA para chat, compra, checkout manual y validacion cross-view.

Verificacion funcional local cerrada:
- `buyerIA` login real correcto y sin superficie admin visible,
- `sellerIA` login real correcto y sin superficie admin visible,
- `sellerIA` entra a dashboard seller normal,
- `Quiero Vender` abre flujo visible de publicacion,
- `buyerIA` puede abrir el listing persistente de `sellerIA`,
- `buyerIA` puede abrir chat real sobre ese listing,
- `buyerIA` puede iniciar compra y reportar pago manual,
- `sellerIA` ve el resultado en `Mis Ventas`,
- `sellerIA` ve el hilo en `Mensajes`,
- `sellerIA` ve `Cobros` con metodo persistente y resumen operativo.

Como regenerarlas o reusarlas:
- regenerar/normalizar: `npx tsx scripts/setup-marketplace-qa-accounts.ts`
- QA UI rápida: `node scripts/qa-marketplace-qa-accounts.mjs`
- flujo base futuro:
  1. login buyerIA,
  2. abrir `/marketplace/selleria-qa-e2e-persistente`,
  3. chatear y comprar,
  4. login sellerIA,
  5. revisar `Mis Ventas`, `Mensajes`, `Cobros`,
  6. luego seguir con admin si hace falta conciliacion o escrow.

## Checkpoint cierre buyerIA -> sellerIA -> admin 2026-04-21

Corrida corta final sobre el registro nuevo `sellerIA QA e2e persistente`:
- buyerIA completo login, abrio el listing persistente, abrio chat, envio mensaje QA y reporto pago manual,
- buyerIA quedo con estado visible `Pago Recibido` en `Mis Compras`,
- sellerIA vio el mismo registro en `Mis Ventas` con comprador `buyerIA` y estado `Pago Recibido`,
- sellerIA vio el hilo en `Mensajes`,
- sellerIA mantuvo `Cobro QA sellerIA` visible en `Cobros`,
- admin `mvera` entro a `Validaciones`, que es la superficie correcta para este estado,
- el registro aparecio en `Validaciones` con buyer, seller, monto, comision, neto, banco y numero de operacion visibles,
- evidencia visible de admin para el registro seguido: `sellerIA QA e2e persistente`, `buyerIA -> sellerIA`, `Pago recibido`, `$125.00`, `Comision $6.29`, `Neto vendedor $118.71`, `Banco emisor 0105 - Banco Mercantil`, `Numero de operacion QA1776786501382`, `Pago vendedor: Cobro QA sellerIA`.

Veredicto operativo:
- el flujo principal buyerIA -> sellerIA -> admin queda funcionalmente cerrado en local,
- no se observaron bloqueos funcionales nuevos del producto en esta pasada,
- persisten warnings de hidratacion en `MarketplaceCard.tsx` y superficies relacionadas, pero no bloquearon el flujo principal.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/obsidian-vault/00_CENTRAL_TURPIAL.md
- docs/obsidian-vault/ROADMAP_RESCATE.md
- docs/obsidian-vault/BUGS_CRITICOS.md
- docs/obsidian-vault/ARQUITECTURA_TASAS.md
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/marketplace/00_IMPLEMENTATION_SUMMARY.md
- docs/marketplace/01_ROADMAP_AND_STATUS.md

Resume en 8-10 lineas el estado real del marketplace.
Confirma que paymentSenderBank/paymentPaidAt ya quedaron aplicados en la DB activa y no reabras ese frente.
Confirma que ya quedaron aplicados los fixes funcionales de dashboard/admin y no reabras ese frente sin evidencia.
Luego ejecuta QA manual completa buyer -> admin -> escrow -> payout manual seller validando:
- contadores vs listados,
- detalle de compras/ventas,
- tabs Operativo vs Todos + terminales,
- CSV exportado,
- datos de cobro del vendedor,
- totales/comisiones/neto/pendiente,
- nota interna,
- badge y tab de mensajes,
- mensaje posterior a Pago recibido.
Si queda algo desalineado, haz segunda pasada puntual.
Actualiza Obsidian y handoff antes de abrir cualquier otro frente.
```

## Regla de mantenimiento

Si cambia el estado operativo real, este archivo se actualiza antes que los docs de resumen tecnico.

## Checkpoint frente actual 2026-04-21 - Flujo de publicacion seller

Frente actual:
- flujo de publicacion seller
- no reabrir buyer, admin, booking ni hardening ya cerrado

Ultimo cambio aplicado:
- `components/marketplace/MarketplaceModals.tsx`
- ajuste de consistencia post-publicacion inmediata para el listing recien creado:
  - `seller/talent.id` usa `currentUserId`
  - `slug` usa el valor real devuelto por server
  - `status` queda coherente con persistencia activa

Estado despues del cambio:
- `npx tsc --noEmit`: limpio
- `npm run build`: limpio
- el frente de codigo queda listo para validacion viva puntual del seller

Ultima corrida de validacion viva:
- objetivo: `sellerIA -> Quiero Vender -> publicar listing minimo -> abrir detalle recien creado -> confirmar slug real y visibilidad en Mi Tienda`
- server local `http://localhost:3000/marketplace` respondio `200`
- la corrida no llego a crear el listing QA
- verificacion posterior en DB para titulos `QA seller publish ...` devolvio `[]`
- el bloqueo observado fue del harness de automatizacion usado para la validacion, no evidencia nueva de fallo funcional confirmada en el producto
- punto donde quedo cortada la corrida: antes de completar publicacion real dentro de `MarketplaceAuthModal / Quiero Vender`

Siguiente paso exacto:
1. iniciar sesion como `sellerIA`
2. entrar a `Quiero Vender`
3. publicar un listing minimo de prueba
4. abrir inmediatamente el detalle del listing recien creado
5. confirmar:
   - navegacion inmediata
   - detalle abre
   - slug real devuelto por server
   - estado visible coherente
   - presencia en `Mi Tienda`

## Cierre formal 2026-04-21/22 - Validacion viva flujo de publicacion seller

Estado:
- `VALIDADO`

Archivo validado indirectamente:
- `components/marketplace/MarketplaceModals.tsx`

Resultado:
- publicacion seller confirmada end-to-end sin regresion observable

Evidencia:
- URL final:
  - `http://localhost:3000/marketplace/qa-seller-publish-1776817368300-1776817377769`
- slug:
  - `qa-seller-publish-1776817368300-1776817377769`
- titulo:
  - `QA seller publish 1776817368300`
- estado visible:
  - `Activo`
- detalle abierto correcto con texto:
  - `Este es tu listing.`
- DB:
  - `id: cmo9b6v3u0000g8ne9jx36t66`
  - `status: ACTIVE`
  - `createdAt: 2026-04-22T00:22:57.786Z`

Conclusion:
- no hubo senal observable de dato sintetico/stale post-publicacion
- el bloqueo anterior pertenecia al harness, no al flujo productivo
- en esta validacion no se reabrieron buyer, admin ni booking

Siguiente frente funcional mas logico:
- pasar a coherencia funcional del shell seller ya publicado, centrado en `Mi Tienda` / tabs seller / metricas visibles, porque el flujo de creacion-publicacion ya quedo validado y el siguiente riesgo operativo natural esta en la consistencia post-publicacion dentro del dashboard seller.

## Cierre formal 2026-04-21/22 - Validacion shell seller post-publicacion

Frente:
- coherencia funcional del shell seller ya publicado

Resultado:
- `VALIDADO`

Tabs revisadas:
- `Mi Tienda`
- `Mis Ventas`
- `Mensajes`
- `Cobros`

Evidencia principal:
- `Mis Publicaciones (2)` incluye `QA seller publish 1776817368300` con `$111` y estado `Activo`
- tambien aparece el listing persistente `sellerIA QA e2e` como `Agotado`
- header seller:
  - `Publicaciones: 2`
  - `Compras: 0`
  - `Calificacion: -`
  - `Favoritos: 0`
- badges / tabs:
  - `Mi Tienda: 2`
  - `Mis Ventas: 7`
  - `Cobros: 3`
- `Mensajes`:
  - `Chats por Atender`: sin pendientes
  - `Todos los Chats`: `1`
- `Cobros`:
  - `Total de ventas: $375.00`
  - `3 ventas operativas`
  - `Comision 5%: $18.75`
  - `Fee bancario 0.03%: $0.12`
  - `Fee Binance: $0.00`
  - `Neto a recibir: $356.13`
  - `Pendiente por pagar: $118.71`
  - `1 liberada`
  - `Validaciones pendientes: 4`
  - `Escrow activo: 2`
  - `Payouts listo: 1`
  - `Total a recibir: $118.71`
  - metodo visible: `Cobro QA sellerIA / Pago movil / Mercantil / 04120000002`

Contraste UI vs DB:
- coherente
- listings `sellerIA`: `2`
- listings `ACTIVE`: `1`
- transacciones seller: `7`
- `PAYMENT_RECEIVED`: `4`
- `IN_ESCROW`: `2`
- `RELEASED`: `1`
- ventas operativas: `3`
- `operationalSold: $375.00`
- `operationalSellerNet: $356.13`
- `payoutReadyNet: $118.71`

Conclusion:
- no hubo stale state
- no hubo duplicados
- no hubo ausencia de refresh
- no hubo mismatch funcional UI/DB
- no hubo quiebre funcional en esta validacion

Siguiente frente propuesto:
- validacion viva de continuidad transaccional `buyer -> seller -> admin` enfocada en estados, conciliacion visible y consistencia de metricas, sin ejecutar cambios todavia.

## Checkpoint 2026-04-23 - Storage productivo marketplace con Vercel Blob

Frente:
- reemplazo del storage temporal local para imagenes publicas del marketplace y base comun de media publica no-booking

Decision:
- usar Vercel Blob como storage productivo definitivo inicial del dominio publico no-booking
- mantener fallback local `public/public-media/*` solo para desarrollo sin credenciales
- en `NODE_ENV=production`, si falta `TS_WEB_BLOB_READ_WRITE_TOKEN`, el upload publico no-booking falla explicitamente para evitar persistencia efimera accidental

Cambios aplicados:
- `@vercel/blob` agregado a dependencias
- `lib/marketplace/media.ts` ahora guarda media publica de marketplace en Vercel Blob cuando existe `TS_WEB_BLOB_READ_WRITE_TOKEN`
- `components/marketplace/MarketplaceImage.tsx` optimiza tambien URLs publicas de Vercel Blob
- `lib/marketplace/media-url.ts` concentra deteccion segura de URLs Blob para uso cliente
- `next.config.mjs` permite imagenes remotas desde `*.public.blob.vercel-storage.com`

Validacion tecnica:
- `npx tsc --noEmit`: limpio
- `npm run build`: limpio

Pendiente externo:
- crear/conectar store Blob en Vercel
- asegurar `TS_WEB_BLOB_READ_WRITE_TOKEN` en Preview y Production
- sincronizar `.env.local` con el token si se quiere probar Blob real en local

QA viva pendiente:
- sellerIA publica listing con imagen real
- abrir detalle recien creado y confirmar que la imagen carga desde URL `https://*.public.blob.vercel-storage.com/...`
- recargar pagina y confirmar persistencia
- no probar comprobantes contra Blob publico; proofs sensibles quedan fuera de esta capa
- confirmar que no se genera nueva ruta local bajo `public/public-media/*` cuando el token esta configurado

## Checkpoint 2026-04-23 - Frontera de ownership storage/media

Contexto de equipo:
- Jean maneja booking/reservas.
- Manuel maneja marketplace, home, subpaginas y frontend publico no-booking.
- La DB se comparte, pero Blob/token/storage no se comparte.
- Todo lo nacido de `/reservas` queda fuera de este frente y no debe tocarse desde la capa publica no-booking.

Regla de ownership:
- Storage de Manuel: `home`, subpaginas, marketplace e imagenes/medios publicos no-booking.
- Storage de Jean: `/reservas`, booking y cualquier superficie de reservas.
- No usar `BLOB_READ_WRITE_TOKEN` generico para el dominio de Manuel.
- Variable exclusiva requerida para media publica no-booking: `TS_WEB_BLOB_READ_WRITE_TOKEN`.

Capa implementada:
- `lib/media/public-no-booking-storage.ts`
  - representa media publica no-booking.
  - usa explicitamente `TS_WEB_BLOB_READ_WRITE_TOKEN`.
  - no consume `BLOB_READ_WRITE_TOKEN` ni token de Jean.
  - en produccion falla cerrado si falta el token dedicado.
- `lib/media/public-no-booking-url.ts`
  - helper de URLs Blob publicas para render compartido.
- `lib/marketplace/media.ts`
  - queda como adaptador marketplace.
  - `listing-image` y `avatar` entran en public media no-booking.
  - `payment-proof` queda fuera del Blob publico no-booking.

Clasificacion actual:
- Public media del sitio: imagenes/videos/audio del home y subpaginas bajo `/public/images`, `/public/video`, `/public/audio`; hoy son assets estaticos y quedan dentro del dominio no-booking si se migran a Blob.
- Media publica de marketplace: imagenes de listings y avatars; usan la capa publica no-booking.
- Media sensible/transaccional marketplace: comprobantes de pago; no van al Blob publico no-booking.
- Booking/reservas: excluido; storage/token de Jean separado.

Decision sobre proofs:
- Los comprobantes no se migran al Blob publico del sitio.
- En produccion, `payment-proof` falla cerrado hasta definir storage sensible dedicado o proxy autenticado.
- En desarrollo queda fallback local solo para no bloquear pruebas locales, documentado como temporal.

Siguiente paso externo:
- Crear un Vercel Blob Store propio para public media no-booking.
- Conectar el token a `TS_WEB_BLOB_READ_WRITE_TOKEN` en Preview/Production.
- No usar ni copiar el store/token de Jean.

## Checkpoint 2026-04-23 - Golden path QA/CLI canonica

Decision operativa:
- dejar una capa canonica de QA/CLI para que Codex no vuelva a redescubrir scripts ni rutas de ejecucion

Runbook fuente:
- `docs/07_handoffs/qa-canonical-runbook.md`

Regla operativa exacta:
- usar primero el script canonico documentado
- no buscar scripts alternativos salvo fallo explicito de precondicion
- separar preflight de ejecucion QA
- no redescubrir el flujo si el runbook ya lo define

Clasificacion vigente:
- `CANONICAL`
  - `scripts/setup-marketplace-qa-accounts.ts`
  - `scripts/qa-marketplace-qa-accounts.mjs`
- `SUPPORTING`
  - `scripts/qa-marketplace-buyer.mjs`
  - `scripts/qa-marketplace-seller-smoke.mjs`
  - `scripts/qa-marketplace-admin-smoke.mjs`
  - `scripts/qa-marketplace-reconcile.mjs`
- `LEGACY`
  - `scripts/qa-marketplace-e2e-extended.mjs`
- `EXPERIMENTAL`
  - `scripts/qa-marketplace-temp.mjs`

Golden path:
1. si hay drift de cuentas o listing QA, correr `npx tsx scripts/setup-marketplace-qa-accounts.ts`
2. si se necesita smoke reutilizable buyer/seller/admin, correr `node scripts/qa-marketplace-qa-accounts.mjs`
3. usar scripts supporting solo para chequeos puntuales por rol
4. no usar `temp` ni `extended` como primera opcion

Contexto media/blob preservado:
- una imagen visible con `data:image/jpeg;base64,...` corresponde a legacy/base64
- los uploads nuevos de seller publish ya enrutan a Blob en codigo
- `payment-proof` queda fuera del Blob publico no-booking
- la validacion viva quedo bloqueada antes de publicar por el harness de login/CTA
- no hay evidencia de fallo de Blob en el camino real
- siguiente paso real pendiente:
  - sellerIA manual en preview
  - publicar listing con imagen nueva
  - abrir detalle recien creado
  - confirmar URL `https://*.public.blob.vercel-storage.com/...`

## Actualizacion 2026-04-23 - Blob/media preview validado

Estado:
- `VALIDADO`

Hallazgo operativo importante:
- el preview `3397rmisp` seguia `Ready` pero estaba desactualizado; no era evidencia valida del estado real del frente
- el preview vigente correcto fue `https://turpialsound-732mlgxcv-cerberus77s-projects.vercel.app`

Evidencia viva:
- sellerIA publico `QA blob verify 1776975409520`
- detalle abierto en `https://turpialsound-732mlgxcv-cerberus77s-projects.vercel.app/marketplace/qa-blob-verify-1776975409520-1776975422206`
- `/api/marketplace/upload` devolvio `200`
- URL persistida:
  - `https://6nylezvxxx1yjqtr.public.blob.vercel-storage.com/public-media/marketplace/listings/2026/04/1776975421901-dcdbb698-5517-46bd-9eb4-88f1e28e630f.webp`
- verificacion final:
  - owner notice visible
  - Blob presente
  - `data:image/...` ausente en el listing nuevo

Cierre:
- queda confirmado el enrutamiento real de uploads NUEVOS de seller publish hacia Blob publico no-booking
- legacy/base64 no bloquea este frente
- no tocar booking ni `/reservas`

## Actualizacion 2026-04-23 - Proofs sensibles marketplace implementados

Estado:
- `IMPLEMENTADO A NIVEL TECNICO`

Frontera cerrada:
- `listing-image` y `avatar` siguen en Blob publico no-booking.
- `payment-proof` ya no usa el Blob publico no-booking.
- booking y `/reservas` siguen fuera de este frente.

Implementacion aplicada:
- se creo una capa dedicada `lib/media/marketplace-sensitive-storage.ts`
- `payment-proof` ahora guarda en storage sensible separado con `access: 'private'` cuando existe token dedicado
- la URL persistida para proofs ya no es publica del store; ahora es una URL interna autenticada del app bajo `/api/marketplace/payment-proofs/...`
- se agrego proxy autenticado para lectura del comprobante
- el upload de proof exige `transactionId` y valida pertenencia del buyer + estado permitido antes de guardar
- en desarrollo el fallback local ya no cae en `public/`; queda en `.tmp-marketplace-sensitive-media/`

Variable nueva requerida:
- `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN`

Regla de seguridad:
- no reutilizar `TS_WEB_BLOB_READ_WRITE_TOKEN`
- no usar `BLOB_READ_WRITE_TOKEN` generico
- no usar Blob/token de Jean

Riesgo residual exacto:
- proofs NUEVOS ya no quedan expuestos en Blob publico
- si falta `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Preview/Production, el upload de proofs falla cerrado
- los proofs legacy no se migraron en esta pasada

Validacion tecnica:
- `npx tsc --noEmit`: limpio
- `npm run build`: limpio

Siguiente paso minimo:
1. crear/conectar Blob privado dedicado para marketplace sensible
2. cargar `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` en Preview/Production
3. ejecutar smoke tecnico corto:
   - buyer sube comprobante nuevo
   - admin abre el proof por la URL interna autenticada
   - confirmar que no existe URL publica del store en `paymentProofUrl`

## Actualizacion 2026-04-23 - Intento de smoke preview proofs sensibles

Preview usado:
- `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`

Preflight real:
- preview accesible: `OK`
- token sensible en Vercel Preview: `OK`
- cuentas QA vigentes por runbook: `buyerIA`, `sellerIA`, `mvera`

Resultado:
- `NO VALIDADO AUN EN VIVO`

Bloqueo exacto:
- esta sesion no pudo conducir el flujo preview buyer/admin por browser reutilizable
- el fallback de server actions por HTTP tampoco quedo operativo desde aqui:
  - action IDs del build identificados correctamente
  - cookie `mp_session` aceptada por el preview
  - pero el POST de server action devolvio HTML normal `200`, no respuesta `text/x-component`
- por esa razon no se llego a:
  - subir proof nuevo desde el flujo real
  - persistir `paymentProofUrl` nuevo en preview
  - abrir un proof nuevo por proxy como admin

Lectura correcta del bloqueo:
- no hay senal nueva de error en Blob sensible, token o proxy
- el bloqueo es del harness/ejecucion de la prueba en esta sesion

Siguiente paso minimo:
1. reintentar exactamente este smoke en una sesion con browser interactivo funcional
2. buyerIA compra el listing QA persistente y adjunta comprobante nuevo
3. confirmar `/api/marketplace/upload` exitoso
4. entrar como `SUPER` a `Validaciones`
5. validar:
   - `paymentProofUrl` persistido bajo `/api/marketplace/payment-proofs/...`
   - ausencia de Blob publico en el proof nuevo
   - apertura `200` del proxy protegido

## Actualizacion 2026-04-23 - Dispatcher QA obligatorio

Problema cerrado:
- el runbook ya existia y si se uso
- la debilidad restante era no tener despacho exacto por objetivo
- sin esa capa, una sesion podia caer en exploracion fuera de cobertura si el objetivo no tenia ruta canonica exacta

Decision operativa nueva:
- fuente de despacho por objetivo:
  - `docs/07_handoffs/qa-dispatcher.json`
- el runbook queda como explicacion humana, no como mapa unico de decision
- si un objetivo no tiene entrada exacta en el dispatcher:
  - no se improvisa
  - se detiene la ejecucion
  - se reporta `GAP OPERATIVO`

Verdad actual preservada:
- `payment_proof_sensitive_preview` sigue siendo `manual_preview`
- si no hay browser interactivo funcional, se reporta precondicion/gap y no se prueban metodos ad hoc
- no repetir automaticamente:
  - `cdp improvisado`
  - `reverse engineering de server actions`
  - `protocolo HTTP ad hoc para UI flows`

Regla de mantenimiento:
- cuando un script o metodo quede validado para un objetivo, se registra obligatoriamente en:
  1. `docs/07_handoffs/qa-dispatcher.json`
  2. `docs/07_handoffs/qa-canonical-runbook.md`

## Actualizacion 2026-04-24 - Reanudacion no interactiva y estado exacto

Contexto:
- se intento recuperar la ultima sesion con `codex resume --last`
- desde el agente actual no fue posible reanudarla

Resultado real:
- intento sin escalar:
  - `Access is denied` al cargar configuracion
- intento escalado:
  - `Error: stdin is not a terminal`

Lectura operativa:
- no se obtuvo contexto adicional por CLI
- no se ejecuto QA
- no se valido ningun frente nuevo
- no hay cambios de estado funcionales sobre marketplace derivados de esta reanudacion

Estado que se debe preservar:
- Blob publico no-booking ya quedo validado en preview vigente `732mlgxcv`
- el preview viejo `3397rmisp` no debe usarse como evidencia actual
- proofs sensibles marketplace estan implementados tecnicamente
- `payment_proof_sensitive_preview` sigue `NO VALIDADO AUN EN VIVO`
- no hay evidencia nueva de fallo en token, storage sensible ni proxy
- el bloqueo sigue siendo de harness/sesion sin browser interactivo funcional

Siguiente paso exacto:
1. resolver primero `task_id` en `docs/07_handoffs/qa-dispatcher.json`
2. para proofs sensibles usar `payment_proof_sensitive_preview`
3. si no hay browser interactivo funcional, detenerse y reportar precondicion fallida
4. no repetir `cdp improvisado`, reverse engineering de server actions ni protocolo HTTP ad hoc
5. cuando el smoke quede validado, registrar el metodo en dispatcher y runbook antes de cerrar

## Actualizacion 2026-04-24 - payment_proof_sensitive_preview detenido por capacidad de ejecucion

Task resuelto por dispatcher:
- `task_id`: `payment_proof_sensitive_preview`
- `mode`: `manual_preview`
- `canonical_script`: `null`

Preview objetivo:
- `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`

Credenciales registradas para esta sesion:
- buyerIA: `buyerIA / BuyerIA_QA_2026!`
- SUPER: `mvera / 13894619`

Resultado:
- `NO EJECUTADO`
- no se ingreso al preview como buyerIA
- no se subio proof nuevo
- no hubo respuesta/status de upload
- no se genero ni confirmo `paymentProofUrl`
- no se pudo validar apertura del proxy con SUPER

Bloqueo exacto:
- aunque el usuario confirma browser interactivo funcional, esta sesion de Codex no expone una herramienta de browser interactivo controlable para hacer login, adjuntar archivo y navegar como buyer/admin.
- ejecutar esto con Playwright/CDP, server actions reverse engineered o HTTP ad hoc violaria la ruta canonica y las prohibiciones del dispatcher/AGENTS.

Decision operativa:
- detenerse en el primer bloqueo real.
- no improvisar metodo.
- no tocar booking ni `/reservas`.
- no actualizar dispatcher ni runbook como metodo validado, porque no se valido ningun metodo nuevo.

Siguiente recomendacion minima:
- ejecutar el smoke manual-preview desde una sesion donde Codex tenga control real de browser interactivo, o hacerlo manualmente en navegador humano siguiendo exactamente `payment_proof_sensitive_preview`.
- al validar, registrar resultado en Obsidian/handoffs; solo si se valida un metodo reusable, actualizar dispatcher y runbook.

## Checkpoint corto 2026-04-24 - proofs sensibles

- Frente activo: `payment_proof_sensitive_preview`.
- Estado: pendiente; no ejecutado en esta sesion.
- Preview objetivo: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`.
- Bloqueo: falta browser interactivo controlable por Codex en esta sesion.
- Regla vigente: no CDP alternativo, no server actions reverse engineered, no HTTP ad hoc.
- Siguiente minimo: reintentar con browser controlable o ejecutar manualmente en navegador humano y documentar resultado.

## Cierre manual 2026-04-24 - payment_proof_sensitive_preview

Estado:
- `VALIDADO MANUALMENTE`

Preview usado:
- `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`

Credenciales usadas:
- buyerIA: `buyerIA / BuyerIA_QA_2026!`
- SUPER: `mvera / 13894619`

Evidencia confirmada:
- buyerIA logro subir un proof nuevo.
- El proof nuevo quedo bajo proxy interno autenticado:
  - `/api/marketplace/payment-proofs/marketplace-sensitive-media/marketplace/payment-proofs/2026/04/1777011359365-8ff99e05-ec49-4178-962b-0295b361eb5d.webp`
- No quedo expuesto como `https://*.public.blob.vercel-storage.com/...`.
- SUPER pudo abrir el proof por el proxy autenticado.

Decision:
- el frente `payment_proof_sensitive_preview` queda cerrado como validado.
- mantener `payment-proof` fuera del Blob publico no-booking.
- no tocar booking ni `/reservas`.
- se actualizan dispatcher y runbook porque el metodo manual-preview quedo validado.

Siguiente minimo:
- retomar continuidad transaccional buyer -> seller -> admin solo si el dispatcher resuelve un `task_id` exacto.

## Checkpoint 2026-04-24 - commits/push y proximo frente

Estado Git:
- commits de cierre creados y pusheados.
- rama vigente: `UI-UX-finalV3`.

Estado QA:
- `payment_proof_sensitive_preview` queda cerrado como validado manualmente.
- preview validado para ese cierre: `turpialsound-mpwpxahfc`.
- `paymentProofUrl` interno autenticado confirmado.
- proof fuera de Blob publico confirmado.
- proxy con SUPER confirmado.

Siguiente frente:
- generar preview fresco.
- ejecutar regresion corta.
- antes de ejecutar cualquier QA, resolver `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- si no hay ruta exacta, detenerse y reportar `GAP OPERATIVO`.

## Actualizacion 2026-04-24 - Lenguaje UX marketplace

- El lenguaje visible del marketplace se simplifico para publico general en Venezuela.
- Seller Cobros y Admin Pagos ya usan textos claros para ventas en proceso, ganancias estimadas, pagos disponibles, comisiones/cargos y metodos de cobro faltantes.
- Se creo el glosario formal `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`.
- Futuras pantallas del marketplace deben seguir ese glosario y evitar exponer jerga interna como escrow, payout, released, operativo, neto operativo, fee o unknown.
- No se tocaron booking ni `/reservas`.

## Actualizacion 2026-04-24 - Refactor UI/UX Seller Cobros

Estado:
- `VALIDADO TECNICAMENTE`

Alcance:
- `components/marketplace/dashboard/DashboardClient.tsx`
- Seller Cobros solamente.
- No se tocaron booking, `/reservas`, Admin Pagos, enums ni logica de negocio.

Cierre visual:
- el dashboard dejo de estar encerrado en un ancho estrecho para una pantalla financiera,
- los tabs pasan a grilla estable y ya no compiten visualmente en una sola fila apretada,
- las metricas principales quedan separadas de comisiones y cargos,
- el estado de cobros ahora explica lo que esta en revision, en aprobacion y listo para cobrar,
- los datos de cobro y el resumen ganan contraste, orden y legibilidad.

Validacion:
- `npx tsc --noEmit`: limpio
- `npm run build`: limpio

## Checkpoint 2026-04-25 - Git post-polish Seller Cobros

Estado:
- `COMMIT CREADO SIN PUSH`

Commit:
- `9d44def style(marketplace): polish seller payouts dashboard`

Alcance confirmado:
- el commit incluyo solo el polish staged de `components/marketplace/dashboard/DashboardClient.tsx`
- `git diff --cached --check` estaba sin errores antes del commit
- no se tocaron booking ni `/reservas`
- no se tocaron Prisma/schema, API routes, Blob/storage ni buyer flow en este checkpoint

Validacion post-commit:
- `npm run build`: pendiente por instruccion explicita
- QA: pendiente por instruccion explicita
- push: pendiente

Estado operativo del worktree:
- el worktree no esta limpio
- quedan cambios unstaged/untracked fuera del commit en docs, scripts, `.obsidian`, admin/actions, `components/marketplace/dashboard/DashboardClient.tsx` con hunks no staged, `.tmp-preview-dev.log` y `.tmp-seller-cobros-polish-staged.patch`
- stash intacto: `stash@{0}: On UI-UX-finalV3: pre-seller-cobros-polish-unstaged`
- existe `.tmp-seller-cobros-polish-staged.patch`

Regla de continuidad:
- no limpiar, no aplicar stash, no borrar `.tmp-seller-cobros-polish-staged.patch`, no borrar `.tmp-preview-dev.log` y no hacer push sin instruccion explicita

Proximo paso recomendado:
- hacer limpieza controlada del worktree separando:
  1. cambios que deben conservarse
  2. basura temporal eliminable
  3. stash viejo pendiente de decision

## Checkpoint 2026-04-25 - Seller Dashboard + Glosario UX

Estado:
- `CERRADO Y VALIDADO TECNICAMENTE`

Commit:
- `21bb346 style(marketplace): clarify seller dashboard payouts UX`

Alcance confirmado:
- `components/marketplace/dashboard/DashboardClient.tsx`
- `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`

Producto cerrado:
- glosario UX creado en `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`;
- Seller Dashboard/Cobros usa lenguaje mas humano para el vendedor;
- se elimino jerga visible del frente seller: escrow, payout, RELEASED y neto operativo;
- Cobros separa `Monto en revision`, `Monto en proceso`, `Listo para cobrar` y `Datos de cobro`;
- el contenedor seller queda ampliado para desktop con `max-w-6xl`;
- mobile-first preservado;
- no se cambiaron calculos, estados backend, enums ni logica de negocio.

Validacion:
- `npx tsc --noEmit`: limpio.
- `npm run build`: limpio.
- `git status --short` final: limpio.

No se toco:
- AdminDashboard;
- booking;
- `/reservas`;
- Prisma/runtime/db/env;
- APIs/actions;
- Blob/storage/paymentProofUrl/proxy SUPER.

Siguiente frente recomendado:
1. Admin dashboard: alinear lenguaje operacional/financiero con el glosario, sin tocar logica ni calculos.
2. SEO/AEO del marketplace publico.
3. Diseno del cierre final de payout/pago al vendedor; no implementarlo sin aprobar DB/schema.

Riesgos de continuidad:
- no tocar runtime/Prisma/env sin tarea explicita;
- no aplicar ni borrar stashes sin inspeccion;
- no mezclar Admin + SEO + payout final en una sola tarea.

## Checkpoint 2026-04-25 - Admin Dashboard UX

Estado:
- `CERRADO Y VALIDADO TECNICAMENTE`

Commit:
- `e8ce902 style(marketplace): clarify admin dashboard operations UX`

Alcance confirmado:
- `components/marketplace/admin/AdminDashboard.tsx`
- `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`

Producto cerrado:
- Admin Dashboard alineado con el glosario UX;
- jerga interna reducida en superficie admin;
- KPIs de primera vista orientados a accion operativa:
  - `Pagos por revisar`;
  - `Dinero en proceso`;
  - `Disputas abiertas`;
  - `Monto listo para pagar`;
- metricas informativas bajadas de jerarquia:
  - transacciones totales;
  - publicaciones activas;
  - usuarios registrados;
  - comision plataforma mensual;
- reemplazos visibles aplicados:
  - `Escrow` -> `En proceso` / `Dinero en proceso`;
  - `RELEASED` / `Liberado` -> `Listo para pagar`;
  - `Payouts listos` -> `Ventas listas`;
  - `Neto vendedor` -> `Monto a pagar`;
  - `Fee retenido` -> `Comision plataforma`;
- layout admin ampliado a `max-w-6xl`;
- tabs admin pasaron a grilla responsive;
- glosario UX actualizado con terminos admin.

Validacion:
- `npm run build`: limpio.
- lint/type check: limpio.
- build genero 29 paginas.
- `git status --short` final: limpio.

No se toco:
- seller dashboard;
- booking;
- `/reservas`;
- Prisma/runtime/db/env;
- APIs/actions;
- Blob/storage/paymentProofUrl/proxy SUPER.

Siguiente frente recomendado:
1. SEO/AEO del marketplace publico.
2. Diseno del cierre final de payout/pago al vendedor, solo diseno primero porque implementarlo tocaria DB/schema.

Riesgos de continuidad:
- no implementar cierre final de payout sin diseno previo;
- no tocar runtime/Prisma/env sin tarea explicita;
- no mezclar SEO/AEO con cierre contable.

## Checkpoint 2026-04-26 - SEO/AEO publico marketplace

Estado:
- `CERRADO Y VALIDADO TECNICAMENTE`

Commit:
- `60be254 feat(marketplace): improve public SEO and AEO`

Alcance confirmado:
- `app/marketplace/MarketplacePageClient.tsx`
- `app/marketplace/page.tsx`
- `app/sitemap.ts`

Producto cerrado:
- `/marketplace` quedo como Server Component con metadata publica;
- la UI interactiva quedo separada en `MarketplacePageClient.tsx`;
- metadata publica agregada: title, description, canonical, OpenGraph y Twitter card;
- JSON-LD estatico agregado: `CollectionPage` + `BreadcrumbList`;
- `/marketplace` quedo incluido en `app/sitemap.ts`;
- el copy publico evita prometer escrow, fiduciario o ausencia de riesgo.

Validacion:
- `git diff --check`: limpio, solo warnings LF -> CRLF.
- `npx tsc --noEmit`: limpio.
- `npm run build`: limpio.
- build genero 29 paginas, incluyendo `/marketplace` y `/sitemap.xml`.

No se toco:
- booking;
- `/reservas`;
- Prisma/runtime/db/env;
- APIs/actions;
- dashboards privados;
- Blob/storage/paymentProofUrl/proxy SUPER.

Siguiente frente recomendado:
1. SEO/AEO de `/marketplace/[slug]`, solo metadata y semantica, sin tocar DB/actions.
2. Diseno del cierre final de payout/pago al vendedor, solo diseno primero porque implementarlo tocaria DB/schema.

Riesgos de continuidad:
- no agregar Product JSON-LD dinamico sin revisar datos reales;
- no tocar DB/actions para SEO;
- no mezclar SEO/AEO con payout final.

## Checkpoint 2026-04-26 - SEO/AEO detalle marketplace

Estado:
- `CERRADO Y VALIDADO TECNICAMENTE`

Commit:
- `745068b feat(marketplace): improve listing detail SEO and AEO`

Alcance confirmado:
- `app/marketplace/[slug]/page.tsx`

Producto cerrado:
- SEO/AEO de `/marketplace/[slug]` quedo cerrado;
- metadata dinamica ampliada: title, description, canonical, OpenGraph, Twitter card, fallback de imagen y `noindex` para listing no encontrado;
- JSON-LD conservador agregado: `ItemPage` + `BreadcrumbList`;
- `Product` JSON-LD omitido por prudencia de datos;
- copy publico corregido para no prometer pago fiduciario ni escrow;
- explicacion visible alineada a pago reportado, revision manual, validacion y confirmacion;
- sitemap dinamico de slugs no se abrio porque requeriria consultar DB.

Validacion:
- `git diff --check`: limpio, solo warning LF -> CRLF.
- `npx tsc --noEmit`: limpio.
- `npm run build`: limpio.
- build genero 29 paginas y `/marketplace/[slug]` quedo dinamico server-rendered.

No se toco:
- sitemap;
- booking;
- `/reservas`;
- Prisma/runtime/db/env;
- APIs/actions;
- dashboards privados;
- Blob/storage/paymentProofUrl/proxy SUPER.

Siguiente frente recomendado:
1. Diseno del cierre final de payout/pago al vendedor, solo diseno primero porque implementarlo tocaria DB/schema/acciones admin.
2. Revision visual/manual del marketplace publico despues del deployment como alternativa menor.

Riesgos de continuidad:
- no agregar Product JSON-LD dinamico sin datos consistentes;
- no consultar DB desde sitemap sin diseno;
- no implementar cierre final de payout sin especificacion.

## Checkpoint 2026-04-26 - P0 marketplace publico/mobile

Estado:
- `CERRADO Y VALIDADO TECNICAMENTE`

Commit:
- `586663b fix(marketplace): resolve mobile public marketplace regressions`

Alcance confirmado:
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

Producto cerrado:
- navbar mobile sin overflow;
- logo/texto mobile con constraints;
- menu hamburguesa legible con fondo solido/opaco y z-index correcto;
- `Quiero comprar` ya no debe quedar en spinner infinito; tiene estado de error acotado;
- cards/listings sin copy de pago fiduciario;
- fallbacks visibles y manejo de error para imagenes de listings;
- upload movil mejorado para imagenes de publicaciones;
- textarea de preguntas de listing con `id` y `name`.

Validacion:
- `git diff --check`: limpio, solo warnings CRLF.
- `npx tsc --noEmit`: limpio.
- `npm run build`: limpio.
- Commit unico usado porque la separacion parcial de `MarketplaceModals.tsx` no aplico limpio y se evito loop.

No se toco:
- booking;
- `/reservas`;
- Prisma/runtime/db/env;
- APIs/actions;
- dashboards privados;
- Blob/storage/paymentProofUrl/proxy SUPER.

Validacion pendiente en preview:
- `/marketplace` mobile;
- menu hamburguesa mobile;
- `Quiero Comprar`;
- `Quiero Vender` + upload de imagen desde movil;
- cards/listings con imagenes/fallback;
- listing detail + textarea preguntas;
- smoke rapido desktop.

Riesgos de continuidad:
- `lib/marketplace/media-client.ts` cambio para upload movil; validar desde galeria/camara.
- No tocar storage/backend si upload visual funciona pero falla backend; reportar antes.
- No mezclar con payout final.

## Checkpoint 2026-04-28 - Sprint UX publico responsive marketplace

Estado:
- `CERRADO Y VALIDADO TECNICAMENTE`

Alcance:
- UX publico del marketplace en mobile + desktop.
- No se tocaron schema, negocio, carrito, tasas, finanzas ni flujo de conformidad/fondos.

Archivos:
- `app/marketplace/MarketplacePageClient.tsx`
- `app/marketplace/[slug]/page.tsx`
- `components/marketplace/CheckoutModal.tsx`
- `components/marketplace/ListingQASection.tsx`
- `components/marketplace/MarketplaceCard.tsx`
- `components/marketplace/MarketplaceModals.tsx`
- `components/marketplace/TransactionChat.tsx`
- `lib/marketplace/venezuelan-banks.ts`

Producto cerrado:
- contraste general reforzado en marketplace publico, ficha de listing, cards, modales, Q&A, checkout y chat;
- preguntas/respuestas con mayor legibilidad, fondos mas separados y mejor espaciado;
- caja de preguntas/respuestas usable en telefono y desktop, con areas tactiles mas altas e identificadores `id/name`;
- dropdown de banco emisor muestra `0105-Mercantil`/`0102-Venezuela` como presentacion compacta, sin cambiar el valor interno enviado;
- horas visibles del chat marketplace en formato 12h;
- auth bar ajustada para no desbordar en mobile y no degradar desktop.

Dark/light:
- no implementado en este sprint;
- no existe infraestructura de tema segura para marketplace;
- el frente requiere diseno/refactor especifico por colores inline/hardcodeados, por lo que queda como pendiente separado.

Validacion:
- `git diff --check`: limpio, solo warnings CRLF.
- `npx tsc --noEmit`: limpio.
- `npm run build`: limpio, 29 paginas generadas.

No se toco:
- booking;
- `/reservas`;
- main/produccion;
- stashes;
- Prisma schema/migrations;
- tasas;
- carrito;
- finanzas/P&L;
- conformidad/fondos;
- paymentProofUrl/proxy SUPER.

Siguiente frente recomendado:
- Sprint 2 de bugs internos acotados: `Guardar metodo de cobro` y nota interna admin.
- Antes de cualquier QA futura, resolver `task_id` exacto en `docs/07_handoffs/qa-dispatcher.json`.
- Si no existe ruta exacta, reportar `GAP OPERATIVO` y no improvisar.
