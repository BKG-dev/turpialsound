---
type: sprint-doc
sprint: "S-BOOKING-01"
nombre: "Ajustes Reserva — Correcciones Mobile, WhatsApp y Dashboard Admin"
track: "T2 — Plataforma Booking"
owner: "Jean"
estado: "activo"
origen: "Reunión 2026-05-20 13:49 UTC"
tags: ["#sprint", "#booking", "#mobile", "#dashboard", "#whatsapp", "#activo"]
---

# S-BOOKING-01 — Ajustes Reserva

> **Origen:** Reunión 20 May 2026 13:49 UTC. Sistema Reserva aprobado al 99% para producción. Quedan ajustes finales de UI móvil, integración WhatsApp y dashboard admin.

## Datos del Sprint

| Campo | Valor |
|-------|-------|
| **Owner** | 👤 Jean |
| **Tipo** | 🔧 TÉCNICO |
| **Zona** | `/reservas`, `components/booking/`, `lib/whatsapp/`, dashboard admin |
| **Branch** | A definir por Jean |
| **Base** | `RAMA MADRE` |
| **Depende de** | S-JB-04 (protocolo reseñas cerrado) |

---

## Tareas

### Bloque 1 — Mobile UX

**B1-T1 — Eliminar footer en móvil durante reserva**
- El footer de la plataforma debe desaparecer al entrar al wizard de reserva en viewport ≤ 768px.
- Debe reaparecer al completar o cancelar la reserva.
- Zona: `components/layout/Footer.tsx`, `app/reservas/`.

**B1-T2 — Auto-scroll al header del wizard**
- Al avanzar a cualquier paso del wizard (clic en "Siguiente"), el viewport debe hacer scroll suave al top del modal.
- No debe requerir scroll manual del usuario.
- Zona: `components/booking/BookingWizard.tsx`.

**B1-T3 — Ventana flotante long-press en botones de selección**
- Mantener presionado (>1s) un botón de selección de modalidad muestra un tooltip/popover con descripción completa del servicio.
- Se cierra al soltar o hacer tap fuera.
- Funciona en mobile (touch long-press) y desktop (click+hold).
- Zona: `components/booking/`.

**B1-T4 — Corregir color del rango intermedio en calendario**
- Al seleccionar rango de horas (ej. 10:00–14:00), todas las celdas intermedias (11:00, 12:00, 13:00) comparten el mismo color de fondo que inicio/fin.
- Zona: `components/booking/CalendarPicker.tsx`.

**B1-T5 — Corregir caracteres extraños en texto de fechas**
- El bloque "Solicitado" en el resumen de reserva muestra formato: "DD de mes de YYYY, HH:MM – HH:MM".
- Sin caracteres de escape (`\n`, `\r`, `&nbsp;`, etc.).
- Zona: `components/booking/BookingSummary.tsx`.

**B1-T6 — Traducir "choose file" → "Seleccionar archivo"**
- Label del input file en español: "Seleccionar archivo".
- Ícono estándar de upload (lucide `Upload` o equivalente).
- Zona: `components/booking/PaymentProofUpload.tsx`.

### Bloque 2 — Integración WhatsApp

**B2-T1 — Reparar enlace WhatsApp: abrir app nativa en móvil**
- En dispositivo móvil, el botón de pago usa `whatsapp://send` o `intent://send` para abrir la app nativa.
- En desktop, mantiene WhatsApp Web como fallback.
- Detectar user-agent para decidir el protocolo.
- Zona: `lib/whatsapp/`, `components/booking/`.

**B2-T2 — Ventana de espera anti doble clic (30-60s)**
- Tras clic en "Enviar a WhatsApp", el botón se deshabilita y muestra overlay con spinner y texto "Enviando...".
- Duración: 30-60 segundos. Pasado el tiempo, el botón vuelve a estado normal.
- Previene envíos duplicados.
- Zona: `components/booking/`.

### Bloque 3 — Dashboard Admin

**B3-T1 — Tarjetas "Pagos por revisar" cliqueables**
- Las tarjetas/KPI de "Pagos por revisar" en el dashboard admin son cliqueables.
- Cada una navega directamente a la vista de gestión del pago (`/admin/reservas/pagos/[id]`).
- Zona: `components/admin/DashboardAdmin.tsx`.

**B3-T2 — Añadir símbolo $ a montos de ingresos**
- Todo monto numérico en el dashboard admin (ingresos, totales, comisiones) muestra: `$X,XXX.XX`.
- Zona: `components/admin/DashboardAdmin.tsx`.

