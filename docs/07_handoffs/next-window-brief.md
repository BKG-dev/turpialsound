# Next Window Brief - Turpial Sound

**Fecha de actualizacion:** 2026-04-26
**Frente activo:** Marketplace
**Tipo de nota:** Checkpoint operativo para siguiente ventana
**Fuente viva obligatoria:** `docs/obsidian-vault/*`

---

## Estado resumido

El marketplace esta funcional y separado del booking.

El checkout sigue en modo manual temporal y la conciliacion tambien sigue siendo manual.

Base64 ya salio del flujo productivo de imagenes y comprobantes; la media se maneja por URL en storage/asset externo temporal.

El dashboard ya acompana el flujo manual actual para admin y seller.

En la ultima ventana quedaron aplicados fixes funcionales sobre dashboard/admin: contadores reales, detalle clickeable de compras/ventas, mensajes priorizados, CSV corregido, datos de cobro visibles, nota interna estable y tabla completa para admin.

El bloqueo de `paymentSenderBank` ya quedo resuelto en la DB activa; el siguiente frente real ahora es QA operativa end-to-end.

El build de Vercel habia quedado limpio en tipos y luego se cerraron correcciones ESLint para deploy.

## Bloqueos activos

- Critico: correr QA manual end-to-end buyer -> admin -> escrow -> payout manual seller.
- Alto: definir luego la migracion desde storage temporal a storage productivo definitivo.
- Medio-Alto: definir cierre final auditable del payout posterior a `RELEASED`.
- Medio: implementar cron T+7 despues de estabilizar operacion real.
- Medio: dejar para proxima pasada el pendiente `Hero marketplace plasma/rayo pro ligero`, solo para el hero del marketplace y sin tocar el resto del site.

## Hallazgos funcionales a tratar primero

- Operativo y Todos muestran casi la misma informacion.
  Impacto: tabs sin diferenciacion real.
  Prioridad: media-alta.
- El tab de mensajes no refleja bien los 3 mensajes sin leer ni su ubicacion real.
  Impacto: parcialmente mitigado por la nueva segmentacion; falta QA real.
  Prioridad: media-alta.
- Totales y comisiones mejoraron, pero requieren QA con flujo real.
  Impacto: puede quedar residual de metricas.
  Prioridad: alta.
- Hay un desajuste transversal entre metricas, tabs y flujo real.
  Impacto: requiere QA y posible segunda pasada puntual.
  Prioridad: alta.

## Resuelto en la ventana previa

- Contador de Mis compras corregido.
- Detalle clickeable de compras/ventas implementado.
- CSV corregido.
- Datos de cobro del vendedor visibles en Pagos.
- Nota interna corregida.
- Badge de mensajes sin leer clickeable.
- Mensaje post Pago recibido agregado.
- Vista admin de tabla completa agregada.
- Build y TypeScript limpios.

## No reabrir

- No mezclar marketplace con booking.
- No quitar el prefijo `MP_` del schema del marketplace.
- No reintroducir base64 en listings ni comprobantes.
- No abrir pasarelas automaticas antes de cerrar migracion/schema y QA real.

## Checkpoint explicito

- Estado marketplace: funcional, separado y en fase de estabilizacion operativa.
- Estado checkout manual: vigente como flujo oficial temporal.
- Estado imagenes/storage: migrado a URLs/asset externo temporal; pendiente storage definitivo.
- Estado dashboard: suficiente para conciliacion manual y seguimiento operativo.
- Estado dashboard post-fix: mas coherente con el flujo real; falta QA final para cerrar residuales.
- Bloqueador `paymentSenderBank`: resuelto en la DB activa; columnas e indices ya presentes.

## Siguiente accion exacta

1. Tomar como cerrado el frente `paymentSenderBank` en la DB activa.
2. Ejecutar QA manual completa con imagenes y comprobantes reales sobre los fixes ya aplicados.
3. Documentar hallazgos residuales y hacer segunda pasada solo si hace falta.
4. Solo despues pasar al storage productivo definitivo.
5. Cuando se retome el frente visual, definir propuesta ligera para el hero del marketplace con enfoque CSS/SVG hibrido o equivalente liviano, sin canvas pesado ni impacto SEO/AEO.

## Proximo prompt operativo exacto

