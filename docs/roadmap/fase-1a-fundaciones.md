# Fase 1A — Fundaciones del sistema de reservas

## Objetivo de la fase
Construir la base técnica del sistema de solicitudes y apartados para Turpial Sound sin implementar todavía el flujo público completo, sin integrar pagos y sin cerrar aún Google Calendar.

Esta fase existe para dejar lista la infraestructura mínima correcta:
- modelo de datos
- catálogos base
- recursos reservables
- roles internos
- estructura admin inicial
- helpers y contratos básicos del dominio

La meta no es “que ya reserve”, sino que el proyecto quede listo para soportar las siguientes fases sin rehacer arquitectura.

---

## Resultado esperado al cerrar Fase 1A

Debe existir una base sólida para continuar con 1B, 1C y 1D:
- esquema de datos inicial bien modelado
- estados canónicos definidos
- seed base de servicios, variantes y recursos
- estructura inicial para roles y usuarios internos
- utilidades/helpers del dominio
- espacio preparado para panel interno

Todavía no es obligatorio que existan:
- wizard público terminado
- aprobaciones visuales completas
- integración real con Google Calendar
- pagos
- ODS automática

---

## Alcance permitido de Fase 1A

Sí entra:
- análisis de estructura actual del repo
- definición de ubicación para módulos de reservas
- schema inicial de base de datos
- enums/constantes de estados y roles
- seed inicial
- estructura de auth/roles base si aplica al stack existente
- placeholder o esqueleto de rutas/admin si la microtarea lo pide

No entra:
- UI premium final del flujo de reservas
- integración completa con Calendar
- emails, WhatsApp, Drive
- pagos
- automatizaciones complejas
- cambios de diseño global

---

## Principios de esta fase

1. **La base de datos es la fuente de verdad.**
   Google Calendar será una capa de agenda posterior, no el motor del workflow.

2. **Los nombres deben ser canónicos.**
   Evitar depender de textos libres o labels inconsistentes.

3. **No inflar alcance.**
   Cada microtarea debe resolver una sola pieza.

4. **No acoplar de más.**
   Mantener separación entre contenido, reservas, admin e integraciones.

---

## Entidades objetivo de referencia

- `services`
- `service_variants`
- `resources`
- `booking_requests`
- `booking_request_items`
- `approvals`
- `users`
- `audit_log`

## Roles objetivo de referencia

- `admin`
- `operations`
- `casa_director`
- `turpial_director`

## Estados objetivo de referencia

- `draft`
- `submitted`
- `availability_checked`
- `under_review`
- `approved_partial`
- `approved`
- `rejected`
- `needs_adjustment`
- `calendar_booked`
- `confirmed`

---

## Subfases / microtareas de Fase 1A

### 1A.1 — Inspección del repo y propuesta de ubicación
Objetivo:
- inspeccionar la estructura actual del proyecto
- decidir dónde vivirá el módulo de reservas, el dominio y el admin
- proponer una organización mínima compatible con lo existente

### 1A.2 — Schema de base de datos inicial
Objetivo:
- crear el schema inicial del dominio reservas
- definir relaciones, enums y campos principales
- dejarlo listo para migraciones posteriores

### 1A.3 — Seed base de catálogos y recursos
Objetivo:
- sembrar servicios, variantes y recursos reservables
- asegurar nombres canónicos y slugs consistentes

### 1A.4 — Helpers de dominio y contratos básicos
Objetivo:
- crear constantes/enums/helpers reutilizables
- centralizar estados, roles y mapeos de dominio

### 1A.5 — Base de auth/roles interna
Objetivo:
- preparar el terreno para acceso de staff y directivos
- sin cerrar aún toda la experiencia admin final

### 1A.6 — Validación de estructura y checklist de salida
Objetivo:
- revisar coherencia de la fase
- dejar lista la transición a Fase 1B
- documentar pendientes, riesgos y validaciones externas

---

## Disciplina de ejecución dentro de esta fase

- una sesión por microtarea
- `/clear` obligatorio al terminar cada microtarea validada
- `/compact` como higiene cada 4 prompts o antes si el contexto crece demasiado
- Claude no ejecuta bash; solo propone comandos al usuario
- si un cambio requiere salir del alcance, detenerse y reportar

---

## Criterio de éxito de Fase 1A

La fase se considera bien terminada si:
- la arquitectura inicial del dominio reservas existe
- el schema base es coherente y escalable
- los catálogos base están claros
- los roles y estados están centralizados
- la siguiente fase puede arrancar sin redefinir la base

