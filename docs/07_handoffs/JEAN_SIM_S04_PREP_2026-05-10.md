# Jean-sim S04 prep — 2026-05-10

Este documento fue preparado por carril sustituto Manuel-as-Jean-Sim; Jean real no ejecutó S04.

## Identidad operativa

- Carril Jean-sim ejecutado por Manuel/agent sustituto.
- Modo trabajado: `align-prep`.
- Alcance: trazabilidad y preparacion documental de S04, sin ejecutar S04.

## Estado recibido

- S03C commit `57ceac3`.
- QA data resuelta.
- S03D en ejecucion por Manuel.
- S04 execute bloqueado.

## Confirmacion documental del estado

- `session-summary-active.md` deja S03C cerrado en datos QA seller y marca como bloqueo restante solo `CDP_HARNESS_BLOCKED` sobre `task_id=marketplace_login_smoke`.
- `next-window-brief.md` confirma que no existe otra ruta canonica de login fuera del dispatcher y que Jean no debe pasar a `S04 execute` mientras el smoke canonico no quede verde.
- `qa-dispatcher.json` mantiene `marketplace_login_smoke` como ruta canonica exacta para buyer/seller login y `payment_proof_sensitive_preview` como validacion minima de S04.
- `SPRINTS_CODEV_MARKETPLACE_2026-05-10.md` confirma que S04 es de Jean, requiere Preview, usa `task_id=payment_proof_sensitive_preview` y forma parte de la secuencia critica `S04 -> S05 -> S06`.

## Que hizo este agente

- lectura de Bus/Obsidian/handoffs
- preparacion de checklist S04
- ninguna mutacion de producto
- ningun deploy
- ninguna DB mutation

## S04 sigue bloqueado

S04 execute sigue bloqueado hasta que S03 quede cerrado con buyer login OK y seller login OK por la ruta canonica exacta del dispatcher. Mientras `marketplace_login_smoke` siga en `CDP_HARNESS_BLOCKED` o equivalente, S04 se mantiene solo en `align/prep`.

## Que validara S04 cuando pueda ejecutarse

- `task_id=payment_proof_sensitive_preview` sobre Preview valido.
- buyer QA debe poder adjuntar un payment proof nuevo.
- el `paymentProofUrl` nuevo debe quedar bajo `/api/marketplace/payment-proofs/...`.
- el proof nuevo no debe quedar expuesto en Blob publico.
- SUPER/admin debe poder abrir el comprobante por proxy autenticado.
- la evidencia final debe demostrar cero exposicion sensible y operacion QA segura.

## Precondiciones obligatorias

- S03 cerrado.
- buyer login OK.
- seller login OK.
- S01 cerrable/reintentado OK.
- lock Jean+Manuel explicito.
- Preview BKG valido, no Cerberus.
- no produccion.
- credenciales QA y env names requeridos presentes sin imprimir valores.
- browser interactivo funcional para la ruta manual canonica.

## Locks requeridos Jean+Manuel

- payment proof / protected media
- auth / session / admin / SUPER
- cualquier superficie de rates, finance o payout si aparece dependencia

Sin lock explicito sobre dominios criticos, S04 no arranca.

## Rutas y zonas sensibles previstas

- `/api/marketplace/payment-proofs/...`
- proxy autenticado de comprobantes para SUPER/admin
- flujo buyer QA de compra + adjunto de proof
- superficies de `Validaciones` en admin
- Preview BKG del proyecto `bkgs-projects-829c67c1`
- exclusion explicita de booking `/reservas`, `main`, produccion y Blob publico para proofs

## Checklist S04 execute para manana

- S03 cerrado
- buyer login OK
- seller login OK
- S01 cerrable/reintentado OK
- lock Jean+Manuel explicito
- Preview BKG valido, no Cerberus
- no produccion

## Stop conditions S04

- login QA no validado
- missing env
- DB mismatch
- protected media/payment proof secrets ausentes
- intento de tocar produccion/main
- divergencia booking/marketplace
- preview fuera de BKG o intento de usar Cerberus
- payment proof nuevo expuesto en Blob publico
- proxy SUPER/admin no abre el comprobante protegido

## Evidencia minima esperada

- identificacion del preview BKG valido usado
- confirmacion de buyer QA con proof nuevo subido
- confirmacion de `paymentProofUrl` bajo `/api/marketplace/payment-proofs/...`
- confirmacion explicita de ausencia de Blob publico para el proof nuevo
- confirmacion de apertura correcta desde SUPER/admin por proxy autenticado
- nota corta de locks vigentes y de que no se toco produccion

## Proxima accion recomendada para Jean manana

- leer resultado final de S03D
- si S03D paso, pasar S04 de align a execute con lock explicito
- si S03D fallo, no ejecutar S04 y ayudar a cerrar bloqueo exacto

## Estado final

- S04 align/prep actualizado
- S04 execute no ejecutado
- Jean informado para manana
