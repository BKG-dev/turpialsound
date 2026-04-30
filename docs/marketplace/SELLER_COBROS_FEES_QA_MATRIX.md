# Matriz de QA: Seller Cobros y Fees

Este documento define la matriz de casos de prueba para el sprint de auditoría y automatización de Seller Cobros y cálculos de Fees en Turpial Sound Marketplace.

## 1. Reglas de Negocio (Fuente de Verdad)
*   **Comisión Turpial:** 5% del monto de venta SIEMPRE.
*   **Escenario A (USDT → Vendedor Binance):** Descuento de 5% + 0.06 USDT flat fee.
*   **Escenario B (USDT → Vendedor Bs):** Descuento de 5% + 0.3% comisión bancaria (aplicado sobre el monto en Bs).
*   **Escenario C (Pago Bs/Normal → BCV):** Descuento de 5% + 0.3% comisión bancaria (aplicado sobre el monto en Bs).

## 2. Escenarios de Prueba con Cálculos Numéricos (Expected Results)

### Caso 1: Venta Binance ($100.00) -> Vendedor Binance (USDT)
*   **Monto Bruto:** $100.00
*   **Comisión Turpial (5%):** $5.00
*   **Flat Fee Red (0.06 USDT):** $0.06
*   **Total Descuentos:** $5.06
*   **Neto a Pagar:** **94.94 USDT**

### Caso 2: Venta Binance ($100.00) -> Vendedor Bs (Tasa Binance)
*   **Monto Bruto:** $100.00
*   **Comisión Turpial (5%):** $5.00
*   **Monto Neto en USD:** $95.00
*   **Monto en Bs (Tasa Binance, ej: 37.00):** 3,515.00 Bs
*   **Comisión Bancaria (0.3% sobre Bs):** 10.545 Bs ≈ 10.55 Bs
*   **Neto a Pagar (Bs):** **3,504.45 Bs**

### Caso 3: Venta Normal ($100.00) -> Vendedor Bs (Tasa BCV)
*   **Monto Bruto:** $100.00
*   **Comisión Turpial (5%):** $5.00
*   **Monto Neto en USD:** $95.00
*   **Monto en Bs (Tasa BCV, ej: 36.50):** 3,467.50 Bs
*   **Comisión Bancaria (0.3% sobre Bs):** 10.4025 Bs ≈ 10.40 Bs
*   **Neto a Pagar (Bs):** **3,457.10 Bs**

## 3. Reglas de Validación Críticas
1.  **0.3% siempre:** El cargo bancario es siempre 0.3% sobre el monto en Bolívares.
2.  **USDT Solo:** El flat fee de 0.06 USDT solo aplica si el pago final es en USDT.
3.  **Segregación:** Fondos `IN_ESCROW` no son liberables.
4.  **Redondeo:** Usar `ROUND_HALF_UP` a 2 decimales para montos finales.
