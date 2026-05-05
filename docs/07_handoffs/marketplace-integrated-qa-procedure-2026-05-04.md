# Procedimiento QA integrado marketplace

Fecha: 2026-05-04
Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

## Proposito

Este documento define como validar cada sprint del marketplace con evidencia concreta.

El objetivo es evitar cerrar sprints por intuicion. Cada sprint debe cerrar con rama, commit, push, validacion proporcional, QA minimo, evidencia, pendientes clasificados y handoff.

## 1. Preparacion obligatoria

Antes de probar cualquier sprint:

- confirmar rama exacta;
- confirmar commit HEAD;
- confirmar preview exacto si aplica;
- confirmar tipo de QA;
- confirmar owner;
- confirmar que NO es produccion;
- confirmar si el QA es de sprint, rama madre o QA integral.

Formato obligatorio:

- Rama:
- Commit:
- Preview:
- Tipo de QA:
- Owner:
- Fecha:
- Scope:
- No incluido:

## 2. Usuarios QA

Usar tres sesiones separadas:

- Buyer QA;
- Seller QA;
- Admin QA.

Recomendado:

- Buyer en navegador normal;
- Seller en incognito;
- Admin en otro navegador o perfil.

No mezclar buyer, seller y admin en la misma sesion.

## 3. Clasificacion PASS / FAIL

### PASS

La funcion hace lo esperado, se refleja visualmente y no rompe otro rol.

### FAIL P0

Bloquea flujo, dinero, seguridad o integridad:

- error server-side;
- no login;
- no compra;
- no validacion de pago;
- fondos liberados antes de confirmacion;
- doble venta;
- payout incorrecto;
- tasa faltante en operacion nueva;
- admin puede liberar desde estado incorrecto;
- booking/lab roto por cambio marketplace;
- marketplace roto por cambio booking/lab.

Accion:
- no mergear;
- no documentar como cerrado;
- crear hotfix o devolver al owner.

### FAIL P1

No bloquea dinero, pero confunde operacion:

- estado no actualiza sin refresh claro;
- badge no accionable;
- modal confuso;
- CTA ausente;
- copy contradictorio;
- timeline no indica paso actual;
- usuario queda sin proximo paso claro.

Accion:
- puede mergearse solo si no bloquea flujo/dinero;
- debe quedar documentado con owner y siguiente sprint.

### FAIL P2

Pulido visual o mejora menor:

- spacing;
- color;
- microcopy;
- responsive menor;
- alineacion;
- detalle estetico no bloqueante.

Accion:
- puede pasar a backlog visual si el sprint no era UX final.

## 4. QA smoke de rama madre

Este QA se hace cuando algo se mergea a la rama madre.

Checklist:

- /marketplace carga sin error;
- listings publicos cargan;
- login buyer funciona;
- login seller funciona;
- login admin funciona;
- dashboard buyer abre;
- dashboard seller abre;
- admin dashboard abre;
- booking/lab smoke abre sin romper;
- no aparece Application Error;
- no hay error server-side al autenticar.

Formato de resultado:

- Smoke rama madre: PASS/FAIL
- Errores:
- Notas:
- P0:
- P1:
- P2:

## 5. QA flujo completo buyer/seller/admin

### Paso 1 - Seller publica listing

Esperado:

- listing aparece en Mi Tienda;
- listing aparece en marketplace publico si esta ACTIVE;
- precio correcto;
- ubicacion/categoria si aplica;
- estado visible coherente.

### Paso 2 - Buyer pregunta

Esperado:

- seller recibe mensaje;
- badge de mensaje aumenta;
- badge es clicable;
- click lleva al hilo correcto;
- no se pierde contexto.

### Paso 3 - Seller responde

Esperado:

- buyer ve respuesta;
- badge de buyer refleja unread;
- click lleva al mensaje;
- chat queda asociado a listing/transaccion correcta.

### Paso 4 - Buyer inicia compra

Esperado:

- se crea transaccion;
- buyer ve compra en dashboard;
- seller ve venta en dashboard;
- listing queda reservado/bloqueado si esa regla ya aplica;
- no se permite doble compra si ya esta bloqueado.

### Paso 5 - Buyer reporta pago

Esperado:

- buyer puede reportar pago;
- se guardan datos minimos de metodo, referencia, banco/fecha si aplica;
- admin ve pago por revisar;
- seller no ve fondos liberados todavia.

Estado esperado:
- PAYMENT_RECEIVED o VALIDATING.

### Paso 6 - Admin valida pago

Esperado:

- admin valida pago;
- estado pasa a IN_ESCROW;
- buyer ve Esperando conformidad;
- seller ve Esperando conformidad;
- admin NO puede liberar fondos todavia.

Estado esperado:
- IN_ESCROW.

P0 si:
- admin puede liberar desde IN_ESCROW.

### Paso 7 - Seller marca Ya entregue

Esperado:

- seller ve CTA Ya entregue;
- click pide confirmacion previa;
- si cancela, no pasa nada;
- si confirma, se registra entrega;
- estado principal sigue en IN_ESCROW;
- buyer todavia debe confirmar recepcion;
- admin todavia NO puede liberar.

