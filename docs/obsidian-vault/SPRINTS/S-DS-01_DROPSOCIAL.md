---
type: sprint-doc
sprint: "S-DS-01"
nombre: "DropSocial — Referral System"
track: "T3 — Crecimiento Digital"
owner: "Manuel"
estado: "CERRADO 2026-05-14"
tags: ["#sprint", "#dropsocial", "#referral", "#cerrado"]
---

# DropSocial — Sistema de Referidos

## Concepto

DropSocial permite que cualquier usuario gane **0.5% de comisión** por cada venta realizada a través de su link de referido. El 0.5% sale del 5% de comisión de la plataforma (neto plataforma: 4.5%).

## Implementación

| Componente | Archivo | Función |
|-----------|---------|---------|
| Schema | `prisma/schema.prisma` | `MpReferralLink`: referrerId, listingId, code, clicks, conversions, totalEarned |
| Server | `actions/marketplace/referrals.ts` | `getOrCreateReferralLink`, `trackReferralClick`, `processReferralConversion`, `getMyReferralEarnings` |
| Route | `app/marketplace/r/[code]/route.ts` | Redirige con tracking de clics |
| QA | `scripts/qa/playwright/s-ds-01-dropsocial.spec.mjs` | 7 pasos E2E con screenshots |

## Flujo

```
Usuario ve listing → Click "Compartir" → Link único generado (ds-XXXX)
→ Comparte en RRSS/WhatsApp → Amigo compra → Usuario gana 0.5%
```

## Hook persuasivo

"Comparte y gana — Generá ingresos adicionales compartiendo esta publicación. Si alguien compra a través de tu link, ganás el 0.5% de la venta."

## Código

```
GET /marketplace/r/ds-XXXX → trackReferralClick → redirect a listing
```

## QA

- 7 pasos E2E: browse → share → link → visit → earnings
- Screenshots en `var/qa-results/s-ds-01-dropsocial/`
