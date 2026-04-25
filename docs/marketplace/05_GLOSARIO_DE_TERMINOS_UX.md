# Glosario UX marketplace

Este glosario define el lenguaje visible para usuarios del marketplace. Los terminos tecnicos pueden seguir existiendo en codigo, enums, comentarios tecnicos o documentacion interna, pero no deben aparecer como copy principal para compradores, vendedores o administradores operativos.

| Termino tecnico interno | Termino recomendado para usuario | Donde usarlo | Donde evitarlo | Nota operacional |
|---|---|---|---|---|
| `escrow` | dinero protegido / pago protegido / operacion protegida | Explicar que el dinero queda resguardado mientras se completa la operacion | CTAs, KPIs principales, estados visibles de vendedor | Elegir segun contexto: "pago protegido" para buyer, "dinero protegido" para seller, "operacion protegida" para vista general |
| `payout` | cobro / pago al vendedor | Seller Cobros, Admin Pagos, mensajes de cierre de venta | Tabs, botones o ayudas visibles para publico general | Para seller usar "cobro"; para admin usar "pago al vendedor" |
| `RELEASED` | listo para cobrar / liberado para cobro | Estados de ventas que ya pueden pagarse al vendedor | Badges visibles, detalle de venta, resumen financiero | No mostrar el enum; usar "listo para cobrar" si todavia no se ejecuto el pago manual |
| `PAYMENT_RECEIVED` | pago recibido / en revision | Buyer post-pago, seller ventas, admin validaciones | Tablas o tarjetas visibles como enum | Indica que el comprador reporto el pago y falta revision manual |
| `DELIVERY_CONFIRMED` | entrega confirmada | Detalle de compra/venta, historial visible | KPIs financieros principales | No implica por si solo que el dinero ya fue pagado al vendedor |
| neto operativo | estimado despues de cargos / monto estimado | Resumen secundario de comisiones y cargos | KPI principal de dinero disponible | Usarlo solo para explicar estimaciones; no confundir con dinero cobrable |
| disponible para cobrar | disponible para cobrar / listo para cobrar | Solo cuando el estado permite pago al vendedor | Ventas en revision o en proceso | Debe referirse a montos realmente listos para pago al vendedor |
| VALIDATING | en revision | Estados intermedios de conciliacion manual | Copy tecnico o filtros visibles al seller | Para seller no distinguir demasiado entre `PAYMENT_RECEIVED` y `VALIDATING` salvo que haya una accion clara |
| IN_ESCROW | en proceso / operacion aprobada | Seller Cobros y detalle de venta | Copy principal como "escrow activo" | En seller, explicar como venta aprobada que sigue pendiente de entrega o cierre |
| platform fee / fee | comision / cargo | Desglose financiero secundario | KPI principal sin contexto | Separar comision plataforma de cargos operativos cuando ambos existan |

## Regla corta

- Si el usuario puede tomar una accion, usar lenguaje de accion: "Completa tus datos de cobro", "Revisa pagos en revision", "Disponible para cobrar".
- Si el dato es solo informativo, bajarlo de jerarquia visual.
- No repetir el mismo monto con nombres distintos.
- No llamar "disponible" a dinero que todavia esta en revision o en proceso.
