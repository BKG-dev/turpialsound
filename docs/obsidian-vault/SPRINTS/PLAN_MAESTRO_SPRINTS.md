### S-MP-08 — Notificaciones + Drop Social Admin + CSV Export Consolidado (P2 COMPLETO)

| Campo | Valor |
|-------|-------|
| **Owner** | Manuel |
| **Tipo** | TECNICO |
| **Branch** | `Manuel/s-mp-08-notificaciones-2026-05-18` |
| **Depende de** | S-MP-05 (flujo de entrega), S-MP-06 (Drop Social) |
| **Cierre** | CERRADO 2026-05-19 — 10/10 criterios |

**Alcance expandido (respecto al plan original):**
1. **Notificaciones jerarquizadas** para compras, ventas, cambios de estado
2. **Alertas WhatsApp** para estados criticos (disputas, nueva venta, pago recibido, liberacion)
3. **Drop Social admin:** payout de comisiones REF-* en admin dashboard
4. **CSV export consolidado** (26 columnas) unificando seller payouts + Drop Social:
   - Datos bancarios desglosados: titular, cedula, telefono, N° cuenta, banco, Pay ID, email
   - **Tasa BCV** y **Tasa Binance** independientes (consultadas de snapshot tables)
   - **Neto a pagar (Bs)** y **Neto a pagar (USDT)** calculados segun moneda
   - Fuente: "Venta" o "Drop Social"
5. **Fee parameterization:** `lib/marketplace/fees.ts` con env vars (`MP_*`) — sin deploy
6. **Fix DB:** `channel_binding=require` removido de DATABASE_URL
7. **Logica moneda:** VES default, USDT solo si buyer + seller USDT

**Criterios de aceptacion (100% CERRADO):**
- [x] ~~S-MP-08-01~~ Notificacion in-app en Action Center por cada cambio de estado TX
- [x] ~~S-MP-08-02~~ Jerarquia: compras/ventas arriba, cambios de estado debajo
- [x] ~~S-MP-08-03~~ WhatsApp alert para: nueva venta, pago recibido, disputa, fondos liberados
- [x] ~~S-MP-08-04~~ Cada notificacion incluye enlace directo a la accion
- [x] ~~S-MP-08-05~~ Notificacion Drop Social: "Tu enlace genero venta de {monto}"
- [x] ~~S-MP-08-06~~ Badge de no leidas en header (contador numerico)
- [x] ~~S-MP-08-07~~ CSV export consolidado con 26 columnas separadas (vendedor + Drop Social)
- [x] ~~S-MP-08-08~~ Tasas BCV/Binance desde snapshot tables con fecha valor
- [x] ~~S-MP-08-09~~ `npx tsc --noEmit` limpio
- [x] ~~S-MP-08-10~~ Documentacion actualizada + cierre con `close-sprint.mjs`

**PENDIENTE POST-CIERRE (proxima sesion):**
- Test CSV export en preview con datos reales (tasas, netos)
- Test "Pagar todo" para Drop Social payouts
- QA manual integral buyer -> admin -> escrow -> release
- Cron T+7 para liberacion automatica
- `pnpm run build` en Vercel preview
