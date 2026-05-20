---
type: sprint-doc
sprint: "S-UX-02"
nombre: "Marketplace UI + Plataforma de Notificaciones (Correo y WhatsApp)"
track: "T5 — UI/UX + T1B — Marketplace Optimización"
owner: "Jean + Manuel"
estado: "activo"
origen: "Reunión 2026-05-20 14:57 UTC"
tags: ["#sprint", "#marketplace", "#ui", "#notificaciones", "#email", "#whatsapp", "#activo"]
nota: "El S-UX-02 original (UI Inmersiva Phase 2 + Refac Global) fue CERRADO 2026-05-15. Este es un nuevo sprint con el mismo ID por decisión del product owner."
---

# S-UX-02 — Marketplace UI + Plataforma de Notificaciones

> **Origen:** Reunión 20 May 2026 14:57 UTC. Prueba de compra en vivo exitosa. Prioridad: correcciones UI móvil, sistema de notificaciones multicanal (correo + WhatsApp), y ajustes de panel.

## Datos del Sprint

| Campo | Valor |
|-------|-------|
| **Owner Jean** | 👤 Jean (UI frontend — 3 tareas) |
| **Owner Manuel** | 👤 Manuel (backend, infra, admin — 15 tareas) |
| **Tipo** | 🔧 TÉCNICO |
| **Zona Jean** | `components/layout/Navbar.tsx`, `app/page.tsx` |
| **Zona Manuel** | `lib/email/`, `lib/whatsapp/`, `components/marketplace/`, `app/admin/` |
| **Branch Jean** | A definir por Jean |
| **Branch Manuel** | `Manuel/s-ux-02-notificaciones-2026-05-20` |
| **Base** | `RAMA MADRE` |
| **Depende de** | S-MP-08 (notificaciones marketplace base) |

---

## Tareas — Jean (3)

### Bloque Jean: UI Frontend Móvil

**J-T1 — Navbar: corregir recorte de "Turpial Marketplace" en móvil**
- En viewport 375×812, el texto "Turpial Marketplace" debe verse completo sin truncar con "...".
- Ajustar `font-size`, `max-width` del contenedor o usar `text-overflow: ellipsis` con tooltip alternativo.
- Zona: `components/layout/Navbar.tsx`.

**J-T2 — Botón "Unirse": corregir alineación/desborde en móvil**
- El botón "Unirse" no debe causar overflow-x (scroll horizontal) en viewport móvil.
- Correctamente alineado y visible sin desbordar el contenedor padre.
- Zona: `components/layout/Navbar.tsx`.

**J-T3 — Home: 4 tarjetas principales cliqueables**
- Las 4 tarjetas principales del home (Compradores, Vendedores, Servicios, Drop Social) son cliqueables.
- Cada una redirige a su sección correspondiente.
- Cursor `pointer` en hover. Efecto visual de interactividad (shadow/hover state).
- Zona: `app/page.tsx`, `components/home/`.
- Redirecciones esperadas:
  - Compradores → `/marketplace`
  - Vendedores → `/marketplace/sell`
  - Servicios → `/turpial-zone`
  - Drop Social → `/marketplace?tab=referrals`

---

## Tareas — Manuel (15)

### Bloque 1: Home y Navegación

**M-T1 — Toggle vista grid ↔ lista horizontal en buscador home**
- Agregar un toggle/switch en el buscador del home que alterne entre vista grid (cards) y lista horizontal (filas con: imagen miniatura, título, precio, descripción breve).
- Persistir preferencia en `localStorage`.
- Zona: `components/marketplace/MarketplacePageClient.tsx`.

**M-T2 — Sección informativa Drop Social en Turpial Zone y Marketplace**
- Crear sección dedicada que explique: qué es Drop Social, cómo funciona (link único de referido), beneficios (0.5% comisión por venta).
- Visible en `/turpial-zone` y `/marketplace`.
- Incluye CTA: "Generar mi link de referido".
- Zona: `components/marketplace/DropSocialInfo.tsx`.