```text
Lee primero:
- docs/obsidian-vault/00_CENTRAL_TURPIAL.md
- docs/obsidian-vault/ROADMAP_RESCATE.md
- docs/obsidian-vault/BUGS_CRITICOS.md
- docs/obsidian-vault/ARQUITECTURA_TASAS.md
- docs/07_handoffs/session-summary-active.md
- docs/07_handoffs/next-window-brief.md
- docs/marketplace/00_IMPLEMENTATION_SUMMARY.md
- docs/marketplace/01_ROADMAP_AND_STATUS.md

Resume el estado real en 8-10 lineas.
Confirma que la DB activa ya tiene paymentSenderBank/paymentPaidAt e indices y no reabras ese frente.
Confirma que los fixes funcionales ya quedaron aplicados y no reabras ese frente sin evidencia.
Luego ejecuta QA manual completa buyer -> admin -> escrow -> payout manual seller validando:
- contador/listado,
- detalle y mensajes de estado en compras/ventas,
- diferenciacion real entre tabs,
- CSV,
- visibilidad de datos de cobro del vendedor,
- totales/comisiones/neto/pendiente,
- nota interna,
- badge y tab de mensajes,
- mensaje posterior a Pago recibido.
Si QA detecta residuales, haz segunda pasada puntual.
Actualiza Obsidian y handoff con los hallazgos residuales antes de abrir cualquier otro frente.
```
## Actualizacion 2026-04-23 - Storage productivo publico no-booking

- Vercel Blob quedo implementado como storage productivo para media publica no-booking.
- La ruta `/api/marketplace/upload` sigue siendo la entrada unica autenticada.
- `lib/media/public-no-booking-storage.ts` usa solo `TS_WEB_BLOB_READ_WRITE_TOKEN`.
- `lib/marketplace/media.ts` deriva `listing-image` y `avatar` a esa capa publica no-booking.
- `payment-proof` no usa el Blob publico no-booking; en produccion falla cerrado hasta definir storage sensible.
- No se usa `BLOB_READ_WRITE_TOKEN` generico ni el token/storage de Jean.
- En desarrollo sin token, queda fallback local para media publica bajo `public/public-media/*`.
- `next.config.mjs` permite imagenes remotas desde `*.public.blob.vercel-storage.com`.
- `npx tsc --noEmit` limpio.
- `npm run build` limpio.

## Regla de convivencia
- DB compartida: si.
- Blob/token compartido: no.
- Jean: `/reservas` y booking.
- Manuel: home, subpaginas, marketplace y frontend publico no-booking.
- Media publica no-booking comparte `TS_WEB_BLOB_READ_WRITE_TOKEN`.
- Comprobantes sensibles del marketplace no van en ese Blob publico.

## Siguiente paso
- Crear/conectar Vercel Blob Store propio no-booking y asegurar `TS_WEB_BLOB_READ_WRITE_TOKEN` en Preview/Production.
- Probar media publica viva: sellerIA publica listing con imagen real y recarga detalle.
- Definir storage sensible/proxy autenticado para comprobantes antes de QA productiva de proofs.
- Luego retomar continuidad transaccional buyer -> seller -> admin.

## Actualizacion 2026-04-23 - Golden path QA/CLI

- Runbook canonico: `docs/07_handoffs/qa-canonical-runbook.md`
- Regla operativa exacta:
  - usar primero el script canonico documentado,
  - no buscar scripts alternativos salvo fallo explicito de precondicion,
  - separar preflight de ejecucion QA,
  - no redescubrir el flujo si el runbook ya lo define.
- Para smoke reutilizable por defecto usar `node scripts/qa-marketplace-qa-accounts.mjs`.
- Para normalizar cuentas QA usar `npx tsx scripts/setup-marketplace-qa-accounts.ts`.
- Para Blob/media no usar harnesses temporales como primera opcion: la validacion oficial actual es manual en preview con `sellerIA`.

## Actualizacion 2026-04-23 - Proof sensible preview smoke bloqueado por harness

- Preview intentado:
  - `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`
- Preflight verificado:
  - preview responde `200`
  - `TS_MARKETPLACE_SENSITIVE_BLOB_READ_WRITE_TOKEN` esta cargado en `Preview`
  - cuentas QA vigentes siguen siendo `buyerIA`, `sellerIA`, `mvera`
- Resultado:
  - el smoke tecnico corto de `payment-proof` sensible quedo `BLOQUEADO`
  - no por evidencia de fallo de storage/proxy, sino porque esta sesion no pudo conducir el flujo real del preview:
    - CDP/browser no quedo utilizable
    - fallback de server actions por HTTP no devolvio `text/x-component`; devolvio HTML normal
- Consecuencia:
  - no hay evidencia nueva de regressions en proofs sensibles
  - el frente queda pendiente de validacion viva corta en una sesion con browser interactivo funcional
- Siguiente accion exacta:
  1. abrir preview `mpwpxahfc`
  2. buyerIA compra listing QA persistente y adjunta comprobante nuevo
  3. confirmar `/api/marketplace/upload` exitoso
  4. entrar como `SUPER` a `Validaciones`
  5. validar que `paymentProofUrl` persistido sea `/api/marketplace/payment-proofs/...` y que abra `200`

## Actualizacion 2026-04-23 - Cierre de debilidad operativa QA

