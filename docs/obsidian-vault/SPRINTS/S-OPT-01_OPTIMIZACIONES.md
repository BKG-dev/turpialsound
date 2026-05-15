---
type: sprint-doc
sprint: "S-OPT-01"
nombre: "Optimizaciones Marketplace"
track: "T1 + T3"
owner: "Manuel"
estado: "CERRADO 2026-05-14"
tags: ["#sprint", "#optimizacion", "#ui", "#search", "#cerrado"]
---

# Optimizaciones Marketplace

## Cambios implementados

| Feature | Archivo | Descripción |
|---------|---------|-------------|
| Location dropdowns | `MarketplaceModals.tsx` | Estado → Ciudad cascade con 14 estados y sus ciudades |
| Inventory qty | `MarketplaceModals.tsx` | Campo cantidad en modal vender/ofrecer, stock tracking |
| Always public location | `MarketplaceModals.tsx` | Sin checkbox, ubicación siempre visible en publicación |
| Fuse.js fuzzy search | `MarketplacePageClient.tsx` | Búsqueda typo-tolerant (threshold 0.4). Ej: "guitara" → "guitarra" |
| Price range presets | `MarketplacePageClient.tsx` | $0-50, $50-100, $100-500, $500-1000, $1000+ |
| Sort options | `MarketplacePageClient.tsx` | Menor precio, Mayor precio, Más reciente |
| Super admin elevation | `admin.ts` | `adminSetUserRole` con `SUPER_ADMIN_ELEVATION_PASS` |
| WhatsApp notif | `notifications.ts` | +584168017844, 6 tipos: new_message, payment_received/sent, dispute, delivery, payout |
| Remove "pago manual" | `DashboardClient.tsx` | Mensajes reemplazados por texto profesional |
| Export payouts | `api/admin/export-payouts/route.ts` | JSON/CSV/TXT con todos los datos de pago |

## QA

- Full E2E: 14 pasos, 15 screenshots
- `s-rev-01-full-e2e.spec.mjs`

## Preview Vercel

`turpialsound-8dl39wqiw-bkgs-projects-829c67c1.vercel.app`
