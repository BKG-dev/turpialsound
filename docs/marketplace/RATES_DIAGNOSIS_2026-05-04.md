# Diagnóstico de Tasas — Marketplace

**Fecha:** 2026-05-04 / 2026-05-05  
**Branch:** `Manuel/marketplace-rates-diagnosis`  
**Base:** `integration/lab-marketplace-sprint2a-selective-2026-05-04`  
**Modo:** Solo lectura — sin modificaciones, sin commits, sin migraciones.  
**Autor:** Back-end Specialist (diagnóstico automatizado)  

---

## 1. Resumen Ejecutivo

"Pendiente de tasa de pago" aparece en el dashboard de vendedor porque **la integración de tasas BCV/Binance nunca se conectó al flujo de creación de transacciones**. El código de resolución de tasas existe y está completo (`resolveBinanceRate()`, `resolveReferenceRate()`), pero ninguna acción de transacción lo invoca. En su lugar, se usa una constante hardcodeada `USD_REFERENCE_RATE = 1` para todos los cálculos. El texto "Pendiente de tasa de pago" es placeholder deliberado en UI que nunca fue reemplazado porque la data real nunca llegó.

---

## 2. Ubicación Exacta del Texto "Pendiente de tasa de pago"

| Archivo | Línea(s) | Contexto |
|---------|----------|----------|
| `components/marketplace/dashboard/DashboardClient.tsx` | 1458–1464 | Componente `SellerFinancialSummary`, rama BS (no-USDT) |

```typescript
// L1458-1464
<FinancialSummaryRow
  label="Tasa usada"
  value={`${payout.appliedRateType ?? 'Pendiente'} - pendiente de tasa de pago`}
  tone="warning"
/>
<FinancialSummaryRow label="Monto Bs base" value="Pendiente de tasa de pago" tone="warning" />
<FinancialSummaryRow label="Comision bancaria 0.3%" value="Pendiente de tasa de pago" tone="warning" />
<FinancialSummaryRow label="Total estimado Bs" value="Pendiente de tasa de pago" tone="warning" />
```

El texto **no** aparece en el admin dashboard (`AdminDashboard.tsx`), que usa los campos `platformFeeAmount` y `sellerNetAmount` directamente de la BD.

---

## 3. Causa Raíz — Cadena de Fallo Completa

### 3.1 Hardcodeo de tasa = 1 en la creación de transacciones

**Archivo:** [`actions/marketplace/transactions.ts`](actions/marketplace/transactions.ts:36)

```typescript
function calcFee(amount: number, paymentMethod: TxPaymentMethod, sellerPayoutMethod: SellerPayoutMethod) {
  const payout = calculateSellerPayout({
    amountUSD: amount,
    buyerPaymentMethod: mapBuyerPaymentMethod(paymentMethod),
    sellerPayoutMethod,
    bcvRate: USD_REFERENCE_RATE,      // = 1
    binanceRate: USD_REFERENCE_RATE,   // = 1
  })
  // ...
}
```

`USD_REFERENCE_RATE` se define en [`lib/marketplace/finance.ts`](lib/marketplace/finance.ts:4):

```typescript
export const USD_REFERENCE_RATE = 1
```

### 3.2 `calculateSellerPayout()` con tasa=1 produce resultados sin sentido

Cuando `bcvRate=1` y `binanceRate=1`:
- `appliedRateType` = `'BCV'` o `'BINANCE'` (válido sintácticamente)
- `netBS` = `(amountUSD - 5%) * 1 - 0.3%` → **valores numéricamente iguales a USD**
- `bankFeeBS` = irrelevante porque rate=1 distorsiona todo

Ejemplo: venta de $100 con rate=1 → `netBS = 94.72` (cuando debería ser ~3,457 Bs a BCV real)

### 3.3 La UI del dashboard también usa rate=1

**Archivo:** [`DashboardClient.tsx`](components/marketplace/dashboard/DashboardClient.tsx:349)