- Debilidad cerrada:
  - faltaba una capa de despacho exacta por objetivo
  - el runbook narrativo no bastaba para bloquear exploracion fuera de cobertura
- Capa agregada:
  - `docs/07_handoffs/qa-dispatcher.json`
- Regla nueva:
  - si no existe entrada exacta en el dispatcher, no se improvisa
  - se detiene la ejecucion y se reporta `GAP OPERATIVO`
- `payment_proof_sensitive_preview` queda en `manual_preview` hasta tener ruta canonica exacta validada
- Cuando un script o metodo quede validado para una tarea, debe registrarse primero en el dispatcher y luego en el runbook

## Actualizacion 2026-04-24 - Reintento proof sensible detenido antes de QA

- Frente: `payment_proof_sensitive_preview`.
- Preview vigente usado como objetivo: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`.
- Credenciales de esta sesion:
  - buyerIA: `buyerIA / BuyerIA_QA_2026!`
  - SUPER: `mvera / 13894619`
- Estado: no ejecutado; no hubo login, upload, `paymentProofUrl` ni validacion de proxy.
- Bloqueo real: la sesion actual no tiene control de browser interactivo para completar manual-preview. No se uso CDP alternativo, server actions reverse engineered ni HTTP ad hoc.
- Siguiente accion exacta:
  1. usar una sesion con browser interactivo controlable por Codex o navegador humano,
  2. abrir preview `mpwpxahfc`,
  3. buyerIA compra listing QA persistente y adjunta comprobante nuevo,
  4. SUPER entra a `Validaciones`,
  5. validar que `paymentProofUrl` use `/api/marketplace/payment-proofs/...`, que el proxy abra y que no haya URL `https://*.public.blob.vercel-storage.com/...` en el proof nuevo.

## Checkpoint corto 2026-04-24

- `payment_proof_sensitive_preview` sigue pendiente.
- No se ejecuto QA ni se subio proof nuevo.
- Preview objetivo: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`.
- Bloqueo: esta sesion no tiene browser interactivo controlable por Codex.
- Proxima accion minima: reintentar con browser controlable o ejecutar manualmente y documentar evidencia.

## Cierre 2026-04-24 - payment_proof_sensitive_preview

- Estado: validado manualmente.
- Preview usado: `https://turpialsound-mpwpxahfc-cerberus77s-projects.vercel.app`.
- Credenciales usadas:
  - buyerIA: `buyerIA / BuyerIA_QA_2026!`
  - SUPER: `mvera / 13894619`
- Resultado:
  - buyerIA subio proof nuevo.
  - `paymentProofUrl` final quedo bajo `/api/marketplace/payment-proofs/...`.
  - ruta confirmada: `/api/marketplace/payment-proofs/marketplace-sensitive-media/marketplace/payment-proofs/2026/04/1777011359365-8ff99e05-ec49-4178-962b-0295b361eb5d.webp`
  - proof nuevo no usa `https://*.public.blob.vercel-storage.com/...`.
  - SUPER pudo abrir el proof por proxy autenticado.
- Dispatcher y runbook actualizados como metodo manual-preview validado.
- Siguiente minimo: no reabrir proofs sensibles salvo regresion; resolver cualquier nuevo frente primero por `qa-dispatcher.json`.

## Checkpoint 2026-04-24 - Git y siguiente frente

- Commits de cierre creados y pusheados.
- Rama vigente: `UI-UX-finalV3`.
- Siguiente frente: preview fresco + regresion corta.
- La regresion corta debe salir primero del dispatcher; si no existe `task_id` exacto, reportar `GAP OPERATIVO`.
- Mantener prohibidos CDP improvisado, server actions reverse engineered y HTTP ad hoc.

## Actualizacion 2026-04-24 - Glosario UX marketplace

- El lenguaje visible del marketplace quedo simplificado para publico general.
- Seller Cobros y Admin Pagos usan terminos humanos para ventas, cobros, pagos, comisiones y estados.
- Existe glosario formal en `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`.
- Futuras pantallas del marketplace deben seguir ese glosario para evitar jerga tecnica o interna en UI.
- No se tocaron booking, `/reservas`, enums ni logica de negocio.

## Actualizacion 2026-04-24 - Seller Cobros UI premium

- Seller Cobros quedo refactorizado visualmente sin cambios de negocio.
- Se amplio el ancho util del dashboard, se estabilizaron tabs, se separaron KPIs principales de comisiones/cargos y se agrego una lectura clara de: en revision, en aprobacion y listo para cobrar.
- El bloque de datos de cobro y el resumen ahora se leen como superficie financiera funcional, no como tarjetas apretadas.
- Admin Pagos no fue tocado.
- Validacion tecnica cerrada: `npx tsc --noEmit` limpio y `npm run build` limpio.

