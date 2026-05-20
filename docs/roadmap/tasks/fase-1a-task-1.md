# Microtarea 1A.1 — Inspección del repo y propuesta de ubicación

## Modelo recomendado
Sonnet 4.6

## Objetivo
Inspeccionar la estructura actual del repositorio y proponer, con cambios mínimos, dónde debe vivir el sistema de reservas dentro del proyecto existente.

No implementar todavía lógica de negocio compleja. Primero entender el terreno.

---

## Alcance exacto
Claude debe:
- revisar la estructura del repo actual
- identificar stack, convenciones de carpetas y zonas sensibles
- proponer la ubicación del módulo de reservas
- proponer la ubicación del panel admin
- proponer la ubicación de schemas, helpers y seeds
- mantener coherencia con la arquitectura ya existente

Claude no debe:
- crear todavía todo el sistema
- escribir integración con Google Calendar
- implementar pagos
- mover archivos globales sin necesidad
- refactorizar diseño o contenido editorial

---

## Preguntas que debe responder

1. ¿Dónde debe vivir el dominio reservas?
2. ¿Dónde deben vivir las rutas públicas de reservas?
3. ¿Dónde debe vivir el panel admin?
4. ¿Dónde deben vivir los tipos, enums y helpers del dominio?
5. ¿Dónde deben vivir el schema y los seeds si el stack actual usa Prisma o similar?
6. ¿Qué partes del proyecto actual no deben tocarse en esta fase?

---

## Forma de trabajo

1. inspeccionar primero
2. resumir estructura encontrada
3. proponer organización mínima
4. solo si es muy seguro, crear carpetas base o archivos placeholder mínimos
5. no inflar alcance

---

## Archivos permitidos
- estructura de carpetas nueva mínima si hace falta
- archivos README o docs de estructura
- archivos placeholder mínimos para reservar espacios del módulo

## Archivos prohibidos
- rutas públicas existentes no relacionadas
- diseño global
- componentes actuales no vinculados
- lógica de Google Calendar
- pagos

---

## Entregable esperado
- propuesta concreta de ubicación
- lista de carpetas/archivos a usar
- justificación breve
- opcional: creación mínima de estructura vacía si aporta claridad y no rompe nada

---

## Validación externa sugerida
Claude no ejecuta comandos. Debe proponer solo si aplica:
- comando para inspección de tipos/build si hubo cambios mínimos

---

## Cierre obligatorio
Termina con:
- Archivos creados/editados
- Qué hizo exactamente
- Qué no tocó
- Riesgos o pendientes
- Comandos a ejecutar fuera de Claude

