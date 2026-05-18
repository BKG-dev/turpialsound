# S-MP-01 - Cierre de Sesion Carrito Marketplace

> Fecha: 2026-05-17
> Rama: `Manuel/s-mp-01-carrito-2026-05-17`
> Operador: Manuel
> Sprint: S-MP-01 - Carrito de Compras del Marketplace
> Ultimo preview documentado: `https://turpialsound-egsoseogk-bkgs-projects-829c67c1.vercel.app`

## Resumen Ejecutivo

Se corrigio el carrito marketplace para que soporte cantidades reales, inventario descontando ventas previas, checkout consolidado, comprobante obligatorio y flujo independiente por vendedor/listing. Tambien se documento y canonizo una ruta QA server-side para carrito dentro del runner E2E de marketplace.

## Que Pasaba Antes

1. El codigo usaba o esperaba referencias a `quantity` sobre listing, pero el schema real define `MpListing.inventory` y `MpListing.hasInventory`.
2. El discovery podia mostrar un disponible visual descontando ventas previas, pero la accion de agregar/comprar podia permitir cantidades mayores al disponible real.
3. Comprar desde carrito generaba problemas porque el backend no tenia una orden consolidada ni una forma formal de agrupar transacciones hijas.
4. El flujo trataba varias unidades del mismo listing como operaciones separadas, lo que no era coherente para marketplace.
5. Al comprar una unidad de un listing con inventario mayor a 1, el listing podia quedar bloqueado como reservado/sin stock antes de consumir todo el inventario.
6. El boton `Ver compras` del modal de orden consolidada no cerraba correctamente overlays del carrito antes de navegar.
7. El comprobante de pago en carrito solo era obligatorio para Binance; para otros metodos podia reportarse pago sin archivo.
8. El dashboard mostraba tabs y mensajes prioritarios en un orden poco claro; la lista de acciones salia plana y dificil de leer.
9. No existia `task_id` exacto en el dispatcher para QA de carrito consolidado, por lo que cualquier prueba automatizada de ese frente caia en `GAP OPERATIVO`.

## Como Se Arreglo

### Preflight Oreshnik

Archivo: `scripts/oreshnik/preflight.mjs`

Problema 1:
- El preflight fallaba por un error sintactico en el bloque de sincronizacion de docs desde rama madre.
- Causa: faltaba cerrar correctamente un bloque `else`/docs sync.
- Arreglo: se agrego la llave faltante para que el flujo `motherRef`/docs sync cierre correctamente.

Problema 2:
- El preflight podia fallar leyendo JSON cacheados con BOM o archivos corruptos parciales.
- Causa: lecturas directas con `JSON.parse(readFileSync(...))` sobre `.preflight-cache.json`, `.mother-version.json`, `.sprint-assignments.json`, `zone-map.json` y `.out-of-band.json`.
- Arreglo: se agrego `readJsonFile(path, fallback)` que elimina BOM inicial (`^\uFEFF`) y devuelve fallback si el archivo no existe o no parsea.

Resultado actual:
- El preflight vuelve a correr hasta completion.
- Los docs se sincronizan desde madre.
- La rama hija S-MP-01 se valida correctamente.
- Los JSON operativos dejan de bloquear la sesion por BOM/cache invalida.

### Inventario y Cantidad

Archivos principales:
- `actions/marketplace/transactions.ts`
- `actions/marketplace/listings.ts`
- `actions/marketplace/admin.ts`
- `lib/marketplace/adapters.ts`
- `components/marketplace/AddToCartButton.tsx`
- `components/marketplace/ListingDetailActions.tsx`

Arreglo:
- Se elimino el contrato erroneo de `MpListing.quantity`.
- Se usa `hasInventory` + `inventory`.
- Se agrego `MpTransaction.quantity` para guardar cuantas unidades compra una transaccion.
- El disponible real se calcula como `inventory - SUM(quantity)` de transacciones en estados consumidores.
- El boton `+`, el selector de detalle y el carrito limitan la cantidad maxima al disponible real.
- Los adapters no marcan un listing como agotado si aun queda inventario disponible.

### Orden Consolidada

Archivos principales:
- `prisma/schema.prisma`
- `prisma/migrations/20260517_marketplace_consolidated_orders/migration.sql`
- `actions/marketplace/transactions.ts`
- `components/marketplace/CartCheckoutModal.tsx`
- `components/marketplace/CartDrawer.tsx`

Arreglo:
- Se agrego `MpOrder` como orden padre.
- Se agrego `MpTransaction.orderId`, `quantity` y `unitPrice`.
- `checkoutCart` crea una `MpOrder` con el total consolidado y una `MpTransaction` por linea del carrito.
- Varias unidades del mismo listing quedan en una sola transaccion con `quantity=N`.
- Multi-seller queda agrupado para el comprador, pero cada seller conserva su transaccion hija.

### Pago y Comprobante

Archivos principales:
- `components/marketplace/CartCheckoutModal.tsx`
- `actions/marketplace/transactions.ts`
- `app/api/marketplace/upload/route.ts`

Arreglo:
- El modal consolidado muestra detalle por vendedor, total USD/Bs, metodo de pago y reporte.
- El comprobante ahora es obligatorio para todos los metodos del carrito.
- `submitOrderPaymentProof` rechaza orden sin `proofUrl`.
- El proof se sube contra la primera transaccion hija y luego se propaga a `MpOrder` y a todas las hijas.

### Flujo Independiente por Seller

