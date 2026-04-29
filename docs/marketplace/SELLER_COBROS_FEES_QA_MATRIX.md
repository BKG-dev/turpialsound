# Matriz de QA: Seller Cobros y Fees

Este documento define la matriz de casos de prueba para el sprint de auditoría y automatización de Seller Cobros y cálculos de Fees en Turpial Sound Marketplace.

## 1. Estados de Transacción (Payout Pipeline)
| Estado | Descripción | Validación esperada |
| :--- | :--- | :--- |
| **En revisión** | Pago recibido/validado pero no conciliado. | No debe aparecer en "Listo para cobrar". |
| **En proceso** | Liquidación iniciada por el sistema. | Bloqueo de cambios en la transacción. |
| **Listo para cobrar** | Fondos liberados (Released) y método configurado. | Disponible para inclusión en Payout. |
| **Sin método de pago** | Fondos liberados pero seller no ha configurado método. | Alerta visual en Admin/Copilot. |

## 2. Estructura de Comisiones y Fees
*   **Comisión Plataforma (Turpial):** 5.00% sobre monto bruto.
*   **Cargo Bancario (Venta):** 0.03% (cuando aplique).
*   **Cargo Binance (USDT):** 0.06 USDT (fijo por transacción).

## 3. Matriz de Conversión y Monedas
| Input (Venta) | Payout Método | Tasa Aplicada | Notas |
| :--- | :--- | :--- | :--- |
| USD | Zelle | N/A | Paridad 1:1 |
| USD | Bs | Tasa BCV (fecha valor) | Comisión de cambio aplicada |
| USDT | USDT | N/A | - |
| USDT | Bs | Tasa Binance (fecha valor) | Ajuste por spread Binance |

## 4. Reglas de Validación Críticas
1.  **Segregación:** Es imposible mezclar fondos `En proceso` con `Listo para cobrar`.
2.  **No-Ingreso:** Los fees externos (Binance/Bancos) NO deben contarse como ingreso neto de Turpial.
3.  **Conformidad:** Prohibido liberar fondos sin `buyerConfirmedAt` o resolución de disputa.

## 5. Casos Edge (Testing)
*   **Seller sin método:** Intentar generar payout masivo; el sistema debe excluir al seller y notificar.
*   **Disputa Activa:** Seller con transacción `DISPUTED` debe quedar bloqueado del payout hasta resolución `RESOLVED_SELLER`.
*   **Falta de Conformidad:** Pago validado pero sin `buyerConfirmedAt` (status != RELEASED); no debe incluirse en la cola.
*   **USDT a Bs:** Validar cálculo de `amountUsd * exchangeRate` menos fees.
*   **USDT a USDT:** Validación de dirección de wallet antes de procesar payout.
