# Matriz de Auditoría de Seguridad - Core Reservas (Red Team)

## 1. RIESGOS CONFIRMADOS / DEUDA DE HARDENING
| Riesgo | Severidad | Evidencia | Archivo | Mitigación | Responsable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Enlaces operativos firmados** | Media-Alta | La revisión de pago puede abrirse por token firmado sin sesión admin activa. Es útil para operación, pero si el enlace se filtra expone contexto sensible mientras el token viva. | `lib/bookings/operational-links.ts`, `app/ops/payment-review` | Mantener TTL corto, auditar accesos y evaluar sesión admin obligatoria para acciones destructivas. | Codex |
| **Expiración no programada** | Alta | La expiración se procesa desde flujo admin; falta scheduler/reconciliación independiente. | `app/admin/page.tsx`, `lib/bookings/operations.ts` | Crear job/cron operativo que expire y sincronice calendar sin depender de visitas al admin. | Codex |

## 2. SOSPECHAS RAZONABLES
| Riesgo | Severidad | Sospecha | Archivo | Mitigación | Responsable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Colisión de Recursos** | Media | Posibilidad de doble asignación si la transacción DB no aísla correctamente el chequeo de disponibilidad. | `lib/bookings/availability.ts` | Asegurar bloqueo (`SELECT FOR UPDATE`) en `tx.resource` durante el chequeo. | Codex |
| **Desalineación Admin/Calendar** | Crítica | El sync ocurre post-transacción sin mecanismo de rollback o reintento garantizado. | `lib/bookings/google-calendar.ts` | Implementar "Outbox Pattern" o tareas asíncronas para sync. | Codex |
| **Timezone Drift** | Media | El sistema fuerza America/Caracas en varias capas; requiere QA cruzado browser/server/calendar para confirmar que no haya deriva visual. | `lib/bookings/actions.ts`, `lib/bookings/google-calendar.ts` | Mantener UTC en DB, renderizar explícitamente America/Caracas y cubrir con QA. | Codex |

## 3. HARDENING FUTURO
| Riesgo | Severidad | Contexto | Archivo | Mitigación | Responsable |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Rate Limiting** | Baja | Sin protección contra spam en formularios públicos. | `lib/bookings/actions.ts` | Implementar middleware de rate limiting (Upstash o similar). | Futuro |
| **Sanitización Admin** | Media | Filtros de URL admin son básicos; requieren validación de tipo más estricta. | `app/admin/page.tsx` | Validar tipos de `searchParams` con `zod`. | Codex |

## CAMBIOS DOCUMENTALES
- Se ha refactorizado la matriz de riesgos para separar lo que es vulnerabilidad confirmada, sospecha técnica y deuda de hardening.
- Se añadió evidencia explícita para cada entrada.

## PRIMER RIESGO A TOMAR POR CODEX
- **Atomicidad de disponibilidad y expiración programada.** Son los dos riesgos con impacto directo sobre operación real de agenda.

## VALIDACIÓN
- `git diff --check`: Ejecutado correctamente.
