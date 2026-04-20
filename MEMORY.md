# Turpial Sound Project Memory Map

Este documento resume el estado actual del proyecto Turpial Sound, basado en el análisis de la estructura de directorios y el esquema de la base de datos.
El proyecto se divide en dos grandes áreas: el Frente Público (Turpial Sound Studio) y el Marketplace.

## Frente Público (Turpial Sound Studio)

### Estado Actual:
*   **Páginas Funcionales:** Implementación robusta de páginas informativas clave, incluyendo:
    *   `/artistas`: Sección dedicada a los artistas.
    *   `/contacto`: Formulario y detalles de contacto.
    *   `/estudio-de-grabacion`, `/salas-de-ensayo`: Páginas detalladas para los servicios de estudio y salas de ensayo.
    *   `/nosotros`: Información sobre la empresa.
    *   `/servicios`: Landing page con sub-páginas para servicios específicos (`/arreglos-musicales`, `/mezcla-masterizacion`, `/podcast-locucion`, `/video-session`).
    *   `/produccion-musical`: Página dedicada a la producción musical.
    *   Páginas complementarias como `/politica-de-privacidad`, `/recursos`, `/recursos/preguntas-frecuentes`.
*   **Componentes de UI y UX:**
    *   **Generales:** [`Button`](components/ui/Button.tsx), [`AnimatedHeading`](components/ui/AnimatedHeading.tsx), [`FlipCounter`](components/ui/FlipCounter.tsx), [`NuminousPersonCard`](components/ui/NuminousPersonCard.tsx), [`NuminousServiceCard`](components/ui/NuminousServiceCard.tsx), [`StatsBar`](components/ui/StatsBar.tsx), [`TiltCard`](components/ui/TiltCard.tsx), [`WhatsAppButton`](components/ui/WhatsAppButton.tsx) para interacción y visualización de datos.
    *   **Secciones:** [`ContactBlock`](components/sections/ContactBlock.tsx), [`CTASection`](components/sections/CTASection.tsx), [`FAQList`](components/sections/FAQList.tsx), [`NuminousHero`](components/sections/NuminousHero.tsx), [`PageHero`](components/sections/PageHero.tsx), [`SectionShell`](components/sections/SectionShell.tsx) para organizar contenido.
    *   **Media Avanzada:** [`AudioVisualizerFrequency`](components/media/AudioVisualizerFrequency.tsx), [`AudioVisualizerPlasma`](components/media/AudioVisualizerPlasma.tsx), [`AudioVisualizerWaterfall3D`](components/media/AudioVisualizerWaterfall3D.tsx), [`CinematicVideo`](components/media/CinematicVideo.tsx), [`FluidCurveScrollImg`](components/media/FluidCurveScrollImg.tsx), [`Lightbox`](components/media/Lightbox.tsx), [`LogoGlb`](components/media/LogoGlb.tsx), [`Mac3DGallery`](components/media/Mac3DGallery.tsx), [`SocialVideoPlayer`](components/media/SocialVideoPlayer.tsx) para experiencias multimedia interactivas.
    *   **Layout:** [`AnimatedLogo`](components/layout/AnimatedLogo.tsx), [`AnimatedNavLinks`](components/layout/AnimatedNavLinks.tsx), [`MapEmbed`](components/layout/MapEmbed.tsx), [`MobileMenu`](components/layout/MobileMenu.tsx), [`SiteFooter`](components/layout/SiteFooter.tsx), [`SiteHeader`](components/layout/SiteHeader.tsx) para la estructura general del sitio.
    *   **Efectos:** [`BokehCanvas`](components/effects/BokehCanvas.tsx), [`ParticleCanvas`](components/effects/ParticleCanvas.tsx) para agregar dinamismo visual.
*   **Sistema de Reservas (Prisma):**
    *   **Modelos:** [`BookingRequest`](prisma/schema.prisma:146) para solicitudes de reservas, [`Service`](prisma/schema.prisma:76), [`ServiceVariant`](prisma/schema.prisma:90), [`Resource`](prisma/schema.prisma:107) para catálogos, [`User`](prisma/schema.prisma:127) para usuarios internos, [`Approval`](prisma/schema.prisma:219) para el flujo de aprobaciones, y [`AuditLog`](prisma/schema.prisma:245) para el registro de auditoría.
    *   **Enums:** [`BookingStatus`](prisma/schema.prisma:18), [`UserRole`](prisma/schema.prisma:33), [`ApprovalDecision`](prisma/schema.prisma:42), [`PriorityLevel`](prisma/schema.prisma:50) para tipificación de datos.
    *   [`SiteCounter`](prisma/schema.prisma:64): Contador de visitas persistente.

