# MiroFish Escrow Seed — Reporte de generacion

> Fecha: 2026-05-24
> Tarea: Preparar documento semilla para simulacion MiroFish sobre Pago Protegido / escrow
> Rama inicial: `Manuel/uiux-dashboard-mobile-redesign-2026-05-19`
> Rama de trabajo: `docs/mirofish-escrow-simulation-seed-2026-05-24`

---

## 1. Rama y commit base

| Dato | Valor |
|---|---|
| Rama creada | `docs/mirofish-escrow-simulation-seed-2026-05-24` |
| Rama madre | `MADRE/v8-s-mp-08-csv-tasas-neto-drop-social-2026-05-19` |
| Commit base | `560845a` — "docs(mother): merge S-MP-08 — Manuel" |
| Operador | Manuel |
| Tipo | docs-only (sin modificaciones de codigo) |

---

## 2. Archivos leidos

### Documentacion central (Obsidian vault)
- `docs/obsidian-vault/00_CENTRAL_TURPIAL.md`
- `docs/obsidian-vault/ROADMAP_RESCATE.md`
- `docs/obsidian-vault/BUGS_CRITICOS.md`
- `docs/obsidian-vault/S03_QA_HARNESS_INDEX.md`
- `docs/obsidian-vault/SPRINTS_MARKETPLACE_PARALELO.md`

### Handoffs
- `docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md`
- `docs/07_handoffs/marketplace-e2e-qa-runbook-2026-05-07.md`
- `docs/07_handoffs/marketplace-integrated-qa-procedure-2026-05-04.md`
- `docs/07_handoffs/integration-gatekeeper-2026-05-07.md`
- `docs/07_handoffs/E2E_MANUAL_TEST_PROTOCOL_2026-05-11.md`
- `docs/07_handoffs/qa-dispatcher.json`
- `docs/07_handoffs/qa-canonical-runbook.md`
- `docs/07_handoffs/zone-map.json`
- `docs/07_handoffs/S_MP_01_CART_SESSION_CLOSURE_2026-05-17.md`
- `docs/07_handoffs/session-summary-jean-2026-05-11.md`
- `docs/07_handoffs/NEXT_PHASE_PLAN_S11_S20_2026-05-11.md`
- `docs/07_handoffs/session-summary-active.md`
- `docs/07_handoffs/next-window-brief.md`