```typescript
function getTxPayoutCalculation(tx: DashTransaction, sellerPayoutMethod: SellerPayoutMethod) {
  return calculateSellerPayout({
    amountUSD: Number(tx.amount ?? 0),
    buyerPaymentMethod: mapTxBuyerPaymentMethod(tx),
    sellerPayoutMethod,
    bcvRate: USD_REFERENCE_RATE,    // = 1
    binanceRate: USD_REFERENCE_RATE, // = 1
  })
}
```

Los totales operacionales en el dashboard (líneas 1817–1829) también se calculan con rate=1:

```typescript
const payoutNetTotal = (rows: DashTransaction[]) => roundMoney(rows.reduce((sum, tx) => sum + payoutFor(tx).netUSD, 0))
const operationalBankFees = payoutRelevantSales.reduce((sum, tx) => sum + payoutFor(tx).bankFeeBS, 0)
const operationalCommissions = payoutRelevantSales.reduce((sum, tx) => sum + payoutFor(tx).platformFeeUSD, 0)
```

### 3.4 Nadie llama a los resolvers de tasas

Búsqueda exhaustiva en todo el código fuente (excluyendo `node_modules`, `.next`, `prisma/migrations`):

| Función | ¿Existe? | ¿Se invoca en creación de TX? | ¿Se invoca en dashboard? | ¿Se invoca en admin? |
|---------|----------|-------------------------------|--------------------------|----------------------|
| `resolveBinanceRate()` | ✅ `lib/marketplace/binance-rate.ts:496` | ❌ | ❌ | ❌ |
| `resolveReferenceRate()` | ✅ `lib/marketplace/reference-rate.ts:268` | ❌ | ❌ | ❌ |
| `/api/bcv-rate` | ✅ `app/api/bcv-rate/route.ts` | ❌ (importa de booking, no marketplace) | ❌ | ❌ |

---

## 4. Estado del Schema de Base de Datos

### 4.1 `MpTransaction` — Sin campos de tasa

**Archivo:** [`prisma/schema.prisma`](prisma/schema.prisma:630-696)

Campos existentes relevantes:
- `amount` (Decimal) — monto en USD
- `platformFeePercent` (Decimal)
- `platformFeeAmount` (Decimal) — **calculado con rate=1**
- `sellerNetAmount` (Decimal) — **calculado con rate=1**
- `paymentMethod` (enum)
- `status` (enum)

**Campos de tasa AUSENTES:**
- ❌ `frozenRate` — tasa congelada al momento de la compra
- ❌ `frozenRateType` — `'BCV'` o `'BINANCE'`
- ❌ `fechaValor` — fecha valor de la tasa usada
- ❌ `rateSnapshotId` — FK a `MpBinanceRateSnapshot` o `MpReferenceRateSnapshot`

### 4.2 `MpBinanceRateSnapshot` — Modelo existe, migración probablemente no aplicada

**Archivo:** [`prisma/schema.prisma`](prisma/schema.prisma:837-856)

