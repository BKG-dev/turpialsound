# Matriz de QA: Flujo Binance Buyer/Seller

Este documento define la matriz de casos de prueba para validar el flujo de transacciones que involucran Binance Pay y USDT dentro del Marketplace de Turpial Sound.

## 1. Escenarios de Pago y Cobro (Buyer/Seller)

| Caso | Buyer Pago | Seller Método Cobro | Validación Flujo |
| :--- | :--- | :--- | :--- |
| **C1** | Binance (USDT) | Binance (USDT) | Checkout muestra USDT. Oculta bancos/Bs. Hash obligatorio. Payout: 100 - 5% - 0.06 = 94.94 USDT. |
| **C2** | Binance (USDT) | Bs (Banco/PM) | Checkout muestra USDT. Seller recibe Bs a tasa Binance del momento. Aplicar 5% + 0.03% (bank fee). |
| **C3** | Banco/Pago Móvil | Bs (Banco/PM) | Checkout muestra Bs. Seller recibe Bs a tasa BCV. Aplicar 5% + 0.03% (bank fee). |

## 2. Estados y Ciclo de Vida
*   **PENDING_PAYMENT:** Confirmar que el hash/referencia es obligatorio para pasar al siguiente estado.
*   **PAYMENT_RECEIVED / VALIDATING:** Verificación de que el pago entra en cola de revisión manual.
*   **IN_ESCROW:** Fondos bloqueados tras validación de admin.
*   **RELEASED:** Fondos transferidos/disponibles para payout según método del seller.

## 3. Validaciones UI (Componentes Marketplace)
*   **Legibilidad:** Validar contrastes en modales tanto en modo `light` como `dark`.
*   **UX Básica:**
    *   Botón de `close` siempre visible y funcional.
    *   `Scroll` interno del modal operativo cuando el contenido excede el viewport.
    *   **Badges de estado:** Verificar que se actualicen en tiempo real (o tras cierre de modal) sin requerir `refresh` de página.

## 4. Casos Edge (Validaciones Críticas)
*   **Selección de método:** Confirmar que si el seller no tiene método de cobro, el checkout deshabilite la compra o advierta de "método no configurado".
*   **Tasa Valor:** Validar que la tasa aplicada sea la de `fechaValor` guardada en la transacción y no una tasa "al momento de liberar".
*   **Validación de Payouts:**
    *   USDT con Payout en Bs (validar cálculo vs Spread Binance).
    *   USDT con Payout en USDT (validar wallet destino).
