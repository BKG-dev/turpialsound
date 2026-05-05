# Hitos pragmaticos marketplace - Definition of Done por sprint

Fecha: 2026-05-04
Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

## Proposito

Este documento traduce los sprints tecnicos del marketplace a hitos pragmaticos de producto.

Cada sprint debe responder:
- que queda funcionando para buyer, seller o admin;
- como se verifica;
- quien es owner;
- que rama usa;
- que riesgo tiene;
- que NO se incluye para evitar mezcla de alcances.

## Regla de trabajo

Nadie trabaja codigo directo sobre la rama madre.
Cada sprint sale en rama propia desde la rama madre.
Jean es owner tecnico del repo, booking/lab, integracion, Vercel/envs y salud global.
Manuel es owner funcional/producto del marketplace, flujo operativo, tasas, payout, estados y QA de negocio.

## Hitos pragmaticos por sprint

### 0. Integracion base sana

Owner: Jean
Rama sugerida: Jean/integration-fix-flipclock
Riesgo: alto / build global / booking

Hito visible:
La rama madre integrada compila y puede usarse como base sana para sprints marketplace.

Resultado verificable:
- tsc no falla por booking;
- npm run build no falla por booking;
- el bloqueo flipclock queda resuelto;
- preview integrado abre marketplace y booking/lab sin error server-side inicial.

Pendiente actual:
components/bookings/PaymentFlipCountdown.tsx importa flipclock, pero flipclock no aparece en package.json ni pnpm-lock.yaml.

No incluido:
- no cambiar reglas marketplace;
- no tocar rates;
- no tocar payout;
- no redisenar UI marketplace.

### 1. Reconciliacion Sprint 2A en rama integrada

Owner tecnico: Jean
Owner funcional/QA: Manuel
Rama pendiente: Manuel/reconcile-sprint2a-on-integrated-mother
Commit pendiente: 6512972 fix(marketplace): reconcile sprint 2a flow on integration
Riesgo: alto / flujo protegido / fondos

Hito visible:
El flujo protegido vuelve a ser seguro en la rama integrada.

Resultado verificable:
- seller puede marcar Ya entregue sin liberar fondos;
- buyer confirma Ya recibi y la transaccion pasa a DELIVERY_CONFIRMED / Fondos por liberar;
- confirmDelivery no auto-libera a RELEASED;
- releaseEscrow solo libera desde DELIVERY_CONFIRMED;
- admin solo ve Liberar fondos cuando la operacion esta en DELIVERY_CONFIRMED;
- no hay release desde IN_ESCROW.

No incluido:
- no payout formal;
- no schema;
- no migrations;
- no rates;
- no booking.

### 2. Rates diagnosis / pendiente tasa de pago

Owner: Manuel
Rama actual: Manuel/marketplace-rates-diagnosis
Riesgo: alto / dinero / calculo financiero

Hito visible:
Se entiende exactamente por que aparece Pendiente de tasa de pago y que dato falta para calcular el pago al vendedor de forma auditable.

Resultado verificable:
- ubicacion exacta del texto Pendiente de tasa de pago;
- mapa de BCV, Binance, fallback y snapshots existentes;
- identificacion de si la tasa se congela al comprar, pagar, validar, confirmar o liberar;
- diagnostico de transacciones legacy sin tasa;
- lista de campos existentes y campos faltantes;
- decision: que puede corregirse sin schema y que requiere migration.

No incluido:
- no implementar calculos todavia;
- no tocar schema;
- no tocar DB;
- no migration;
- no payout formal.

### 3. Rates implementation / tasa auditable

Owner tecnico: Jean si hay DB/schema
Owner funcional: Manuel
Rama sugerida: Manuel/marketplace-rates-implementation o Jean/marketplace-rates-implementation segun lock
Riesgo: muy alto / DB / dinero

Hito visible:
Cada operacion muestra la tasa usada, fecha valor y calculo base para pago al vendedor.

Resultado verificable:
- desaparece Pendiente de tasa de pago en operaciones nuevas;
- si es legacy, se muestra mensaje claro y no falso estado roto;
- buyer no-Binance usa BCV congelada;
- buyer Binance + seller no-Binance usa Binance congelada;
- seller Binance recibe USDT con regla 5% + 0.06 USDT si aplica;
- el calculo queda trazable.

No incluido:
- no registrar payout final;
- no contabilidad/P&L;
- no automatizar pagos.

### 4. Payout architecture / diseno de cierre financiero

Owner funcional: Manuel
Owner tecnico DB: Jean si toca schema
Rama sugerida: Manuel/marketplace-payout-design
Riesgo: muy alto / dinero / DB

Hito visible:
Existe un diseno claro para registrar el pago real al vendedor sin ambiguedades.

Resultado verificable:
- definido si se usa MpPayout o ajustes nuevos;
- definido monto bruto, comision Turpial, fee externo, neto vendedor;
- definido metodo, moneda, referencia/hash, fecha, adminId;
- definido uso de tasa y fecha valor;
- definido cierre de operacion.

No incluido:
- no implementacion directa sin aprobacion;
- no migration sin lock DB;
- no pagos reales.

### 5. Payout implementation / cierre operativo

Owner tecnico: Jean si hay DB/schema
Owner funcional/QA: Manuel
Rama sugerida: Jean/marketplace-payout-implementation o Manuel/marketplace-payout-implementation segun lock
Riesgo: muy alto / dinero / cierre

Hito visible:
Admin puede registrar el pago real al vendedor y cerrar la operacion de forma auditable.