```prisma
model MpBinanceRateSnapshot {
  id         String   @id @default(cuid())
  rate       Decimal  @db.Decimal(12, 4)
  fechaValor DateTime
  source     String
  mode       String
  metadata   Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

Estado según documentación:
- [`ARQUITECTURA_TASAS.md:54-58`](docs/obsidian-vault/ARQUITECTURA_TASAS.md:54): "Migracion creada pero no aplicada contra produccion"
- [`BUGS_CRITICOS.md:62-63`](docs/obsidian-vault/BUGS_CRITICOS.md:62): "Binance rate snapshot: Aplicar migración contra DB productiva y asociar a transacciones"

### 4.3 `MpReferenceRateSnapshot` — NO EXISTE

No hay modelo Prisma para persistir tasas BCV/referencia. La tasa BCV solo existe en:
- Memoria (variable `lastValid` en `reference-rate.ts`)
- Archivo opcional (si `RATE_STORAGE=file`)

Esto impide cualquier auditoría o FK desde `MpTransaction` para tasas BCV.

### 4.4 `MpPayout` — Sin campos de tasa

**Archivo:** [`prisma/schema.prisma`](prisma/schema.prisma:756-782)

Campos: `amount`, `currency`, `method`, `status`, `transactionIds`, `externalPayoutId`.  
Sin campos de tasa.

---

## 5. Flujo de Tasas — Lo Que Existe vs Lo Que Falta

### 5.1 Infraestructura de resolución (EXISTE ✅)

| Componente | Archivo | Estado |
|-----------|---------|--------|
| Resolver Binance P2P | [`lib/marketplace/binance-rate.ts`](lib/marketplace/binance-rate.ts) | ✅ Completo |
| Resolver BCV (3 providers + consenso) | [`lib/marketplace/reference-rate.ts`](lib/marketplace/reference-rate.ts) | ✅ Completo |
| Persistencia Binance (DB) | `MpBinanceRateSnapshot` | ✅ Modelo listo, migración pendiente |
| Fallback Google Sheets → CSV | [`binance-rate.ts:317-373`](lib/marketplace/binance-rate.ts:317) | ✅ Implementado |
| Stale fallback (último snapshot DB) | [`binance-rate.ts:414-429`](lib/marketplace/binance-rate.ts:414) | ✅ Implementado |
| Cálculo de payout (`calculateSellerPayout`) | [`lib/marketplace/finance.ts`](lib/marketplace/finance.ts:40) | ✅ Lógica correcta |

### 5.2 Puntos de integración (AUSENTE ❌)

| Punto de integración | Qué debería pasar | Qué pasa actualmente |
|---------------------|-------------------|---------------------|
| `initiatePurchase()` | Resolver tasa según método de pago, congelarla, guardarla en TX | Usa `USD_REFERENCE_RATE=1` |
| `submitPaymentProof()` | Sin cambios (la tasa ya está congelada) | Sin cambios |
| `validatePayment()` | Sin cambios (la tasa ya está congelada) | Sin cambios |
| `releaseEscrow()` | Sin cambios (la tasa ya está congelada) | Sin cambios |
| Dashboard seller | Leer tasa congelada de la TX, calcular payout real | Re-calcula con `USD_REFERENCE_RATE=1` |
| Admin payout report | Agregar usando tasas congeladas reales | Agrega `sellerNetAmount` calculado con rate=1 |

### 5.3 Diagrama de flujo actual vs deseado

```
ACTUAL (ROTO):
  Usuario compra → initiatePurchase()
    → calcFee() con rate=1
    → guarda platformFeeAmount, sellerNetAmount con rate=1
    → Dashboard lee sellerNetAmount de BD (rate=1) o recalcula con rate=1
    → Admin ve montos en USD que no reflejan realidad BS

DESEADO:
  Usuario compra → initiatePurchase()
    → resolveBinanceRate() o resolveReferenceRate() según método
    → calcFee() con tasa real
    → guarda platformFeeAmount, sellerNetAmount, frozenRate, fechaValor, rateType, rateSnapshotId
    → Dashboard lee frozenRate de la TX y recalcula payout real en BS
    → Admin ve montos correctos en moneda destino
