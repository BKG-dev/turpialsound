# Resultado 1A.1 — Inspección del repo y propuesta de ubicación

## Estado: COMPLETADA

---

## Stack identificado

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| UI | React 18 |
| Estilos | Tailwind CSS 3 |
| Lenguaje | TypeScript 5 |
| ORM | No existe todavía — añadir Prisma en 1A.2 |
| Auth | No existe todavía — preparar en 1A.5 |

---

## Mapa de ubicaciones decididas

### Rutas públicas
```
app/reservas/page.tsx         ← wizard público de solicitud (se crea en 1B)
```

### Panel admin interno
```
app/admin/page.tsx            ← panel de operaciones (se crea en 1A.5)
```

### Base de datos
```
prisma/schema.prisma          ← schema del dominio (se crea en 1A.2)
prisma/seed.ts                ← datos iniciales de catálogos (se crea en 1A.3)
```

### Dominio reservas
```
lib/bookings/index.ts         ← barrel del módulo (CREADO — placeholder)
lib/bookings/constants.ts     ← estados, roles, enums (se crea en 1A.4)
lib/bookings/types.ts         ← interfaces del dominio (se crea en 1A.4)
lib/bookings/helpers.ts       ← funciones puras (se crea en 1A.4)
```

### Tipos
```
types/bookings.ts             ← tipos transaccionales (CREADO — placeholder)
```

### Componentes del módulo
```
components/bookings/          ← componentes del wizard/forms (fases futuras)
```

---

## Zonas protegidas — NO tocar en esta fase

- Todas las rutas en `app/` excepto `app/reservas/` y `app/admin/`
- `components/layout/`, `components/sections/`, `components/ui/`
- `content/*.ts`
- `lib/utils.ts`, `lib/metadata.ts`, `lib/schema.ts`
- `types/index.ts`
- `styles/globals.css`
- Archivos de configuración raíz (`tailwind.config.ts`, `tsconfig.json`, etc.)

---

## Dependencias externas que se añadirán (microtareas futuras)

| Paquete | Cuándo | Microtarea |
|---------|--------|-----------|
| `prisma` + `@prisma/client` | Al crear el schema | 1A.2 |
| `next-auth` o similar | Al preparar auth | 1A.5 |

---

## Riesgos identificados

1. **No hay base de datos configurada.** Requiere instalar Prisma y conectar una DB antes de 1A.2.
2. **No hay auth.** La ruta `app/admin/` estará sin protección hasta 1A.5. No exponer al público todavía.
3. **`CLIENT_REQUIRED`** marcado en múltiples archivos de `content/` — no bloquea la fase 1A pero se debe resolver antes del lanzamiento.

---

## Archivos creados en esta microtarea

- `lib/bookings/index.ts` — placeholder del módulo de dominio
- `types/bookings.ts` — placeholder de tipos transaccionales
- `docs/roadmap/tasks/fase-1a-task-1-resultado.md` — este archivo
