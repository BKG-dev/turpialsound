# Script ORESHNIK Preflight

## Propósito
Este script es una herramienta de seguridad no destructiva para agentes. Su objetivo es actuar como una guardia de seguridad durante las tareas de desarrollo, detectando si se han modificado archivos críticos (zonas prohibidas) en el branch actual.

## Nota para el equipo
- **Este script es para agentes antes de escribir**: Ejecútelo como chequeo preliminar para evitar cambios accidentales en áreas sensibles.
- **Detección en consolidación**: Puede detectar cambios críticos durante consolidación, lo cual es útil para revisión.
- **Criterio Humano**: Esta herramienta **no sustituye el criterio humano**. Es un asistente para evitar errores triviales de ruta.

## Zonas Bloqueadas
El script monitorea los siguientes paths críticos:
- `.env*`
- `prisma/**`
- `generated/**`
- marketplace o cualquier segmento de ruta `marketplace`
- modelos, tablas o archivos `Mp*`
- `app/api/**`
- `lib/auth/**`
- `middleware.ts`
- `package.json`
- `pnpm-lock.yaml`
- `lib/bookings/actions*`
- `lib/bookings/payment*`
- `lib/bookings/reference-rate*`
- `lib/bookings/google-calendar*`
- `lib/storage/payment-proofs*`

## Cómo ejecutarlo
```bash
node scripts/checks/oreshnik-preflight.mjs
```

## Comportamiento
- **Exit 0**: Todo OK, ninguna zona prohibida ha sido modificada.
- **Exit 1**: Se detectaron cambios en zonas prohibidas. El script listará los archivos infractores.
