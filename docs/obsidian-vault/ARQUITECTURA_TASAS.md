---
tags: ["#area/backend", "#architecture"]
---

# Arquitectura del Motor de Tasas

## Componentes Clave
- **Motor de Consenso (`reference-rate.ts`)**: Determina la tasa de cambio basada en múltiples fuentes.
  - **Hallazgo crítico**: El sistema NO debe fallback a 50 BS si falta .env, debe fallar explícitamente
- **APIs Utilizadas**:
  - `ExchangeRate`: Proporciona tasas de cambio oficiales.
  - `DolarAPI`: Fuente alternativa para tasas de cambio.

## Parámetros Importantes
- **RATE_DELTA_PCT**: Umbral de variación permitido entre las tasas de las APIs antes de activar un fallback.