Estado esperado:
- IN_ESCROW.

P0 si:
- seller Ya entregue libera fondos o pasa a RELEASED.

### Paso 8 - Buyer marca Ya recibi

Esperado:

- buyer ve CTA Ya recibi;
- click pide confirmacion previa;
- si cancela, no pasa nada;
- si confirma, estado pasa a DELIVERY_CONFIRMED;
- buyer ve Fondos por liberar;
- seller ve Fondos por liberar;
- admin ahora si ve Liberar fondos.

Estado esperado:
- DELIVERY_CONFIRMED.

P0 si:
- buyer Ya recibi pasa directo a RELEASED.

### Paso 9 - Admin libera o registra pago

Esperado:

- admin puede liberar solo desde DELIVERY_CONFIRMED;
- admin registra pago si el sprint de payout ya existe;
- estado pasa a RELEASED / Operacion cerrada;
- seller ve operacion cerrada o pago enviado;
- buyer ve operacion cerrada;
- operacion sale de pendientes.

Estado esperado:
- RELEASED.

## 6. QA especifico de rates

Aplica a Sprint 3.

Checklist:

- ubicar donde aparece Pendiente de tasa de pago;
- confirmar si ocurre en operacion nueva o legacy;
- confirmar metodo buyer: Binance o no-Binance;
- confirmar metodo seller: Binance o Bs;
- confirmar tasa usada: BCV o Binance;
- confirmar fecha valor visible;
- confirmar calculo bruto, comision, fee externo y neto;
- confirmar que external fees no se cuentan como revenue Turpial;
- confirmar fallback si fuente de tasa falla;
- confirmar manejo claro para legacy sin tasa.

P0 si:
- operacion nueva queda sin tasa y no puede calcular payout.

P1 si:
- tasa existe pero la UI muestra Pendiente por error.

## 7. QA especifico de payout

Aplica a Sprint 4.

Checklist:

- admin ve operaciones en Fondos por liberar;
- admin no ve operaciones IN_ESCROW como pagables;
- admin registra metodo;
- admin registra moneda;
- admin registra monto;
- admin registra referencia/hash;
- admin registra fecha;
- admin registra tasa/fecha valor si aplica;
- seller ve pago enviado;
- buyer ve operacion cerrada;
- admin ve operacion cerrada;
- calculo coincide con reglas de negocio.

P0 si:
- se puede pagar al vendedor antes de confirmacion buyer.

## 8. QA especifico de listing state

Checklist:

- listing ACTIVE se puede comprar;
- al iniciar compra, listing queda bloqueado/reservado si aplica;
- otro buyer no puede comprar el mismo listing simultaneamente;
- si pago falla, listing se libera;
- si operacion cierra, listing queda vendido/cerrado;
- seller ve estado correcto;
- marketplace publico no ofrece comprar algo cerrado.

P0 si:
- el mismo listing puede venderse dos veces.

## 9. QA chat, unread y system messages

Checklist:

- badge unread aparece;
- click en badge abre hilo correcto;
- scroll/focus al mensaje nuevo;
- validacion de pago genera mensaje/evento visible;
- seller Ya entregue genera mensaje/evento visible;
- buyer Ya recibi genera mensaje/evento visible;
- admin libera fondos genera mensaje/evento visible;
- buyer/seller no quedan sin guia.

P1 si:
- hay unread badge pero no hace nada.

## 10. QA visual/responsive

Probar minimo:

- Desktop 1440px;
- Laptop 1366px;
- Mobile 390px;
- Dark mode;
- Light mode.

Checklist:

- authbar no tapa contenido;
- no hay overflow horizontal;
- modal transaction detail aprovecha viewport desktop;
- timeline/estado se entiende;
- CTA principal visible sin scroll absurdo;
- chat usable;
- botones no quedan cortados;
- no hay texto roto por encoding.

## 11. Evidencia minima por sprint

Cada cierre debe reportar:

- Sprint:
- Rama:
- Commit:
- Preview:
- Owner:
- Tipo QA:
- Validaciones:
- git diff --check:
- tsc:
- build:
- preview:
- QA 1 PASS/FAIL:
- QA 2 PASS/FAIL:
- QA 3 PASS/FAIL:
- Bloqueos:
- Pendientes:
- No tocado:

## 12. Criterio para cerrar un sprint

Un sprint queda cerrado solo si:

- tiene rama propia;
- tiene commit;
- tiene push;
- tiene validacion proporcional;
- tiene QA minimo;
- tiene preview si aplica;
- tiene handoff/documentacion;
- no deja P0 abierto;
- P1 queda documentado con owner;
- no toca fuera de scope.

## 13. Criterio para cerrar marketplace MVP

Marketplace MVP se considera cerrado cuando:

- buyer puede comprar de punta a punta;
- seller puede vender de punta a punta;
- admin puede validar pago y cerrar operacion;
- tasas y payout son auditables;
- no hay doble venta;
- no hay liberacion prematura de fondos;
- chat/unread guia el flujo;
- modal transaccion es usable;
- mobile/desktop funcionan;
- booking/lab no queda roto;
- preview integrado pasa QA completa.