### Logros:
*   Una sólida base para la presencia online del estudio con enfoque en servicios y contenido multimedia.
*   Framework inicial para la gestión de reservas internas.

### Pendientes Críticos:
*   **Validar consistencia de tasas en producción**

## Marketplace

### Estado Actual:
*   **Páginas Clave:**
    *   `/marketplace`: Landing principal.
    *   `/marketplace/[slug]`: Páginas de detalle para cada listado.
    *   `/marketplace/admin`: Panel de administración.
    *   `/marketplace/dashboard`: Dashboard para usuarios.
    *   `/marketplace/reset-password`: Flujo de recuperación de contraseña.
*   **API Routes:** [`/api/marketplace/ai-chat/route.ts`](app/api/marketplace/ai-chat/route.ts) para funcionalidades de chat con IA.
*   **Componentes de Marketplace:**
    *   [`CheckoutModal`](components/marketplace/CheckoutModal.tsx), [`ListingDetailActions`](components/marketplace/ListingDetailActions.tsx), [`ListingQASection`](components/marketplace/ListingQASection.tsx), [`MarketplaceAuthModal`](components/marketplace/MarketplaceAuthModal.tsx), [`MarketplaceCard`](components/marketplace/MarketplaceCard.tsx), [`MarketplaceModals`](components/marketplace/MarketplaceModals.tsx), [`TransactionChat`](components/marketplace/TransactionChat.tsx) para la funcionalidad principal.
    *   [`AdminDashboard`](components/marketplace/admin/AdminDashboard.tsx) y [`DashboardClient`](components/marketplace/dashboard/DashboardClient.tsx) para la gestión.
*   **Acciones (Server Actions):**
    *   [`marketplace.ts`](actions/marketplace.ts) (general).
    *   Específicas: [`admin.ts`](actions/marketplace/admin.ts), [`auth.ts`](actions/marketplace/auth.ts), [`chat.ts`](actions/marketplace/chat.ts), [`favorites.ts`](actions/marketplace/favorites.ts), [`listings.ts`](actions/marketplace/listings.ts), [`questions.ts`](actions/marketplace/questions.ts), [`transactions.ts`](actions/marketplace/transactions.ts), [`users.ts`](actions/marketplace/users.ts) para la lógica de negocio.
*   **Prisma Schema (Modelos):**
    *   **Manejo de Usuarios:** [`MpUser`](prisma/schema.prisma:361) con roles (USER, SOCIO, SUPER), verificación (KYC), reputación de vendedor/comprador, y métodos de pago.
    *   **Listados de Productos/Servicios:** [`MpListing`](prisma/schema.prisma:465) con título, descripción, categoría, tags, precio, imágenes, inventario, estado y slug para SEO.
    *   **Transacciones y Pagos:** [`MpTransaction`](prisma/schema.prisma:594) registra detalles de la transacción, compradores, vendedores, listados, métodos de pago, estados, comisiones, referencias externas, gestión de *escrow* (T+7), y confirmación por parte del comprador.
    *   **Resolución de Disputas:** [`MpDispute`](prisma/schema.prisma:683) con razones, descripciones, evidencia, estado y resolución.
    *   **Comunicación:** [`MpChatThread`](prisma/schema.prisma:537) y [`MpMessage`](prisma/schema.prisma:563) para el chat entre comprador y vendedor.
    *   **Preguntas y Respuestas:** [`MpListingQuestion`](prisma/schema.prisma:514) para preguntas específicas de los listados.
    *   **Retiros de Fondos (Payouts):** [`MpPayout`](prisma/schema.prisma:715) y [`MpPayoutMethod`](prisma/schema.prisma:435) para la gestión de retiros por parte de los vendedores (Zelle, Pago Móvil, Crypto, etc.).
    *   **Auditoría y Logs:** [`MpTransactionStatusHistory`](prisma/schema.prisma:661) y [`MpWebhookLog`](prisma/schema.prisma:747) para trazabilidad.
    *   **Enums:** [`MpPaymentMethodType`](prisma/schema.prisma:275), [`MpTransactionStatus`](prisma/schema.prisma:286), [`MpPayoutMethodType`](prisma/schema.prisma:309), [`MpPayoutStatus`](prisma/schema.prisma:318), [`MpDisputeStatus`](prisma/schema.prisma:328), [`MpListingStatus`](prisma/schema.prisma:338), [`MpUserRole`](prisma/schema.prisma:348).

