# E2E Manual Test Protocol — Turpial Marketplace QA Harness

> Rama madre: `RAMA MADRE`
> Commit: `e659cb3`
> Fecha: 2026-05-11
> Preview: `https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`

---

## Pre-vuelo

```bash
# 1. Verificar env vars
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs
# Debe mostrar ok=true en todas las variables

# 2. Si faltan credenciales
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1
```

---

## Test Suite Automatizada (18 módulos)

```bash
npx tsx scripts/qa/run-marketplace-qa.mjs \
  "--modules=qa-00,qa-01,qa-02,qa-03,qa-04,qa-05,qa-06,qa-07,qa-08,qa-09,qa-10,qa-11" \
  "--app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app"
```

| QA | Nombre | Qué valida | Esperado |
|----|--------|-----------|----------|
| QA-00 | Preflight | Env, APP_URL, DB, tablas, usuarios QA | PASS |
| QA-01 | Login | bcrypt buyer/seller/admin | PASS (AUTH_DATA_PASS) |
| QA-02 | Publish | Listing QA creado/actualizado | PASS (ACTIVE) |
| QA-03 | Discovery | Listing visible en /marketplace | PASS (UI_PASS) |
| QA-04 | Purchase | TX PENDING_PAYMENT | PASS |
| QA-05 | Payment | TX PAYMENT_RECEIVED | PASS |
| QA-06 | Proof | Blob metadata + proof URL | PASS |
| QA-07 | Admin Review | Status flow verificado | PASS |
| QA-08 | Delivery | IN_ESCROW + seller_delivered | PASS |
| QA-09 | Receipt | DELIVERY_CONFIRMED | PASS |
| QA-10 | Payout | RELEASED + MpPayout | PASS |
| QA-11 | Dashboards | Stats buyer/seller/admin | PASS |

---

## Módulos por Sprint

```bash
npx tsx scripts/qa/modules/qa-s04-payment-proof-protection.mjs
npx tsx scripts/qa/modules/qa-s05-delivery-receipt-flow.mjs
npx tsx scripts/qa/modules/qa-s07-tasas-accounting.mjs
npx tsx scripts/qa/modules/qa-s08-action-center-ux.mjs
npx tsx scripts/qa/modules/qa-s09-discovery-publico.mjs
npx tsx scripts/qa/modules/qa-s10-release-gate.mjs
```

| Sprint | Propietario | Qué valida | Checks | Esperado |
|--------|------------|-----------|--------|----------|
| S04 | Jean | Payment proof protegido | 9 | PASS |
| S05 | Manuel | Delivery & receipt flow | 9 | PASS |
| S07 | Jean | Tasas y accounting | 11 | PASS |
| S08 | Manuel | Action center y UX | 11 | PASS |
| S09 | Manuel | Discovery público y SEO | 9 | PASS |
| S10 | Jean | Release gate | 10 | 🟢 READY |

---

## Full Regression

```bash
npx tsx scripts/qa/run-marketplace-qa.mjs \
  "--modules=qa-12,s05,s07,s08,s09" \
  "--app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app"
```

Resultado esperado: **18/18 PASS, 0 FAIL, 0 SKIP**

---

## Test Manual — UI funcional

### 1. Login
- [ ] Abrir `/marketplace` en navegador
- [ ] Click "Iniciar sesión"
- [ ] Entrar como `buyerIA` / contraseña QA
- [ ] Verificar que el nombre aparece en el header
- [ ] Cerrar sesión
- [ ] Repetir con `sellerIA` y `mvera`

### 2. Discovery
- [ ] Abrir `/marketplace` sin sesión
- [ ] Verificar que hay listings visibles
- [ ] Verificar que el listing QA (`qa-e2e-s03f-selleria-discovery`) aparece
- [ ] Click en el listing, verificar página de detalle carga
- [ ] Navegar por categorías (`?category=instrumentos-nuevos`)

### 3. Compra (buyerIA)
- [ ] Iniciar sesión como `buyerIA`
- [ ] Ir al listing QA, click "Comprar"
- [ ] Seleccionar método de pago "Pago Móvil"
- [ ] Confirmar compra
- [ ] Verificar que aparece pantalla de "Esperando comprobante"

### 4. Reporte de pago (buyerIA)
- [ ] En dashboard → Mis Compras, ver la transacción
- [ ] Click "Reportar pago"
- [ ] Ingresar referencia: `QA-MANUAL-001`
- [ ] Banco: `Mercantil`
- [ ] Fecha: hoy
- [ ] Subir comprobante (cualquier imagen PNG/JPG pequeña)
- [ ] Verificar que el estado cambia a "Pago recibido"

### 5. Admin review (mvera)
- [ ] Iniciar sesión como `mvera`
- [ ] Ir a `/marketplace/admin?tab=validations`
- [ ] Ver la transacción en "Pendientes de validación"
- [ ] Click "Validar pago" → Aprobar
- [ ] Verificar que pasa a "En revisión / Escrow"

### 6. Delivery (sellerIA)
- [ ] Iniciar sesión como `sellerIA`
- [ ] Ir a dashboard → Mis Ventas
- [ ] Ver la transacción en "Pendientes de entrega"
- [ ] Click "Registrar entrega"
- [ ] Verificar que el comprador recibe notificación

### 7. Receipt (buyerIA)
- [ ] Iniciar sesión como `buyerIA`
- [ ] Ir a dashboard → Mis Compras
- [ ] Ver la transacción con opción "Confirmar recepción"
- [ ] Click "Confirmar recepción"
- [ ] Verificar que el estado cambia a "Entrega confirmada"

### 8. Payout (mvera)
- [ ] Iniciar sesión como `mvera`
- [ ] Ir a `/marketplace/admin?tab=payouts`
- [ ] Ver la transacción en "Pendientes de liberación"
- [ ] Click "Liberar pago"
- [ ] Verificar que el estado cambia a "Liberado"

---

## Criterios de Aprobación

- [ ] Los 18 módulos QA automatizados pasan (0 FAIL)
- [ ] Release Gate 10/10 🟢
- [ ] Login funciona para los 3 roles
- [ ] Discovery muestra listings públicos
- [ ] Flujo de compra completo: iniciar → pagar → validar → entregar → recibir → liberar
- [ ] No hay errores 500 en consola del navegador
- [ ] No se imprimen secretos en logs

---

## Si algo falla

```bash
# Revertir merge
git revert -m 1 e659cb3
# O revertir archivos específicos
git checkout HEAD~1 -- <archivo>
```