```

---

## 6. Análisis de Seguridad e Integridad de Datos

### 6.1 Riesgo de race condition en congelamiento de tasa

Si dos transacciones se crean simultáneamente, ambas deben ver la misma tasa (o tasas muy cercanas). El enfoque correcto:
- **NO** llamar al resolver en cada `initiatePurchase()` individualmente (podría dar tasas diferentes en milisegundos)
- Usar un snapshot reciente (últimos 5 minutos) de la tabla de snapshots
- Solo resolver fresh si el último snapshot tiene > 5 minutos

Actualmente `resolveBinanceRate()` ya implementa `shouldReuseLatestSnapshot()` (línea 431-446 de [`binance-rate.ts`](lib/marketplace/binance-rate.ts:431)) con lógica de intervalo mínimo — esto está bien diseñado.

### 6.2 Idempotencia

`initiatePurchase()` ya usa `idempotencyKey` con constraint unique en BD. La tasa debe congelarse dentro de la misma transacción Prisma que crea el `MpTransaction` para garantizar atomicidad.

### 6.3 Riesgo de usar tasa=1 en datos ya almacenados

Todas las transacciones existentes en BD tienen `platformFeeAmount` y `sellerNetAmount` calculados con rate=1. Estos valores son **matemáticamente incorrectos** y no deben usarse para pagos reales. Cualquier migración correctiva deberá:
1. Añadir columnas de tasa a `MpTransaction`
2. Para transacciones históricas: dejar `frozenRate = NULL` (indicando "tasa no congelada")
3. Recalcular montos solo si se puede determinar la tasa que aplicaba en la fecha de la transacción (backfill desde snapshots históricos o Google Sheets)

---

## 7. Mapeo Completo de Archivos Relevantes

### Archivos de lógica de tasas

| Archivo | Líneas | Función |
|---------|--------|---------|
| [`lib/marketplace/finance.ts`](lib/marketplace/finance.ts) | 82 | Constantes financieras, `calculateSellerPayout()`, `roundMoney()` |
| [`lib/marketplace/binance-rate.ts`](lib/marketplace/binance-rate.ts) | 528 | `resolveBinanceRate()`, persistencia DB, fallback sheets |
| [`lib/marketplace/reference-rate.ts`](lib/marketplace/reference-rate.ts) | 331 | `resolveReferenceRate()`, consenso multi-provider |
| [`app/api/bcv-rate/route.ts`](app/api/bcv-rate/route.ts) | 37 | Endpoint público BCV (importa de booking, NO marketplace) |
| [`lib/bookings/reference-rate.ts`](lib/bookings/reference-rate.ts) | — | Resolver BCV del módulo booking (NO marketplace) |

### Archivos de transacciones

| Archivo | Líneas | Función |
|---------|--------|---------|
| [`actions/marketplace/transactions.ts`](actions/marketplace/transactions.ts) | 599 | `initiatePurchase()`, `calcFee()` con rate=1 |
| [`actions/marketplace/admin.ts`](actions/marketplace/admin.ts) | 749 | `getPayoutReport()`, `getEscrowList()`, stats |

### Archivos de UI

| Archivo | Líneas | Elemento relevante |
|---------|--------|--------------------|
| [`components/marketplace/dashboard/DashboardClient.tsx`](components/marketplace/dashboard/DashboardClient.tsx) | 1458-1464 | **"Pendiente de tasa de pago"** en `SellerFinancialSummary` |
| [`components/marketplace/dashboard/DashboardClient.tsx`](components/marketplace/dashboard/DashboardClient.tsx) | 349-357 | `getTxPayoutCalculation()` con rate=1 |
| [`components/marketplace/dashboard/DashboardClient.tsx`](components/marketplace/dashboard/DashboardClient.tsx) | 1815-1829 | Totales operacionales con rate=1 |
| [`components/marketplace/admin/AdminDashboard.tsx`](components/marketplace/admin/AdminDashboard.tsx) | 697-703 | Escrow: muestra `platformFeeAmount`, `sellerNetAmount` (rate=1) |
| [`components/marketplace/admin/AdminDashboard.tsx`](components/marketplace/admin/AdminDashboard.tsx) | 821,851,855 | Payouts: muestra `netAmount`, `grossAmount`, `feeAmount` (rate=1) |

### Schema Prisma

| Modelo | Líneas | Estado |
|--------|--------|--------|
| `MpTransaction` | 630-696 | ❌ Sin campos de tasa |
| `MpPayout` | 756-782 | ❌ Sin campos de tasa |
| `MpBinanceRateSnapshot` | 837-856 | ✅ Modelo creado, migración pendiente |
| `MpReferenceRateSnapshot` | — | ❌ No existe |

### Documentación

| Archivo | Relevancia |
|---------|------------|
| [`docs/obsidian-vault/ARQUITECTURA_TASAS.md`](docs/obsidian-vault/ARQUITECTURA_TASAS.md) | Arquitectura del motor de tasas |
| [`docs/obsidian-vault/BUGS_CRITICOS.md`](docs/obsidian-vault/BUGS_CRITICOS.md:62-63) | Binance rate snapshot pendiente |
| [`docs/marketplace/02_PAYMENT_ARCHITECTURE.md`](docs/marketplace/02_PAYMENT_ARCHITECTURE.md) | Arquitectura de pagos actual |
| [`docs/marketplace/SELLER_COBROS_FEES_QA_MATRIX.md`](docs/marketplace/SELLER_COBROS_FEES_QA_MATRIX.md) | Matriz QA de fees |
| [`docs/07_handoffs/session-summary-active.md`](docs/07_handoffs/session-summary-active.md:926-938) | Historial: migración Binance no aplicada |

---

## 8. Clasificación de Gaps

### Gap A: Schema (CRÍTICO)
**`MpTransaction` no tiene dónde guardar la tasa congelada.**

Se requieren al menos 4 columnas nuevas:
- `frozenRate` — `Decimal(12,4)` — la tasa aplicada
- `frozenRateType` — `String` — `'BCV'` o `'BINANCE'`
- `fechaValor` — `DateTime` — fecha valor de la tasa
- `rateSnapshotId` — `String?` — FK opcional al snapshot

### Gap B: `MpReferenceRateSnapshot` (CRÍTICO)
**No existe modelo para persistir tasas BCV.**

Se necesita crear modelo `MpReferenceRateSnapshot` análogo a `MpBinanceRateSnapshot`, y modificar `resolveReferenceRate()` para persistir.

### Gap C: Integración en `initiatePurchase()` (CRÍTICO)
**`calcFee()` debe recibir tasas reales.**

Cambios necesarios:
1. Resolver tasa (Binance o BCV) según `paymentMethod` dentro de `initiatePurchase()`
2. Pasar la tasa resuelta a `calcFee()`
3. Guardar `frozenRate`, `frozenRateType`, `fechaValor`, `rateSnapshotId` en `MpTransaction`
4. Todo dentro de una transacción Prisma `$transaction` para atomicidad

### Gap D: Dashboard recalcula con tasa=1 (ALTO)
**`getTxPayoutCalculation()` y totales operacionales usan `USD_REFERENCE_RATE`.**

Una vez que `MpTransaction` tenga `frozenRate`, el dashboard debe:
1. Leer `frozenRate` de la transacción
2. Usarlo en `calculateSellerPayout()` en lugar de `USD_REFERENCE_RATE`
3. Reemplazar los strings hardcodeados "Pendiente de tasa de pago" con valores reales

### Gap E: Admin payout report usa montos almacenados (ALTO)
**`getPayoutReport()` agrega `sellerNetAmount` que fue calculado con rate=1.**

Si se decide mantener `sellerNetAmount` como campo calculado al momento de creación, entonces el Gap C lo resuelve. Si se prefiere calcular en el momento del payout, el admin debe usar `frozenRate` para recalcular.

### Gap F: Migración Binance no aplicada (ALTO)
**La tabla `mp_binance_rate_snapshots` posiblemente no existe en BD productiva.**

Ejecutar `npx prisma migrate deploy` o migración manual con respaldo.

### Gap G: BCV API route usa módulo booking, no marketplace (MEDIO)
**`/api/bcv-rate` importa de `@/lib/bookings/reference-rate`.**

Si la API pública debe reflejar el resolver del marketplace, debe cambiar a `@/lib/marketplace/reference-rate`. Si se quiere mantener separado, documentar la discrepancia.

### Gap H: Placeholder strings en UI (BAJO — cosmético)
**Líneas 1458-1464 de `DashboardClient.tsx`.**

Strings hardcodeados que deben reemplazarse con valores reales una vez que los gaps A-D estén resueltos.

---

## 9. Órdenes de Magnitud de Tasas Reales

Para referencia, con tasas aproximadas de Venezuela (mayo 2025):

| Tasa | Valor aproximado |
|------|-----------------|
| BCV | ~36-38 Bs/USD |
| Binance P2P (USDT/VES) | ~37-40 Bs/USD |

Con rate=1 (actual), una venta de $100 muestra:
- Monto Bs base: ~95 Bs (debería ser ~3,500-3,800 Bs)
- Comisión bancaria: ~0.28 Bs (debería ser ~10-11 Bs)
- Total estimado Bs: ~94.72 Bs (debería ser ~3,450-3,790 Bs)

**El error es de ~40x en todos los valores en Bs.**

---

## 10. Acciones Requeridas (Plan de Corrección)

### Fase 1: Schema (sin la cual nada funciona)

1. **Crear `MpReferenceRateSnapshot`** — modelo Prisma + migración
2. **Añadir columnas de tasa a `MpTransaction`** — `frozenRate`, `frozenRateType`, `fechaValor`, `rateSnapshotId`
3. **Aplicar migración de `MpBinanceRateSnapshot`** si no está aplicada
4. **Modificar `resolveReferenceRate()`** para persistir en `MpReferenceRateSnapshot`

### Fase 2: Integración en flujo de compra

5. **Modificar `initiatePurchase()`** en [`transactions.ts`](actions/marketplace/transactions.ts):
   - Resolver `binanceRate` y/o `bcvRate` ANTES de llamar a `calcFee()`
   - Pasar tasas reales a `calcFee()`
   - Guardar frozen rate en `MpTransaction`
   - Envolver en `$transaction` para atomicidad

### Fase 3: Corrección de UI

6. **Modificar `getTxPayoutCalculation()`** en [`DashboardClient.tsx`](components/marketplace/dashboard/DashboardClient.tsx:349):
   - Leer `frozenRate` del objeto `tx` (requiere que el server action `getMyTransactions()` incluya el campo)
   - Usar tasa real en `calculateSellerPayout()`
7. **Reemplazar placeholders** en [`DashboardClient.tsx:1458-1464`](components/marketplace/dashboard/DashboardClient.tsx:1458) con valores calculados reales
8. **Actualizar admin** para mostrar tasa usada en escrow y payout views

### Fase 4: Backfill (opcional, para datos históricos)

9. Determinar tasa aplicable históricamente desde Google Sheets o snapshots
10. Recalcular `platformFeeAmount` y `sellerNetAmount` para transacciones existentes

---

## 11. Verificación de No-Interferencia con Booking

Confirmado: ningún archivo del módulo booking (`lib/bookings/`, `app/reservas/`) fue modificado en esta diagnosis. La tasa BCV del marketplace está en [`lib/marketplace/reference-rate.ts`](lib/marketplace/reference-rate.ts) y es completamente independiente del resolver en [`lib/bookings/reference-rate.ts`](lib/bookings/reference-rate.ts). El endpoint `/api/bcv-rate` importa del módulo booking y no fue alterado.

---

## 12. Riesgos de Implementación

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Transacciones existentes con rate=1 | ALTO | No pagar basado en datos actuales; backfill o recalcular |
| Migración en producción sin respaldo | CRÍTICO | Respaldar BD antes de migrar |
| `resolveBinanceRate()` puede fallar (API rate limit) | MEDIO | Usar stale fallback de DB; nunca bloquear compra por falta de tasa |
| Dos compras simultáneas obtienen tasas diferentes | BAJO | Usar snapshot cacheado (5 min) como ya implementa `shouldReuseLatestSnapshot()` |
| BCV no tiene persistencia DB | MEDIO | Crear `MpReferenceRateSnapshot` antes de usarlo en TX |

---

## 13. Conclusión

"Pendiente de tasa de pago" es un **placeholder deliberado de UI** que expone una **desconexión arquitectural**: los resolvers de tasas existen y están completos, pero nunca se integraron al flujo de creación de transacciones. El `MpTransaction` carece de columnas para almacenar la tasa congelada. Sin estos campos, cualquier intento de mostrar valores en Bs es matemáticamente inválido.

**El problema es 80% backend/schema, 20% UI.** La UI muestra placeholders porque la data real no existe. Una vez que el schema y `initiatePurchase()` integren las tasas, los placeholders se reemplazan trivialmente.

**No se requiere tocar el módulo booking ni `/reservas`.**
