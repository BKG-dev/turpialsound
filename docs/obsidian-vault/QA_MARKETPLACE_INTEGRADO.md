# QA Marketplace Integrado

Rama madre: integration/lab-marketplace-sprint2a-selective-2026-05-04

## Regla

No se cierra ningun sprint sin QA minimo, evidencia y clasificacion P0/P1/P2.

## QA obligatorio

1. Confirmar rama, commit y preview.
2. Confirmar que no es produccion.
3. Probar buyer, seller y admin en sesiones separadas.
4. Clasificar fallos como P0, P1 o P2.
5. No cerrar con P0 abierto.
6. Documentar P1 con owner.
7. Reportar evidencia minima.

## Flujo canonico

1. Seller publica.
2. Buyer pregunta.
3. Seller responde.
4. Buyer inicia compra.
5. Buyer reporta pago.
6. Admin valida pago.
7. Estado pasa a IN_ESCROW.
8. Seller marca Ya entregue.
9. Buyer marca Ya recibi.
10. Estado pasa a DELIVERY_CONFIRMED.
11. Admin libera/registra pago.
12. Estado pasa a RELEASED.
13. Chat, timeline y dashboards quedan consistentes.

## P0 automatico

- fondos liberados antes de confirmacion buyer;
- admin libera desde IN_ESCROW;
- doble venta;
- operacion nueva sin tasa para payout;
- error server-side;
- booking/lab roto por cambios marketplace.

## Documentos relacionados

- docs/07_handoffs/marketplace-integrated-qa-procedure-2026-05-04.md
- docs/07_handoffs/marketplace-pragmatic-milestones-2026-05-04.md
- docs/07_handoffs/parallel-sprint-distribution-2026-05-04.md
