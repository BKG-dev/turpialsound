# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-04-20  
**Frente activo:** Marketplace  
**Tipo de nota:** Punto de control de cierre de sesion  
**Fuente viva obligatoria:** `docs/obsidian-vault/*`

---

## Instruccion de arranque

```text
Lee primero:
- docs/obsidian-vault/00_CENTRAL_TURPIAL.md
- docs/obsidian-vault/ROADMAP_RESCATE.md
- docs/obsidian-vault/BUGS_CRITICOS.md
- docs/obsidian-vault/ARQUITECTURA_TASAS.md
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md

Resume el estado real del marketplace en 5 lineas maximo.
Confirma si la base real ya tiene paymentSenderBank/paymentPaidAt.
No abras otro frente hasta cerrar la siguiente instruccion operativa.
```

## Estado resumido

El marketplace esta funcional y separado del booking. El cobro sigue en checkout manual temporal, la conciliacion sigue siendo manual y el payout al seller tambien sigue siendo manual. Hoy ya salio base64 del flujo productivo de imagenes y comprobantes: la media ahora se persiste como URL en storage temporal local desacoplado. El mayor riesgo activo ahora ya no es base64 sino la operacion real: confirmar/aplicar migracion real de conciliacion, ejecutar QA end-to-end y luego definir storage productivo definitivo.

## Que ya esta resuelto

- Checkout manual temporal operativo.
- Conciliacion manual con datos persistidos a nivel de codigo.
- Dashboard admin util para conciliacion.
- Seller summary corregido para no sobreestimar cobro.
- Reglas de aprobacion admin endurecidas.
- Marketplace desacoplado del booking.
- Imagenes y comprobantes fuera del flujo productivo de base64.
- Storage temporal local desacoplado ya implementado con persistencia por URL.

## Bloqueos activos

- Prioridad critica: confirmar o aplicar en base real la migracion de conciliacion manual, incluyendo `paymentSenderBank`.
- Prioridad critica: QA manual buyer -> admin -> escrow -> payout manual seller.
- Prioridad alta: reemplazar luego el storage temporal por storage productivo definitivo.
- Pendiente media: definir cierre final de payout al vendedor.
- Pendiente media: cron T+7 para auto-release.

## Lo siguiente que se hace

1. Revisar la base real y confirmar si existe `paymentSenderBank`, `paymentPaidAt` e indices.
2. Si no existen, aplicar la migracion real de conciliacion manual.
3. Ejecutar QA manual completa del flujo marketplace con imagenes y comprobantes reales.
4. Registrar resultados.
5. Solo despues decidir y ejecutar la migracion a storage productivo definitivo.

No abrir Mercantil, Binance ni nuevos frentes antes de eso.

## Requisito transversal del sitio

SEO/AEO es requisito transversal del sitio completo. Toda decision de contenido, taxonomia, metadata, slugs, listing pages y landings debe revisarse tambien bajo ese criterio.

## Siguiente instruccion operativa exacta

La siguiente ventana debe arrancar asi:

1. validar la base real,
2. confirmar o aplicar migracion de conciliacion,
3. correr QA manual completa,
4. documentar hallazgos,
5. luego pasar al storage productivo definitivo.

## Instruccion breve de reanudacion

No retomar por frontend ni por pasarelas. Retomar por base real y operacion real.

## No reabrir sin motivo

- El flujo vigente sigue siendo manual temporal.
- Conciliacion manual y payout manual siguen siendo el foco.
- Pasarelas automaticas siguen diferidas.
- Obsidian sigue siendo la fuente de trazabilidad viva.
- Base64 ya no debe volver al camino productivo.
