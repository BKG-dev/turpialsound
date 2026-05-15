---
type: test-protocol
project: "Turpial Sound Marketplace"
status: active
last_updated: "2026-05-11T04:30-04:00"
mother_commit: "8999e32"
preview: "https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app"
tags:
  - "#test-protocol"
  - "#e2e"
  - "#manual-test"
  - "#qa"
---

# Protocolo de Pruebas Manuales E2E

> Ver dashboard general en [[00_CENTRAL_TURPIAL]]

---

## Pre-vuelo

```bash
# 1. Verificar env vars
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs

# 2. Si faltan credenciales
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1
```

---

## Suite Automatizada (18 módulos)

```bash
npx tsx scripts/qa/run-marketplace-qa.mjs \
  "--modules=qa-12,s05,s07,s08,s09" \
  "--app-url=https://turpialsound-5qwhe7is1-bkgs-projects-829c67c1.vercel.app"
```

---

## Test Manual — UI funcional

### 1. Login
- [ ] Abrir `/marketplace`, click "Iniciar sesión"
- [ ] Entrar como `buyerIA`, verificar nombre en header
- [ ] Cerrar sesión, repetir con `sellerIA` y `mvera`

### 2. Discovery
- [ ] `/marketplace` sin sesión: listings visibles
- [ ] Listing QA `qa-e2e-s03f-selleria-discovery` visible
- [ ] Página de detalle carga correctamente
- [ ] Categorías navegables

### 3. Compra (buyerIA)
- [ ] Login buyerIA → listing QA → "Comprar"
- [ ] Seleccionar "Pago Móvil" → confirmar
- [ ] Verificar pantalla "Esperando comprobante"

### 4. Reporte de pago (buyerIA)
- [ ] Dashboard → Mis Compras → ver transacción
- [ ] "Reportar pago" → referencia `QA-MANUAL-001`, banco `Mercantil`
- [ ] Subir comprobante (imagen PNG/JPG)
- [ ] Verificar estado cambia a "Pago recibido"

### 5. Admin review (mvera)
- [ ] Login mvera → `/marketplace/admin?tab=validations`
- [ ] Ver transacción en "Pendientes"
- [ ] "Validar pago" → Aprobar
- [ ] Verificar pasa a "Escrow"

### 6. Delivery (sellerIA)
- [ ] Login sellerIA → Mis Ventas → transacción
- [ ] "Registrar entrega"
- [ ] Verificar buyer recibe notificación

### 7. Receipt (buyerIA)
- [ ] Login buyerIA → Mis Compras
- [ ] "Confirmar recepción"
- [ ] Estado cambia a "Entrega confirmada"

### 8. Payout (mvera)
- [ ] Login mvera → `/marketplace/admin?tab=payouts`
- [ ] "Liberar pago"
- [ ] Estado cambia a "Liberado"

---

## Modulos por Sprint (individual)

| Sprint | Comando | Esperado |
|--------|---------|----------|
| S04 | `npx tsx scripts/qa/modules/qa-s04-payment-proof-protection.mjs` | 9/9 PASS |
| S05 | `npx tsx scripts/qa/modules/qa-s05-delivery-receipt-flow.mjs` | 9/9 PASS |
| S07 | `npx tsx scripts/qa/modules/qa-s07-tasas-accounting.mjs` | 11/11 PASS |
| S08 | `npx tsx scripts/qa/modules/qa-s08-action-center-ux.mjs` | 11/11 PASS |
| S09 | `npx tsx scripts/qa/modules/qa-s09-discovery-publico.mjs` | 9/9 PASS |
| S10 | `npx tsx scripts/qa/modules/qa-s10-release-gate.mjs` | 10/10 🟢 |

---

## Criterios de Aprobación

- [ ] 18 módulos QA automatizados PASS (0 FAIL)
- [ ] Release Gate 10/10 🟢
- [ ] Login funciona para 3 roles
- [ ] Discovery muestra listings públicos
- [ ] Flujo completo: iniciar → pagar → validar → entregar → recibir → liberar
- [ ] No hay errores 500 en consola
- [ ] No se imprimen secretos en logs

---

## Si algo falla

```bash
# Revertir merge
git revert -m 1 8999e32
```
