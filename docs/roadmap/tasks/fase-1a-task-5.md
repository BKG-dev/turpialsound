# Microtarea 1A.5 — Base de auth/roles interna

## Modelo recomendado
Sonnet 4.6

## Objetivo
Preparar la base mínima de acceso interno para staff y directivos, sin construir todavía toda la experiencia admin final.

Esta tarea existe para dejar listo el terreno para revisión y aprobaciones en Fase 1C.

---

## Alcance exacto
Claude debe:
- revisar el mecanismo de auth actual del proyecto
- identificar si existe auth previa reutilizable
- proponer e implementar la base mínima de roles internos si el stack lo permite
- proteger de forma básica el espacio admin o dejarlo preparado para protección posterior

Claude no debe:
- construir todo el dashboard admin completo
- crear flujo visual de login sofisticado si no es necesario
- conectar todavía aprobaciones finales ni Google Calendar

---

## Roles de referencia
- `admin`
- `operations`
- `casa_director`
- `turpial_director`

---

## Requisitos de calidad
- mínima intrusión en el proyecto actual
- compatible con el esquema definido en 1A.2
- no sobrecomplicar auth si aún no es imprescindible
- dejar claro qué quedó listo y qué se difiere

---

## Archivos permitidos
- configuración/auth mínima
- guards/helpers de autorización
- placeholders mínimos de rutas protegidas si aporta claridad

## Archivos prohibidos
- UI admin completa
- Google Calendar
- pagos

---

## Entregable esperado
- base interna de roles lista o razonablemente preparada
- explicación clara de lo implementado y lo diferido

---

## Validación externa sugerida
Claude no ejecuta comandos. Debe proponer solo los necesarios, por ejemplo:
- `pnpm build`
- `pnpm lint`
- comandos específicos del sistema de auth si aplican

---

## Cierre obligatorio
Termina con:
- Archivos creados/editados
- Qué hizo exactamente
- Qué no tocó
- Riesgos o pendientes
- Comandos a ejecutar fuera de Claude