### Logros:
*   Diseño y esquema de base de datos completo para un marketplace funcional con soporte para usuarios, listados, transacciones, pagos, chat y disputas.
*   Implementación de scaffolding y acciones para las principales funcionalidades del marketplace.

### Pendientes Críticos:
*   **Optimización de carga de imágenes en el nuevo modal.**

## Sprints

*   **Sprint 2 (Motor de Tasas y UI PC-First) - COMPLETADO**

## Auditoría de Supervivencia (Epic 5) - 2026-04-19

### Componentes Confirmados (Sobrevivieron al Rollback)
* **MpListingQuestion Model:** Verificado en el schema de Prisma (líneas 514-530). El modelo está completo con sus relaciones.
* **API de AI Chat:** La ruta `/api/marketplace/ai-chat/route.ts` existe y está funcional, implementando un asistente virtual con límite de 8 mensajes por hora.
* **Lógica de Disputas:** La función `openDispute` está implementada en `actions/marketplace/transactions.ts` (líneas 299-346), permitiendo a compradores y vendedores abrir disputas mientras los fondos están en escrow.

### Checkout Flow
* **Estado:** El flujo de checkout está completamente implementado en `CheckoutModal.tsx`.
* **Características Clave Confirmadas:**
  * Campo autocompletado con total a pagar en USD y Bs (usando tasa BCV)
  * Modal de confirmación de pago al completar el proceso
  * Métodos de pago manuales configurados:
    * Pago Móvil: Banco Mercantil, CI: V-13864619, Teléfono: 04141333305
    * Transferencia Bancaria: Turpial Sound, Banco Mercantil, Cuenta: 01050187331187028916, CI: V-13894619
    * Binance Pay: ID 117577221

### Observaciones
* El flujo de checkout está correctamente integrado con la lógica de transacciones mediante la función `initiatePurchase`.
* El sistema de escrow T+7 está implementado en la lógica de backend, pero requiere validación de los cron jobs para liberación automática.
* Los métodos de pago manuales están hardcodeados en el componente CheckoutModal, lo que facilita su mantenimiento pero podría beneficiarse de una configuración centralizada en el futuro.

## Actualizaciones Post-Rollback (2026-04-19)

### Correcciones de Identidad y Reactividad
* **Limpieza de Mocks:** Se eliminaron todas las referencias a 'Carlos Mendoza' en los datos de prueba, reemplazándolas por 'mvera' para mantener consistencia con el vendedor real en pruebas.
* **Optimistic UI para Notificaciones:** Se implementó actualización optimista de los contadores de notificaciones en el Auth Bar y Dashboard para que se actualicen inmediatamente al enviar/recibir mensajes sin necesidad de recargar.
*   **Sincronización de Mensajería:** Se modificó el sistema de preguntas públicas para que cuando un vendedor reciba una pregunta en su tienda, esta también aparezca en su Tab de Mensajes con opción de respuesta, manteniendo el historial completo y mejorando la experiencia de usuario.

### Logros Recientes (2026-04-19)
*   **Endpoint BCV:** Implementación de la integración del campo de tasas BCV para cálculo de pagos.
*   **Checkout automático:** Flujo de checkout completamente implementado en [`CheckoutModal.tsx`](components/marketplace/CheckoutModal.tsx).
*   **Layout PC:** Optimización y ajustes generales del layout para experiencia PC-First.
*   **Botón favoritos:** Implementación de funcionalidad de botón de favoritos para listados.
*   **Follow-up Q&A:** Modelo [`MpListingQuestion`](prisma/schema.prisma:514) y sincronización de mensajería para preguntas y respuestas.
