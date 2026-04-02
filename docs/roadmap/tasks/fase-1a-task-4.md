# Microtarea 1A.4 — Helpers de dominio y contratos básicos

## Modelo recomendado
Sonnet 4.6

## Objetivo
Centralizar los contratos básicos del dominio reservas para evitar lógica dispersa y nombres inconsistentes en fases posteriores.

Esto incluye estados, roles, constantes del dominio y helpers puros seguros.

---

## Alcance exacto
Claude debe:
- crear constantes o enums reutilizables
- centralizar estados del workflow
- centralizar roles internos
- crear helpers puros de dominio si aportan claridad
- definir contratos mínimos para usar luego en UI/admin

Claude no debe:
- implementar lógica de negocio pesada
- meter llamadas a APIs externas
- duplicar enums ya existentes si pueden reutilizarse de forma limpia

---

## Posibles piezas a crear
- `booking-status`
- `user-role`
- `service-category`
- `priority-level`
- helper para labels legibles
- helper para validar transiciones simples si procede

Todo debe adaptarse al stack real y evitar sobreingeniería.

---

## Archivos permitidos
- módulos de constantes/enums
- helpers puros de dominio
- tipos compartidos del módulo reservas

## Archivos prohibidos
- páginas visuales
- Google Calendar
- panel admin completo
- servicios externos

---

## Entregable esperado
- núcleo reutilizable del dominio
- nombres consistentes
- mínimo número de archivos posible sin sacrificar claridad

---

## Validación externa sugerida
Claude no ejecuta comandos. Debe proponer solo los necesarios, por ejemplo:
- `pnpm build`
- `pnpm lint`

---

## Cierre obligatorio
Termina con:
- Archivos creados/editados
- Qué hizo exactamente
- Qué no tocó
- Riesgos o pendientes
- Comandos a ejecutar fuera de Claude