Archivos principales:
- `actions/marketplace/transactions.ts`
- `actions/marketplace/admin.ts`
- `components/marketplace/dashboard/DashboardClient.tsx`

Arreglo:
- Admin validation, entrega seller, confirmacion buyer, liberacion admin y payout siguen operando por `transactionId`.
- Una hija puede avanzar a `RELEASED` mientras otra queda esperando validacion/entrega.
- El buyer ve todas sus compras; cada seller ve solo sus ventas.

### Dashboard

Archivo:
- `components/marketplace/dashboard/DashboardClient.tsx`

Arreglo:
- Las tabs `Mi Tienda`, `Mis Ventas`, `Mis Compras`, `Mensajes`, `Favoritos`, `Cobros` se movieron arriba de la bandeja prioritaria.
- Las tabs quedan sticky.
- La bandeja de mensajes prioritarios se agrupa y colapsa por:
  - `Requiere tu accion`
  - `En revision Turpial`
  - `Esperando a otra parte`
  - `Cerradas`

## Migraciones y Prisma

Migracion agregada:
- `prisma/migrations/20260517_marketplace_consolidated_orders/migration.sql`

Cambios:
- Tabla `mp_orders`.
- Columnas `orderId`, `quantity`, `unitPrice` en `mp_transactions`.
- FK de `mp_transactions.orderId` a `mp_orders.id`.
- Indices para buyer/status/payment/order.

Situacion encontrada:
- La DB tenia drift de migraciones previas ya aplicadas a nivel de columnas, pero no marcadas como aplicadas por Prisma.

Resolucion:
- Se verificaron columnas existentes con `information_schema`.
- Se marcaron como aplicadas migraciones locales que ya estaban materializadas.
- Luego se aplico la migracion nueva de orden consolidada.
- `npx prisma migrate status --schema prisma/schema.prisma` quedo en `Database schema is up to date`.

## QA Canonico Agregado

Dispatcher:
- `docs/07_handoffs/qa-dispatcher.json`
- Nuevo `task_id`: `smp01_cart_consolidated_checkout`

Runbook:
- `docs/07_handoffs/qa-canonical-runbook.md`

Script:
- `scripts/qa/modules/qa-smp01-cart-consolidated.mjs`

Runner:
- `scripts/qa/run-marketplace-qa.mjs`
- `scripts/qa/modules/qa-12-regression.mjs`

Comando:

```powershell
npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01
```

Cobertura:
- Schema contract.
- Inventario real descontando cantidades.
- Bloqueo de sobrecompra.
- Orden consolidada multivendedor.
- Comprobante obligatorio y propagado.
- Avance independiente por transaccion hija.
- Payout parcial por seller.
- Visibilidad buyer/seller.

Evidencia:
- Run ID: `2026-05-17T21-24-44-148Z`.
- Resultado: 17/17 checks PASS.
- Reporte JSON: `var/qa-results/report-2026-05-17T21-24-44-148Z.json`.
- Reporte MD: `var/qa-results/report-2026-05-17T21-24-44-148Z.md`.

## Validaciones Ejecutadas Durante la Sesion

Comandos ejecutados exitosamente en distintos checkpoints:

```powershell
npx prisma generate
npx prisma migrate status --schema prisma/schema.prisma
npx tsc --noEmit
pnpm run build
npx vercel --yes
```

Deploys preview relevantes:
- `https://turpialsound-4kix5hbyw-bkgs-projects-829c67c1.vercel.app`
- `https://turpialsound-7tbhx2jvf-bkgs-projects-829c67c1.vercel.app`
- `https://turpialsound-kmr4b8740-bkgs-projects-829c67c1.vercel.app`
- `https://turpialsound-egsoseogk-bkgs-projects-829c67c1.vercel.app`

## Pendientes Conocidos

- QA browser real del carrito en preview sigue pendiente como ruta separada Playwright. No se improviso CDP ni HTTP ad hoc.
- El modulo `S-MP-01` cubre contrato funcional server-side/DB; no valida clicks visuales.
- Warnings de build existentes:
  - `<img>` en varias pantallas.
  - dependencia faltante de hook en `WhatsappReservaTokenLabClient`.
  - warning SSL de Neon/pg sobre `sslmode`.

## Archivos Principales Tocadas en el Sprint

- `actions/marketplace/transactions.ts`
- `actions/marketplace/admin.ts`
- `actions/marketplace/listings.ts`
- `actions/marketplace.ts`
- `components/marketplace/AddToCartButton.tsx`
- `components/marketplace/CartCheckoutModal.tsx`
- `components/marketplace/CartDrawer.tsx`
- `components/marketplace/CheckoutModal.tsx`
- `components/marketplace/ListingDetailActions.tsx`
- `components/marketplace/dashboard/DashboardClient.tsx`
- `lib/marketplace/adapters.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260517_marketplace_consolidated_orders/migration.sql`
- `scripts/oreshnik/preflight.mjs`
- `scripts/qa/run-marketplace-qa.mjs`
- `scripts/qa/modules/qa-12-regression.mjs`
- `scripts/qa/modules/qa-smp01-cart-consolidated.mjs`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/marketplace/CART_CONSOLIDATED_QA_MATRIX.md`

## Decision de Cierre

S-MP-01 queda funcionalmente cerrado para contrato server-side y preview deployado. Para cerrar E2E visual completo falta crear una ruta Playwright canonica especifica, aprobada en dispatcher, con selectores estables del carrito.
