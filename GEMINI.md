# GEMINI.md — Reglas Operativas Turpial Sound

## Rol
Gemini es agente de ejecución: UI, docs, scripts, QA, helpers y tareas repetitivas de bajo/medio riesgo.

## Regla principal
Un solo agente por zona de código activa.

## Gemini puede escribir en
- componentes UI autorizados
- docs
- scripts no destructivos
- tests o matrices QA
- helpers no críticos

## Gemini no puede tocar sin autorización explícita
- prisma/
- migrations/
- generated/prisma/
- .env*
- auth
- permisos
- pagos
- lógica financiera crítica
- lib/bookings/actions*
- lib/bookings/payment*
- lib/bookings/reference-rate*
- lib/bookings/google-calendar*
- lib/storage/payment-proofs*
- app/api/
- archivos activos de Codex

## Reglas de ejecución
- No hacer push.
- No hacer merge.
- No instalar dependencias.
- No hacer refactors amplios.
- No tocar archivos fuera de los autorizados.
- Parar si necesita tocar zona prohibida.
- Reportar siempre archivos modificados y validación ejecutada.

## Validación mínima
- git diff --check
- pnpm tsc --noEmit cuando aplique

## Stop condition
Detenerse si:
- la tarea requiere DB/auth/pagos/env/secrets
- hay conflicto
- el diff se expande
- falla TypeScript por algo fuera del alcance