Resultado verificable:
- admin registra monto, moneda, metodo, fecha, referencia/hash;
- se guarda tasa y fecha valor si aplica;
- seller ve Pago enviado / Operacion cerrada;
- buyer ve Operacion cerrada;
- admin deja de ver la operacion como pendiente;
- el cierre no depende de texto ambiguo Listo para pagar.

No incluido:
- no automatizar pagos bancarios;
- no integracion bancaria real;
- no produccion sin QA integral.

### 6. Sprint 2A.1 sync stabilization

Owner tecnico: Jean
Owner funcional/QA: Manuel
Rama sugerida: Jean/marketplace-2a1-sync-stabilization
Riesgo: medio / estado visual / dashboards

Hito visible:
Buyer, seller y admin ven el mismo estado sin refrescar manualmente ni entrar en modales confusos.

Resultado verificable:
- buyer confirma recepcion y card/modal/timeline cambian sin refresh confuso;
- seller marca entrega y recibe feedback claro;
- admin ve fondos por liberar cuando corresponde;
- badges de mensajes son accionables;
- no hay modal sin accion ni guia.

No incluido:
- no schema;
- no rates;
- no payout formal;
- no redisenar todo el modal.

### 7. Transaction detail UX / modal desktop

Owner tecnico/UI: Jean
Owner producto review: Manuel
Rama sugerida: Jean/marketplace-transaction-detail-ux
Riesgo: medio / UX operacional

Hito visible:
El modal de transaccion deja de parecer layout movil en desktop y muestra la operacion de forma clara.

Resultado verificable:
- layout desktop amplio;
- menos scroll innecesario;
- timeline/stepper claro;
- paso actual destacado con jerarquia visual sobria;
- proximo paso claro por rol;
- CTA contextual visible.

No incluido:
- no cambio de estados;
- no rates;
- no payout formal;
- no schema.

### 8. Chat, unread y system messages

Owner tecnico: Jean
Owner QA flujo: Manuel
Rama sugerida: Jean/marketplace-chat-unread-system
Riesgo: medio / comunicacion / UX

Hito visible:
Los mensajes sin leer llevan al mensaje correcto y los cambios de estado dejan rastro visible.

Resultado verificable:
- badge de mensajes clicable;
- scroll/focus al mensaje no leido;
- system message al validar pago;
- system message al marcar entrega;
- system message al confirmar recepcion;
- system message al liberar fondos;
- polling o near realtime razonable.

No incluido:
- no red social;
- no realtime complejo si polling basta;
- no schema si puede resolverse con estructura existente.

### 9. Listing reservation/state correctness

Owner funcional: Manuel
Owner tecnico DB si aplica: Jean
Rama sugerida: Manuel/marketplace-listing-state
Riesgo: alto / doble venta / inventario

Hito visible:
Un producto comprado queda reservado o bloqueado correctamente y no se puede vender dos veces.

Resultado verificable:
- al iniciar compra, listing refleja estado reservado/bloqueado si aplica;
- no hay doble compra simultanea;
- si pago falla/cancela, el listing se libera;
- si operacion cierra, listing queda en estado final correcto;
- buyer/seller/admin ven estado coherente.

No incluido:
- no payout;
- no rates;
- no filtros/search.

### 10. Publish requirements

Owner tecnico/UI: Jean
Owner reglas negocio: Manuel
Rama sugerida: Jean/marketplace-publish-requirements
Riesgo: medio / datos operativos

Hito visible:
El seller no puede publicar una venta operativamente incompleta.

Resultado verificable:
- se captura ubicacion real del articulo;
- se capturan datos minimos de cobro o se exige antes del payout;
- validaciones claras antes de publicar;
- no se crean listings que luego rompan tasas/payout/entrega.

No incluido:
- no payout final;
- no rates implementation;
- no booking.

### 11. Filters/search/browsing

Owner tecnico/UI: Jean
Owner product review: Manuel
Rama sugerida: Jean/marketplace-filters-search
Riesgo: medio / discovery / UX publica

Hito visible:
Los compradores pueden encontrar productos por ubicacion, categoria, precio y busqueda.

Resultado verificable:
- filtros por ubicacion;
- filtros por precio;
- categorias;
- busqueda;
- ordenamiento;
- mobile y desktop usable;
- no indexar combinaciones basura si aplica SEO.

No incluido:
- no cambios de flujo financiero;
- no payout;
- no DB critica salvo aprobacion.

### 12. QA integral final

Owner QA operacional: Manuel
Owner tecnico/integracion: Jean
Rama sugerida: integration QA sobre madre
Riesgo: alto / cierre preproduccion

Hito visible:
Marketplace completo probado de punta a punta en preview integrado.

Resultado verificable:
- seller publica;
- buyer pregunta;
- seller responde;
- buyer compra;
- buyer reporta pago;
- admin valida pago;
- seller marca entrega;
- buyer confirma recepcion;
- admin registra/libera pago;
- operacion cierra;
- chat/timeline/notificaciones consistentes;
- tasas/payout visibles y auditables;
- booking smoke test pasa;
- marketplace smoke test pasa.

No incluido:
- no produccion sin autorizacion Jean;
- no main desde workflow Manuel.

## Procedimiento QA integrado

Ademas de los hitos pragmaticos, el cierre de cada sprint debe seguir:

- docs/07_handoffs/marketplace-integrated-qa-procedure-2026-05-04.md
- docs/obsidian-vault/QA_MARKETPLACE_INTEGRADO.md

Estos documentos definen QA smoke, QA buyer/seller/admin, QA rates, QA payout, QA listing state, QA chat/unread, QA visual, severidad P0/P1/P2 y evidencia minima.