## Checkpoint inmediato 2026-04-25 - post commit Seller Cobros

- Ultimo commit: `9d44def style(marketplace): polish seller payouts dashboard`.
- Alcance del commit: solo `components/marketplace/dashboard/DashboardClient.tsx` con polish visual staged de Seller Cobros.
- Push: pendiente.
- Build/QA post-commit: pendientes por instruccion explicita; no ejecutar en loop.
- Worktree: no limpio; quedan cambios unstaged/untracked fuera del commit.
- Stash existente: `stash@{0}: On UI-UX-finalV3: pre-seller-cobros-polish-unstaged`.
- Patch temporal existente: `.tmp-seller-cobros-polish-staged.patch`.
- No limpiar, no aplicar stash, no borrar patch, no borrar `.tmp-preview-dev.log` y no hacer push sin instruccion explicita.
- Booking y `/reservas`: no tocados.
- Siguiente accion recomendada: limpieza controlada del worktree, clasificando primero cambios a conservar, basura temporal eliminable y decision sobre stash viejo.

## Checkpoint 2026-04-25 - Seller Dashboard UX cerrado

- Ultimo commit cerrado: `21bb346 style(marketplace): clarify seller dashboard payouts UX`.
- Archivos del commit:
  - `components/marketplace/dashboard/DashboardClient.tsx`
  - `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- Estado actual:
  - glosario UX creado;
  - Seller Cobros elimina jerga visible como escrow, payout, RELEASED y neto operativo;
  - Cobros separa dinero en revision, dinero en proceso, listo para cobrar y datos de cobro;
  - layout seller aprovecha mejor desktop con `max-w-6xl`;
  - mobile-first queda preservado;
  - no hubo cambios de calculos ni logica de negocio.
- Validacion:
  - `npx tsc --noEmit`: limpio.
  - `npm run build`: limpio.
  - `git status --short` final: limpio.
- No se toco AdminDashboard, booking, `/reservas`, Prisma/runtime/db/env, APIs/actions ni Blob/storage/paymentProofUrl/proxy SUPER.
- Push: pendiente; no realizado.

## Siguiente accion recomendada

1. Admin dashboard: alinear lenguaje operacional/financiero con el glosario, sin tocar logica ni calculos.
2. Luego SEO/AEO del marketplace publico.
3. Luego disenar el cierre final de payout/pago al vendedor; no implementarlo sin aprobar DB/schema.

Reglas de continuidad:
- No tocar runtime/Prisma/env sin tarea explicita.
- No aplicar ni borrar stashes sin inspeccion.
- No mezclar Admin + SEO + payout final en una sola tarea.

## Checkpoint 2026-04-25 - Admin Dashboard UX cerrado

- Ultimo commit cerrado: `e8ce902 style(marketplace): clarify admin dashboard operations UX`.
- Archivos del commit:
  - `components/marketplace/admin/AdminDashboard.tsx`
  - `docs/marketplace/05_GLOSARIO_DE_TERMINOS_UX.md`
- Estado actual:
  - Admin Dashboard quedo alineado con el glosario UX;
  - se redujo jerga interna visible en la superficie admin;
  - KPIs principales ahora priorizan `Pagos por revisar`, `Dinero en proceso`, `Disputas abiertas` y `Monto listo para pagar`;
  - transacciones totales, publicaciones activas, usuarios registrados y comision plataforma mensual quedan como contexto secundario;
  - layout admin ampliado a `max-w-6xl`;
  - tabs admin en grilla responsive;
  - glosario UX actualizado con terminos admin.
- Validacion:
  - `npm run build`: limpio.
  - lint/type check: limpio.
  - build genero 29 paginas.
  - `git status --short` final: limpio.
- No se toco seller dashboard, booking, `/reservas`, Prisma/runtime/db/env, APIs/actions ni Blob/storage/paymentProofUrl/proxy SUPER.
- Push: pendiente; no realizado.

## Siguiente accion recomendada

1. SEO/AEO del marketplace publico.
2. Luego diseno del cierre final de payout/pago al vendedor; no implementarlo sin aprobar DB/schema.

Reglas de continuidad:
- No implementar cierre final de payout sin diseno previo.
- No tocar runtime/Prisma/env sin tarea explicita.
- No mezclar SEO/AEO con cierre contable.

## Checkpoint 2026-04-26 - SEO/AEO publico marketplace

- Ultimo commit cerrado: `60be254 feat(marketplace): improve public SEO and AEO`.
- Archivos del commit:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `app/marketplace/page.tsx`
  - `app/sitemap.ts`
- Estado actual:
  - `/marketplace` quedo como Server Component con metadata;
  - la UI interactiva vive en `MarketplacePageClient.tsx`;
  - se agrego metadata publica: title, description, canonical, OpenGraph y Twitter card;
  - se agrego JSON-LD estatico `CollectionPage` + `BreadcrumbList`;
  - `/marketplace` quedo incluido en `app/sitemap.ts`;
  - el copy publico evita prometer escrow, fiduciario o ausencia de riesgo.
- Validacion:
  - build validado previamente segun reporte de implementacion;
  - `npx tsc --noEmit` y `npm run build` reportados limpios en ese cierre;
  - no hay cambios pendientes en esos archivos.
- No se tocaron booking, `/reservas`, Prisma/runtime/db/env, APIs/actions, dashboards privados ni Blob/storage/paymentProofUrl/proxy SUPER.
- Push: pendiente; no realizado.

## Siguiente accion recomendada

1. SEO/AEO de `/marketplace/[slug]`, solo metadata y semantica, sin tocar DB/actions.
2. Luego diseno del cierre final de payout/pago al vendedor; no implementarlo sin aprobar DB/schema.

Reglas de continuidad:
- No agregar Product JSON-LD dinamico sin revisar datos reales.
- No tocar DB/actions para SEO.
- No mezclar SEO/AEO con payout final.

## Checkpoint 2026-04-26 - SEO/AEO detalle marketplace

- Ultimo commit cerrado: `745068b feat(marketplace): improve listing detail SEO and AEO`.
- Archivo del commit:
  - `app/marketplace/[slug]/page.tsx`
- Estado actual:
  - SEO/AEO de `/marketplace/[slug]` quedo cerrado;
  - metadata dinamica ampliada: title, description, canonical, OpenGraph, Twitter card, fallback de imagen y `noindex` para listing no encontrado;
  - JSON-LD agregado: `ItemPage` + `BreadcrumbList`;
  - `Product` JSON-LD no fue agregado por prudencia de datos;
  - copy publico corregido: se elimino "Pago fiduciario protegido" y se explica pago reportado, revision manual, validacion y confirmacion;
  - sitemap no fue tocado porque slugs dinamicos requeririan DB.
- Validacion:
  - `git diff --check`: limpio, solo warning LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio;
  - build genero 29 paginas y `/marketplace/[slug]` quedo dinamico server-rendered.
- No se tocaron sitemap, booking, `/reservas`, Prisma/runtime/db/env, APIs/actions, dashboards privados ni Blob/storage/paymentProofUrl/proxy SUPER.
- Push: pendiente; no realizado.

## Siguiente accion recomendada

1. Diseno del cierre final de payout/pago al vendedor, solo diseno primero; no implementarlo sin aprobar DB/schema/acciones admin.
2. Alternativa menor: revision visual/manual del marketplace publico despues del deployment.

Reglas de continuidad:
- No agregar Product JSON-LD dinamico sin datos consistentes.
- No consultar DB desde sitemap sin diseno.
- No implementar cierre final de payout sin especificacion.

## Checkpoint 2026-04-26 - P0 marketplace publico/mobile

- Ultimo commit cerrado: `586663b fix(marketplace): resolve mobile public marketplace regressions`.
- Archivos del commit:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `components/layout/AnimatedLogo.tsx`
  - `components/layout/MobileMenu.tsx`
  - `components/layout/SiteHeader.tsx`
  - `components/marketplace/ListingQASection.tsx`
  - `components/marketplace/MarketplaceAuthModal.tsx`
  - `components/marketplace/MarketplaceCard.tsx`
  - `components/marketplace/MarketplaceImage.tsx`
  - `components/marketplace/MarketplaceModals.tsx`
  - `components/marketplace/TransactionChat.tsx`
  - `content/marketplace.ts`
  - `lib/marketplace/media-client.ts`
- Estado actual:
  - navbar mobile ya no debe desbordarse;
  - logo/texto mobile tienen constraints;
  - menu hamburguesa usa fondo solido/opaco y capa correcta;
  - `Quiero comprar` ya no debe quedar congelado en spinner infinito y muestra error acotado si no cargan listados;
  - cards/listings ya no muestran copy de pago fiduciario;
  - listings tienen fallback/error handling visible para imagenes;
  - upload movil de imagenes de publicaciones quedo mas robusto;
  - textarea de preguntas del listing tiene `id` y `name`.
- Validacion:
  - `git diff --check`: limpio, solo warnings CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio.
- No se tocaron booking, `/reservas`, Prisma/runtime/db/env, APIs/actions, dashboards privados ni Blob/storage/paymentProofUrl/proxy SUPER.
- Commit unico usado porque la separacion parcial de `MarketplaceModals.tsx` no aplico limpio y se evito loop.
- Push: pendiente; no realizado.

## Validacion pendiente post `586663b`

1. `/marketplace` mobile.
2. Menu hamburguesa mobile.
3. `Quiero Comprar`.
4. `Quiero Vender` + upload de imagen desde movil, idealmente galeria y camara.
5. Cards/listings con imagenes y fallback.
6. Listing detail + textarea de preguntas.
7. Smoke rapido desktop.

Riesgos de continuidad:
- `lib/marketplace/media-client.ts` cambio para upload movil; validar desde galeria/camara.
- Si upload visual funciona pero falla backend/storage, reportar antes de tocar storage/backend.
- No mezclar con payout final.

## Checkpoint 2026-04-28 - UX publico responsive cerrado tecnicamente

- Sprint cerrado: UX publico responsive mobile + desktop.
- Archivos tocados en codigo:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `app/marketplace/[slug]/page.tsx`
  - `components/marketplace/CheckoutModal.tsx`
  - `components/marketplace/ListingQASection.tsx`
  - `components/marketplace/MarketplaceCard.tsx`
  - `components/marketplace/MarketplaceModals.tsx`
  - `components/marketplace/TransactionChat.tsx`
  - `lib/marketplace/venezuelan-banks.ts`
- Resultado:
  - contraste publico reforzado sin tocar negocio;
  - Q&A legible y mas usable en telefono y desktop;
  - caja de preguntas/respuestas tactil, con `id/name` en formularios publicos/modales;
  - banco emisor visible como label compacto, manteniendo el valor interno completo;
  - horas del chat en formato 12h;
  - auth bar y textos secundarios ajustados para responsive.
- Dark/light queda pendiente disenado: requiere infraestructura de tema y refactor de colores inline/hardcodeados; no se improviso en este sprint.
- Validacion:
  - `git diff --check`: limpio, solo warnings CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- No se ejecuto QA automatizada ni Playwright.

## Siguiente accion recomendada

1. Sprint 2: bugs internos acotados (`Guardar metodo de cobro` y nota interna admin), resolviendo primero `task_id` exacto en `qa-dispatcher.json`.
2. Si no existe `task_id` exacto para la validacion futura, detenerse y reportar `GAP OPERATIVO`.
3. Mantener fuera de alcance: carrito, tasas, finanzas, conformidad/fondos, schema/migrations, booking y `/reservas`.

## Checkpoint 2026-04-28 - Dark/light marketplace

- Rama vigente: `Marketplace-Pure`.
- Estado: dark/light implementado sin commit y sin push.
- Estrategia:
  - provider local `components/marketplace/MarketplaceTheme.tsx`;
  - tema scoped con `.mp-theme-root[data-marketplace-theme]`;
  - CSS variables en `styles/globals.css`;
  - persistencia en `localStorage` (`turpial-marketplace-theme`);
  - fallback inicial a `prefers-color-scheme`;
  - bootstrap inline para reducir parpadeo antes de hidratacion;
  - toggle visible en `/marketplace` y `/marketplace/[slug]`.
- Archivos modificados:
  - `app/marketplace/MarketplacePageClient.tsx`
  - `app/marketplace/[slug]/page.tsx`
  - `components/marketplace/MarketplaceTheme.tsx`
  - `components/marketplace/MarketplaceAuthModal.tsx`
  - `components/marketplace/ListingDetailActions.tsx`
  - `components/marketplace/CheckoutModal.tsx`
  - `components/marketplace/ListingQASection.tsx`
  - `components/marketplace/MarketplaceCard.tsx`
  - `components/marketplace/MarketplaceModals.tsx`
  - `components/marketplace/TransactionChat.tsx`
  - `styles/globals.css`
- Validacion ejecutada:
  - `git diff --check`: limpio, solo warnings LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- Siguiente accion recomendada:
  - si el usuario aprueba el resultado, crear commit checkpoint de dark/light;
  - despues retomar Sprint 2 de bugs internos o el frente que el usuario priorice, sin mezclar con carrito/tasas/finanzas.
- Regla QA: no ejecutar QA automatizada ni Playwright sin `task_id` exacto en dispatcher.

## Checkpoint 2026-04-28 - Dark/light marketplace global

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado, validado tecnicamente, sin commit y sin push.
- Provider:
  - `MarketplaceThemeProvider` quedo montado en `app/marketplace/layout.tsx`;
  - se quitaron providers locales de landing y detalle para evitar duplicados;
  - todo `/marketplace` hereda el mismo `data-marketplace-theme`.
- Toggle:
  - label muestra la accion disponible, no el estado actual;
  - tema claro -> `Modo oscuro`;
  - tema oscuro -> `Modo claro`;
  - estilo switch deslizante en `styles/globals.css`.
- Cobertura adicional:
  - `/marketplace/dashboard`;
  - `/marketplace/admin`;
  - tabs, cards, badges, tablas nativas, inputs, forms, paneles y modales de dashboard/admin.
- Validacion ejecutada:
  - `git diff --check`: limpio, solo warnings LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- Restricciones:
  - no Playwright;
  - no QA automatizada;
  - no CDP;
  - no commit;
  - no push;
  - no tocar booking, `/reservas`, schema/migrations, carrito, tasas, finanzas, conformidad/fondos ni pagos.

## Checkpoint 2026-04-28 - Barrido final theme marketplace

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado, validado tecnicamente, sin commit y sin push.
- Cambio principal:
  - `mp-route-shell` en `app/marketplace/layout.tsx` cubre el padding global del `<main>` y elimina la banda negra superior en light mode;
  - `styles/globals.css` refuerza tokens, contraste y compatibilidad con estilos inline heredados.
- Causa de la banda negra:
  - el `pt-16` global de `app/layout.tsx` dejaba visible el fondo global oscuro antes de que iniciara el root themeado de marketplace.
- Superficies barridas:
  - home marketplace;
  - listing detail;
  - dashboard usuario/seller;
  - dashboard admin;
  - tabs;
  - KPI/paneles;
  - cards/listings;
  - modales/auth/checkout/chat;
  - inputs, textareas, selects, badges y tablas nativas.
- Validacion ejecutada:
  - `git diff --check`: limpio, solo warnings LF -> CRLF;
  - `npx tsc --noEmit`: limpio;
  - `npm run build`: limpio, 29 paginas generadas.
- Restricciones:
  - no Playwright;
  - no QA automatizada;
  - no CDP;
  - no commit;
  - no push;
  - no tocar booking, `/reservas`, schema/migrations, carrito, tasas, finanzas, conformidad/fondos, pagos ni SOLD_OUT.

## Checkpoint 2026-04-28 - Residual dashboard usuario/seller

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Alcance acotado:
  - solo dashboard usuario/seller y docs;
  - no admin/home salvo dependencia previa del theme ya existente.
- Causa:
  - `DashboardClient.tsx` tenia cards y listados con gradientes/fondos inline oscuros que no debian depender solo del compatibility layer.
- Cambios:
  - KPI superiores ya usan `--mp-card`, `--mp-border`, `--mp-card-shadow` y textos `--mp-text-*`;
  - Mensajes usa cards y header themeados;
  - Cobros, cards financieras, datos de cobro, resumen y metodos registrados usan tokens;
  - listados internos principales migrados a superficies themeadas.
- Validacion final de este pase: ejecutar `git diff --check`, `npx tsc --noEmit`, `npm run build` antes de cerrar.

## Checkpoint 2026-04-28 - Sprint 2 bugs internos

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Alcance:
  - `Guardar metodo de cobro` en `/marketplace/dashboard`;
  - nota interna del admin en operaciones/validaciones/escrow.
- Metodo de cobro:
  - causa: mismatch entre opcion UI `BINANCE_PAY` y enum persistible `CRYPTO_WALLET`, mas falta de validacion server para tipo/payload/duplicado;
  - fix: normalizacion cliente/server, validacion de campos, deduplicacion y actualizacion local de `payoutMethods` sin refresh manual.
- Nota interna admin:
  - causa: tabs definidos como componentes internos renderizados con JSX, lo que remontaba el panel al cambiar el draft;
  - fix: tabs renderizados como helpers para mantener foco y valor controlado mientras se escribe.
- Archivos:
  - `components/marketplace/dashboard/DashboardClient.tsx`;
  - `components/marketplace/admin/AdminDashboard.tsx`;
  - `actions/marketplace/users.ts`.
- Validacion pendiente al cierre de la tarea:
  - `git diff --check`;
  - `npx tsc --noEmit`;
  - `npm run build`.
- Restricciones:
  - no Playwright;
  - no CDP;
  - no QA automatizada sin `task_id` exacto y autorizacion;
  - no commit ni push;
  - no tocar booking, `/reservas`, schema/migrations, carrito, tasas, finanzas/P&L, conformidad/fondos, pagos/escrow, SOLD_OUT ni `paymentProofUrl`/proxy SUPER.

## Checkpoint 2026-04-28 - Ajuste metodos de cobro

- Rama vigente: `Marketplace-Pure`.
- Estado: implementado sin commit y sin push.
- Cambio:
  - Banco de metodo de cobro ahora es select con `VENEZUELAN_BANK_OPTIONS`;
  - visible compacto tipo `0105-Mercantil`;
  - valor guardado estandarizado igual al checkout, no texto libre.
- Telefono:
  - helper nuevo `lib/marketplace/venezuelan-phone.ts`;
  - formato final `04XXXXXXXXX`;
  - prefijos validos: `0412`, `0414`, `0416`, `0422`, `0424`, `0426`;
  - cliente y server validan y normalizan.
- UI:
  - se quitaron botones `Copiar` de datos propios en `Metodos registrados`;
  - se mantienen `Usar por defecto` y `Eliminar`.
- Validacion pendiente al cierre:
  - `git diff --check`;
  - `npx tsc --noEmit`;
  - `npm run build`.
- Validacion manual sugerida:
  - `/marketplace/dashboard?tab=payouts`;
  - crear Pago Movil con banco del dropdown;
  - probar telefonos `+584141333305`, `584141333305`, `4141333305`, `0414-133-33-05`, `+584221234567`, `4221234567`;
  - confirmar guardado como `04141333305` o `04221234567`;
  - probar telefono invalido y confirmar error;
  - confirmar que no aparecen botones `Copiar`.

## Actualizacion 2026-04-28 - Marketplace-Pure Sync (Gemini)

- **Rama:** `Marketplace-Pure`.
- **Estado:** Sprint 1 (UX Responsive) y Dark/Light Mode completados. Sprint 2 (Payouts/Nota Admin) completado.
- **Commits:** `18c5eec`, `deef9f4`, `70045a6`.
- **DiagnÃ³stico Sprint 3A:**
  - **Frente A (Mensajes):** Necesidad de polling optimizado y fuente de datos unificada para badges.
  - **Frente B (Disponibilidad):** Bloquear compra si existe transacciÃ³n activa (PENDING_PAYMENT, etc.).
- **PrÃ³ximo Paso:** Iniciar Sprint 3B de implementaciÃ³n segÃºn diagnÃ³stico 3A.
- **LÃ­mites:** Sin booking, sin /reservas, sin schema migrations.

## Checkpoint final 2026-04-28
- Rama final: `Marketplace-Pure`.
- Git status: Limpio.
- Docs actualizados: `session-summary-active.md`, `next-window-brief.md`, `ROADMAP_RESCATE.md`, `BUGS_CRITICOS.md`.
- Handoff nuevo: `marketplace-pure-gemini-resume.md`.

## Checkpoint Sprint 3B1 - disponibilidad por transacción activa

**Fecha:** 2026-04-28
**Rama:** Marketplace-Pure
**Estado:** completado técnicamente, pendiente validación manual local antes de commit.

### Implementado
- Se agregó bloqueo de compra duplicada cuando un listing tiene una transacción activa.
- initiatePurchase() ahora rechaza nuevas compras si existe ctiveTx para el listing.
- La disponibilidad pública se deriva de ctiveTransactionStatus.
- MarketplaceCard muestra overlay de disponibilidad según estado.
- ListingDetailActions deshabilita el CTA de compra y muestra copy informativo.
- No se marca SOLD_OUT antes de validación real por admin.

### Estados bloqueantes
- PENDING_PAYMENT
- PAYMENT_RECEIVED
- VALIDATING
- IN_ESCROW
- DELIVERY_CONFIRMED
- DISPUTED

### Estados terminales
- RELEASED
- REFUNDED
- PAYMENT_FAILED
- CANCELLED

### Copy operativo
- PENDING_PAYMENT: Reservado temporalmente
- PAYMENT_RECEIVED / VALIDATING: Pago en revisión
- IN_ESCROW: Venta en proceso
- DELIVERY_CONFIRMED: Entrega confirmada
- DISPUTED: Operación en disputa
- SOLD_OUT / RELEASED: Vendido
- ACTIVE sin transacción activa: Disponible

### Validación técnica reportada
-
px tsc --noEmit: OK.
-
pm run build: OK.
- Pendiente confirmar git diff --check tras esta sincronización documental.

### Restricciones respetadas
- No se tocó schema.prisma.
- No se aplicaron migraciones.
- No se tocó booking ni /reservas.
- No se tocó main ni producción.
- No se tocaron pasarelas, carrito, tasas, finanzas, conformidad/fondos ni paymentProofUrl/proxy SUPER.

## Checkpoint 2026-04-29 - Admin Pagos vendedores

- Admin > Pagos vendedores fue corregido para no mezclar operaciones listas con operaciones sin metodo de cobro.
- Causa: query admin limitado a metodo `isDefault + isActive`, sin fallback a metodo activo ni detalles de `encryptedData`; agrupacion visual trataba todo `RELEASED` como listo.
- Estado esperado: `Listo para pagar` solo muestra vendedores con metodo activo usable; `Falta método de cobro` agrupa los montos bloqueados por falta de datos.
- Datos visibles para pago manual cuando existen: metodo, etiqueta, banco, telefono, cedula, titular/beneficiario, cuenta, email o wallet.
- No se implemento pago final ni cierre contable; no se tocaron schema/migrations, finanzas, conformidad/fondos, booking, `/reservas`, Playwright ni CDP.
- Siguiente ventana: si se valida manualmente esta pantalla, documentar solo hallazgos residuales; cualquier QA automatizada nueva sigue requiriendo `task_id` exacto en `qa-dispatcher.json`.