**B3-T3 — Eliminar icono de WhatsApp del admin**
- Ninguna vista del panel de administración (`/admin/*`) muestra íconos o botones de WhatsApp.
- Zona: `components/admin/`.

**B3-T4 — Limpiar datos de prueba de la DB**
- Eliminar reservas mock/ficticias. Solo conservar datos reales de clientes.
- Ejecutar script o query que verifique `SELECT count(*) FROM Booking WHERE notas ILIKE '%test%' OR notas ILIKE '%prueba%'`.
- Zona: DB, `scripts/qa/`.

### Bloque 4 — Configuración

**B4-T1 — Completar cuestionario de asignación de salas**
- Todas las salas (`Room`) deben tener `assignmentConfig` poblado (no NULL).
- Incluye: instrumentos disponibles, capacidad máxima, tipo de servicio habilitado.
- Verificar: `SELECT count(*) FROM Room WHERE assignmentConfig IS NULL` = 0.
- Zona: DB (vía panel admin o script).

---

## Criterios de Aceptación (100% CERRADO)

### Bloque 1 — Mobile UX
- [ ] **S-BOOKING-01-01** Footer NO visible en `/reservas/*` con viewport ≤ 768px. Reaparece al salir del wizard. → **👤 MANUAL** (responsive mode 375×812 + 768×1024)
- [ ] **S-BOOKING-01-02** Cada "Siguiente" en el wizard → scroll automático al header del modal. → **👤 MANUAL**
- [ ] **S-BOOKING-01-03** Long-press >1s en botón de modalidad → tooltip con descripción completa visible. → **👤 MANUAL** (mobile touch + desktop click-hold)
- [ ] **S-BOOKING-01-04** Rango horario en calendario: celdas intermedias con mismo color que inicio/fin. → **👤 MANUAL**
- [ ] **S-BOOKING-01-05** Texto "Solicitado" sin caracteres de escape, formato legible. → **👤 MANUAL**
- [ ] **S-BOOKING-01-06** Label "Seleccionar archivo" con ícono upload visible. → **👤 MANUAL**

### Bloque 2 — WhatsApp
- [ ] **S-BOOKING-01-07** Botón de pago en móvil → abre app nativa de WhatsApp (no WhatsApp Web). → **👤 MANUAL** (dispositivo real)
- [ ] **S-BOOKING-01-08** Clic en "Enviar a WhatsApp" → botón disabled + spinner 30-60s → sin doble envío posible. → **👤 MANUAL**

### Bloque 3 — Dashboard Admin
- [ ] **S-BOOKING-01-09** Card "Pagos por revisar" cliqueable → navega a detalle del pago. → **👤 MANUAL** (login admin)
- [ ] **S-BOOKING-01-10** Montos con prefijo `$` en dashboard admin. → **👤 MANUAL**
- [ ] **S-BOOKING-01-11** Sin iconos/botones WhatsApp en `/admin/*`. → **👤 MANUAL**

### Bloque 4 — Configuración
- [ ] **S-BOOKING-01-12** DB sin reservas de prueba (`notas ILIKE '%test%'` = 0). → **🔧 SERVER** (`scripts/qa/modules/qa-s-booking-01-db-clean.mjs`)
- [ ] **S-BOOKING-01-13** 100% de salas con `assignmentConfig` poblado. → **🔧 SERVER** (`scripts/qa/modules/qa-s-booking-01-rooms.mjs`)

### Metodológicos
- [ ] **S-BOOKING-01-14** `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [ ] **S-BOOKING-01-15** Documentación actualizada en `PLAN_MAESTRO_SPRINTS.md`
- [ ] **S-BOOKING-01-16** Cierre con `close-sprint.mjs`

---

## Scripts de Prueba

| Tipo | Script | Qué verifica |
|------|--------|-------------|
| Server | `scripts/qa/modules/qa-s-booking-01-db-clean.mjs` | DB sin datos de prueba, solo reservas reales |
| Server | `scripts/qa/modules/qa-s-booking-01-rooms.mjs` | `Room.assignmentConfig` != NULL en todas las salas |

> No se requieren scripts Playwright para este sprint. Todas las verificaciones de UI son manuales por la naturaleza visual de los cambios (colores, tooltips, alineación, scroll).

---

## Inventario de Verificaciones

| Tipo | Cantidad |
|------|----------|
| 👤 Manual | 11 |
| 🔧 Server | 2 |
| 📋 Metodológico | 3 |
| **Total** | **16** |

---

**Cierre:** ✅ S-BOOKING-01 CERRADO cuando 16/16 criterios = PASS. 11 manuales + 2 server + 3 metodológicos.
