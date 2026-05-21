# UI/UX Dashboard Mobile Redesign — 2026-05-19/20

> Branch: `Manuel/uiux-dashboard-mobile-redesign-2026-05-19`
> Base: `MADRE/v8-s-mp-08-csv-tasas-neto-drop-social-2026-05-19` @ `e4ad725`
> Date: 2026-05-19 / 2026-05-20
> Agent: Codex 5.5 Thinking → Kilo (DeepSeek V4 Pro)
> Status: COMPLETED — 0/24 overflow, build PASS, tsc PASS, pushed

## Rutas auditadas

| Ruta | Tipo | Auditado | Resultado |
|------|------|----------|-----------|
| `/marketplace` | Public | Visual (6 viewports) | 0 overflow |
| `/marketplace/[slug]` (salas-de-ensayo) | Public | Visual (6 viewports) | 0 overflow |
| `/marketplace/dashboard` | Private | Visual (6 viewports) con login | 0 overflow |
| `/marketplace/admin` | Private | Visual (6 viewports) con login | 0 overflow |
| Chat/transaccion | Private (modal) | Codigo mejorado | Verificado via tsc+build |
| Checkout/compra | Private (modal) | Codigo mejorado | Verificado via tsc+build |

## Viewports auditados (24 combinaciones)

| Viewport | Resolution | marketplace | slug | dashboard | admin |
|----------|-----------|-------------|------|-----------|-------|
| android-small | 360x740 | OK | OK | OK | OK |
| iphone-base | 390x844 | OK | OK | OK | OK |
| android-large | 412x915 | OK | OK | OK | OK |
| iphone-promax | 430x932 | OK | OK | OK | OK |
| tablet | 768x1024 | OK | OK | OK | OK |
| desktop | 1440x900 | OK | OK | OK | OK |

**Total: 0/24 viewports con overflow horizontal.**

**Resultado: 0/12 viewports con overflow horizontal.**

## Cambios realizados

### 1. Agrupacion visual de mensajes (TransactionChat.tsx)

- Implementado `buildMessageTimeline()` que agrupa mensajes consecutivos del mismo autor/tipo con ventana de 5 minutos.
- Separadores de fecha: Hoy, Ayer, fecha completa.
- Separador de "Nuevo sin leer" con marker ref para scroll automático.
- Eventos de sistema agrupados con estilo compacto centrado (advertencias en naranja, info en gris).
- Burbujas de grupo con bordes redondeados inteligentes (primera, media, última).
- Timestamps compactados en grupo con rango de tiempo.
- Check/CheckCheck de lectura conservados.
- Quotes siempre en burbuja individual.

### 2. Dashboard mobile-first (DashboardClient.tsx)

- **Tabs**: Cambiadas de grid a rail horizontal con scroll en mobile (`overflow-x-auto`, `-mx-4` compensado con `px-4`). En sm+ vuelven a grid.
- **KpiCard**: Padding y altura reducidos en mobile (`min-h-[104px]` mobile vs `min-h-[118px]` desktop).
- **TxCard**: Layout responsivo (stack vertical en mobile, row en sm+). Botones full-width en mobile. Texto con `[overflow-wrap:anywhere]`.
- **DisputeModal**: Full-height en mobile (`h-[100dvh]`), scroll interno, sticky footer.
- **ChatOverlay (TransactionChat wrapper)**: Full-height en mobile, `rounded-none` en mobile.

### 3. Modales mobile-first (CheckoutModal.tsx)

- **Success/Error states**: `items-end` en mobile, `items-center` en sm+.
- **Checkout form**: `h-[100dvh]` en mobile, `max-h-[92vh]` en desktop. Scroll interno solo en body.
- **Payment methods grid**: 1 columna en mobile (<380px), 3 columnas en sm+.
- **Input fields**: Panel de pago sin max-height fijo para evitar doble scroll en mobile.

## Archivos modificados

- `components/marketplace/TransactionChat.tsx` — +243/-?? lines (agrupacion mensajes, timeline, separadores)
- `components/marketplace/dashboard/DashboardClient.tsx` — +48/-?? lines (tabs, modales, cards responsive)
- `components/marketplace/CheckoutModal.tsx` — +18/-?? lines (modales mobile-first)

## Validaciones ejecutadas

| Validacion | Resultado |
|-----------|----------|
| `git diff --check` | PASS (solo warnings CRLF cosmeticos) |
| `npx tsc --noEmit` | PASS (sin errores) |
| `pnpm run build` | PASS (48/48 paginas, compiled successfully) |
| Playwright publico (12 viewports) | 0 overflows horizontales |
| Playwright dashboard privado (6 viewports) | 0 overflows horizontales |
| Playwright admin privado (6 viewports) | 0 overflows horizontales |
| Console errors (nuevos por nuestro diff) | 0 |

## Riesgos restantes

- **Chat/mensajes con datos reales**: La logica de agrupacion usa el tipo `Message` existente sin modificar DB, pero no fue verificada con transacciones reales en vivo.
- **Dark/light theme toggle**: No verificado cuantitativamente. Los estilos usan variables CSS (`--mp-*`) existentes.
- **Contraste WCAG**: No medido. Pendiente para sprint de accesibilidad.
- **Login inestable**: El `getMpSession()` puede tardar >30s en primera carga post-build fria (Next.js server action). No es causado por nuestro diff.

## Siguiente paso real

1. PR a rama madre.
2. Sprint de contraste/accesibilidad WCAG.
3. Prueba con transacciones reales para verificar agrupacion de mensajes.
