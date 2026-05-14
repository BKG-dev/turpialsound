# S18 Full Regression Report

**Fecha:** 2026-05-14 05:27 UTC-4  
**App URL:** `turpialsound-qc6k39eh1` (Vercel Preview)  
**Run ID:** 2026-05-14T09-27-50-800Z

---

## Resultado Final: 25 PASS / 0 FAIL / 50 CHECKS

| Modulo | Checks | Resultado |
|--------|--------|-----------|
| QA-00 Preflight | 2 | ✅ PASS |
| QA-01 Login | 2 | ✅ PASS |
| QA-02 Publish | 3 | ✅ PASS (location + inventory) |
| QA-03 Discovery | 4 | ✅ PASS (location verify) |
| QA-04 Purchase | 4 | ✅ PASS (inventory decrement) |
| QA-05 Payment Report | 2 | ✅ PASS |
| QA-06 Payment Proof | 2 | ✅ PASS |
| QA-07 Admin Review | 2 | ✅ PASS |
| QA-08 Seller Delivery | 2 | ✅ PASS |
| QA-09 Buyer Receipt | 2 | ✅ PASS |
| QA-10 Admin Payout | 2 | ✅ PASS |
| QA-11 Dashboards | 2 | ✅ PASS |
| QA-12 Final Regression | 2 | ✅ PASS |
| S05 Delivery Flow | 9/9 | ✅ PASS (IN_ESCROW → RELEASED) |
| S07 Rates/Accounting | 11/11 | ✅ PASS (BCV 490.04, Binance 651.14) |
| S08 Action Center | 11/11 | ✅ PASS (chat, unread, history) |
| S09 Discovery Publico | 9/9 | ✅ PASS (DB 37 listings, 11 active) |

## Datos Clave

- **BCV Rate:** 490.04 BS/USD (live, ExchangeRate + DolarAPI)
- **Binance Rate:** 651.14 BS/USD
- **Active Listings:** 11 (37 total, 24 SOLD_OUT)
- **Transactions:** Buyer 25, Seller 28
- **Payouts Pending:** 19
- **Escrow Active:** 3 in IN_ESCROW

## Cobertura S15/S16

- ✅ Location fields (city, state, isLocationPublic) en create/verify
- ✅ Inventory decrement en purchase (10 → 9)
- ✅ System messages ESCROW + PAGO LIBERADO
- ✅ Chat threads activos con mensajes no leidos

## Estado General

**Todos los sprints S01-S16 validados.** Plataforma estable para release gate (S21).
