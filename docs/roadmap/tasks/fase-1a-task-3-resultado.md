# Resultado 1A.3 — Seed base de catálogos y recursos

## Estado: COMPLETADA

---

## Catálogo sembrado

### Services (7)

| slug | name |
|------|------|
| `sala-ensayo` | Sala de Ensayo |
| `grabacion` | Grabación |
| `produccion-musical` | Producción Musical |
| `mezcla-masterizacion` | Mezcla y Masterización |
| `podcast-locucion` | Podcast / Locución |
| `video-session` | Video Session |
| `arreglos-musicales` | Arreglos Musicales |

### ServiceVariants (9)

| slug | name | service |
|------|------|---------|
| `sala-ensayo-flexible` | Flexible | sala-ensayo |
| `sala-ensayo-premium` | Premium | sala-ensayo |
| `sala-ensayo-prioritaria` | Prioritaria | sala-ensayo |
| `grabacion-standard` | Estándar | grabacion |
| `produccion-musical-standard` | Estándar | produccion-musical |
| `mezcla-masterizacion-standard` | Estándar | mezcla-masterizacion |
| `podcast-locucion-standard` | Estándar | podcast-locucion |
| `video-session-standard` | Estándar | video-session |
| `arreglos-musicales-standard` | Estándar | arreglos-musicales |

La variedad de variantes se concentra en `sala-ensayo` (flexible / premium / prioritaria) porque es el servicio con mayor diferenciación operativa. Los demás servicios parten con una sola variante estándar, ampliable sin migración de schema.

### Resources (5)

| slug | name |
|------|------|
| `sala-ensayo-a` | Sala Ensayo A |
| `sala-ensayo-b` | Sala Ensayo B |
| `estudio-grabacion` | Estudio de Grabación |
| `booth-voz` | Booth de Voz |
| `set-video` | Set Video Session |

---

## Criterios de implementación

- **Slugs**: kebab-case, estables, sin caracteres especiales.
- **Idempotencia**: el seed usa `upsert` en todos los registros. Se puede correr múltiples veces sin duplicar datos.
- **Descriptions**: presentes donde aportan contexto para formularios y panel. `null` en variantes genéricas para no inflar datos innecesarios.
- **No se sembraron**: `BookingRequest`, `Approval`, `User`, `AuditLog` — fuera del alcance de 1A.3.

---

## Dependencia de ejecución

El seed necesita `tsx` instalado como devDependency para poder ejecutar TypeScript directamente.
Se añadió `"prisma": { "seed": "tsx prisma/seed.ts" }` en `package.json`.

---

## Archivos creados/editados

- `prisma/seed.ts` — creado (seed base de catálogos)
- `package.json` — editado (añadida entrada `prisma.seed`)
- `docs/roadmap/tasks/fase-1a-task-3-resultado.md` — creado (este archivo)

## Archivos no tocados

- `prisma/schema.prisma` — sin cambios
- `prisma.config.ts` — sin cambios
- `lib/bookings/` — no tocado (1A.4)
- `types/bookings.ts` — no tocado (1A.4)
- Todas las rutas en `app/`
- Todos los archivos de contenido, estilos y configuración global

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Acción |
|---|-------------------|--------|
| 1 | `tsx` no está instalado como devDependency. Sin él, `pnpm prisma db seed` fallará. | `pnpm add -D tsx` |
| 2 | El cliente Prisma debe estar generado antes de ejecutar el seed. Si no, `@prisma/client` no resolverá los tipos. | `pnpm prisma generate` |
| 3 | Las migraciones deben estar aplicadas antes del seed. Las tablas deben existir en la base de datos. | `pnpm prisma migrate dev` (si no se hizo antes) |
| 4 | `sala-ensayo` tiene 3 variantes específicas. Si en fases futuras se quiere añadir variantes a otros servicios (ej: grabación premium), se añaden al seed sin cambio de schema. | Sin acción inmediata |
| 5 | `publicCode` es requerido en `BookingRequest` pero no hay seed de solicitudes — eso es correcto. La lógica de generación de `publicCode` se implementa en 1B. | 1B |

---

## Comandos a ejecutar fuera de Claude (en orden)

```bash
# 1. Instalar tsx (si no está instalado)
pnpm add -D tsx

# 2. Generar el cliente Prisma (si no se hizo después de la última migración)
pnpm prisma generate

# 3. Aplicar migraciones (si no están aplicadas)
pnpm prisma migrate dev --name init_reservas

# 4. Ejecutar el seed
pnpm prisma db seed

# 5. Verificar que el build no se rompe
pnpm build
```
