# Resultado — Corrección de configuración Prisma (prisma.config.ts)

## Estado: COMPLETADA

---

## Qué cambió y por qué

### Problema

`pnpm prisma validate` fallaba porque Prisma 6+ separa la URL de conexión del schema.
La propiedad `url = env("DATABASE_URL")` dentro del bloque `datasource db` ya no es válida
en el formato de configuración actual: debe moverse a `prisma.config.ts`.

### Cambios realizados

**`prisma/schema.prisma`** — editado

Eliminada la línea `url = env("DATABASE_URL")` del bloque `datasource db`.
El bloque queda solo con `provider = "postgresql"`.

```prisma
// antes
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// después
datasource db {
  provider = "postgresql"
}
```

**`prisma.config.ts`** — creado en la raíz del proyecto

```typescript
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

- `dotenv/config` carga `.env` antes de que Prisma lea las variables de entorno.
- `defineConfig` y `env` provienen de `prisma/config` (subpath export de Prisma 6+).
- `earlyAccess: true` es requerido por Prisma 6 para habilitar el nuevo sistema de configuración.
- `schema` y `migrations.path` apuntan a las rutas existentes del proyecto.
- `datasource.url` usa el helper `env("DATABASE_URL")` de Prisma, equivalente al `env()` del schema pero ahora en la capa de configuración.

---

## Qué no se tocó

- Entidades, enums y relaciones del schema — sin cambios
- `package.json` — sin cambios
- `.env` — sin cambios
- Rutas en `app/` — no tocadas
- `lib/bookings/` — no tocado
- `types/bookings.ts` — no tocado
- Archivos de seed — no existen todavía

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Acción |
|---|-------------------|--------|
| 1 | `dotenv` debe estar instalado como dependencia. Si no lo está, `prisma.config.ts` no podrá cargar `.env`. | `pnpm add dotenv` |
| 2 | `prisma/config` es un subpath export de Prisma 6+. Si la versión instalada es < 6, este import fallará. | Verificar con `pnpm prisma --version` |
| 3 | `earlyAccess: true` es necesario en Prisma 6. En versiones futuras puede volverse innecesario o cambiar de nombre. | Sin acción inmediata |
| 4 | `.env` con `DATABASE_URL` debe existir antes de ejecutar migraciones. | Crear manualmente si no existe |

---

## Comandos a ejecutar fuera de Claude

```bash
# Instalar dotenv si no está presente
pnpm add dotenv

# Validar que el schema y la config son correctos
pnpm prisma validate

# Formatear el schema (opcional)
pnpm prisma format

# Crear la migración inicial (si aún no existe)
pnpm prisma migrate dev --name init_reservas

# Verificar que el build no se rompe
pnpm build
```