**M-T3 — Menú: opción "Volver a Turpial Zone" desde Marketplace**
- El menú principal del Marketplace incluye ítem "Turpial Zone" que navega a `/turpial-zone`.
- El logo del Marketplace redirige al home del Marketplace (`/marketplace`), NO a Turpial Zone.
- Zona: `components/layout/Navbar.tsx`, `components/layout/`

**M-T4 — Footer: reemplazar footer Turpial Zone por footer Marketplace**
- En todas las rutas `/marketplace/*`, el footer debe ser específico del Marketplace.
- Incluye links a: categorías, vender, ayuda/soporte, términos.
- No debe mostrar links de Turpial Zone (Reservas, Salas, etc.).
- Zona: `components/layout/Footer.tsx`.

### Bloque 2: Correcciones de Layout y Estilo

**M-T5 — Corregir desbordes horizontales en FAQ/Preguntas marketplace**
- La sección de FAQ sobre el uso del marketplace no debe causar overflow-x (scroll horizontal) en ningún breakpoint.
- Verificar en 375px, 768px, 1024px, 1920px.
- Zona: `components/marketplace/MarketplaceFAQ.tsx`, `app/marketplace/`.

**M-T6 — Optimizar tamaño de insignias de usuario en navbar móvil**
- Badges de notificaciones y mensajes en navbar móvil con tamaño proporcional al viewport.
- No deben solaparse con otros elementos ni requerir zoom para ser legibles.
- Zona: `components/layout/Navbar.tsx`.

**M-T7 — Vista previa de fotos al crear publicación en móvil**
- Al seleccionar imágenes en el formulario de publicación desde móvil, mostrar miniaturas/preview de cada imagen antes de publicar.
- No solo el nombre del archivo; el usuario debe ver qué imágenes subió.
- Zona: `components/marketplace/MarketplaceModals.tsx`, `app/marketplace/publish/`.

### Bloque 3: Panel de Usuario y Notificaciones In-App

**M-T8 — Panel: mensajes de usuario colapsados por defecto**
- Las conversaciones en el panel de mensajes aparecen colapsadas (solo preview del último mensaje).
- El usuario expande manualmente la conversación que desea leer.
- Zona: `components/marketplace/dashboard/DashboardClient.tsx`.

**M-T9 — Iconos de mensajes sin leer cliqueables**
- Cada badge/ícono de "mensaje sin leer" es un `<Link>` que redirige directamente a la conversación correspondiente.
- No solo al panel general de mensajes, sino al mensaje/tema específico.
- Zona: `components/layout/Navbar.tsx`, `components/marketplace/dashboard/`.

### Bloque 4: Infraestructura de Notificaciones

**M-T10 — Configurar sistema de correos transaccionales**
- Crear `lib/email/` con templates HTML para:
  - Recuperación de contraseña (reset password link)
  - Confirmación de compra (buyer)
  - Notificación de nueva venta (seller)
  - Confirmación de pago recibido
  - Notificación de comisión generada (referido)
  - Notificación de liberación de fondos (payout)
- Cada email usa diseño visual con identidad Turpial Sound (logo, colores, tipografía).
- Integrar con provider de envío (Resend, SendGrid, o SMTP).
- Zona: `lib/email/`, configuración en env vars.

**M-T11 — Notificaciones WhatsApp: integración backend**
- Extender `lib/whatsapp/` para cubrir:
  - Verificación de número (OTP vía WhatsApp)
  - Notificación de nueva venta al seller
  - Notificación de pago recibido al buyer
  - Notificación de disputa abierta
  - Notificación de fondos liberados
- Cada mensaje incluye: monto, referencia de transacción, link directo a la acción en plataforma.
- Zona: `lib/whatsapp/`, `lib/whatsapp/booking-notifications.ts`.

### Bloque 5: Panel Vendedor y Transacciones