### Documentacion marketplace
- `docs/marketplace/00_IMPLEMENTATION_SUMMARY.md`
- `docs/marketplace/01_ROADMAP_AND_STATUS.md`
- `docs/marketplace/02_PAYMENT_ARCHITECTURE.md`
- `docs/marketplace/03_API_INTEGRATION_PLAN.md`
- `docs/marketplace/04_DISPUTES_&_SECURITY.md`
- `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- `docs/marketplace/QA_HARNESS_ARCHITECTURE.md`
- `docs/marketplace/CART_CONSOLIDATED_QA_MATRIX.md`
- `docs/marketplace/SELLER_COBROS_FEES_QA_MATRIX.md`
- `docs/marketplace/BINANCE_BUYER_SELLER_FLOW_QA_MATRIX.md`
- `docs/marketplace/ADMIN_AI_COPILOT_QA_MATRIX.md`

### Codigo (solo lectura)
- `prisma/schema.prisma`
- `actions/marketplace/transactions.ts`
- `actions/marketplace/admin.ts`
- `actions/marketplace/referrals.ts`
- `lib/marketplace/finance.ts`
- `lib/marketplace/reference-rate.ts`
- `lib/marketplace/binance-rate.ts`
- `lib/marketplace/assistant-knowledge.ts`
- `lib/bookings/payment-settings.ts`
- `types/marketplace.ts`
- `types/payments.ts`

---

## 3. Hallazgos confirmados

### Modelo de negocio
- [x] Marketplace separado de booking/reservas. Modelos `Mp*` independientes en Prisma.
- [x] Comision plataforma: 5% (paga el vendedor). Fuente: `lib/marketplace/finance.ts:1`.
- [x] Fee bancario interbancario: 0.3% (pagos en Bs). Fuente: `lib/marketplace/finance.ts:2`.
- [x] Flat fee USDT: 0.06 USDT (pagos USDT directo). Fuente: `lib/marketplace/finance.ts:3`.
- [x] Comision referral DropSocial: 0.5%. Fuente: `actions/marketplace/referrals.ts:71`.
- [x] Exencion SOCIO/SUPER: sin comision de plataforma. Fuente: `prisma/schema.prisma:386-387`.

### Flujo de pago protegido
- [x] 11 estados de transaccion: `INITIATED → PENDING_PAYMENT → PAYMENT_RECEIVED → VALIDATING → IN_ESCROW → DELIVERY_CONFIRMED → RELEASED`. Mas `PAYMENT_FAILED`, `DISPUTED`, `REFUNDED`, `CANCELLED`.
- [x] Pago manual: comprador sube comprobante, admin valida. No hay pasarela automatica.
- [x] Escrow se activa en `validatePayment()` → `IN_ESCROW`. Se setea `escrowHoldAt = now`, `escrowReleaseAt = now + 7 dias`.
- [x] Vendedor marca entrega sin cambiar estado (solo registro `seller_delivered` en status history).
- [x] Comprador confirma recepcion → `DELIVERY_CONFIRMED`.
- [x] Admin libera escrow solo desde `DELIVERY_CONFIRMED`. No se puede liberar desde `IN_ESCROW`.
- [x] Cron T+7 auto-release: campo seteado en DB pero cron NO implementado en codigo.

### Metodos de pago
- [x] Comprador: Pago Movil, transferencia bancaria, Zelle, Binance Pay / crypto wallet manual.
- [x] Vendedor cobro: Pago Movil, transferencia bancaria, Zelle, crypto wallet (Binance USDT).
- [x] Mercantil y Binance Pay automatico diferidos (sin integracion activa).
- [x] Tasa de cambio congelada al crear transaccion, multi-provider consensus para BCV, P2P API + Google Sheets para Binance.

### Disputas
- [x] `openDispute()` desde `IN_ESCROW` o `DELIVERY_CONFIRMED`.
- [x] `resolveDispute()` resuelve a `REFUNDED` (comprador) o `RELEASED` (vendedor).
- [x] Sin subsistema de evidencia estructurada ni SLA automatico.

### UX / copy
- [x] Glosario UX confirmado: "escrow" → "dinero protegido", "payout" → "cobro", etc.

---

## 4. Supuestos usados

| Supuesto | Razon |
|---|---|
| Ticket promedio: $50 / $150 / $500 / $1500 | Sin datos reales. Basado en categorias de producto del marketplace. |
| Tasa de disputa: 3-5% | Estimado conservador para marketplace sin pasarela automatica. |
| Fraude comprador: 1-2%, fraude vendedor: 1-3% | Estimado conservador. |
| Costo operativo por operacion: ~$2 | Tiempo estimado de admin para validar + liberar. |
| Capacidad operativa: 20-40 ops/dia | 1-2 personas haciendo validaciones manuales. |
| Tasa de fuga a venta directa: 10-20% | Estimado para mercado de baja confianza. |
| Volumen mensual inicial: 50 (conservador) / 150 (base) / 500 (agresivo) | Sin datos reales de proyeccion. |
| Tasa de abandono por friccion: 15-30% | Estimado. |
| Tasa de recompra: 20-40% | Estimado. |

---

## 5. Archivos creados/modificados

| Archivo | Accion | Descripcion |
|---|---|---|
| `docs/marketplace/MIROFISH_ESCROW_SIMULATION_SEED.md` | CREADO | Documento semilla principal para MiroFish (14 secciones) |
| `docs/07_handoffs/MIROFISH_ESCROW_SEED_REPORT_2026-05-24.md` | CREADO | Este reporte de generacion |
| `docs/obsidian-vault/00_CENTRAL_TURPIAL.md` | ACTUALIZADO | Entrada de navegacion al seed |
| `docs/obsidian-vault/ROADMAP_RESCATE.md` | ACTUALIZADO | Entrada de navegacion al seed |

---

## 6. Validaciones ejecutadas

- [x] `git diff --check` — sin errores de whitespace
- [x] `git status --short` — solo archivos docs modificados/creados
- [x] Sin modificaciones de codigo (actions, lib, prisma, scripts, components)
- [x] Sin tocar booking, /reservas, main, production
- [x] Sin leer, imprimir o exponer secretos de .env
- [x] Sin usar `git add .`
- [x] Todos los datos marcados como CONFIRMADO tienen fuente verificable en repo/docs/codigo
- [x] Todos los datos marcados como SUPUESTO estan explicitamente senalados

---

## 7. Que debe revisar Manuel

1. **Datos numericos:** Revisar y corregir supuestos de ticket promedio, volumen, capacidad operativa, tasas de disputa/fraude (Seccion 13 del seed).
2. **Escenarios de la simulacion:** Validar que los 4 escenarios (A/B/C/D) cubren las opciones estrategicas reales que se estan considerando.
3. **Variables de MiroFish:** Ajustar valores base conservador/base/agresivo antes de correr la simulacion.
4. **Prompt de MiroFish:** El bloque final (Seccion 12) esta listo para copiar y pegar. Revisar que el formato de salida esperado se ajusta a lo que MiroFish puede generar.
5. **Cuenta bancaria juridica + Binance empresa (S-ADM-02):** Pendiente fisico. Bloquea la automatizacion de pagos.

---

## 8. Siguiente paso recomendado

1. **Manuel:** Completar datos faltantes de la Seccion 13 del seed.
2. **Manuel:** Copiar el prompt de la Seccion 12 en MiroFish y ejecutar la simulacion con los 3 casos.
3. **Despues de la simulacion:** Crear documento de decision con el modelo elegido (A/B/C/D) y plan de implementacion incremental.
4. **A corto plazo:** Implementar Cron T+7 auto-release (ya tiene campo en schema, solo falta el scheduler).
5. **A mediano plazo:** Evaluar scoring de riesgo (Escenario C) si el volumen supera ~100 ops/mes.

---

*Reporte generado: 2026-05-24. Rama: `docs/mirofish-escrow-simulation-seed-2026-05-24`.*
