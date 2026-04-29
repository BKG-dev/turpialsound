# Business Intelligence Roadmap: Admin AI Copilot

## 1. Objetivo
Evolucionar el Admin AI Copilot de una herramienta de gestión operativa a un sistema de inteligencia de negocio (BI) integral que permita la visibilidad total del rendimiento del marketplace y la salud financiera de Turpial Sound.

## 2. Estado de Métricas: Reales vs. Estimadas
| Métrica | Estado | Instrumentación |
| :--- | :--- | :--- |
| **Transacciones (Volumen/Monto)** | **Real** | DB Relacional (Prisma) |
| **Comisiones Ganadas** | **Real** | DB Relacional (Prisma) |
| **Conversión (Clicks/Views)** | Estimada | Pendiente (Requiere tracking) |
| **Costo de Adquisición/Mantenimiento**| Estimada | Pendiente (Requiere P&L) |
| **Margen Neto / P&L** | Estimada | Pendiente (Requiere Integración) |

## 3. Requisitos Técnicos de Instrumentación
*   **Vercel Observability:** Necesario para monitorear el rendimiento de los endpoints del marketplace y tiempos de respuesta de queries complejas de BI.
*   **Módulo Financiero / P&L:** Requiere la implementación de `AccountingEntry` para registrar costos operativos, impuestos y flujos de caja.
*   **Dependencias Críticas:**
    *   `MP_AnalyticsEvent`: Definición de estructura estándar para eventos.
    *   `Blob metadata`: Enriquecimiento de assets con metadatos para análisis de contenido.
    *   `Event tracking`: Implementación en componentes críticos del frontend.
    *   `Future costs/taxes/cashflow`: Modelado necesario para el P&L automático.

## 4. Secuencia Recomendada de Implementación
1.  **Eventos Básicos:** Implementación de `MP_AnalyticsEvent` en el flujo de navegación principal para captura de datos reales de usuario.
2.  **Blob Metadata:** Enriquecimiento de archivos/imágenes para análisis cualitativo de listings.
3.  **Dashboard BI:** Centralización de métricas reales existentes y nuevas capturas en panel centralizado (copilot UI).
4.  **Finanzas / P&L:** Implementación del modelo contable real para cálculo de márgenes.
5.  **Acciones Admin:** Automatización de toma de decisiones basadas en el P&L generado.

## 5. Riesgos y Seguridad
*   **Privacidad:** Los datos de payouts y métodos de cobro son sensibles. El Copilot NO debe exponer `encryptedData` ni credenciales.
*   **Seguridad:** El acceso al Copilot BI debe ser restringido estrictamente al rol `SUPER` mediante middleware de seguridad.
*   **Performance:** Las agregaciones masivas en base de datos deben hacerse fuera de horas pico o mediante réplicas de lectura.

***

**NOTA:** Este documento es una guía estratégica. No implica la modificación de código, esquema o base de datos actual. Toda implementación futura deberá ser evaluada y aprobada explícitamente.