**M-T12 — Panel vendedor: eliminar "Pago manual" y corregir desbordes**
- El panel de cobros del vendedor NO muestra texto "Pago manual".
- Estados de pago con terminología profesional: "Pago en revisión", "Pago procesado", "Fondos liberados".
- Los chips/badges de estado no se desbordan horizontalmente del contenedor.
- Zona: `components/marketplace/dashboard/DashboardClient.tsx`.

**M-T13 — Revisar lógica de estados de transacción**
- Una transacción NO debe marcarse como "finalizada" hasta que ambas partes confirmen:
  1. Comprador confirma recepción → estado: `RECEIVED`
  2. Vendedor/Admin confirma entrega → estado: `COMPLETED`
- Si el sistema reporta "finalizada" sin confirmación real, corregir la máquina de estados.
- Zona: `lib/marketplace/transactions.ts`, `actions/marketplace/`.

### Bloque 6: Análisis y Coordinación

**M-T14 — Enviar captura del modal de confirmación de recibido a Jean**
- Tomar screenshot del modal de confirmación de recibido (vista comprador).
- Guardar en `var/screenshots/modal-confirmacion-recibido.png`.
- Enviar a Jean por WhatsApp.
- Jean confirma recepción.
- Zona: manual, coordinación.

**M-T15 — Análisis de costos operativos/fiscales para exención de comisiones**
- Crear documento `docs/negocio/ANALISIS_COSTOS_COMISIONES.md` con:
  1. Costos fijos mensuales (Vercel, DB, APIs, infraestructura)
  2. Carga fiscal estimada (IVA, ISLR, impuestos municipales)
  3. Proyección de ingresos por comisiones (escenarios: 10, 50, 100 transacciones/mes)
  4. Escenario con exención de comisiones 15 días (costo de oportunidad)
  5. Recomendación final: go / no-go con justificación
- Zona: `docs/negocio/`.

---

## Criterios de Aceptación (100% CERRADO)

### Jean — UI Frontend (3 criterios)
- [ ] **S-UX-02-J01** "Turpial Marketplace" visible completo en navbar móvil (375px) sin truncar. → **👤 MANUAL**
- [ ] **S-UX-02-J02** Botón "Unirse" alineado, sin overflow-x en viewport ≤ 768px. → **👤 MANUAL**
- [ ] **S-UX-02-J03** 4 cards del home cliqueables, cursor pointer, redirigen a ruta correcta. → **👤 MANUAL**

### Manuel — Home y Navegación (4 criterios)
- [ ] **S-UX-02-M01** Toggle grid/lista funcional, preferencia persiste en localStorage. → **🔧 E2E** (`s-ux-02-toggle.spec.mjs`)
- [ ] **S-UX-02-M02** Sección Drop Social visible en `/turpial-zone` y `/marketplace` con CTA funcional. → **🔧 E2E** (`s-ux-02-dropsocial-section.spec.mjs`)
- [ ] **S-UX-02-M03** Menú muestra "Turpial Zone", navega a `/turpial-zone`. Logo marketplace NO redirige a Turpial Zone. → **👤 MANUAL**
- [ ] **S-UX-02-M04** Footer en `/marketplace/*` es específico de Marketplace, sin links de Turpial Zone. → **👤 MANUAL**

### Manuel — Layout y Estilo (3 criterios)
- [ ] **S-UX-02-M05** FAQ sin overflow-x en 375px, 768px, 1024px, 1920px. → **🔧 E2E** (`s-ux-02-layout.spec.mjs`)
- [ ] **S-UX-02-M06** Badges notificaciones/mensajes tamaño legible y no solapados en móvil. → **👤 MANUAL**
- [ ] **S-UX-02-M07** Preview de imágenes visible en formulario de publicación en móvil. → **🔧 E2E** (`s-ux-02-publish-preview.spec.mjs`)

### Manuel — Panel y Notificaciones In-App (2 criterios)
- [ ] **S-UX-02-M08** Conversaciones colapsadas por defecto, expanden con clic. → **🔧 E2E** (`s-ux-02-messages.spec.mjs`)
- [ ] **S-UX-02-M09** Badge mensaje no leído cliqueable → redirige a conversación específica. → **🔧 E2E** (`s-ux-02-messages.spec.mjs`)

