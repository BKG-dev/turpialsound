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
