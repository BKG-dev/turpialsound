# CLAUDE.md

## Propósito
Este repositorio está incorporando un sistema de solicitudes y apartados de reservas para Turpial Sound dentro de la web ya existente. El objetivo es construirlo por fases, con cambios seguros, reversibles y de alcance mínimo.

Claude debe trabajar como un operador quirúrgico:
- una sesión = una microtarea = un entregable verificable
- no expandir alcance
- no improvisar arquitectura fuera de la fase activa
- no tocar áreas no autorizadas
- no ejecutar comandos bash dentro de la consola de Claude

---

## Reglas operativas obligatorias

1. **Trabajar solo la microtarea activa.**
   - No adelantar tareas futuras.
   - No mezclar backend, UI, auth, Calendar y panel en una sola ejecución si no está pedido explícitamente.

2. **Primero inspeccionar, luego proponer, luego ejecutar.**
   - Antes de editar, revisar la estructura actual del proyecto.
   - Explicar en breve qué se tocará y por qué.
   - Ejecutar solo después de delimitar el alcance.

3. **Prohibido correr bash dentro de Claude Code.**
   - No ejecutar `bash`, `npm`, `pnpm`, `yarn`, `git`, `npx`, `prisma`, `next`, `vercel` ni comandos similares dentro de Claude.
   - En su lugar, entregar al usuario los comandos exactos para correr fuera de Claude.
   - Excepción: solo si el usuario autoriza de forma explícita y puntual ejecutar un comando dentro de Claude.

4. **Control estricto de contexto.**
   - Al cerrar cada microtarea validada: usar `/clear` obligatoriamente antes de iniciar la siguiente.
   - Usar `/compact` como higiene periódica cuando el contexto empiece a crecer innecesariamente; por defecto, aplicar cada 4 prompts o antes si la conversación se volvió pesada o repetitiva.
   - Nunca confiar en la memoria del chat como fuente principal de continuidad; la continuidad debe vivir en archivos `.md` del proyecto.

5. **No entrar en bucles de reparación.**
   - Si aparece un error nuevo, hacer como máximo 1 intento de corrección autónoma dentro del alcance actual.
   - Si el error cambia de naturaleza, detenerse y reportar.
   - No encadenar arreglos indefinidos.

6. **No tocar archivos fuera de la lista permitida.**
   - Cada microtarea define archivos permitidos y archivos prohibidos.
   - Si para resolver algo hace falta tocar un archivo no permitido, detenerse y reportarlo primero.

7. **Salida final obligatoria por microtarea.**
   Claude debe terminar siempre con este bloque:
   - Archivos creados/editados
   - Qué hizo exactamente
   - Qué no tocó
   - Riesgos o pendientes
   - Comandos que el usuario debe ejecutar fuera de Claude para validar

---

## Criterios de estilo de implementación

- Mantener arquitectura clara y extensible.
- Preferir nombres canónicos, no textos ambiguos.
- Separar claramente:
  - contenido/editorial
  - lógica transaccional
  - panel interno
  - integraciones externas
- No acoplar Google Calendar como motor de aprobación.
- La fuente de verdad del workflow debe ser la base de datos.
- No prometer “reserva instantánea” si la fase actual es de solicitud con aprobación.

---

## Modelo funcional objetivo

El sistema debe soportar este flujo general:

1. visitante envía solicitud desde la web
2. el sistema registra la solicitud en base de datos
3. el equipo interno revisa
4. directivos aprueban o rechazan
5. si se aprueba, se crea evento en Google Calendar
6. posteriormente podrá haber ODS, Drive, pagos y confirmación final

En Fase 1A solo se construyen las fundaciones.

---

## Estados canónicos previstos

Usar como referencia estos estados, aunque solo algunos se implementen en la fase activa:
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

## Entidades previstas

- `services`
- `service_variants`
- `resources`
- `booking_requests`
- `booking_request_items`
- `approvals`
- `users`
- `audit_log`

Claude no debe inventar entidades nuevas sin justificarlo.

---

## Relación con el proyecto actual

Este sistema debe integrarse dentro de la web existente de Turpial Sound sin romper:
- rutas públicas actuales
- diseño ya aprobado
- sistema editorial existente
- arquitectura base del proyecto

Antes de proponer estructura nueva, revisar la organización real del repo.

---

## Política de validación

Claude no ejecuta comandos. Claude propone los comandos.

Ejemplos de salida esperada al final de cada tarea:
- `pnpm lint`
- `pnpm build`
- `pnpm prisma validate`
- `pnpm prisma migrate dev`
- `pnpm test`

Solo listar los que realmente apliquen a la microtarea.

---

## Formato de respuesta esperado en cada microtarea

1. Diagnóstico breve del alcance
2. Plan breve de ejecución
3. Cambios realizados
4. Bloque final obligatorio:
   - Archivos creados/editados
   - Resumen
   - Riesgos/pendientes
   - Comandos a ejecutar fuera de Claude