### Manuel — Infraestructura Notificaciones (2 criterios)
- [ ] **S-UX-02-M10** 6 tipos de email transaccional funcionales, diseño Turpial Sound, links correctos. → **🔧 SERVER** (`qa-s-ux-02-email.mjs`) + **👤 MANUAL** (recibir emails reales)
- [ ] **S-UX-02-M11** 5 tipos de mensaje WhatsApp disparados correctamente, incluyen datos de TX y link. → **🔧 SERVER** (`qa-s-ux-02-whatsapp.mjs`) + **👤 MANUAL** (recibir WhatsApp real)

### Manuel — Panel Vendedor y Transacciones (2 criterios)
- [ ] **S-UX-02-M12** Sin texto "Pago manual" en panel vendedor. Chips sin desborde. Terminología profesional. → **👤 MANUAL**
- [ ] **S-UX-02-M13** TX no finaliza hasta doble confirmación (comprador + vendedor/admin). Estados: RECEIVED → COMPLETED. → **🔧 SERVER** (`qa-s-ux-02-tx-states.mjs`)

### Manuel — Análisis y Coordinación (2 criterios)
- [ ] **S-UX-02-M14** Screenshot guardado + enviado a Jean + Jean confirma. → **👤 MANUAL**
- [ ] **S-UX-02-M15** Documento `ANALISIS_COSTOS_COMISIONES.md` con 5 secciones + recomendación. → **👤 MANUAL** (revisión de contenido)

### Metodológicos (3 criterios)
- [ ] **S-UX-02-M16** `npx tsc --noEmit` limpio + `pnpm build` exitoso
- [ ] **S-UX-02-M17** Documentación actualizada en `PLAN_MAESTRO_SPRINTS.md`
- [ ] **S-UX-02-M18** Cierre con `close-sprint.mjs`

---

## Scripts de Prueba

| Tipo | Script | Qué verifica |
|------|--------|-------------|
| E2E | `scripts/qa/playwright/s-ux-02-toggle.spec.mjs` | Toggle grid/lista, persistencia localStorage |
| E2E | `scripts/qa/playwright/s-ux-02-dropsocial-section.spec.mjs` | Sección Drop Social visible con CTA |
| E2E | `scripts/qa/playwright/s-ux-02-layout.spec.mjs` | FAQ sin overflow-x en 4 breakpoints |
| E2E | `scripts/qa/playwright/s-ux-02-publish-preview.spec.mjs` | Preview de imágenes en formulario mobile |
| E2E | `scripts/qa/playwright/s-ux-02-messages.spec.mjs` | Mensajes colapsados + badge cliqueable |
| Server | `scripts/qa/modules/qa-s-ux-02-email.mjs` | Disparo de 6 tipos de email transaccional |
| Server | `scripts/qa/modules/qa-s-ux-02-whatsapp.mjs` | Disparo de 5 tipos de mensaje WhatsApp |
| Server | `scripts/qa/modules/qa-s-ux-02-tx-states.mjs` | Máquina de estados TX: RECEIVED → COMPLETED |

> Scripts E2E usan `login.mjs` (loginViaMarketplaceModal). Server-side usan `db-read.mjs`. Resultados en `var/qa-results/s-ux-02/`.

---

## Inventario de Verificaciones

| Tipo | Cantidad |
|------|----------|
| 🔧 E2E (Playwright) | 5 |
| 🔧 Server | 3 |
| 👤 Manual | 10 |
| 📋 Metodológico | 3 |
| **Total** | **21** |

| Owner | Automatizadas | Manuales | Total |
|-------|-------------|----------|-------|
| Jean | 0 | 3 | **3** |
| Manuel | 8 | 7 | **15** |

---

**Cierre:** ✅ S-UX-02 CERRADO cuando 21/21 criterios = PASS. 8 automatizados + 10 manuales + 3 metodológicos.
