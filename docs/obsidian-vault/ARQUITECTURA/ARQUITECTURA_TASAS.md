---
tags: ["#area/backend", "#architecture", "#marketplace", "#rates"]
last_updated: "2026-05-18"
---

# Arquitectura del Motor de Tasas

## S-MP-01 - Carrito consolidado e impacto schema (2026-05-17)

Aunque este documento se centra en tasas, el cierre S-MP-01 toca schema marketplace y payout:

- Se agrego `MpOrder` como orden consolidada para carrito.
- `MpTransaction` ahora tiene `orderId`, `quantity` y `unitPrice`.
- `MpListing` mantiene el contrato correcto: `hasInventory` + `inventory`; no existe `quantity` en listing.
- La liquidacion sigue por `MpTransaction`, no por `MpOrder`, para permitir liberar/pagar a un seller mientras otro sigue pendiente.
- `MpPayout.transactionIds` sigue siendo la fuente para registrar pago por transaccion hija.

QA canonico:

```powershell
npx tsx scripts/qa/run-marketplace-qa.mjs --module=S-MP-01
```

Resultado validado: 2026-05-17T21:24:48Z - 17/17 PASS.

### S-MP-06 — Referral Tracking en MpTransaction (2026-05-18)

Cierre S-MP-06 (Drop Social) agrega trazabilidad de referidos:
- `MpTransaction` ahora tiene campo `referredBy` (referencia al userId del referidor).
- El código de referido se persiste vía cookie `turpial_ref` y se asigna automáticamente al crear la transacción.
- No impacta el motor de tasas ni la liquidación; es metadata transaccional para analítica de referidos.

## Scheduler BCV — Actualización Automática (Nuevo 2026-05-13)

### Política de actualización

| Ventana | Frecuencia | Días |
|---------|-----------|------|
| 🔴 **PEAK** 4pm-7pm VET (20:00-23:00 UTC) | **Cada 30 min** | Lun-Vie |
| 🟢 **OFF-PEAK** Resto de horas | **Cada 60 min** | Lun-Vie noches + fines de semana |

### Implementación

| Archivo | Rol |
|---------|-----|
| `lib/marketplace/bcv-scheduler.ts` | Lógica de ventana peak/off-peak, control de intervalo |
| `app/api/cron/refresh-bcv-rate/route.ts` | Endpoint llamado por Vercel Cron |
| `vercel.json` | Configuración del cron job (`*/30 * * * *`) |

### Funcionamiento

1. Vercel Cron dispara `GET /api/cron/refresh-bcv-rate` cada 30 min
2. El endpoint consulta `bcv-scheduler.ts` para determinar si debe refrescar:
   - Si `shouldRefresh()` → true: ejecuta `resolveReferenceRate()` y persiste
   - Si `shouldRefresh()` → false: salta (aún dentro del intervalo)
3. En **PEAK** (30 min): se ejecuta en cada llamado del cron
4. En **OFF-PEAK** (60 min): se ejecuta cada 2do llamado del cron (30min × 2 = 60min)
5. La tasa resuelta se persiste en DB (`mp_reference_rate_snapshots`) y en archivo/caché

### Seguridad
- `CRON_SECRET` requerido como Bearer token en producción
- Sin este header → 401 Unauthorized

### Comando manual
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://turpialsound.vercel.app/api/cron/refresh-bcv-rate
```

## Estado real al 2026-04-29

BCV no se reescribio. La mecanica vigente sigue en `lib/marketplace/reference-rate.ts` con:

- hasta 3 fuentes configurables por `RATE_A_*`, `RATE_B_*`, `RATE_C_*`;
- consenso por `RATE_DELTA_PCT`;
- ultimo valor valido en memoria o archivo segun `RATE_STORAGE`;
- fallback configurado por `BCV_FALLBACK_RATE`;
- contrato actual de `/api/bcv-rate` sin campos Binance.

El ajuste de este sprint queda acotado a Binance: persistencia minima de una tasa Binance/USDT -> VES para futuras liquidaciones auditables.

## BCV

Entrada vigente:

- `/api/bcv-rate`

Implementacion:

- `lib/marketplace/reference-rate.ts`

Regla operativa:

- No mezclar persistencia Binance con el resolver BCV.
- No eliminar el fallback BCV existente.
- No cambiar el contrato publico de `/api/bcv-rate` salvo un requerimiento explicito posterior.

## Binance Persistente

Modelo Prisma:

- `MpBinanceRateSnapshot`

Tabla fisica:

- `mp_binance_rate_snapshots`

Campos:

- `rate`: tasa Binance/USDT -> VES.
- `fechaValor`: fecha valor del snapshot.
- `source`: fuente usada, por ejemplo `binance_p2p_median_top_10` o `google_sheets_csv`.
- `mode`: `live`, `sheet` o `stale`.
- `metadata`: auditoria minima de la fuente.
- `createdAt` / `updatedAt`: timestamps del snapshot.

Migracion creada:

- `prisma/migrations/20260429_marketplace_binance_rate_snapshots/migration.sql`

No se aplico migracion contra produccion desde esta tarea.

## Resolver Binance

Helper:

- `lib/marketplace/binance-rate.ts`

Funcion principal:

- `resolveBinanceRate()`

Flujo:

1. Consultar Binance P2P API como fuente primaria.
2. Payload usado:
   - `asset: "USDT"`
   - `fiat: "VES"`
   - `tradeType: "BUY"`
   - `rows: 10`
   - `page: 1`
3. Leer `data[].adv.price`.
4. Filtrar precios validos mayores a 0.
5. Ordenar y calcular mediana del top 10 recibido.
6. Persistir snapshot en `mp_binance_rate_snapshots` si DB esta disponible.
7. Si Binance falla, intentar Google Sheets CSV solo como fallback opcional.
8. Si ambas fuentes fallan, devolver ultimo snapshot valido de DB como `stale`.
9. Si no hay fuente ni snapshot DB, fallar explicitamente.

## Google Sheets Fallback Binance

Variables soportadas para URL CSV publica:

- `MP_RATES_GOOGLE_SHEETS_CSV_URL` recomendada.
- `MARKETPLACE_RATES_GOOGLE_SHEETS_CSV_URL`.
- `RATE_GOOGLE_SHEETS_CSV_URL`.
- `RATE_SHEET_CSV_URL`.

El parser se usa solo para Binance y soporta:

- header con columna Binance/USDT y fecha;
- columnas visibles A-D sin header: A fecha, B BCV, C Binance, D brecha.

Aunque el CSV pueda contener BCV, este helper no consume BCV para reemplazar el flujo existente.

## Pendiente Para Liquidacion Seller

La base Binance queda lista, pero liquidacion auditable por venta requiere otro sprint:

- aplicar migracion en DB con flujo controlado;
- asociar tasa/snapshot exacto a `MpTransaction` o guardar snapshot transaccional equivalente;
- guardar tipo de tasa usada (`BCV` o `BINANCE`);
- guardar monto pagado por comprador y moneda/metodo original;
- separar comision Turpial, fee bancario y fee USDT;
- usar esos campos en Admin > Pagos vendedores y CSV final.

No se implemento liquidacion final, CSV final ni payout final en esta tarea.
