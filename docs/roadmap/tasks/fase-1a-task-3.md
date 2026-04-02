# Microtarea 1A.3 — Seed base de catálogos y recursos

## Modelo recomendado
Sonnet 4.6

## Objetivo
Crear la semilla base del catálogo inicial de reservas: servicios, variantes y recursos reservables.

Debe quedar lista para que Fase 1B pueda consumir catálogos consistentes sin depender de textos improvisados.

---

## Alcance exacto
Claude debe:
- revisar cómo se manejan seeds o fixtures en el proyecto actual
- crear seed inicial para servicios
- crear seed inicial para variantes de servicio
- crear seed inicial para recursos reservables
- usar slugs y nombres canónicos
- respetar la estructura del schema aprobado en 1A.2

Claude no debe:
- cablear todavía UI pública
- integrar disponibilidad real
- crear descuentos complejos o pricing dinámico si no está definido

---

## Catálogos de referencia
Servicios posibles de partida:
- sala de ensayo
- grabación
- mezcla
- mastering
- podcast
- locución
- studio session
- consultoría

Variantes de referencia donde aplique:
- flexible
- premium
- prioritaria

Recursos de referencia:
- Sala Ensayo A
- Sala Ensayo B
- Sala Grabación
- Booth Voz
- Set Studio Session

Adaptar a la realidad del repo y dejar TODO fácil de ampliar.

---

## Requisitos de calidad
- no duplicar labels ambiguos
- slugs estables
- datos mínimos pero útiles
- preparados para usar en formularios y panel admin

---

## Archivos permitidos
- seed file(s)
- catálogos estáticos relacionados si el stack lo requiere
- documentación breve del seed si hace falta

## Archivos prohibidos
- páginas de UI
- Google Calendar
- auth
- pagos

---

## Entregable esperado
- seed base clara y limpia
- lista breve de servicios/variantes/recursos incluidos
- criterio seguido para nombres y slugs

---

## Validación externa sugerida
Claude no ejecuta comandos. Debe proponer solo los necesarios, por ejemplo:
- `pnpm prisma db seed`
- `pnpm build`

---

## Cierre obligatorio
Termina con:
- Archivos creados/editados
- Qué hizo exactamente
- Qué no tocó
- Riesgos o pendientes
- Comandos a ejecutar fuera de Claude

