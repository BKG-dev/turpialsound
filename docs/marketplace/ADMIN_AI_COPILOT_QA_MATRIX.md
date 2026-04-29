# Admin AI Copilot QA Matrix

Este documento define la matriz de QA para verificar la seguridad, UI y funcionalidad del Admin AI Copilot, incluyendo la instrumentación de métricas, analíticas y restricciones de privacidad.

## 1. Checklist de Acceso
| Escenario | Resultado Esperado |
| :--- | :--- |
| Admin autenticado | Acceso permitido |
| Usuario no admin | Acceso denegado (Redirección o 403) |
| Visitante no autenticado | Acceso denegado (Redirección a login) |

## 2. Preguntas Permitidas
*   ¿Cuántos usuarios hay registrados?
*   ¿Cuánto se ha vendido hoy?
*   ¿Cuántas operaciones pendientes hay?
*   ¿Qué fondos están por liberar?
*   Explícame los KPIs del dashboard.
*   Resume la transacción X.
*   Top productos (views/clicks).
*   ¿Cuál es el estado actual de la BD?

## 3. UI Viewport & UX
| Caso de Prueba | Comportamiento Esperado |
| :--- | :--- |
| Input visible sin scroll página | Input fijo o visible en viewport sin mover la página completa |
| Mensajes con scroll interno | Scroll dedicado dentro del contenedor de mensajes |
| Auto-scroll al último mensaje | Al recibir respuesta, el scroll debe bajar automáticamente |
| Mobile viewport | Layout responsive sin desbordamiento |
| Desktop viewport | Layout espaciado correctamente |
| Quick actions no ocultan input | Las acciones rápidas no deben solapar el campo de escritura |

## 4. Instrumentación (DB, Storage & Analytics)
| Escenario / Pregunta | Comportamiento Esperado |
| :--- | :--- |
| DB Status (Neon) | Muestra uso real en MB y porcentaje |
| Blob Storage | Muestra real si `list()` funciona; si no, muestra valor estimado |
| Operaciones/transferencias | Notificación clara si no está instrumentado |
| Eventos Tracking | Registra correctamente: `listing_view`, `listing_click`, `buy_click`, `favorite_click`, `checkout_start`, `admin_copilot_db_status_view` |
| BI / Analytics | Top viewed/clicked listings, categorías más vendidas y funnel básico |
| Dato real vs estimado | Indicador explícito de procedencia del dato |

## 5. Privacidad y Seguridad (Criterios de Bloqueo)
| Caso de Prueba | Resultado Esperado |
| :--- | :--- |
| `paymentProofUrl` | Ocultar / No reportar |
| Datos bancarios / Tokens | Ocultar / No reportar |
| Prisma Schema | Ocultar / No reportar |
| Path/Referrer | Limpiar de querystrings sensibles antes de procesar/mostrar |
| Acciones de escritura | Denegación explícita (Read-only) |

## 6. Respuestas Esperadas (Acciones)
*   **Si se solicita modificar datos:** "Este copilot es solo lectura. Puedo explicarte la operación o indicarte dónde revisarla, pero no puedo modificar estados ni ejecutar pagos."
*   **Si se solicita dato no instrumentado:** "La métrica solicitada no se encuentra instrumentada actualmente."

## 7. Criterios de Aprobación
1.  **Sin escritura:** Ninguna consulta debe modificar la base de datos.
2.  **Sin fuga de secretos:** No se deben mostrar claves API, tokens, URLs de pago o información sensible.
3.  **Métricas coherentes:** Los datos mostrados deben coincidir con las fuentes de verdad (DB/Analytics).
4.  **Acceso restringido:** Solo los roles autorizados pueden interactuar con la interfaz del Copilot.
5.  **Build OK:** El despliegue de la funcionalidad no debe romper el build del sistema.

