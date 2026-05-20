# Resultado 1B.3 — Paso 3 del wizard: fecha y bloque horario

## Estado: COMPLETADA

---

## Objetivo de la tarea

Implementar el paso 3 del wizard público (fecha y bloque horario), reemplazando el placeholder con un step funcional que capture `eventDate`, `startTime` y `durationMinutes` en estado local.

---

## Archivos creados/editados

| Archivo | Acción |
|---------|--------|
| `components/bookings/steps/DateTimeStep.tsx` | Creado — paso 3: fecha, hora inicio, duración, hora fin derivada |
| `components/bookings/BookingWizard.tsx` | Editado — import, WizardData, canProceed, render del paso 3 |
| `docs/roadmap/tasks/fase-1b-task-3-resultado.md` | Creado — este archivo |

---

## Qué se hizo exactamente

### `components/bookings/steps/DateTimeStep.tsx`

Nuevo step funcional con tres campos de entrada:

| Campo | Tipo de input | Notas |
|-------|--------------|-------|
| Fecha | `input type="date"` | `min` = hoy en hora local. Valor nulo si el usuario borra la selección. |
| Hora de inicio | `select` | 13 opciones de 08:00 a 20:00 en intervalos de 1 hora. |
| Duración | `select` | 4 opciones discretas: 60, 90, 120, 180 min con labels en español. |

**Hora de fin derivada:** `deriveEndTime(startTime, durationMinutes)` — función pura exportada, sin IO. Calcula `endTime = (h*60 + m + duration) % 1440` y lo formatea como HH:MM.

**Resumen del bloque:** cuando los tres campos están completos, aparece un bloque visual (borde dorado/fondo sutil) que muestra `YYYY-MM-DD · HH:MM – HH:MM` y el label de duración. Se oculta si algún campo falta.

**Feedback visual:** el borde del input/select cambia de `border-brand-border` a `border-accent-gold/50` cuando el campo tiene valor, sin requerir estado extra.

**Props interface:**
```ts
interface DateTimeStepProps {
  eventDate: string | null
  startTime: string | null
  durationMinutes: number | null
  onDateChange: (value: string | null) => void
  onStartTimeChange: (value: string | null) => void
  onDurationChange: (value: number | null) => void
}
```

Patrón coherente con `ServiceSelectStep` y `VariantSelectStep` (callbacks independientes por campo).

### `components/bookings/BookingWizard.tsx`

Cuatro cambios:

1. **Import** de `DateTimeStep` añadido.

2. **`WizardData`** — tres nuevos campos:
   ```ts
   eventDate: string | null       // "YYYY-MM-DD"
   startTime: string | null       // "HH:MM"
   durationMinutes: number | null
   ```

3. **`canProceed`** — extendido al paso 2 (índice):
   ```ts
   currentStep === 2 ? data.eventDate !== null && data.startTime !== null && data.durationMinutes !== null
   ```
   El botón "Continuar" permanece deshabilitado hasta que los tres campos tengan valor.

4. **Render** — paso 2 (`currentStep === 2`) renderiza `DateTimeStep`. El placeholder pasa a mostrarse solo para `currentStep > 2`.

---

## Decisiones tomadas

1. **Sin datepicker de terceros.** `input type="date"` nativo. Más ligero, sin dependencias, compatible con todos los navegadores modernos.

2. **Horas discretas, no libre.** El `select` de hora inicio evita entradas inválidas y simplifica la lógica de validación. Las opciones cubren un rango laboral razonable (08:00–20:00).

3. **Duración como opciones fijas.** 60 / 90 / 120 / 180 min son los bloques operativos típicos. Si en fases futuras se necesitan bloques personalizados, se añade al select sin cambio de arquitectura.

4. **`deriveEndTime` es puro y exportado.** Puede usarse desde el paso de resumen (paso 5) cuando se implemente, sin duplicar la lógica.

5. **No se almacena `endTimeDisplay` en el estado del wizard.** Es siempre derivable de `startTime + durationMinutes`. Almacenarla duplicaría la fuente de verdad.

6. **Sin reset de fecha/hora al cambiar servicio o variante.** El usuario puede volver atrás y cambiar servicio sin perder la fecha elegida. La fecha es independiente del servicio seleccionado.

---

## Qué no se tocó

- `prisma/schema.prisma` — sin cambios
- `prisma/seed.ts` — sin cambios
- `middleware.ts` — sin cambios
- `app/admin/page.tsx` — sin cambios
- `lib/bookings/` (constants, types, helpers, catalog, index) — sin cambios
- `lib/auth/` — sin cambios
- `app/reservas/page.tsx` — sin cambios
- `components/bookings/BookingProcessSteps.tsx` — sin cambios
- `components/bookings/steps/ServiceSelectStep.tsx` — sin cambios
- `components/bookings/steps/VariantSelectStep.tsx` — sin cambios
- Todos los archivos de contenido, estilos globales y configuración

---

## Riesgos y pendientes

| # | Riesgo / Pendiente | Fase |
|---|-------------------|------|
| 1 | `getTodayISO()` usa `new Date()` en hora local del cliente. Si el servidor renderiza con UTC distinto al cliente, puede haber discrepancia leve en el `min` del date picker. Aceptable para esta fase. | sin acción inmediata |
| 2 | El último slot permitido es 20:00. Con 180 min de duración, la hora fin sería 23:00 — dentro de rango. Si en el futuro se añaden slots más tardíos, revisar que la suma no cruce medianoche visualmente. | futuro si aplica |
| 3 | La fecha se almacena como string ISO `"YYYY-MM-DD"`. Al persistir en DB, el API Route deberá convertirlo a `Date` antes del INSERT. Sin acción en esta fase. | 1B.x (persistencia) |
| 4 | No hay validación de solapamiento de recursos ni de disponibilidad real. Eso es explícitamente fuera del alcance de esta microtarea. | 1B.x o posterior |
| 5 | El paso 3 no resetea si el usuario vuelve y cambia servicio. Es la decisión correcta (la fecha no depende del servicio), pero si operaciones necesita resetear la fecha al cambiar servicio, se añade entonces. | decisión del equipo |
| 6 | `WizardData` tiene 5 campos. Al implementar pasos 4 (extras) y 5 (contacto) se añadirán más — sin cambio de arquitectura. | 1B.x |

---

## Comandos a ejecutar fuera de Claude

```bash
# Verificar que TypeScript no reporta errores
pnpm build

# Verificar que no hay problemas de lint
pnpm lint
```

No aplican comandos de Prisma en esta microtarea (no se tocó el schema ni el seed).
